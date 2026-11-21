"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeaveLanes } from "@/components/leave-lanes";
import { BackLink, Button, Card, Chip, PageBand, WarningBox } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function VariantsPage() {
  return <Suspense><Variants /></Suspense>;
}

function Variants() {
  const { persona, params, variants, plan, names } = useFamily();
  const router = useRouter();
  const query = useSearchParams();
  const fromTasks = query.get("z") === "zadania";
  const event = plan.events.find((item) => item.id === query.get("wydarzenie"));
  const returnHref = fromTasks ? "/zadania" : event ? `/plan#timeline-event-${encodeURIComponent(event.id)}` : "/plan";

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        crumbs={[["Strona główna", "/"], ["Oś czasu", "/plan"], ["Warianty urlopu"]]}
        title="Narodziny dziecka: kto idzie na urlop?"
        lead="Porównaj podział urlopu i kwoty zasiłków. „Tracicie” to różnica między podstawą zasiłku a zasiłkiem, przed podatkiem."
      />
      <div className="page">
      <BackLink href={returnHref}>{fromTasks ? "Wróć do zadań" : event ? "Wróć do wydarzenia" : "Wróć do osi czasu"}</BackLink>

      {variants.map((v) => {
        const active = plan.chosenVariant === v.key;
        return (
          <Card key={v.key} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="grow"><p className="text-sm text-muted-foreground">{v.key === "custom" ? "Z kalkulatora" : `Wariant ${v.key}`}</p><h2 className="text-[22px] font-bold">{v.name}</h2></div>
              <Chip>{v.tag}</Chip>
            </div>

            <LeaveLanes
              result={v.result}
              names={names}
              endLabel={`${names[v.lastReturn.who]} wraca ${formatDate(v.lastReturn.date)}`}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {[
                ["Tracicie względem pensji", `ok. ${formatPln(Math.round(v.incomeLoss / 10) * 10)}`],
                ["Zasiłki łącznie", `ok. ${formatPln(Math.round(v.result.familyTotal / 10) * 10)}`],
                ["Dziecko pod opieką rodzica", `${v.childcareWeeks} tyg.`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm bg-secondary px-3.5 py-3">
                  <div className="text-[13px] text-muted-foreground">{label}</div>
                  <div className="text-xl font-bold sm:text-2xl">{value}</div>
                </div>
              ))}
            </div>

            <ul className="flex flex-col gap-1.5">
              {v.points.map((pt) => (
                <li key={pt.text} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <span className="w-5 shrink-0 text-center font-bold text-primary">{pt.sign}</span>
                  <span>{pt.text}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={active ? "primary" : "outline"}
              className="min-h-[50px] self-start"
              onClick={() => {
                updatePlan((s) => ({ ...s, chosenVariant: v.key }));
                router.push("/zadania");
              }}
            >
              {active ? "Przejdź do zadań" : v.key === "custom" ? "Wybierz plan z kalkulatora" : `Wybierz wariant ${v.key} i przejdź do zadań`}
            </Button>
          </Card>
        );
      })}

      <WarningBox
        items={[
          `Każde z Was ma ${params.parentalOwnWeeks} tygodni urlopu rodzicielskiego tylko dla siebie. Jeśli ich nie wykorzystacie, przepadają – nie można ich przekazać drugiemu rodzicowi.`,
          `Termin porodu ${formatDate(persona.dueDate)} – daty urlopów przesuną się razem z faktyczną datą urodzenia.`,
        ]}
      />
    </div>
    </main>
  );
}
