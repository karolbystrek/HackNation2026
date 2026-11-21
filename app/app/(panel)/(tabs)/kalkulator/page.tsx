"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { BasisCalculator } from "@/components/calculator/basis-calculator";
import { LeaveCalculator } from "@/components/calculator/leave-calculator";
import { PregnancyCalculator } from "@/components/calculator/pregnancy-calculator";
import { BackLink, Button, Notice, PageTitle } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import type { ParentKey } from "@/lib/calc/leave";
import type { EventType, TimelineEvent } from "@/lib/events";
import { calculatorNavigate } from "@/lib/calculator-navigation";
import { updatePlan, usePlan, usePlanDraft } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

const MODES = [
  ["birth", "Narodziny dziecka"],
  ["adoption", "Adopcja lub rodzina zastępcza"],
  ["pregnancy", "Zwolnienie w ciąży"],
  ["basis", "Oblicz podstawę zasiłku"],
] as const;
type Mode = (typeof MODES)[number][0];

const eventModes: Partial<Record<EventType, Mode>> = {
  birth: "birth",
  adoption: "adoption",
  sickLeave: "pregnancy",
  returnToWork: "birth",
  salary: "basis",
};

export default function CalculatorPage() {
  return <Suspense><CalculatorEntry /></Suspense>;
}

function CalculatorEntry() {
  const search = useSearchParams();
  const eventId = search.get("wydarzenie");
  const href = search.size ? `/kalkulator?${search}` : "/kalkulator";
  const plan = usePlan();
  const event = plan.events.find((item) => item.id === eventId);
  useEffect(() => {
    if (!eventId && plan.calculatorHref !== href) {
      updatePlan((previous) => ({ ...previous, calculatorHref: href }));
    }
  }, [eventId, href, plan.calculatorHref]);
  return <Calculators key={event?.id} event={event} />;
}

function Calculators({ event }: { event?: TimelineEvent }) {
  const { persona, params } = useFamily();
  const query = useSearchParams();
  const defaultMode = event ? eventModes[event.type] ?? null : null;
  const selectedMode = query.get("tryb");
  const mode = MODES.find(([key]) => key === selectedMode)?.[0] ?? (selectedMode === "wybor" ? null : defaultMode);
  const basisParent = query.get("podstawa");
  const basisRequest: { parent: ParentKey; startMonth: string } | null = mode && mode !== "basis" && (basisParent === "mother" || basisParent === "father")
    ? { parent: basisParent, startMonth: query.get("miesiac") ?? "" }
    : null;
  const draftKey = `kalkulator/${event?.id ?? "ogolny"}`;
  const [bases, setBases] = usePlanDraft(`${draftKey}/kwoty`, {
    mother: computeBasis(persona.parents.mother.monthlyGross, params, persona.parents.mother.contract).basis.toFixed(2).replace(".", ","),
    father: computeBasis(persona.parents.father.monthlyGross, params, persona.parents.father.contract).basis.toFixed(2).replace(".", ","),
  });
  const picker = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (mode === null) picker.current?.focus();
  }, [mode]);

  const setMode = (next: Mode | null, back = false) => calculatorNavigate((params) => {
    if (next === defaultMode) params.delete("tryb");
    else params.set("tryb", next ?? "wybor");
    params.delete("krok");
    params.delete("podstawa");
    params.delete("miesiac");
    params.delete("krok-podstawy");
  }, back);
  const chooseMode = () => setMode(null, true);
  const openBasis = (parent: ParentKey, startMonth: string) => calculatorNavigate((params) => {
    params.set("podstawa", parent);
    params.set("miesiac", startMonth);
    params.delete("krok-podstawy");
  });
  const closeBasis = () => calculatorNavigate((params) => {
    params.delete("podstawa");
    params.delete("miesiac");
    params.delete("krok-podstawy");
  }, true);
  const useBasis = (parent: ParentKey, value: string) => {
    setBases((previous) => ({ ...previous, [parent]: value }));
    if (basisRequest) closeBasis();
    else setMode("birth");
  };

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      {event && <BackLink href={`/plan#timeline-event-${encodeURIComponent(event.id)}`}>Wróć do wydarzenia</BackLink>}
      <PageTitle>{basisRequest ? "Oblicz podstawę zasiłku" : MODES.find(([key]) => key === mode)?.[1] ?? "Kalkulatory zasiłków"}</PageTitle>
      {event && (
        <Notice>
          <p className="font-bold">{event.title}</p>
          {event.type === "salary" && <p>Sprawdź miesiąc rozpoczęcia zasiłku i wpisz wynagrodzenia uwzględniające zmianę.</p>}
          {event.type === "returnToWork" && <p>Jeśli planujesz pracować podczas urlopu rodzicielskiego, ustaw wymiar etatu dla każdego rodzica w kroku „Podział urlopu”.</p>}
          {!eventModes[event.type] && <p>Wybierz świadczenie i sprawdź, czy dane pracy i ubezpieczenia odpowiadają sytuacji po zmianie.</p>}
        </Notice>
      )}
      {mode === null && (
        <section className="flex flex-col items-start gap-3">
          <h2 ref={picker} tabIndex={-1} className="text-2xl font-bold">Co chcesz obliczyć?</h2>
          <p className="text-muted-foreground">Uzupełniliśmy dane z profilu. Możesz je zmienić w każdym kroku.</p>
          <div className="flex w-full flex-col gap-2">
            {MODES.map(([key, label]) => (
              <Button key={key} variant="outline" className="justify-start py-3 text-left" onClick={() => setMode(key)}>
                {label}
              </Button>
            ))}
          </div>
        </section>
      )}

      {mode === "birth" && !basisRequest && (
        <LeaveCalculator key="birth" draftKey={`${draftKey}/birth`} event={event?.type === "birth" || event?.type === "returnToWork" ? event : undefined} mode="birth" bases={bases} setBases={setBases} onBasis={openBasis} onBack={chooseMode} active />
      )}
      {mode === "adoption" && !basisRequest && (
        <LeaveCalculator key="adoption" draftKey={`${draftKey}/adoption`} event={event?.type === "adoption" ? event : undefined} mode="adoption" bases={bases} setBases={setBases} onBasis={openBasis} onBack={chooseMode} active />
      )}
      {mode === "pregnancy" && !basisRequest && (
        <PregnancyCalculator draftKey={`${draftKey}/pregnancy`} startDate={event?.type === "sickLeave" ? event.date : undefined} basis={bases.mother} setBasis={(v) => setBases((b) => ({ ...b, mother: v }))} onBasis={openBasis} onBack={chooseMode} active />
      )}
      {mode === "basis" && (
        <BasisCalculator key="basis" draftKey={`${draftKey}/basis`} initialParent={event?.type === "salary" && event.who !== "both" ? event.who : undefined} onUse={useBasis} onBack={chooseMode} active />
      )}
      {basisRequest && (
        <BasisCalculator key="basis-helper" draftKey={`${draftKey}/${mode}/basis/${basisRequest.parent}/${basisRequest.startMonth}`} request={basisRequest} onUse={useBasis} onBack={closeBasis} />
      )}
    </main>
  );
}
