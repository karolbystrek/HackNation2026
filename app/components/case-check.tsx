"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button, Checkbox, Field, Notice, RadioGroup, WarningBox } from "@/components/ui";
import { analyzeCase, PERIOD_LABELS } from "@/lib/cases/analyze";
import type { BenefitKind, CaseExtraction, ContractType, EventKind, PeriodKind } from "@/lib/cases/schema";
import { formatDate } from "@/lib/dates";
import { formatPln, parseAmount } from "@/lib/format";
import type { Params } from "@/lib/params";

type Sample = { id: string; label: string };
type Loaded = { extraction: CaseExtraction; cached: boolean; source: string };

const BENEFITS: [BenefitKind, string][] = [
  ["maternity", "Zasiłek macierzyński"],
  ["sickness_pregnancy", "Zasiłek chorobowy w ciąży"],
  ["equal_maternity", "Zasiłek w wysokości zasiłku macierzyńskiego"],
  ["other", "Inne"],
];
const CONTRACTS: [ContractType, string][] = [["uop", "Umowa o pracę"], ["zlec", "Umowa zlecenia"], ["jdg", "Działalność lub współpraca"], ["unknown", "Nie wiadomo"]];
const EVENTS: [EventKind, string][] = [
  ["birth", "Poród"], ["stillbirth", "Martwe urodzenie"], ["child_death", "Śmierć dziecka"], ["adoption", "Przysposobienie"],
  ["foster", "Rodzina zastępcza"], ["pregnancy", "Ciąża"], ["other", "Inne"],
];
const DOCUMENT_NAMES: Record<string, string> = {
  insurance_certificate: "Poświadczenie ubezpieczenia chorobowego",
  decision: "Decyzja lub pismo ZUS",
  birth_certificate: "Odpis aktu urodzenia",
  medical_certificate: "Zaświadczenie lekarskie",
};

/** Upload or pick a ZUS case file, let AI read it, correct the data and compare our calculation with the ZUS decision. */
export function CaseCheck({ params }: { params: Params }) {
  const [samples, setSamples] = useState<Sample[] | null>(null);
  const [sampleId, setSampleId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const selectId = useId();
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/cases").then((r) => r.json()).then((body: { samples: Sample[] }) => setSamples(body.samples)).catch(() => setSamples([]));
  }, []);

  useEffect(() => {
    if (loaded) resultHeading.current?.focus();
  }, [loaded]);

  async function read(init: RequestInit, source: string) {
    setBusy(true);
    setError(null);
    setLoaded(null);
    try {
      const response = await fetch("/api/cases/analyze", { method: "POST", ...init });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Nie udało się odczytać dokumentów.");
      setLoaded({ extraction: body.extraction, cached: body.cached, source });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Nie udało się odczytać dokumentów.");
    } finally {
      setBusy(false);
    }
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    read({ body: form }, file.name);
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-xl flex-col gap-2">
        <input
          ref={fileInput}
          id={`${selectId}-file`}
          type="file"
          accept="application/pdf"
          className="sr-only"
          tabIndex={-1}
          disabled={busy}
          onChange={(e) => { upload(e.target.files?.[0]); e.target.value = ""; }}
        />
        <Button className="self-start" disabled={busy} onClick={() => fileInput.current?.click()}>
          Wgraj dokumenty (PDF)
        </Button>
        <p className="text-sm text-muted-foreground">Na przykład decyzję ZUS, wniosek o zasiłek albo zaświadczenie od pracodawcy. Może to być jeden plik ze skanem wielu stron.</p>
      </div>

      {!!samples?.length && (
        <div className="flex max-w-xl flex-col gap-2">
          <label htmlFor={selectId} className="font-bold">Nie masz dokumentów pod ręką? Wybierz przykładową sprawę</label>
          <div className="flex flex-wrap gap-2">
            <select
              id={selectId}
              value={sampleId}
              disabled={busy}
              onChange={(e) => setSampleId(e.target.value)}
              className="min-h-11 min-w-0 grow basis-60 rounded-sm border border-input bg-background px-3 py-2"
            >
              <option value="">Wybierz sprawę</option>
              {samples.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            <Button
              variant="outline"
              disabled={busy || !sampleId}
              onClick={() => read({ headers: { "content-type": "application/json" }, body: JSON.stringify({ sampleId }) }, samples.find((s) => s.id === sampleId)?.label ?? sampleId)}
            >
              Sprawdź
            </Button>
          </div>
        </div>
      )}

      <div aria-live="polite">
        {busy && <Notice><p className="font-bold">Odczytujemy dokumenty…</p><p className="text-muted-foreground">To może potrwać do 2 minut.</p></Notice>}
        {error && <Notice className="border-destructive"><p className="font-bold">Nie udało się odczytać dokumentów</p><p>{error}</p></Notice>}
      </div>

      {loaded && (
        <CaseResult key={loaded.source} loaded={loaded} params={params} headingRef={resultHeading} />
      )}
    </div>
  );
}

