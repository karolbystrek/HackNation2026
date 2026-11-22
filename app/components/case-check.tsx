"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { amountPattern } from "@/components/calculator/calculator-steps";
import { Button, Checkbox, Field, Notice, WarningBox } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { analyzeCase, PERIOD_LABELS } from "@/lib/cases/analyze";
import type { BenefitKind, CaseExtraction, CaseSourceField, ContractType, EventKind, PeriodKind } from "@/lib/cases/schema";
import { formatDate } from "@/lib/dates";
import { formatPln, parseAmount } from "@/lib/format";
import { updatePlan, usePlanDraft } from "@/lib/plan-store";
import type { Params } from "@/lib/params";
import { DateField, MonthField } from "@/components/ui/date-field";

type Loaded = { extraction: CaseExtraction; cached: boolean; source: string; id: string; manual?: boolean };

const EMPTY_CASE: CaseExtraction = {
  benefit: "other", contract: "unknown", insuranceTitleCode: null, claimant: "other",
  event: { kind: "other", date: null, childBirthDate: null, kids: 1, zaZyciem: false, gestationWeek: null, birthWeightG: null, hospitalWeeks: null },
  documents: [], requested: [], fullLeaveDeclaration: false, sickInsurance: [],
  insuranceEnd: { date: null, reason: "none" }, debtOnDate: null, basisMonths: [],
  decision: { present: false, granted: null, reason: null, periods: [], ratePercent: null, basis: null, monthlyAmount: null },
  uncertain: [],
};

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
const validAmount = new RegExp(`^(?:${amountPattern})$`);

