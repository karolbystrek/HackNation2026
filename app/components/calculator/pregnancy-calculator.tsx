"use client";

import { usePlanDraft } from "@/lib/plan-store";
import { amountHint, amountPattern, CalculatorDetails, UrlCalculatorSteps } from "./calculator-steps";
import { Button, Checkbox, Field, RadioGroup, ResultSummary, WarningBox } from "@/components/ui";
import { calcPregnancy, type PregnancyInput } from "@/lib/calc/pregnancy";
import { addDays, parseIso, toIso } from "@/lib/dates";
import type { ParentKey } from "@/lib/calc/leave";
import { formatPln, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

export function PregnancyCalculator({ basis, setBasis, onBasis, onBack, active, startDate, draftKey }: {
  basis: string;
  setBasis: (v: string) => void;
  onBasis: (parent: ParentKey, startMonth: string) => void;
  onBack: () => void;
  active: boolean;
  draftKey: string;
  startDate?: string;
}) {
  const { persona, params, names } = useFamily();
  const mother = persona.parents.mother;
  const [form, setForm] = usePlanDraft<Omit<PregnancyInput, "basis">>(draftKey, {
    contract: mother.contract,
    insuredFrom: mother.insuredFrom,
    sickLeaveFrom: startDate ?? mother.sickLeaveFrom ?? persona.fetchedAt,
    dueDate: startDate ? persona.birthDate ?? persona.dueDate : persona.dueDate,
    employerInsolvent: false,
    over50: mother.age >= 50,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const r = calcPregnancy({ ...form, basis: parseAmount(basis) }, params);

  const sickLeave = parseIso(form.sickLeaveFrom);
  const steps = [
    {
      title: "Praca i ubezpieczenie",
      content: (
        <>
          <RadioGroup
            label={`Forma pracy (${names.mother})`}
            value={form.contract}
            onChange={(value) => set("contract", value)}
            options={[["uop", "Umowa o pracę"], ["zlec", "Umowa zlecenie"], ["jdg", "Działalność"]]}
          />
          <Field required label="Ubezpieczenie chorobowe od" type="date" value={form.insuredFrom} onChange={(e) => set("insuredFrom", e.target.value)} />
          <Checkbox checked={form.employerInsolvent} onChange={() => set("employerInsolvent", !form.employerInsolvent)}
            title="Umowę rozwiązano w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy" />
        </>
      ),
    },
    {
      title: "Zwolnienie i termin porodu",
      content: (
        <>
          <Field required label="Zwolnienie (kod B) od" type="date" value={form.sickLeaveFrom} onChange={(e) => set("sickLeaveFrom", e.target.value)} />
          {!form.employerInsolvent && <Field label="Zwolnienie ważne do (włącznie)" type="date" min={form.sickLeaveFrom}
            hint="Pozostaw puste, aby oszacować ciągłe zwolnienie do porodu."
            value={form.sickLeaveThrough ?? ""} onChange={(e) => set("sickLeaveThrough", e.target.value)} />}
          <Field required label="Termin porodu" type="date" min={sickLeave ? toIso(addDays(sickLeave, 1)) : undefined}
            hint="Po dacie rozpoczęcia zwolnienia" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
        </>
      ),
    },
    {
      title: "Podstawa zasiłku",
      content: (
        <>
          <Field required label="Podstawa zasiłku (zł)" inputMode="decimal" pattern={amountPattern} title={amountHint} maxLength={24}
            hint="Kwota, od której naliczany jest zasiłek." value={basis} onChange={(e) => setBasis(e.target.value)} />
          <Button variant="link" className="self-start" onClick={() => onBasis("mother", form.sickLeaveFrom.slice(0, 7))}>Oblicz z 12 miesięcy</Button>
        </>
      ),
    },
  ];

  return (
    <UrlCalculatorSteps steps={steps} onBack={onBack} active={active} result={
      <>
        <ResultSummary label="Szacowana kwota do dnia porodu (brutto)" value={formatPln(r.total)}>
          <p>{r.days} dni płatnego zwolnienia</p>
          <p>Miesięczna podstawa zasiłku <strong>{formatPln(parseAmount(basis), 2)}</strong></p>
          <p>Prawo do zasiłku ustala ZUS lub płatnik składek.</p>
        </ResultSummary>
        <WarningBox items={r.warnings} />
        <CalculatorDetails label="Składniki kwoty i płatnik">
          <p>Wypłaca: {r.payer}</p>
          {r.rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-border py-2.5 last:border-0">
              <div className="flex justify-between gap-2 text-[15px] font-bold">
                <span>{row.label}</span>
                <span>{row.amount === null ? "" : formatPln(row.amount)}</span>
              </div>
              <div className="text-sm text-muted-foreground">{row.note}</div>
            </div>
          ))}
        </CalculatorDetails>
      </>
    } />
  );
}
