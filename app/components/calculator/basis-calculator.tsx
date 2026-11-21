"use client";

import { useState } from "react";
import { Button, Card, Field, PillGroup } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { PARENTS, type ParentKey } from "@/lib/calc/leave";
import { formatPln, formatRate, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function BasisCalculator({ onUse }: { onUse: (parent: ParentKey, basis: string) => void }) {
  const { persona, params, names } = useFamily();
  const [source, setSource] = useState<ParentKey | "manual">("father");
  const [incomeType, setIncomeType] = useState<"uop" | "jdg">("uop");
  const [startMonth, setStartMonth] = useState(persona.dueDate.slice(0, 7));
  const [months, setMonths] = useState(() => persona.parents.father.monthlyGross.map(String));

  const r = computeBasis(months.map(parseAmount), params);
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const firstMonth = (startYear || 2027) * 12 + ((startMon || 1) - 1) - 12;
  const basisText = r.basis.toFixed(2).replace(".", ",");

  const rows: [string, string][] = [
    [`Średnia z ${r.months} mies.`, formatPln(r.average, 2)],
    [`Minus składki ${formatRate(params.employeeContributionRate)}`, formatPln(-r.contributions, 2)],
    ["Stawka dzienna (podstawa / 30)", formatPln(r.daily, 2)],
    [`Zasiłek ${formatRate(params.rates.full)} / mies.`, formatPln(r.basis * params.rates.full, 2)],
    [`Zasiłek ${formatRate(params.rates.flat)} / mies.`, formatPln(r.basis * params.rates.flat, 2)],
    [`Zasiłek ${formatRate(params.rates.parental)} / mies.`, formatPln(r.basis * params.rates.parental, 2)],
  ];

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="flex min-w-0 flex-[1_1_420px] flex-col gap-[18px]">
        <PillGroup
          label="Skąd wziąć dane?"
          value={source}
          onChange={(v) => {
            setSource(v);
            if (v !== "manual") setMonths(persona.parents[v].monthlyGross.map(String));
          }}
          options={[...PARENTS.map((p): [ParentKey, string] => [p, `${names[p]} – z ZUS`]), ["manual", "Wpiszę ręcznie"]]}
        />
        <div className="flex flex-wrap items-end gap-4">
          <PillGroup
            label="Rodzaj przychodu"
            value={incomeType}
            onChange={setIncomeType}
            options={[
              ["uop", "Wynagrodzenie (umowa)"],
              ["jdg", "Działalność – zadeklarowana podstawa"],
            ]}
          />
          <Field label="Miesiąc startu zasiłku" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} className="flex-[1_1_160px]" />
        </div>
        <div className="flex flex-col gap-2">
          <span className="font-extrabold">
            {incomeType === "jdg" ? "Zadeklarowana podstawa składek w 12 miesiącach przed zasiłkiem" : "Wynagrodzenie brutto w 12 miesiącach przed zasiłkiem"}
          </span>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
            {months.map((value, i) => {
              const m = firstMonth + i;
              return (
                <label key={i} className="flex flex-col gap-1 text-[13px] font-bold text-muted">
                  {MONTHS[m % 12]} {Math.floor(m / 12)}
                  <input
                    inputMode="decimal"
                    value={value}
                    onChange={(e) => {
                      setMonths(months.map((x, j) => (j === i ? e.target.value : x)));
                      setSource("manual");
                    }}
                    className="min-h-11 w-full rounded-[10px] border border-stone bg-white px-2.5 text-base text-ink focus:border-brand focus:outline-none"
                  />
                </label>
              );
            })}
          </div>
        </div>
      </Card>

      <section aria-live="polite" className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5">
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Podstawa wymiaru zasiłku</div>
          <div className="mt-1 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.basis, 2)}</div>
        </div>
        <Card className="px-5 py-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 border-b border-line-soft py-2.5 text-[15px] last:border-0">
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </Card>
        <div className="flex flex-wrap gap-2">
          {PARENTS.map((p, i) => (
            <Button key={p} variant={i === 0 ? "primary" : "outline"} onClick={() => onUse(p, basisText)}>
              Użyj dla: {names[p]}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