function CaseResult({ loaded, params, headingRef }: { loaded: Loaded; params: Params; headingRef: React.RefObject<HTMLHeadingElement | null> }) {
  const [c, setC] = useState(loaded.extraction);
  const analysis = analyzeCase(c, params);
  const unsure = (path: string) => c.uncertain.some((u) => u === path || u.startsWith(`${path}.`) || u.startsWith(`${path}[`));
  const hint = (path: string) => (unsure(path) ? <span className="font-bold text-destructive">Odczyt niepewny, sprawdź ze skanem.</span> : undefined);
  const set = (patch: Partial<CaseExtraction>) => setC((prev) => ({ ...prev, ...patch }));
  const setEvent = (patch: Partial<CaseExtraction["event"]>) => setC((prev) => ({ ...prev, event: { ...prev.event, ...patch } }));

  return (
    <section aria-labelledby="case-result" className="flex flex-col gap-6">
      <div>
        <h3 id="case-result" ref={headingRef} tabIndex={-1} className="text-2xl font-bold">Wynik: {loaded.source}</h3>
        <p className="text-sm text-muted-foreground">
          Jeśli coś odczytaliśmy źle, popraw dane pod wynikiem, a wynik przeliczy się od razu.
        </p>
      </div>

      <Notice className={analysis.eligible ? "border-primary" : "border-destructive"}>
        <p className="text-lg font-bold">{analysis.eligible ? "Zasiłek przysługuje" : "Zasiłek nie przysługuje"}</p>
        <p>{analysis.eligibility}</p>
        {analysis.basis && (
          <p className="mt-2">
            Podstawa wymiaru: <strong>{formatPln(analysis.basis.value, 2)}</strong>
            {analysis.basis.months > 0 && ` (średnia z ${analysis.basis.months} mies. minus 13,71% składek${analysis.basis.floored ? ", podniesiona do minimum" : ""}${analysis.basis.capped ? ", z limitem podstawy dobrowolnej" : ""})`}.
            {analysis.monthly !== null && <> Zasiłek miesięcznie: <strong>{formatPln(analysis.monthly, 2)}</strong>.</>}
          </p>
        )}
      </Notice>

      {analysis.periods.length > 0 && (
        <Table caption="Okresy i kwoty" head={["Okres", "Od – do", "Dni", "Stawka", "Dziennie", "Razem"]}>
          {analysis.periods.map((p, i) => (
            <tr key={i} className="border-t">
              <th scope="row" className="py-2 pr-3 text-left font-normal">{PERIOD_LABELS[p.kind]}</th>
              <td className="py-2 pr-3 whitespace-nowrap">{formatDate(p.from)} – {formatDate(p.to)}</td>
              <td className="py-2 pr-3 text-right">{p.days}</td>
              <td className="py-2 pr-3 text-right">{Math.round(p.rate * 1000) / 10}%</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap">{formatPln(p.daily, 2)}</td>
              <td className="py-2 text-right whitespace-nowrap">{formatPln(p.total, 2)}</td>
            </tr>
          ))}
          <tr className="border-t font-bold">
            <th scope="row" colSpan={5} className="py-2 pr-3 text-left">Razem brutto</th>
            <td className="py-2 text-right whitespace-nowrap">{formatPln(analysis.total, 2)}</td>
          </tr>
        </Table>
      )}

      <WarningBox items={analysis.notes} />

      {c.decision.present && (
        <div className="flex min-w-0 flex-col gap-2">
          {analysis.comparison.length > 0 ? (
            <Table caption="Porównanie z decyzją ZUS" head={["Pozycja", "Nasze wyliczenie", "ZUS", "Wynik"]}>
              {analysis.comparison.map((row, i) => (
                <tr key={i} className="border-t">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">{row.label}</th>
                  <td className="py-2 pr-3">{row.ours}</td>
                  <td className="py-2 pr-3">{row.zus}</td>
                  <td className={row.match ? "py-2 font-bold text-primary" : "py-2 font-bold text-destructive"}>{row.match ? "Zgodne" : "Różnica"}</td>
                </tr>
              ))}
            </Table>
          ) : <p className="text-muted-foreground">W piśmie ZUS nie ma danych do porównania.</p>}
          {c.decision.reason && <p className="text-sm text-muted-foreground">Uzasadnienie ZUS: {c.decision.reason}</p>}
        </div>
      )}

      {c.documents.length > 0 && (
        <div>
          <h4 className="mb-2 text-lg font-bold">Rozpoznane dokumenty</h4>
          <ul className="list-disc space-y-1 pl-5">
            {c.documents.map((d, i) => (
              <li key={i}>{d.title || DOCUMENT_NAMES[d.kind] || d.kind} <span className="text-muted-foreground">(str. {d.pages})</span></li>
            ))}
          </ul>
        </div>
      )}

      <details className="border-y py-3">
        <summary className="min-h-11 cursor-pointer content-center text-lg font-bold">Odczytane dane – popraw, jeśli coś się nie zgadza</summary>
        <div className="mt-4 flex flex-col gap-5">
          <RadioGroup label="Świadczenie" options={BENEFITS} value={c.benefit} onChange={(benefit) => set({ benefit })} />
          <RadioGroup label="Tytuł ubezpieczenia" options={CONTRACTS} value={c.contract} onChange={(contract) => set({ contract })} />
          <RadioGroup label="Zdarzenie" options={EVENTS} value={c.event.kind} onChange={(kind) => setEvent({ kind })} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Data zdarzenia" type="date" value={c.event.date ?? ""} hint={hint("event.date")} onChange={(e) => setEvent({ date: e.target.value || null })} />
            <Field label="Data urodzenia dziecka" type="date" value={c.event.childBirthDate ?? ""} hint={hint("event.childBirthDate")} onChange={(e) => setEvent({ childBirthDate: e.target.value || null })} />
            <Field label="Liczba dzieci" type="number" min={1} max={10} value={c.event.kids} onChange={(e) => setEvent({ kids: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <Checkbox checked={c.fullLeaveDeclaration} onChange={() => set({ fullLeaveDeclaration: !c.fullLeaveDeclaration })} title="Wniosek o 81,5% za cały okres" />
          <Checkbox checked={!!c.debtOnDate} onChange={() => set({ debtOnDate: !c.debtOnDate })} title="Zadłużenie składkowe na dzień powstania prawa" />

          <PeriodsEditor title="Okresy z wniosku" periods={c.requested} unsure={unsure("requested")} onChange={(requested) => set({ requested })} />

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-bold">Ubezpieczenie chorobowe</legend>
            {hint("sickInsurance")}
            {c.sickInsurance.map((s, i) => (
              <div key={i} className="grid items-end gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
                <Field label="Od" type="date" value={s.from} onChange={(e) => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)) })} />
                <Field label="Do" type="date" value={s.to ?? ""} hint="Puste, jeśli trwa" onChange={(e) => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, to: e.target.value || null } : x)) })} />
                <Checkbox checked={s.voluntary} onChange={() => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, voluntary: !x.voluntary } : x)) })} title="Dobrowolne" />
                <Button variant="outline" onClick={() => set({ sickInsurance: c.sickInsurance.filter((_, j) => j !== i) })}>Usuń</Button>
              </div>
            ))}
            <Button variant="outline" className="self-start" onClick={() => set({ sickInsurance: [...c.sickInsurance, { from: "", to: null, voluntary: false }] })}>Dodaj okres ubezpieczenia</Button>
          </fieldset>

          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 font-bold">Podstawa wymiaru za miesiące</legend>
            {hint("basisMonths")}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {c.basisMonths.map((m, i) => (
                <Field
                  key={m.month + i}
                  label={m.month}
                  inputMode="decimal"
                  defaultValue={String(m.amount).replace(".", ",")}
                  onBlur={(e) => set({ basisMonths: c.basisMonths.map((x, j) => (j === i ? { ...x, amount: parseAmount(e.target.value) } : x)) })}
                />
              ))}
            </div>
            {c.basisMonths.length === 0 && <p className="text-muted-foreground">W dokumentach nie odczytano miesięcznych kwot.</p>}
          </fieldset>
        </div>
      </details>
    </section>
  );
}

