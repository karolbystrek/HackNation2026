"use client";

import { useState } from "react";
import { amountHint, amountPattern, CalculatorDetails, CalculatorSteps } from "./calculator-steps";
import { Button, Field, PillGroup } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { PARENTS, type ParentKey } from "@/lib/calc/leave";
import { formatPln, formatRate, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function BasisCalculator({ onUse, onBack, active, request }: {
  onUse: (parent: ParentKey, basis: string) => void;
  onBack: () => void;
  active?: boolean;
  request?: { parent: ParentKey; startMonth: string };
}) {
  const { persona, params, names } = useFamily();
  const initialParent = request?.parent ?? "father";
  const [source, setSource] = useState<ParentKey | "manual">(initialParent);
  const [incomeType, setIncomeType] = useState<"uop" | "jdg">(persona.parents[initialParent].contract === "jdg" ? "jdg" : "uop");
  const [startMonth, setStartMonth] = useState(request?.startMonth || persona.dueDate.slice(0, 7));
  const [months, setMonths] = useState(() => persona.parents[initialParent].monthlyGross.map(String));

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

  const incomeFields = months.map((value, i) => {
    const month = firstMonth + i;
    return (
      <Field
        key={i}
        label={`${MONTHS[month % 12]} ${Math.floor(month / 12)}`}
        inputMode="decimal"
        value={value}
        pattern={amountPattern}
        title={amountHint}
        required={i === 0 && !months.some((amount) => amount.trim())}
        maxLength={24}
        onChange={(event) => setMonths(months.map((amount, index) => index === i ? event.target.value : amount))}
      />
    );
  });

  const steps = [
    {
      title: "Dane do obliczenia podstawy",
      content: (
        <>
          <PillGroup
            label="Skąd wziąć dane?"
            value={source}
            onChange={(value) => {
              if (value === source) return;
              setSource(value);
              if (value === "manual") {
                setMonths(Array.from({ length: 12 }, () => ""));
              } else {
                setMonths(persona.parents[value].monthlyGross.map(String));
                setIncomeType(persona.parents[value].contract === "jdg" ? "jdg" : "uop");
              }
            }}
            options={[...PARENTS.map((p): [ParentKey, string] => [p, `${names[p]} – z ZUS`]), ["manual", "Wpiszę ręcznie"]]}
          />
          <PillGroup
            label="Rodzaj przychodu"
            value={incomeType}
            onChange={setIncomeType}
            options={[["uop", "Wynagrodzenie (umowa)"], ["jdg", "Działalność – zadeklarowana podstawa"]]}
          />
          <Field required label="Miesiąc startu zasiłku" type="month" value={startMonth} onChange={(e) => setStartMonth(e.target.value)} />
        </>
      ),
    },
    {
      title: "Przychody z 12 miesięcy",
      content: (
        <>
          <p className="text-muted">
            {incomeType === "jdg" ? "Zadeklarowana podstawa składek" : "Wynagrodzenie brutto"} w miesiącach przed rozpoczęciem zasiłku.
          </p>
          {source === "manual" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{incomeFields}</div>
          ) : (
            <>
              <p>{names[source]} · {formatPln(r.average, 2)} średnio miesięcznie</p>
              <CalculatorDetails label="Sprawdź lub zmień kwoty" initiallyOpen={months.some((value, i) => value !== String(persona.parents[source].monthlyGross[i]))}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{incomeFields}</div>
              </CalculatorDetails>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <CalculatorSteps steps={steps} calculate="Oblicz podstawę" backFromResult={request ? "Wróć bez użycia kwoty" : undefined} onBack={onBack} active={active} result={
      <div className="flex flex-col gap-4">
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Podstawa wymiaru zasiłku</div>
          <div className="mt-1 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.basis, 2)}</div>
        </div>
        <CalculatorDetails label="Zobacz szczegóły">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 border-b border-line-soft py-2.5 text-[15px] last:border-0">
              <span>{label}</span>
              <b>{value}</b>
            </div>
          ))}
        </CalculatorDetails>
        <div className="flex flex-wrap gap-2">
          {(request ? [request.parent] : PARENTS).map((p, i) => (
            <Button key={p} variant={i === 0 ? "primary" : "outline"} onClick={() => onUse(p, basisText)}>
              {request ? "Użyj tej kwoty" : `Użyj dla ${names[p]}`}
            </Button>
          ))}
        </div>
      </div>
    } />
  );
}
