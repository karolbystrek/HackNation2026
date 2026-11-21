"use client";

import { useState } from "react";
import { amountHint, amountPattern, CalculatorDetails, CalculatorSteps } from "./calculator-steps";
import { Button, Checkbox, Field, PillGroup, WarningBox } from "@/components/ui";
import { calcPregnancy, type PregnancyInput } from "@/lib/calc/pregnancy";
import { addDays, parseIso, toIso } from "@/lib/dates";
import type { ParentKey } from "@/lib/calc/leave";
import { formatPln, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

export function PregnancyCalculator({ basis, setBasis, onBasis, onBack, active }: {
  basis: string;
  setBasis: (v: string) => void;
  onBasis: (parent: ParentKey, startMonth: string) => void;
  onBack: () => void;
  active: boolean;
}) {
  const { persona, params, names } = useFamily();
  const mother = persona.parents.mother;
  const [form, setForm] = useState<Omit<PregnancyInput, "basis">>({
    contract: mother.contract,
    insuredFrom: mother.insuredFrom,
    sickLeaveFrom: mother.sickLeaveFrom ?? persona.fetchedAt,
    dueDate: persona.dueDate,
    employerInsolvent: false,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const r = calcPregnancy({ ...form, basis: parseAmount(basis) }, params);

  const sickLeave = parseIso(form.sickLeaveFrom);
  const steps = [
    {
      title: "Praca i ubezpieczenie",
      content: (
        <>
          <PillGroup
            label={`Forma pracy (${names.mother})`}
            value={form.contract}
            onChange={(value) => set("contract", value)}
            options={[["uop", "Umowa o pracę"], ["zlec", "Umowa zlecenie"], ["jdg", "Działalność"]]}
          />
          <Field required label="Ubezpieczenie chorobowe od" type="date" value={form.insuredFrom} onChange={(e) => set("insuredFrom", e.target.value)} />
          <CalculatorDetails label="Rozwiązanie umowy w ciąży" initiallyOpen={form.employerInsolvent}>
            <Checkbox checked={form.employerInsolvent} onChange={() => set("employerInsolvent", !form.employerInsolvent)} title="Umowę rozwiązano z powodu upadłości, likwidacji lub śmierci pracodawcy">
              Wtedy do porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego.
            </Checkbox>
          </CalculatorDetails>
        </>
      ),
    },
    {
      title: "Zwolnienie i termin porodu",
      content: (
        <>
          <Field required label="Zwolnienie (kod B) od" type="date" value={form.sickLeaveFrom} onChange={(e) => set("sickLeaveFrom", e.target.value)} />
          <Field required label="Termin porodu" type="date" min={sickLeave ? toIso(addDays(sickLeave, 1)) : undefined}
            hint="Po dacie rozpoczęcia zwolnienia" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </>
      ),
    },
    {
      title: "Kwota do obliczeń",
      content: (
        <>
          <Field required label="Podstawa zasiłku (zł)" inputMode="decimal" pattern={amountPattern} title={amountHint} maxLength={24}
            value={basis} onChange={(e) => setBasis(e.target.value)} />
          <Button variant="link" className="self-start" onClick={() => onBasis("mother", form.sickLeaveFrom.slice(0, 7))}>Oblicz z 12 miesięcy</Button>
        </>
      ),
    },
  ];

  return (
    <CalculatorSteps steps={steps} onBack={onBack} active={active} result={
      <>
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Do dnia porodu (brutto)</div>
          <div className="mt-1 mb-2.5 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.total)}</div>
          <div className="text-[15px]">
            {r.days} dni płatnego zwolnienia · {formatPln(parseAmount(basis), 2)} / mies.
          </div>
          <div className="text-sm text-brand-soft">Wypłaca: {r.payer}</div>
        </div>
        <WarningBox items={r.warnings} />
        <CalculatorDetails label="Zobacz szczegóły">
          {r.rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-line-soft py-2.5 last:border-0">
              <div className="flex justify-between gap-2 text-[15px] font-extrabold">
                <span>{row.label}</span>
                <span>{row.amount === null ? "" : formatPln(row.amount)}</span>
              </div>
              <div className="text-sm text-muted">{row.note}</div>
            </div>
          ))}
        </CalculatorDetails>
      </>
    } />
  );
}
