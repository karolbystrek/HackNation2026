"use client";

import { useRouter } from "next/navigation";
import { readCustomLeave } from "@/lib/calc/variants";
import { updatePlan, usePlanDraft } from "@/lib/plan-store";
import { LeaveLanes } from "@/components/leave-lanes";
import { amountHint, amountPattern, CalculatorDetails, UrlCalculatorSteps } from "./calculator-steps";
import { Button, Card, Checkbox, Field, RadioGroup, ResultSummary, WarningBox } from "@/components/ui";
import { otherParent, PARENTS, planLeave, type LeaveInput, type ParentKey } from "@/lib/calc/leave";
import type { TimelineEvent } from "@/lib/events";
import { addDays, formatDate, parseIso } from "@/lib/dates";
import { formatPln, formatRate, formatWeeks, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

type Bases = Record<ParentKey, string>;

export function LeaveCalculator({ mode, bases, setBases, onBasis, onBack, active, event, draftKey }: {
  mode: "birth" | "adoption";
  bases: Bases;
  setBases: (b: Bases) => void;
  onBasis: (parent: ParentKey, startMonth: string) => void;
  onBack: () => void;
  active: boolean;
  draftKey: string;
  event?: TimelineEvent;
}) {
  const router = useRouter();
  const { persona, params, names, chosen, plan, fromGuide } = useFamily();
  const [form, setForm] = usePlanDraft(draftKey, {
    startDate: mode === "birth"
      ? (event?.type === "birth" ? event.date : persona.birthDate ?? persona.dueDate)
      : event?.date ?? (typeof plan.guideAnswers.placementDate === "string" && fromGuide ? plan.guideAnswers.placementDate : persona.dueDate),
    kids: fromGuide || mode === "birth" ? persona.kids : 1,
    zaZyciem: fromGuide && Array.isArray(plan.guideAnswers.special) && plan.guideAnswers.special.includes("zaZyciem"),
    adoptionType: (fromGuide && plan.guideAnswers.situation === "foster" ? "foster" : "adoption") as LeaveInput["adoptionType"],
    childBirthDate: "",
    schoolDeferred: false,
    main: (event?.type === "adoption" && event.who === "father" ? "father" : "mother") as ParentKey,
    otherWeeks: event?.type === "returnToWork" ? chosen?.result.otherWeeks ?? params.parentalOwnWeeks : params.parentalOwnWeeks,
    paternity: true,
    flatRate: persona.wantsAveragedRate ?? false,
    workFractions: { mother: 0, father: 0 },
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const input: LeaveInput = {
    ...form,
    mode,
    names,
    bases: { mother: parseAmount(bases.mother), father: parseAmount(bases.father) },
  };
  const r = planLeave(input, params);
  const adoption = mode === "adoption";
  const customLeave = !adoption && r.start === (persona.birthDate ?? persona.dueDate) &&
    !(fromGuide && plan.guideAnswers.placementDate) ? readCustomLeave(input) : undefined;
  const main = adoption ? form.main : "mother";
  const other = otherParent(main);
  const showPaternity = !adoption || form.adoptionType === "adoption";
  const kidsOptions: [number, string][] = [1, 2, 3, 4, 5].map((k) => [k, k === 5 ? "5 i więcej" : String(k)]);

  const steps = [
    ...(adoption ? [{
      title: "Rodzaj opieki",
      content: (
        <RadioGroup
          label="W jakiej sytuacji przyjmujecie dziecko?"
          value={form.adoptionType}
          onChange={(v) => set("adoptionType", v)}
          options={[
            ["adoption", "Adopcja (przysposobienie)"],
            ["foster", "Rodzina zastępcza niezawodowa"],
          ]}
        />
      ),
    }] : []),
    {
      title: adoption ? "Dane o przyjęciu dziecka" : "Dane o porodzie",
      content: (
        <>
          <Field required label={adoption ? "Data przyjęcia dziecka" : "Data porodu"} type="date"
            value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
          {adoption && (
            <Field required label="Data urodzenia dziecka" type="date" max={form.startDate || undefined}
              hint="Najpóźniej w dniu przyjęcia" value={form.childBirthDate} onChange={(e) => set("childBirthDate", e.target.value)} />
          )}
          <RadioGroup label={adoption ? "Liczba dzieci przyjętych jednocześnie" : "Liczba dzieci przy jednym porodzie"}
            value={form.kids} onChange={(v) => set("kids", v)} options={kidsOptions} />
          {adoption ? (
            form.adoptionType === "foster" && (
              <Checkbox checked={form.schoolDeferred} onChange={() => set("schoolDeferred", !form.schoolDeferred)} title="Odroczony obowiązek szkolny">
                Urlop przysługuje wtedy do {params.adoptionAgeLimit.fosterDeferred}. roku życia zamiast do {params.adoptionAgeLimit.foster}.
              </Checkbox>
            )
          ) : (
            <div>
              <Checkbox checked={form.zaZyciem} onChange={() => set("zaZyciem", !form.zaZyciem)} title="Dziecko ma zaświadczenie „Za życiem”">
                Zaświadczenie zwiększa pulę urlopu rodzicielskiego do {form.kids > 1 ? params.parentalPoolWeeks.zaZyciemMultiple : params.parentalPoolWeeks.zaZyciemSingle} tygodni.
              </Checkbox>
              <a href="https://www.gov.pl/web/rodzina/urlop-rodzicielski" className="text-link ml-8 inline-flex min-h-11 items-center">
                Zasady urlopu rodzicielskiego
              </a>
            </div>
          )}
        </>
      ),
    },
    {
      title: "Podział urlopu",
      content: (
        <>
          {adoption && (
            <RadioGroup
              label="Kto bierze urlop na warunkach urlopu macierzyńskiego?"
              value={form.main}
              onChange={(v) => set("main", v)}
              options={PARENTS.map((p) => [p, names[p]])}
            />
          )}
          <div className="space-y-1">
            <p className="text-lg font-bold">Wspólna pula urlopu rodzicielskiego: {r.pool} tyg.</p>
            <p className="text-sm text-muted-foreground">Każdy rodzic ma w tej puli {params.parentalOwnWeeks} tygodni, których nie może przekazać drugiej osobie.</p>
          </div>
          <label className="flex flex-col gap-1.5 font-bold">
            <span>Podzielcie tygodnie między siebie</span>
            <input type="range" min={0} max={r.maxOtherWeeks} step={1} value={r.otherWeeks}
              aria-valuetext={`${names[main]}: ${formatWeeks(r.mainWeeks)}, ${names[other]}: ${formatWeeks(r.otherWeeks)}`}
              onChange={(e) => set("otherWeeks", Number(e.target.value))} className="min-h-11 w-full accent-primary" />
          </label>
          <dl className="grid grid-cols-2 gap-3 bg-secondary p-3">
            {[[names[main], r.mainWeeks], [names[other], r.otherWeeks]].map(([label, weeks]) => (
              <div key={label}>
                <dt className="text-sm text-muted-foreground">{label}</dt>
                <dd className="text-lg font-bold">{weeks} tyg.</dd>
              </div>
            ))}
          </dl>

          {showPaternity && (
            <Checkbox checked={form.paternity} onChange={() => set("paternity", !form.paternity)} title={`Urlop ojcowski (${names.father})`}>
              {params.paternityWeeks * 7} dni, 100%
            </Checkbox>
          )}
          <div className="flex flex-col gap-4">
            <h3 className="font-bold">Praca podczas własnej części urlopu rodzicielskiego</h3>
            {([main, other] as const).filter((parent) => (parent === main ? r.mainWeeks : r.otherWeeks) > 0).map((parent) => (
              <RadioGroup
                key={parent}
                label={`Wymiar pracy (${names[parent]})`}
                value={form.workFractions[parent]}
                onChange={(value) => set("workFractions", { ...form.workFractions, [parent]: value })}
                options={[[0, "Bez pracy"], [0.25, "1/4 etatu"], [0.5, "1/2 etatu"]]}
              />
            ))}
          </div>
        </>
      ),
    },
    {
      title: "Podstawa i stawka zasiłku",
      content: (
        <>
          <p className="text-muted-foreground">Podstawa to kwota, od której naliczany jest zasiłek.</p>
          {PARENTS.map((parent) => (
            <div key={parent}>
              <Field required label={`Podstawa zasiłku (zł) dla ${names[parent]}`} inputMode="decimal" pattern={amountPattern}
                title={amountHint} maxLength={24} value={bases[parent]} onChange={(e) => setBases({ ...bases, [parent]: e.target.value })} />
              <Button variant="link" onClick={() => onBasis(parent, form.startDate.slice(0, 7))}>
                Oblicz z 12 miesięcy
              </Button>
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <RadioGroup
              label="Sposób wypłaty zasiłku"
              value={form.flatRate ? "flat" : "variable"}
              onChange={(value) => set("flatRate", value === "flat")}
              options={[
                ["flat", `${formatRate(params.rates.flat)} przez cały okres`],
                ["variable", `${formatRate(params.rates.full)}, potem ${formatRate(params.rates.parental)}`],
              ]}
            />
            {form.flatRate && !r.flatRateAllowed && (
              <span className="text-sm leading-snug text-foreground">
                {form.zaZyciem
                  ? "Przy „Za życiem” kalkulator liczy wariant 100% / 70%."
                  : `${formatRate(params.rates.flat)} wymaga wniosku o pełny wymiar urlopu w ciągu ${params.flatRateRequestDays} dni – przy takim podziale liczymy 100% / 70%.`}
              </span>
            )}
          </div>
        </>
      ),
    },
  ];

  return (
    <UrlCalculatorSteps steps={steps} onBack={onBack} active={active} result={
      <>
        <ResultSummary label="Szacowane zasiłki łącznie (brutto)" value={formatPln(r.familyTotal)}>
          <p>Koniec urlopów: <strong>{formatDate(r.end)}</strong></p>
          <p>{r.deadline}</p>
          <p>Prawo do zasiłku ustala ZUS lub płatnik składek.</p>
        </ResultSummary>
        <WarningBox items={r.warnings} />
        <CalculatorDetails label="Okresy i kwoty dla każdego rodzica">
          <Card className="py-[18px]">
            <LeaveLanes result={r} names={names} />
          </Card>
          {PARENTS.map((p) => (
            <div key={p} className="flex flex-col gap-2 border-t py-4">
              <div className="flex items-baseline justify-between gap-2 text-xl font-bold">
                <span>{names[p]}</span>
                <span>{formatPln(r.totals[p])}</span>
              </div>
              {r.periods[p].length === 0 && <span className="text-sm text-muted-foreground">Bez urlopu w tym planie.</span>}
              {r.periods[p].map((x) => (
                <div key={x.from + x.label} className="flex flex-col gap-0.5 border-t border-border pt-2.5">
                  <div className="flex justify-between gap-2 text-[15px] font-bold">
                    <span>{x.label}</span>
                    <span>{formatRate(x.rate)}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <p>{formatDate(x.from)} – {formatDate(addDays(parseIso(x.to)!, -1))}</p>
                    <p>{x.workFraction > 0 ? `${formatWeeks(x.weeks)} zasiłku rozłożone na ${formatWeeks(x.spanWeeks)}` : formatWeeks(x.weeks)}</p>
                  </div>
                  <div className="text-sm">
                    {formatPln(x.monthlyBenefit, 2)} / mies.
                    {x.monthlyWage > 0 && ` + ok. ${formatPln(x.monthlyWage)} pensji za ${x.workFraction === 0.5 ? "1/2" : "1/4"} etatu`}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </CalculatorDetails>
        {customLeave && <Button className="self-start" onClick={() => {
          updatePlan((state) => ({ ...state, customLeave, chosenVariant: "custom" }));
          router.push("/zadania");
        }}>Zapisz podział urlopu w planie</Button>}
      </>
    } />
  );
}
