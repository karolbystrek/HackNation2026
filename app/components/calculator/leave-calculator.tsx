"use client";

import { useState } from "react";
import { LeaveLanes } from "@/components/leave-lanes";
import { amountHint, amountPattern, CalculatorDetails, CalculatorSteps } from "./calculator-steps";
import { Button, Card, Checkbox, Field, PillGroup, WarningBox } from "@/components/ui";
import { otherParent, PARENTS, planLeave, type LeaveInput, type ParentKey } from "@/lib/calc/leave";
import { addDays, formatDate, parseIso } from "@/lib/dates";
import { formatPln, formatRate, formatWeeks, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

type Bases = Record<ParentKey, string>;

export function LeaveCalculator({ mode, bases, setBases, onBasis, onBack, active }: {
  mode: "birth" | "adoption";
  bases: Bases;
  setBases: (b: Bases) => void;
  onBasis: (parent: ParentKey, startMonth: string) => void;
  onBack: () => void;
  active: boolean;
}) {
  const { persona, params, names } = useFamily();
  const [form, setForm] = useState({
    startDate: mode === "birth" ? persona.dueDate : "2027-06-01",
    kids: mode === "birth" ? persona.kids : 1,
    zaZyciem: false,
    adoptionType: "adoption" as LeaveInput["adoptionType"],
    childBirthDate: "2023-02-10",
    schoolDeferred: false,
    main: "mother" as ParentKey,
    otherWeeks: params.parentalOwnWeeks,
    paternity: true,
    flatRate: false,
    workingParent: null as ParentKey | null,
    workFraction: 0.5,
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
  const main = adoption ? form.main : "mother";
  const other = otherParent(main);
  const showPaternity = !adoption || form.adoptionType === "adoption";
  const kidsOptions: [number, string][] = [1, 2, 3, 4, 5].map((k) => [k, k === 5 ? "5 i więcej" : String(k)]);

  const steps = [
    ...(adoption ? [{
      title: "Rodzaj opieki",
      content: (
        <PillGroup
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
          <PillGroup label={adoption ? "Liczba dzieci przyjętych jednocześnie" : "Liczba dzieci przy jednym porodzie"}
            value={form.kids} onChange={(v) => set("kids", v)} options={kidsOptions} />
          {adoption ? (
            form.adoptionType === "foster" && (
              <Checkbox checked={form.schoolDeferred} onChange={() => set("schoolDeferred", !form.schoolDeferred)} title="Odroczony obowiązek szkolny">
                Urlop przysługuje wtedy do {params.adoptionAgeLimit.fosterDeferred}. roku życia zamiast do {params.adoptionAgeLimit.foster}.
              </Checkbox>
            )
          ) : (
            <CalculatorDetails label="Zaświadczenie „Za życiem”" initiallyOpen={form.zaZyciem}>
              <Checkbox checked={form.zaZyciem} onChange={() => set("zaZyciem", !form.zaZyciem)} title="Dziecko ma zaświadczenie „Za życiem”">
                Urlop rodzicielski wydłuża się do {params.parentalPoolWeeks.zaZyciemSingle} tyg. ({params.parentalPoolWeeks.zaZyciemMultiple} przy ciąży mnogiej).
              </Checkbox>
            </CalculatorDetails>
          )}
        </>
      ),
    },
    {
      title: "Podział urlopu",
      content: (
        <>
          {adoption && (
            <PillGroup
              label="Kto bierze urlop na warunkach urlopu macierzyńskiego?"
              value={form.main}
              onChange={(v) => set("main", v)}
              options={PARENTS.map((p) => [p, names[p]])}
            />
          )}
          <label className="flex flex-col gap-1.5 font-extrabold">
            <span>
              {names[other]} bierze z urlopu rodzicielskiego: {r.otherWeeks} tyg.
            </span>
            <input type="range" min={0} max={r.maxOtherWeeks} step={1} value={r.otherWeeks} onChange={(e) => set("otherWeeks", Number(e.target.value))} className="min-h-11 w-full accent-dad" />
            <span className="text-sm font-normal text-muted">
              {names[main]}: {r.mainWeeks} tyg. · {names[other]}: {r.otherWeeks} tyg. · pula {r.pool} tyg., po {params.parentalOwnWeeks} tyg. tylko dla każdego
            </span>
          </label>

          {showPaternity && (
            <Checkbox checked={form.paternity} onChange={() => set("paternity", !form.paternity)} title={`Urlop ojcowski (${names.father})`} accent="dad">
              {params.paternityWeeks * 7} dni, 100%
            </Checkbox>
          )}
          <CalculatorDetails label="Praca na część etatu podczas urlopu" initiallyOpen={!!form.workingParent}>
            <PillGroup
              label="Praca w trakcie urlopu rodzicielskiego"
              value={form.workingParent ?? "none"}
              onChange={(v) => set("workingParent", v === "none" ? null : v)}
              options={[["none", "Nikt nie pracuje"], ...PARENTS.map((p): [ParentKey, string] => [p, `${names[p]} pracuje`])]}
            />
            {form.workingParent && (
              <PillGroup
                value={form.workFraction}
                onChange={(v) => set("workFraction", v)}
                options={[
                  [0.25, "1/4 etatu"],
                  [0.5, "1/2 etatu"],
                ]}
              />
            )}
          </CalculatorDetails>
        </>
      ),
    },
    {
      title: "Kwoty do obliczeń",
      content: (
        <>
          {PARENTS.map((parent) => (
            <div key={parent}>
              <Field required label={`Podstawa zasiłku (zł) · ${names[parent]}`} inputMode="decimal" pattern={amountPattern}
                title={amountHint} maxLength={24} value={bases[parent]} onChange={(e) => setBases({ ...bases, [parent]: e.target.value })} />
              <Button variant="link" onClick={() => onBasis(parent, form.startDate.slice(0, 7))}>
                Oblicz z 12 miesięcy · {names[parent]}
              </Button>
            </div>
          ))}
          <div className="flex flex-col gap-2">
            <span className="font-extrabold">Sposób wypłaty zasiłku</span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  [true, `${formatRate(params.rates.flat)} przez cały okres`],
                  [false, `${formatRate(params.rates.full)}, potem ${formatRate(params.rates.parental)}`],
                ] as const
              ).map(([flat, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={r.flatRateApplied === flat}
                  onClick={() => set("flatRate", flat)}
                  className={`min-h-11 cursor-pointer rounded-full px-4 font-extrabold ${r.flatRateApplied === flat ? "border-2 border-ink bg-ink text-white" : "border border-stone bg-white"} ${flat && !r.flatRateAllowed ? "opacity-50" : ""}`}
                >
                  {label}
                </button>
              ))}
            </div>
            {form.flatRate && !r.flatRateAllowed && (
              <span className="text-sm leading-snug text-warn">
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
    <CalculatorSteps steps={steps} onBack={onBack} active={active} result={
      <>
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Zasiłki łącznie (brutto)</div>
          <div className="mt-1 mb-2.5 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.familyTotal)}</div>
          <div className="text-[15px]">
            Koniec urlopów: <b>{formatDate(r.end)}</b>
          </div>
          <div className="text-sm text-brand-soft">{r.deadline}</div>
        </div>
        <WarningBox items={r.warnings} />
        <CalculatorDetails label="Zobacz szczegóły">
          <Card className="py-[18px]">
            <LeaveLanes result={r} names={names} />
          </Card>
          {PARENTS.map((p) => (
            <div key={p} className={`flex flex-col gap-2 rounded-[20px] border-t-[6px] bg-white px-5 py-[18px] ${p === "mother" ? "border-brand" : "border-dad"}`}>
              <div className="flex items-baseline justify-between gap-2 text-xl font-black">
                <span>{names[p]}</span>
                <span>{formatPln(r.totals[p])}</span>
              </div>
              {r.periods[p].length === 0 && <span className="text-sm text-muted">Bez urlopu w tym planie.</span>}
              {r.periods[p].map((x) => (
                <div key={x.from + x.label} className="flex flex-col gap-0.5 border-t border-line-soft pt-2.5">
                  <div className="flex justify-between gap-2 text-[15px] font-extrabold">
                    <span>{x.label}</span>
                    <span>{formatRate(x.rate)}</span>
                  </div>
                  <div className="text-sm text-muted">
                    {formatDate(x.from)} – {formatDate(addDays(parseIso(x.to)!, -1))} · {x.workFraction > 0 ? `${formatWeeks(x.weeks)} zasiłku rozłożone na ${formatWeeks(x.spanWeeks)}` : formatWeeks(x.weeks)}
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
      </>
    } />
  );
}
