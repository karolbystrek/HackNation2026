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
    uninsured: mother.insuredType === "uninsured" || mother.insuredType === "after_insurance",
    over50: mother.age > 50,
    payerSize: mother.payerSize,
  });
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));
  const insolvency = form.contract === "uop" && form.employerInsolvent;
  const [debt, setDebt] = usePlanDraft(`${draftKey}/zadluzenie`, "");
  const debtFromProfile = mother.contributionDebt?.date === form.sickLeaveFrom ? mother.contributionDebt?.amount : undefined;
  const debtInput = debt || (debtFromProfile === undefined ? "" : String(debtFromProfile));
  const r = calcPregnancy({ ...form, employerInsolvent: insolvency, basis: parseAmount(basis), contributionDebt: debtInput ? parseAmount(debtInput) : undefined }, params);

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
          {form.contract !== "jdg" && <RadioGroup label="Ile osób płatnik zgłasza do ubezpieczenia chorobowego?"
            value={form.payerSize ?? mother.payerSize} onChange={(value) => set("payerSize", value)}
            options={[["le20", "Do 20 osób"], ["gt20", "Powyżej 20 osób"], ["unknown", "Nie wiem"]]} />}
          <Checkbox checked={!!form.uninsured} onChange={() => set("uninsured", !form.uninsured)}
            title="Brak ubezpieczenia chorobowego" />
          {!form.uninsured && !insolvency && <Field required label="Ubezpieczenie chorobowe od" type="date" value={form.insuredFrom} onChange={(e) => set("insuredFrom", e.target.value)} />}
          {form.contract === "uop" && !form.uninsured && !insolvency && <Field label="Rok ukończenia 50 lat (jeśli dotyczy)" type="number" min={1900} max={2100}
            value={form.yearTurned50 ?? ""} onChange={(e) => set("yearTurned50", e.target.value ? Number(e.target.value) : undefined)}
            hint="Krótszy okres wynagrodzenia chorobowego obowiązuje od następnego roku." />}
          {form.contract === "uop" && <Checkbox checked={insolvency} onChange={() => set("employerInsolvent", !insolvency)}
            title="Umowa ustała w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy i nie zapewniono mi innego zatrudnienia" />}
        </>
      ),
    },
    {
      title: "Zwolnienie i termin porodu",
      content: (
        <>
          {insolvency ? <Field required label="Ostatni dzień zatrudnienia" type="date" value={form.employmentEnd ?? ""}
            onChange={(e) => set("employmentEnd", e.target.value)} /> : !form.uninsured && <Field required label="Początek zwolnienia w ciąży" hint="Jeśli na zwolnieniu brakuje kodu B, ciążę możesz potwierdzić odrębnym zaświadczeniem." type="date" value={form.sickLeaveFrom} onChange={(e) => set("sickLeaveFrom", e.target.value)} />}
          {!insolvency && !form.uninsured && <Field label="Zwolnienie ważne do (włącznie)" type="date" min={form.sickLeaveFrom}
            hint="Pozostaw puste, aby oszacować ciągłe zwolnienie do porodu."
            value={form.sickLeaveThrough ?? ""} onChange={(e) => set("sickLeaveThrough", e.target.value)} />}
          <Field required label="Termin porodu" type="date" min={!insolvency && !form.uninsured && sickLeave ? toIso(addDays(sickLeave, 1)) : undefined} value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          {form.contract === "jdg" && <Field label="Zadłużenie składkowe na dzień powstania prawa (zł)" inputMode="decimal" pattern={amountPattern}
            value={debtInput} onChange={(e) => setDebt(e.target.value)} />}
        </>
      ),
    },
    {
      title: "Podstawa zasiłku",
      content: (
        <>
          <Field required={!form.uninsured || insolvency} label="Podstawa zasiłku (zł)" inputMode="decimal" pattern={amountPattern} title={amountHint} maxLength={24}
            hint="Kwota, od której naliczany jest zasiłek." value={basis} onChange={(e) => setBasis(e.target.value)} />
          <Button variant="link" className="self-start" onClick={() => onBasis("mother", form.sickLeaveFrom.slice(0, 7))}>Oblicz z 12 miesięcy</Button>
          {!form.employerInsolvent && r.rows.some((row) => row.label.startsWith("Świadczenie rehabilitacyjne")) &&
            <Checkbox checked={!!form.simulateRehabilitation} onChange={() => set("simulateRehabilitation", !form.simulateRehabilitation)}
              title="Pokaż osobną kwotę rehabilitacyjnego przy założeniu przyznania go przez ZUS" />}
        </>
      ),
    },
  ];

  return (
    <UrlCalculatorSteps steps={steps} onBack={onBack} active={active} result={
      <>
        <ResultSummary label="Szacowana kwota świadczenia (brutto)" value={formatPln(r.total)}>
          <p>{r.days} dni objętych wyliczeniem</p>
          <p>Miesięczna podstawa zasiłku <strong>{formatPln(parseAmount(basis), 2)}</strong></p>
          <p>Prawo do zasiłku ustala ZUS lub płatnik składek.</p>
        </ResultSummary>
        <WarningBox items={r.warnings} />
        <a className="text-link" href="https://www.zus.pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/niezbedne-dokumenty">Sprawdź w ZUS, które dokumenty złożyć</a>
        <CalculatorDetails label="Świadczenie rehabilitacyjne w ciąży">
          <p>Po wyczerpaniu zasiłku chorobowego ZUS może przyznać świadczenie, jeśli nadal nie możesz pracować, a dalsze leczenie lub rehabilitacja daje szansę na odzyskanie zdolności do pracy. W ciąży stawka wynosi {params.rates.full * 100}% podstawy. Świadczenie może trwać do {params.rehabilitationMaxMonths} miesięcy.</p>
          <a className="text-link" href="https://www.zus.pl/swiadczenia/zasilki/swiadczenie-rehabilitacyjne/z-ubezpieczenia-chorobowego/niezbedne-dokumenty">Dokumenty do ZNp-7 w ZUS</a>
        </CalculatorDetails>
        <CalculatorDetails label="Składniki kwoty i płatnik">
          <p>Płatnik: {r.payer}</p>
          {form.contract === "jdg" && <a className="text-link" href="https://www.zus.pl/-/tymczasowe-przywr%C3%B3cenie-formularza-z-3b-na-profilu-p%C5%82atnika-w-zwi%C4%85zku-z-ograniczeniami-na-ezus-dla-pe%C5%82nomocnik%C3%B3w">ZUS: tymczasowa instrukcja dla pełnomocnika z rolą „Płatnik”</a>}
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