/** Upload a PDF or enter case data manually to check the benefit. */
export function CaseCheck({ params }: { params: Params }) {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = usePlanDraft<Loaded | null>("sprawa-odczyt", null);
  const activeRead = useRef<AbortController | null>(null);
  const resultHeading = useRef<HTMLHeadingElement>(null);
  const fileId = useId();

  useEffect(() => {
    if (loaded) resultHeading.current?.focus();
  }, [loaded]);

  useEffect(() => () => activeRead.current?.abort(), []);
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  function clearCase() {
    setPreviewUrl(null);
    updatePlan((plan) => ({ ...plan, drafts: { ...plan.drafts, "sprawa-odczyt": null, "sprawa-korekta": null, "sprawa-podstawa": "", "sprawa-podstawa-zus": false } }));
  }

  async function readPdf(uploaded: File | null) {
    setBusy(true);
    setError(null);
    clearCase();
    const controller = new AbortController();
    activeRead.current = controller;
    try {
      const sampleUrl = "/case-samples/demo-maternity.pdf";
      const form = new FormData();
      if (uploaded) {
        form.append("file", uploaded);
      } else {
        const sample = await fetch(sampleUrl, { signal: controller.signal });
        if (!sample.ok) throw new Error("Przykładowa sprawa jest niedostępna.");
        form.append("file", await sample.blob(), "demo-maternity.pdf");
      }
      const response = await fetch("/api/cases/analyze", { method: "POST", body: form, signal: controller.signal });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Nie udało się odczytać dokumentów.");
      if (controller.signal.aborted) return;
      setPreviewUrl(uploaded ? URL.createObjectURL(uploaded) : sampleUrl);
      setLoaded({ extraction: body.extraction, cached: body.cached, source: uploaded ? "Wgrany PDF" : "Fikcyjna sprawa", id: crypto.randomUUID() });
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Nie udało się odczytać dokumentów.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex max-w-xl flex-col gap-2">
        <label htmlFor={fileId} className="font-bold">Wybierz dokumenty (PDF)</label>
        <input
          id={fileId}
          type="file"
          accept="application/pdf"
          disabled={busy}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="min-h-11 min-w-0 rounded-sm border border-input bg-background px-3 py-2 file:mr-3 file:rounded-sm file:border-0 file:bg-secondary file:px-3 file:py-1 file:font-bold"
        />
        <Button className="self-start" disabled={busy || !file} onClick={() => { if (file) void readPdf(file); }}>Prześlij PDF do odczytu</Button>
      </div>

      <div aria-live="polite">
        {busy && <Notice><p className="font-bold">Odczytujemy dokumenty…</p><p className="text-muted-foreground">To może potrwać do 2 minut.</p></Notice>}
        {error && <Notice className="border-destructive"><p className="font-bold">Nie udało się odczytać dokumentów</p><p>{error}</p></Notice>}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={busy} onClick={() => readPdf(null)}>Wypróbuj fikcyjną sprawę</Button>
        <Button variant="outline" disabled={busy} onClick={() => {
          setError(null);
          clearCase();
          setLoaded({ extraction: EMPTY_CASE, source: "Dane wpisane ręcznie", id: crypto.randomUUID(), cached: false, manual: true });
        }}>Wpisz dane ręcznie</Button>
        {loaded && <Button variant="link" onClick={clearCase}>Wyczyść bieżącą sprawę</Button>}
      </div>
      {loaded && (
        <CaseResult key={loaded.id} loaded={loaded} params={params} headingRef={resultHeading} previewUrl={previewUrl} />
      )}
    </div>
  );
}

function CaseResult({ loaded, params, headingRef, previewUrl }: { loaded: Loaded; params: Params; headingRef: React.RefObject<HTMLHeadingElement | null>; previewUrl: string | null }) {
  const [c, setC] = usePlanDraft("sprawa-korekta", loaded.extraction);
  const [basisInput, setBasisInput] = usePlanDraft("sprawa-podstawa", "");
  const [decisionBasis, setDecisionBasis] = usePlanDraft("sprawa-podstawa-zus", false);
  const basisAmount = parseAmount(basisInput);
  const invalidBasis = basisInput.trim() !== "" && (!validAmount.test(basisInput) || basisAmount <= 0);
  const analysis = analyzeCase(c, params, invalidBasis ? undefined : basisAmount);
  const hasAmounts = analysis.eligible === false || (analysis.eligible === true && analysis.monthly !== null);
  const unsure = (path: string) => c.uncertain.some((u) => u === path || u.startsWith(`${path}.`) || u.startsWith(`${path}[`));
  const hint = (path: string) => (unsure(path) ? <span className="font-bold text-destructive">Odczyt niepewny, sprawdź ze skanem.</span> : undefined);
  const set = (patch: Partial<CaseExtraction>) => setC((prev) => ({ ...prev, ...patch }));
  const setEvent = (patch: Partial<CaseExtraction["event"]>) => setC((prev) => ({
    ...prev, event: { ...prev.event, ...patch }, uninsuredOnStart: patch.date === undefined ? prev.uninsuredOnStart : undefined,
  }));
  const source = (field: CaseSourceField) => {
    const pages = c.sources?.find((s) => s.field === field)?.pages ?? [];
    return previewUrl && pages.length ? (
      <a href={`${previewUrl}#page=${pages[0]}`} target="_blank" rel="noreferrer" className="text-link self-start text-sm">
        Źródło odczytu (str. {pages.join(", ")})
      </a>
    ) : null;
  };

  return (
    <section aria-labelledby="case-result" className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="case-result" ref={headingRef} tabIndex={-1} className="text-2xl font-bold">Dane do obliczenia</h3>
        <div className="flex flex-wrap gap-x-4">
          {previewUrl && <a href={previewUrl} target="_blank" rel="noreferrer" className="text-link min-h-11 content-center">Otwórz skan PDF</a>}
          <a href="#case-calculation" className="text-link min-h-11 content-center lg:hidden">Przejdź do wyniku</a>
        </div>
      </div>

      <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section aria-label={loaded.manual ? "Dane do obliczenia" : "Odczytane dane"} className="@container min-w-0">
          <div className="border-t pt-4">
            <div className="flex flex-col gap-3 pb-4">
              <div className="grid gap-3 @lg:grid-cols-2">
                <CaseSelect label="Świadczenie" options={BENEFITS} value={c.benefit} onChange={(benefit) => set({ benefit, uninsuredOnStart: undefined })} />
                <CaseSelect label="Tytuł ubezpieczenia" options={CONTRACTS} value={c.contract} onChange={(contract) => set({ contract })} />
              </div>
              {source("benefit")}
              <CaseSelect label="Zdarzenie" options={EVENTS} value={c.event.kind} onChange={(kind) => setEvent({ kind })} />
              <div className="grid gap-4 @lg:grid-cols-3">
                <DateField label="Data zdarzenia" value={c.event.date ?? ""} hint={hint("event.date")} onChange={(value) => setEvent({ date: value || null })} />
                <DateField label="Data urodzenia dziecka" value={c.event.childBirthDate ?? ""} hint={hint("event.childBirthDate")} onChange={(value) => setEvent({ childBirthDate: value || null })} />
                <Field label="Liczba dzieci" type="number" min={1} max={10} value={c.event.kids} onChange={(e) => setEvent({ kids: Math.max(1, Number(e.target.value) || 1) })} />
              </div>
              <Checkbox checked={c.fullLeaveDeclaration} onChange={() => set({ fullLeaveDeclaration: !c.fullLeaveDeclaration })} title="Wniosek o stawkę uśrednioną 81,5%" />
            </div>
          </div>
          <div className="border-t pt-4">
            <h5 className="mb-3 font-bold">Ubezpieczenie</h5>
            <div className="flex flex-col gap-3 pb-4">
              <Checkbox checked={!!c.debtOnDate} onChange={() => set({ debtOnDate: !c.debtOnDate })} title="Zadłużenie składkowe na dzień powstania prawa" />

              {(c.benefit === "equal_maternity" || c.benefit === "maternity") && <>
                <DateField label="Data ustania zatrudnienia" value={c.insuranceEnd.date ?? ""} onChange={(value) =>
                  set({ insuranceEnd: { ...c.insuranceEnd, date: value || null } })} />
                <CaseSelect label="Przyczyna ustania zatrudnienia" value={c.insuranceEnd.reason}
                  options={[["none", "Brak danych"], ["employer_insolvency", "Upadłość, likwidacja lub śmierć pracodawcy"], ["unlawful_dismissal", "Bezprawne zwolnienie w ciąży potwierdzone prawomocnym wyrokiem"], ["other", "Inna przyczyna"]]}
                  onChange={(reason) => set({ insuranceEnd: { ...c.insuranceEnd, reason } })} />
              </>}
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 font-bold">Ubezpieczenie chorobowe</legend>
                {source("sickInsurance")}
                {hint("sickInsurance")}
                {!c.sickInsurance.length && <Checkbox checked={c.uninsuredOnStart === true} onChange={() => set({ uninsuredOnStart: !c.uninsuredOnStart })}
                  title="Potwierdzony brak ubezpieczenia w dniu rozpoczęcia świadczenia" />}
                {c.sickInsurance.map((s, i) => (
                  <div key={i} className="grid items-end gap-3 @2xl:grid-cols-[1fr_1fr_auto_auto]">
                    <DateField label="Od" value={s.from} onChange={(value) => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, from: value } : x)) })} />
                    <DateField label="Do" value={s.to ?? ""} hint="Puste, jeśli trwa" onChange={(value) => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, to: value || null } : x)) })} />
                    <Checkbox checked={s.voluntary} onChange={() => set({ sickInsurance: c.sickInsurance.map((x, j) => (j === i ? { ...x, voluntary: !x.voluntary } : x)) })} title="Dobrowolne" />
                    <Button variant="outline" onClick={() => set({ sickInsurance: c.sickInsurance.filter((_, j) => j !== i) })}>Usuń</Button>
                  </div>
                ))}
                <Button variant="outline" className="self-start" onClick={() => set({ sickInsurance: [...c.sickInsurance, { from: "", to: null, voluntary: false }], uninsuredOnStart: undefined })}>Dodaj okres ubezpieczenia</Button>
                <DateField label="ZUS ustalił niepodleganie ubezpieczeniu od" value={c.notInsuredFrom ?? ""} className="max-w-sm"
                  hint="Np. umowa uznana za zawartą dla pozoru. Puste, jeśli nie ma takiego ustalenia."
                  onChange={(value) => set({ notInsuredFrom: value || null })} />
              </fieldset>
            </div>
          </div>
          <div className="border-t pt-4">
            <h5 className="mb-3 font-bold">Okresy z wniosku</h5>
            <div className="pb-4">
              {source("requested")}
              <PeriodsEditor periods={c.requested} unsure={unsure("requested")} onChange={(requested) => set({ requested, uninsuredOnStart: undefined })} />
            </div>
          </div>
          <div className="border-t pt-4">
            <h5 className="mb-3 font-bold">Podstawa wymiaru</h5>
            <Field label="Gotowa podstawa wymiaru (zł)" inputMode="decimal" value={basisInput} maxLength={24} aria-invalid={invalidBasis || undefined}
              hint={invalidBasis ? "Wpisz kwotę większą od zera, np. 4 200,50." : "Wpisz kwotę po odliczeniu składek. Jeśli zostawisz puste, wykorzystamy dane ze sprawy."}
              className="mb-4 max-w-sm" onChange={(e) => { setBasisInput(e.target.value); setDecisionBasis(false); }} />
            {!!c.decision.basis && !decisionBasis && (
              <Button variant="outline" className="mb-4" onClick={() => {
                setBasisInput(String(c.decision.basis).replace(".", ","));
                setDecisionBasis(true);
              }}>Użyj podstawy z decyzji ZUS</Button>
            )}
            <div className="mb-4">
              <Checkbox checked={c.parentalAllowanceTopUp === true} onChange={() => set({ parentalAllowanceTopUp: !c.parentalAllowanceTopUp })}
                title="ZUS podwyższa zasiłek do kwoty świadczenia rodzicielskiego">
                Pismo ZUS mówi, że zasiłek jest niższy niż {formatPln(params.parentalAllowanceMonthly)} miesięcznie.
              </Checkbox>
            </div>
            <div className="pb-4">
              <fieldset className="flex flex-col gap-3">
                <legend className="mb-1 font-bold">Kwoty za poszczególne miesiące</legend>
                {source("basisMonths")}
                {hint("basisMonths")}
                <div className="grid gap-3 @lg:grid-cols-2 @3xl:grid-cols-3">
                  {c.basisMonths.map((m, i) => (
                    // The amount input is uncontrolled (saved on blur), so rows remount from state whenever one is added or removed.
                    <div key={`${c.basisMonths.length}-${i}`} className="grid gap-2">
                      <MonthField label="Miesiąc" value={m.month}
                        onChange={(value) => set({ basisMonths: c.basisMonths.map((x, j) => j === i ? { ...x, month: value } : x) })} />
                      <Field label="Kwota podstawy lub wynagrodzenia" inputMode="decimal"
                        defaultValue={m.amount ? String(m.amount).replace(".", ",") : ""}
                        onBlur={(e) => set({ basisMonths: c.basisMonths.map((x, j) => j === i ? { ...x, amount: parseAmount(e.target.value) } : x) })} />
                      <Button variant="link" onClick={() => set({ basisMonths: c.basisMonths.filter((_, j) => j !== i) })}>Usuń miesiąc</Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="self-start" disabled={c.basisMonths.length >= 12}
                  onClick={() => set({ basisMonths: [...c.basisMonths, { month: "", amount: 0 }] })}>Dodaj miesiąc</Button>
              </fieldset>
            </div>
          </div>
        </section>
        <aside aria-labelledby="case-calculation" className="min-w-0 lg:sticky lg:top-4">
          <h4 id="case-calculation" className="mb-2 text-lg font-bold">Wynik kalkulatora</h4>
          <Notice className={analysis.eligible === null ? undefined : analysis.eligible ? "border-primary" : "border-destructive"}>
            <div aria-live="polite" className="flex flex-col gap-2">
              <p className="text-lg font-bold">{analysis.eligible === null ? "Wymaga sprawdzenia" : analysis.eligible ? "Wstępna ocena: spełniasz sprawdzane warunki" : "Wstępna ocena: warunki wymagają wyjaśnienia"}</p>
              <p>{analysis.eligibility}</p>
              <a className="text-link" href={c.benefit === "sickness_pregnancy"
                ? "https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/prawo-do-zasilku-i-okres-przyslugiwania"
                : "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/niezbedne-dokumenty"}>Sprawdź zasady w ZUS</a>
              {(analysis.basis || analysis.monthly !== null || (hasAmounts && analysis.periods.length > 0)) && <dl className="flex flex-col gap-2 border-t pt-2">
                {analysis.basis && <div><dt>{decisionBasis ? "Podstawa z decyzji ZUS (symulacja)" : "Podstawa wymiaru"}</dt><dd className="font-bold">{formatPln(analysis.basis.value, 2)}</dd></div>}
                {analysis.monthly !== null && <div><dt>Zasiłek miesięcznie</dt><dd className="font-bold">{formatPln(analysis.monthly, 2)}</dd></div>}
                {hasAmounts && analysis.periods.length > 0 && <div><dt>Razem za wskazane okresy</dt><dd className="font-bold">{formatPln(analysis.total, 2)}</dd></div>}
              </dl>}
            </div>
          </Notice>
        </aside>
      </div>

      <Disclosure className="border-y" label={<strong>Szczegóły wyliczenia i dokumenty</strong>}>
        <div className="flex min-w-0 flex-col gap-5 px-3 pb-4 sm:px-4">
          {analysis.periods.length > 0 && (
            <Table caption="Okresy i kwoty" head={["Okres", "Od – do", "Dni", "Stawka", "Dziennie", "Razem"]}>
              {analysis.periods.map((p, i) => (
                <tr key={i} className="border-t">
                  <th scope="row" className="py-2 pr-3 text-left font-normal">{PERIOD_LABELS[p.kind]}</th>
                  <td className="py-2 pr-3 whitespace-nowrap">{formatDate(p.from)} – {formatDate(p.to)}</td>
                  <td className="py-2 pr-3 text-right">{p.days}</td>
                  <td className="py-2 pr-3 text-right">{Math.round(p.rate * 1000) / 10}%</td>
                  <td className="py-2 pr-3 text-right whitespace-nowrap">{hasAmounts ? formatPln(analysis.eligible ? p.daily : 0, 2) : "–"}</td>
                  <td className="py-2 text-right whitespace-nowrap">{hasAmounts ? formatPln(p.total, 2) : "–"}</td>
                </tr>
              ))}
              <tr className="border-t font-bold">
                <th scope="row" colSpan={5} className="py-2 pr-3 text-left">Razem brutto</th>
                <td className="py-2 text-right whitespace-nowrap">{hasAmounts ? formatPln(analysis.total, 2) : "–"}</td>
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
              ) : <p className="text-muted-foreground">Na razie nie można porównać wyliczenia z decyzją ZUS.</p>}
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
          {previewUrl && <iframe src={previewUrl} title="Wgrany skan PDF" loading="lazy" className="hidden h-[70vh] w-full rounded-sm border border-border lg:block" />}
        </div>
      </Disclosure>
    </section>
  );
}

function CaseSelect<T extends string>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (value: T) => void }) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="font-bold">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="min-h-11 min-w-0 rounded-sm border border-input bg-background px-3 py-2">
        {options.map(([key, text]) => <option key={key} value={key}>{text}</option>)}
      </select>
    </label>
  );
}

function PeriodsEditor({ periods, unsure, onChange }: { periods: CaseExtraction["requested"]; unsure: boolean; onChange: (p: CaseExtraction["requested"]) => void }) {
  const kinds = Object.entries(PERIOD_LABELS) as [PeriodKind, string][];
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="sr-only">Okresy z wniosku</legend>
      {unsure && <span className="font-bold text-destructive">Odczyt niepewny, sprawdź ze skanem.</span>}
      {periods.map((p, i) => (
        <div key={i} className="grid items-end gap-3 @3xl:grid-cols-[1.4fr_1fr_1fr_auto]">
          <CaseSelect label="Rodzaj" options={kinds} value={p.kind} onChange={(kind) => onChange(periods.map((x, j) => (j === i ? { ...x, kind } : x)))} />
          <DateField label="Od" value={p.from} onChange={(value) => onChange(periods.map((x, j) => (j === i ? { ...x, from: value } : x)))} />
          <DateField label="Do" value={p.to} onChange={(value) => onChange(periods.map((x, j) => (j === i ? { ...x, to: value } : x)))} />
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
