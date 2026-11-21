"use client";

import { useState } from "react";
import { Card, Checkbox, Field, PillGroup, WarningBox } from "@/components/ui";
import { calcPregnancy, type PregnancyInput } from "@/lib/calc/pregnancy";
import { formatPln, parseAmount } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

export function PregnancyCalculator({ basis, setBasis }: { basis: string; setBasis: (v: string) => void }) {
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

  return (
    <div className="flex flex-wrap items-start gap-5">
      <Card className="flex min-w-0 flex-[1_1_380px] flex-col gap-[18px]">
        <PillGroup
          label={`Forma pracy (${names.mother})`}
          value={form.contract}
          onChange={(v) => set("contract", v)}
          options={[
            ["uop", "Umowa o pracę"],
            ["zlec", "Umowa zlecenie"],
            ["jdg", "Działalność"],
          ]}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3 text-sm">
          <Field label="Ubezpieczenie chorobowe od" type="date" value={form.insuredFrom} onChange={(e) => set("insuredFrom", e.target.value)} />
          <Field label="Zwolnienie (kod B) od" type="date" value={form.sickLeaveFrom} onChange={(e) => set("sickLeaveFrom", e.target.value)} />
          <Field label="Termin porodu" type="date" value={form.dueDate} onChange={(e) => set("dueDate", e.target.value)} />
          <Field label="Podstawa wymiaru" inputMode="decimal" value={basis} onChange={(e) => setBasis(e.target.value)} />
        </div>
        <Checkbox checked={form.employerInsolvent} onChange={() => set("employerInsolvent", !form.employerInsolvent)} title="Umowę rozwiązano w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy">
          Wtedy do porodu przysługuje zasiłek w wysokości zasiłku macierzyńskiego.
        </Checkbox>
      </Card>

      <section aria-live="polite" className="flex min-w-0 flex-[1_1_360px] flex-col gap-3.5">
        <div className="rounded-[20px] bg-brand p-[22px] text-white">
          <div className="text-[15px] font-bold text-brand-soft">Do dnia porodu (brutto)</div>
          <div className="mt-1 mb-2.5 text-[34px] leading-tight font-black sm:text-[42px]">{formatPln(r.total)}</div>
          <div className="text-[15px]">
            {r.days} dni płatnego zwolnienia · {formatPln(parseAmount(basis), 2)} / mies.
          </div>
          <div className="text-sm text-brand-soft">Wypłaca: {r.payer}</div>
        </div>
        <Card className="flex flex-col py-2">
          {r.rows.map((row) => (
            <div key={row.label} className="flex flex-col gap-0.5 border-b border-line-soft py-2.5 last:border-0">
              <div className="flex justify-between gap-2 text-[15px] font-extrabold">
                <span>{row.label}</span>
                <span>{row.amount === null ? "" : formatPln(row.amount)}</span>
              </div>
              <div className="text-sm text-muted">{row.note}</div>
            </div>
          ))}
        </Card>
        <WarningBox items={r.warnings} />
      </section>
    </div>
  );
}
