"use client";

import { useState } from "react";
import { LeaveLanes } from "@/components/leave-lanes";
import { Card, Checkbox, Field, PillGroup, WarningBox } from "@/components/ui";
import { otherParent, PARENTS, planLeave, type LeaveInput, type ParentKey } from "@/lib/calc/leave";
import { addDays, formatDate, parseIso } from "@/lib/dates";
import { formatPln, formatRate, formatWeeks, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

type Bases = Record<ParentKey, string>;

export function LeaveCalculator({ mode, bases, setBases, onBasisTab }: { mode: "birth" | "adoption"; bases: Bases; setBases: (b: Bases) => void; onBasisTab: () => void }) {
  const { persona, params, names } = useFamily();
  const [form, setForm] = useState({
    startDate: mode === "birth" ? persona.dueDate : "2027-06-01",
    kids: 1,
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

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        {adoption ? (
          <>
            <PillGroup
              label="Sytuacja"
              value={form.adoptionType}
              onChange={(v) => set("adoptionType", v)}
              options={[
                ["adoption", "Adopcja (przysposobienie)"],
                ["foster", "Rodzina zastępcza niezawodowa"],
              ]}
            />
            <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
              <Field label="Przyjęcie dziecka" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              <Field label="Data urodzenia dziecka" type="date" value={form.childBirthDate} onChange={(e) => set("childBirthDate", e.target.value)} />
            </div>
            <PillGroup label="Liczba dzieci przyjętych jednocześnie" value={form.kids} onChange={(v) => set("kids", v)} options={kidsOptions} />
            {form.adoptionType === "foster" && (
              <Checkbox checked={form.schoolDeferred} onChange={() => set("schoolDeferred", !form.schoolDeferred)} title="Odroczony obowiązek szkolny">
                Urlop przysługuje wtedy do {params.adoptionAgeLimit.fosterDeferred}. roku życia zamiast do {params.adoptionAgeLimit.foster}.
              </Checkbox>
            )}
            <PillGroup
              label="Kto bierze urlop na warunkach urlopu macierzyńskiego?"
              value={form.main}
              onChange={(v) => set("main", v)}
              options={PARENTS.map((p) => [p, names[p]])}
            />
          </>
        ) : (
          <>
            <Field label="Data porodu" type="date" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
            <PillGroup label="Liczba dzieci przy jednym porodzie" value={form.kids} onChange={(v) => set("kids", v)} options={kidsOptions} />
            <Checkbox checked={form.zaZyciem} onChange={() => set("zaZyciem", !form.zaZyciem)} title="Dziecko ma zaświadczenie „Za życiem”">
              Urlop rodzicielski wydłuża się do {params.parentalPoolWeeks.zaZyciemSingle} tyg. ({params.parentalPoolWeeks.zaZyciemMultiple} przy ciąży mnogiej).
            </Checkbox>
          </>
        )}

        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <div className="flex flex-wrap items-baseline justify-between gap-1.5">
            <span className="font-extrabold">Podstawa wymiaru zasiłku</span>
            <button type="button" onClick={onBasisTab} className="min-h-9 cursor-pointer text-sm font-extrabold text-brand underline">
              Policz z 12 miesięcy →
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
            {PARENTS.map((p) => (
              <Field
                key={p}
                label={<span className={`text-[13px] ${p === "mother" ? "text-brand" : "text-dad"}`}>{names[p]}</span>}
                hint={<span className="text-[13px]">z ZUS</span>}
                inputMode="decimal"
                value={bases[p]}
                onChange={(e) => setBases({ ...bases, [p]: e.target.value })}
              />
            ))}
          </div>
        </div>

        <label className="flex flex-col gap-1.5 border-t border-line-soft pt-4 font-extrabold">
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

        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
          <span className="font-extrabold">Wysokość zasiłku</span>
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

        <div className="flex flex-col gap-2 border-t border-line-soft pt-4">
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
        </div>
      </Card>

      <section aria-live="polite" className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Zasiłki łącznie (brutto)</div>
          <div className="mt-1 mb-2.5 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.familyTotal)}</div>
          <div className="text-[15px]">
            Koniec urlopów: <b>{formatDate(r.end)}</b>
          </div>
          <div className="text-sm text-brand-soft">{r.deadline}</div>
        </div>
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
        <WarningBox items={r.warnings} />
      </section>
    </div>
  );
}
