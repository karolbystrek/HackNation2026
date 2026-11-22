"use client";

import { usePlanDraft } from "@/lib/plan-store";
import { amountHint, amountPattern, CalculatorDetails, UrlCalculatorSteps } from "./calculator-steps";
import { Button, Field, RadioGroup, ResultSummary } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { PARENTS, type ParentKey } from "@/lib/calc/leave";
import { formatPln, formatRate, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";
import { MonthField } from "@/components/ui/date-field";

const MONTHS = ["sty", "lut", "mar", "kwi", "maj", "cze", "lip", "sie", "wrz", "paź", "lis", "gru"];

export function BasisCalculator({ onUse, onBack, active, request, initialParent = "father", draftKey }: {
  onUse: (parent: ParentKey, basis: string) => void;
  onBack: () => void;
  active?: boolean;
  draftKey: string;
  initialParent?: ParentKey;
  request?: { parent: ParentKey; startMonth: string };
}) {
  const { persona, params, names } = useFamily();
  const parent = request?.parent ?? initialParent;
  const [source, setSource] = usePlanDraft<ParentKey | "manual">(`${draftKey}/source`, parent);
  const [incomeType, setIncomeType] = usePlanDraft(`${draftKey}/incomeType`, persona.parents[parent].contract);
  const [startMonth, setStartMonth] = usePlanDraft(`${draftKey}/startMonth`, request?.startMonth || persona.dueDate.slice(0, 7));
  const [months, setMonths] = usePlanDraft(`${draftKey}/months`, persona.parents[parent].monthlyGross.map(String));
  const [employmentPercent, setEmploymentPercent] = usePlanDraft(`${draftKey}/etat`, "100");

  const r = computeBasis(months.map(parseAmount), params, incomeType, Number(employmentPercent) / 100);
  const [startYear, startMon] = startMonth.split("-").map(Number);
  const firstMonth = (startYear || 2027) * 12 + ((startMon || 1) - 1) - 12;
  const basisText = r.basis.toFixed(2).replace(".", ",");

  const rows: [string, string][] = [
    [`Średnia z ${r.months} mies.`, formatPln(r.average, 2)],
    [`Minus składki ${formatRate(params.employeeContributionRate)}`, formatPln(-r.contributions, 2)],
    ...(r.floored ? [["Podniesiono do minimum dla wymiaru etatu", formatPln(r.basis, 2)] as [string, string]] : []),
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
          <RadioGroup
            label="Skąd wziąć dane?"
            value={source}
            onChange={(value) => {
              if (value === source) return;
              setSource(value);
              if (value === "manual") {
                setMonths(Array.from({ length: 12 }, () => ""));
              } else {
                setMonths(persona.parents[value].monthlyGross.map(String));
                setIncomeType(persona.parents[value].contract);
                setEmploymentPercent("100");
              }
            }}
            options={[...PARENTS.map((p): [ParentKey, string] => [p, `${names[p]} – z ZUS`]), ["manual", "Wpiszę ręcznie"]]}
          />
          <RadioGroup
            label="Rodzaj przychodu"
            value={incomeType}
            onChange={setIncomeType}
            options={[["uop", "Umowa o pracę"], ["zlec", "Umowa zlecenie"], ["jdg", "Działalność – zadeklarowana podstawa"]]}
          />
          {incomeType === "uop" && <Field required label="Wymiar etatu (%)" type="number" min={0.01} max={100} step="any"
            hint="Podaj np. 50 dla połowy etatu." value={employmentPercent} onChange={(e) => setEmploymentPercent(e.target.value)} />}
          <MonthField required label="Miesiąc startu zasiłku" value={startMonth} onChange={(value) => setStartMonth(value)} />
        </>
      ),
    },
    {
      title: "Przychody z 12 miesięcy",
      content: (
        <>
          <p className="text-muted-foreground">
            {incomeType === "jdg" ? "Zadeklarowana podstawa składek" : "Wynagrodzenie brutto"} w miesiącach przed rozpoczęciem zasiłku.
          </p>
          {source === "manual" ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{incomeFields}</div>
          ) : (
            <>
              <p>Średnio miesięcznie ({names[source]}) <strong>{formatPln(r.average, 2)}</strong></p>
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
    <UrlCalculatorSteps stepParam={request ? "krok-podstawy" : "krok"} steps={steps} calculate="Oblicz podstawę" backFromResult={request ? "Wróć bez użycia kwoty" : undefined} onBack={onBack} active={active} result={
      <div className="flex flex-col gap-4">
        <ResultSummary label="Podstawa wymiaru zasiłku" value={formatPln(r.basis, 2)} />
        <CalculatorDetails label="Jak obliczyliśmy podstawę">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2 border-b border-border py-2.5 text-[15px] last:border-0">
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