function PeriodsEditor({ title, periods, unsure, onChange }: { title: string; periods: CaseExtraction["requested"]; unsure: boolean; onChange: (p: CaseExtraction["requested"]) => void }) {
  const kinds = Object.entries(PERIOD_LABELS) as [PeriodKind, string][];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 font-bold">{title}</legend>
      {unsure && <span className="font-bold text-destructive">Odczyt niepewny, sprawdź ze skanem.</span>}
      {periods.map((p, i) => (
        <div key={i} className="grid items-end gap-3 sm:grid-cols-[1.4fr_1fr_1fr_auto]">
          <label className="flex min-w-0 flex-col gap-1">
            <span className="font-bold">Rodzaj</span>
            <select value={p.kind} onChange={(e) => onChange(periods.map((x, j) => (j === i ? { ...x, kind: e.target.value as PeriodKind } : x)))} className="min-h-11 rounded-sm border border-input bg-background px-3 py-2">
              {kinds.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
          <Field label="Od" type="date" value={p.from} onChange={(e) => onChange(periods.map((x, j) => (j === i ? { ...x, from: e.target.value } : x)))} />
          <Field label="Do" type="date" value={p.to} onChange={(e) => onChange(periods.map((x, j) => (j === i ? { ...x, to: e.target.value } : x)))} />
          <Button variant="outline" onClick={() => onChange(periods.filter((_, j) => j !== i))}>Usuń</Button>
        </div>
      ))}
      <Button variant="outline" className="self-start" onClick={() => onChange([...periods, { kind: "maternity", from: "", to: "" }])}>Dodaj okres</Button>
    </fieldset>
  );
}

function Table({ caption, head, children }: { caption: string; head: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] border-collapse text-[15px]">
        <caption className="mb-2 text-left text-lg font-bold">{caption}</caption>
        <thead>
          <tr className="text-left text-sm text-muted-foreground">
            {head.map((h, i) => <th key={h} scope="col" className={i > 1 && head.length > 4 ? "py-1 pr-3 text-right font-normal" : "py-1 pr-3 font-normal"}>{h}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
