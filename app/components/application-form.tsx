"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CalculatorSteps } from "@/components/calculator/calculator-steps";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { BackLink, Button, ButtonLink, Checkbox, Field, Notice, PageBand, RadioGroup, WarningBox } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formContext, type FormContext } from "@/lib/forms/context";
import { prefill } from "@/lib/forms/prefill";
import { fieldState, formSteps, isFilled, requiredAttachments, validate, type Issue } from "@/lib/forms/rules";
import {
  ATTACHMENTS_STEP, ZUS_TEMPLATES, attachmentKey, type Child, type DateRange, type FieldValue, type FormField, type FormSpec,
  type FormValues, type Person,
} from "@/lib/forms/spec";
import { submitApplication, usePlanDraft, type Submission } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

const inputClass = "min-h-11 w-full min-w-0 rounded-sm border border-input bg-background px-3 py-2 aria-invalid:border-destructive";
const sentFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Warsaw" });

export function ApplicationForm({ specs }: { specs: Record<string, FormSpec> }) {
  const { taskId } = useParams<{ taskId: string }>();
  const origin = useSearchParams().get("z");
  const returnHref = origin === "wnioski" ? "/wnioski" : origin === "zadania" ? "/zadania" : `/plan#timeline-${taskId}`;
  const returnLabel = origin === "wnioski" ? "Wróć do wniosków" : origin === "zadania" ? "Wróć do zadań" : "Wróć do planu";
  const parentCrumb: [string, string] = origin === "wnioski" ? ["Wnioski", "/wnioski"] : origin === "zadania" ? ["Do zrobienia", "/zadania"] : ["Oś czasu", "/plan"];
  const { persona, plan, params, today } = useFamily();
  const found = useMemo(
    () => formContext(persona, plan.events, plan.chosenVariant, params, plan.doneTasks, today, taskId, plan.guideAnswers, plan.customLeave),
    [persona, plan.events, plan.chosenVariant, params, plan.doneTasks, today, taskId, plan.guideAnswers, plan.customLeave],
  );

  if (!found) {
    return (
      <main id="main-content" tabIndex={-1} className="flex flex-col">
        <PageBand crumbs={[["Strona główna", "/"], parentCrumb, ["Wniosek"]]} title="Nie znaleziono wniosku" lead="Ten krok planu nie ma wniosku do wypełnienia." />
        <div className="page"><BackLink href={returnHref}>{returnLabel}</BackLink></div>
      </main>
    );
  }

  const spec = specs[found.entry.form!];
  const submission = plan.submissions[taskId];
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        crumbs={[["Strona główna", "/"], parentCrumb, [found.entry.title]]}
        title={found.entry.title}
        lead={<>
          <span className="block">Formularz: {spec.title}</span>
          <span className="block">Adresat: {found.ctx.recipientName}</span>
          {!submission && <span className="mt-2 block text-base">Sprawdź dane przeniesione do formularza z planu i uzupełnij brakujące pola. Szkic zostanie w tej karcie.</span>}
        </>}
      />
      <div className="page">
      <BackLink href={returnHref}>{returnLabel}</BackLink>
      {submission
        ? <Submitted spec={spec} ctx={found.ctx} submission={submission} doneTasks={plan.doneTasks} returnHref={returnHref} returnLabel={returnLabel} />
        : <Wizard key={taskId} spec={spec} ctx={found.ctx} doneTasks={plan.doneTasks} returnHref={returnHref} returnLabel={returnLabel} />}
    </div>
    </main>
  );
}

function Wizard({ spec, ctx, doneTasks, returnHref, returnLabel }: { spec: FormSpec; ctx: FormContext; doneTasks: string[]; returnHref: string; returnLabel: string }) {
  const router = useRouter();
  const [values, setValues] = usePlanDraft(`wniosek/${ctx.taskId}/${spec.id}`, prefill(spec, ctx));
  const [step, setStep] = useState(0);
  const [navigated, setNavigated] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<number[]>([]);
  const [sendError, setSendError] = useState<Issue[] | null>(null);
  const [sending, setSending] = useState(false);
  const summaryRef = useRef<HTMLDivElement>(null);

  const steps = formSteps(spec, ctx, values);
  const attachments = requiredAttachments(spec, ctx, values);
  const { errors, warnings } = validate(spec, values, ctx);
  const keysOf = (i: number) => [
    ...steps[i].fields.map((f) => f.key),
    ...(steps[i].title === ATTACHMENTS_STEP ? attachments.map((a) => attachmentKey(a.id)) : []),
  ];
  const stepOfKey = (key: string) => Math.max(0, steps.findIndex((_, i) => keysOf(i).includes(key)));
  const errorFor = (key: string, i: number) => (checkedSteps.includes(i) ? errors.find((e) => e.field === key)?.message : undefined);
  const set = (key: string) => (value: FieldValue) => setValues((prev) => ({ ...prev, [key]: value }));
  const goTo = (i: number) => {
    setNavigated(true);
    setStep(i);
  };

  function checkStep(i: number) {
    setCheckedSteps((prev) => (prev.includes(i) ? prev : [...prev, i]));
    const first = errors.find((e) => keysOf(i).includes(e.field));
    if (first) requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-field="${first.field}"] :is(input, textarea)`)?.focus());
    return !first;
  }

  async function send() {
    if (errors.length) {
      summaryRef.current?.focus();
      return;
    }
    setSending(true);
    setSendError(null);
    try {
      const response = await fetch("/api/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskId: ctx.taskId, personaId: ctx.persona.id, chosenVariant: ctx.chosen?.key ?? null,
          events: ctx.events, guideAnswers: ctx.guideAnswers, customLeave: ctx.customLeave, doneTasks, values,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setSendError(data.errors ?? [{ field: "", message: "Nie udało się wysłać wniosku. Spróbuj ponownie." }]);
        return;
      }
      submitApplication(ctx.taskId, { number: data.number, sentAt: data.sentAt, recipient: data.recipient, channel: data.channel, values });
      window.scrollTo({ top: 0 });
    } catch {
      setSendError([{ field: "", message: "Brak połączenia. Spróbuj ponownie za chwilę." }]);
    } finally {
      setSending(false);
    }
  }

  const issues = sendError ?? errors;
  return (
    <CalculatorSteps
      step={step}
      onStepChange={goTo}
      onStepSubmit={checkStep}
      active={navigated}
      calculate="Sprawdź wniosek"
      resultTitle="Sprawdź przed symulacją"
      backFromResult={returnLabel}
      onBack={() => router.push(returnHref)}
      steps={steps.map((s, i) => ({
        title: s.title,
        content: (
          <>
            {s.title === ATTACHMENTS_STEP && attachments.map((a) => (
              <div key={a.id} data-field={attachmentKey(a.id)}>
                <Checkbox checked={values[attachmentKey(a.id)] === true} onChange={() => set(attachmentKey(a.id))(values[attachmentKey(a.id)] !== true)} title={`Dołączam: ${a.title}`}>
                  {a.note ?? (ctx.recipient === "employer" ? "Dokument przekazujesz pracodawcy razem z wnioskiem." : "Do wniosku elektronicznego dodajesz skan lub zdjęcie dokumentu.")}
                </Checkbox>
                <FieldError message={errorFor(attachmentKey(a.id), i)} />
              </div>
            ))}
            {s.fields.map((field) => (
              <FieldInput
                key={field.key}
                field={field}
                value={values[field.key]}
                onChange={set(field.key)}
                required={fieldState(field, ctx, values) === "required"}
                error={errorFor(field.key, i)}
              />
            ))}
          </>
        ),
      }))}
      result={
        <div className="flex min-w-0 flex-col gap-4">
          {issues.length > 0 ? (
            <div ref={summaryRef} tabIndex={-1} role="alert" className="border-l-4 border-destructive bg-secondary p-4">
              <p className="font-bold">Popraw wniosek przed wysłaniem</p>
              <ul className="mt-2 space-y-1">
                {issues.map((issue) => {
                  const i = stepOfKey(issue.field);
                  const field = spec.fields.find((f) => f.key === issue.field);
                  return (
                    <li key={issue.field + issue.message}>
                      <button type="button" className="text-link text-left" onClick={() => { setCheckedSteps((p) => [...p, i]); goTo(i); }}>
                        {field ? `${field.label}: ` : ""}{issue.message}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Notice><p className="font-bold">Wniosek jest kompletny.</p><p>Sprawdź dane poniżej. W symulacji adresatem jest: {ctx.recipientName}</p></Notice>
          )}
          <WarningBox items={warnings} />
          <Summary spec={spec} ctx={ctx} values={values} onEdit={goTo} />
          {errors.length === 0 && (spec.id in ZUS_TEMPLATES
            ? <ZusPdf specId={spec.id} ctx={ctx} values={values} doneTasks={doneTasks} />
            : <PrintButton spec={spec} ctx={ctx} values={values} date={ctx.today} />)}
          <Button className="self-start" disabled={sending} onClick={send}>
            {sending ? "Trwa symulacja…" : "Symuluj wysłanie"}
          </Button>
        </div>
      }
    />
  );
}

function Submitted({ spec, ctx, submission, doneTasks, returnHref, returnLabel }: { spec: FormSpec; ctx: FormContext; submission: Submission; doneTasks: string[]; returnHref: string; returnLabel: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Notice role="status">
        <p className="text-xl font-bold">Zakończono symulację wysłania</p>
        <dl className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-[14rem_minmax(0,1fr)] [&_dt]:font-bold">
          <dt>Adresat</dt><dd>{submission.recipient}</dd>
          <dt>Sposób wysłania</dt><dd>{submission.channel}</dd>
          <dt>Numer potwierdzenia symulacji</dt><dd className="font-mono">{submission.number}</dd>
          <dt>Data symulacji</dt><dd>{sentFormat.format(new Date(submission.sentAt))}</dd>
        </dl>
        <p className="mt-3">Zadanie jest oznaczone w planie jako zakończone.</p>
      </Notice>
      <div className="flex flex-wrap items-start gap-3">
        <ButtonLink href={returnHref}>{returnLabel}</ButtonLink>
        {!(spec.id in ZUS_TEMPLATES) && <PrintButton spec={spec} ctx={ctx} values={submission.values} date={submission.sentAt.slice(0, 10)} number={submission.number} />}
      </div>
      {spec.id in ZUS_TEMPLATES && <ZusPdf specId={spec.id} ctx={ctx} values={submission.values} doneTasks={doneTasks} />}
      <section aria-labelledby="sent-title" className="flex min-w-0 flex-col gap-3">
        <h2 id="sent-title" className="text-2xl font-bold">Wniosek z symulacji</h2>
        <Summary spec={spec} ctx={ctx} values={submission.values} />
      </section>
    </div>
  );
}

/** The official ZUS form filled by the server, shown in the browser's PDF viewer where fields stay editable. */
function ZusPdf({ specId, ctx, values, doneTasks }: { specId: string; ctx: FormContext; values: FormValues; doneTasks: string[] }) {
  const [url, setUrl] = useState<string | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");
  const fileName = `${ZUS_TEMPLATES[specId].toUpperCase()}-${ctx.persona.parents[ctx.parent].lastName}.pdf`;

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  async function load() {
    setState("loading");
    try {
      const response = await fetch("/api/applications/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId: ctx.taskId, personaId: ctx.persona.id, chosenVariant: ctx.chosen?.key ?? null, events: ctx.events, guideAnswers: ctx.guideAnswers, customLeave: ctx.customLeave, doneTasks, values }),
      });
      if (!response.ok) throw new Error(String(response.status));
      setUrl(URL.createObjectURL(await response.blob()));
      setState("idle");
    } catch {
      setState("error");
    }
  }

  if (!url) {
    return (
      <div className="flex flex-col gap-1">
        <Button variant="outline" className="self-start" disabled={state === "loading"} onClick={load}>
          {state === "loading" ? "Wypełniamy formularz…" : "Pokaż wypełniony formularz ZUS (PDF)"}
        </Button>
        <p className="text-sm text-muted-foreground">Oryginalny wzór z zus.pl z Twoimi danymi. Pola możesz jeszcze poprawić w podglądzie.</p>
        {state === "error" && <FieldError message="Nie udało się przygotować formularza. Spróbuj ponownie." />}
      </div>
    );
  }
  return (
    <section aria-label="Formularz ZUS" className="flex min-w-0 flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <a href={url} download={fileName} className={cn(buttonVariants({ variant: "outline" }))}>Pobierz PDF</a>
        <a href={url} target="_blank" rel="noreferrer" className="text-link">Otwórz w nowej karcie</a>
      </div>
      {/* Mobile browsers do not render PDFs inline, so phones get the download and new-tab links only. */}
      <iframe src={url} title="Wypełniony formularz ZUS" className="hidden h-[80vh] w-full rounded-sm border border-border sm:block" />
    </section>
  );
}

function PrintButton(props: { spec: FormSpec; ctx: FormContext; values: FormValues; date: string; number?: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Button variant="outline" className="self-start" onClick={() => window.print()}>Pobierz PDF do wydruku</Button>
      <p className="text-sm text-muted-foreground">W oknie drukowania wybierz „Zapisz jako PDF” albo wydrukuj wniosek.</p>
      {createPortal(<PrintableApplication {...props} />, document.body)}
    </div>
  );
}


/** Letter-style copy of the application, shown only when printing (see `.print-document` in globals.css). */
function PrintableApplication({ spec, ctx, values, date, number }: { spec: FormSpec; ctx: FormContext; values: FormValues; date: string; number?: string }) {
  const me = ctx.persona.parents[ctx.parent];
  const city = /\d{2}-\d{3} (.+)$/.exec(me.address)?.[1] ?? "";
  const fields = formSteps(spec, ctx, values).flatMap((step) => step.fields).filter((field) => field.type !== "signature");
  const attachments = requiredAttachments(spec, ctx, values);
  return (
    <article className="print-document text-[11pt] leading-normal text-black">
      <p className="text-right">{city && `${city}, `}{formatDate(date)}</p>
      <div className="mt-6 grid grid-cols-2 gap-8">
        <div>
          <p className="font-bold">{me.name} {me.lastName}</p>
          <p>{me.address}</p>
          <p>PESEL {me.pesel}</p>
        </div>
        <div>
          <p className="font-bold">{ctx.recipient === "employer" ? me.payerName : ctx.recipient === "zus" ? "Zakład Ubezpieczeń Społecznych" : ctx.recipientName}</p>
          {ctx.recipient === "employer" && <p>NIP {me.payerNip}</p>}
        </div>
      </div>
      <h1 className="mt-8 text-center text-[14pt] font-bold">{spec.title}</h1>
      {number && <p className="text-center">Kopia wniosku wysłanego elektronicznie, nr {number}</p>}
      <table className="mt-6 w-full border-collapse">
        <tbody>
          {fields.map((field) => (
            <tr key={field.key} className="break-inside-avoid border-b border-black/30 align-top">
              <th scope="row" className="w-1/2 py-1.5 pr-4 text-left font-normal">{field.label}</th>
              <td className="py-1.5 font-bold whitespace-pre-line">{formatValue(field, values[field.key])}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {attachments.length > 0 && (
        <section className="mt-6 break-inside-avoid">
          <p className="font-bold">Załączniki:</p>
          <ol className="list-decimal pl-6">{attachments.map((a) => <li key={a.id}>{a.title}</li>)}</ol>
        </section>
      )}
      <div className="mt-16 ml-auto w-64 break-inside-avoid text-center">
        <div className="border-t border-black pt-1 text-[9pt]">{number ? "Podpisano w mObywatelu" : "Data i podpis"}</div>
      </div>
      <p className="mt-10 text-[8pt] text-black/60">Wniosek przygotowany w Zasiłkowym Przewodniku Przyszłego Rodzica (projekt demonstracyjny, dane symulowane).</p>
    </article>
  );
}

function formatValue(field: FormField, value: FieldValue | undefined): ReactNode {
  if (field.type === "signature") return value === true ? "Podpisano w mObywatelu" : "Brak podpisu";
  if (field.type === "boolean") return value === true ? "Tak" : "Nie";
  if (!isFilled(value)) return <span className="text-muted-foreground">Nie podano</span>;
  switch (field.type) {
    case "date": return formatDate(value as string);
    case "date_range": {
      const range = value as DateRange;
      return `${formatDate(range.from)} – ${formatDate(range.to)}`;
    }
    case "choice": return field.options?.find((o) => o.value === value)?.label ?? String(value);
    case "multi_choice": return (value as string[]).map((v) => field.options?.find((o) => o.value === v)?.label ?? v).join(", ");
    case "person": {
      const person = value as Person;
      return [person.name, person.pesel && `PESEL ${person.pesel}`].filter(Boolean).join(", ");
    }
    case "child_list": return (value as Child[]).map((c) => `${c.name}, ur. ${formatDate(c.birthDate)}${c.birthPlace ? ` w ${c.birthPlace}` : ""}`).join("; ");
    default: return String(value);
  }
}

function Summary({ spec, ctx, values, onEdit }: { spec: FormSpec; ctx: FormContext; values: FormValues; onEdit?: (step: number) => void }) {
  const attachments = requiredAttachments(spec, ctx, values);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {formSteps(spec, ctx, values).map((step, i) => (
        <section key={step.title} className="min-w-0 border-t pt-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-lg font-bold">{step.title}</h3>
            {onEdit && <Button variant="link" onClick={() => onEdit(i)}>Zmień<span className="sr-only">: {step.title}</span></Button>}
          </div>
          <dl className="divide-y [&>div]:grid [&>div]:gap-1 [&>div]:py-2 sm:[&>div]:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:[&>div]:gap-4">
            {step.title === ATTACHMENTS_STEP && attachments.map((a) => (
              <div key={a.id}><dt className="font-bold">{a.title}</dt><dd>{values[attachmentKey(a.id)] === true ? "Dołączono" : "Brak"}</dd></div>
            ))}
            {step.fields.map((field) => (
              <div key={field.key}><dt className="font-bold">{field.label}</dt><dd className="break-words whitespace-pre-line">{formatValue(field, values[field.key])}</dd></div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

function FieldError({ id, message }: { id?: string; message?: string }) {
  return message ? <p id={id} className="mt-1 text-sm font-bold text-destructive">{message}</p> : null;
}

function FieldInput({ field, value, onChange, required, error }: {
  field: FormField; value: FieldValue | undefined; onChange: (value: FieldValue) => void; required: boolean; error?: string;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  const invalid = error ? true : undefined;
  const describedBy = error ? errorId : undefined;
  const label = <>{field.label}{!required && field.type !== "boolean" && <span className="font-normal text-muted-foreground"> (opcjonalnie)</span>}</>;
  const wrap = (children: ReactNode) => (
    <div data-field={field.key} className="min-w-0">{children}<FieldError id={errorId} message={error} /></div>
  );

  switch (field.type) {
    case "signature":
      return wrap(
        <Checkbox checked={value === true} onChange={() => onChange(value !== true)} title="Podpisuję wniosek w mObywatelu">
          Potwierdzam, że dane we wniosku są zgodne z prawdą. Podpis jest symulowany.
        </Checkbox>,
      );
    case "boolean":
      return wrap(<Checkbox checked={value === true} onChange={() => onChange(value !== true)} title={field.label}>{field.help}</Checkbox>);
    case "choice":
      return wrap(
        <>
          <RadioGroup label={field.label} options={(field.options ?? []).map((o) => [o.value, o.label] as [string, string])} value={String(value ?? "")} onChange={onChange} />
          {field.help && <p className="mt-1 text-sm text-muted-foreground">{field.help}</p>}
        </>,
      );
    case "multi_choice": {
      const selected = (value as string[] | undefined) ?? [];
      return wrap(
        <fieldset className="min-w-0">
          <legend className="mb-2 font-bold">{label}</legend>
          {field.options?.map((o) => (
            <Checkbox key={o.value} checked={selected.includes(o.value)} title={o.label}
              onChange={() => onChange(selected.includes(o.value) ? selected.filter((v) => v !== o.value) : [...selected, o.value])} />
          ))}
        </fieldset>,
      );
    }
    case "date_range": {
      const range = (value as DateRange | undefined) ?? { from: "", to: "" };
      return wrap(
        <fieldset className="min-w-0">
          <legend className="mb-2 font-bold">{label}</legend>
          {field.help && <p className="mb-2 text-sm text-muted-foreground">{field.help}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Od" type="date" value={range.from} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange({ ...range, from: e.target.value })} />
            <Field label="Do" type="date" value={range.to} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange({ ...range, to: e.target.value })} />
          </div>
        </fieldset>,
      );
    }
    case "person": {
      const person = (value as Person | undefined) ?? { name: "", pesel: "" };
      return wrap(
        <fieldset className="min-w-0">
          <legend className="mb-2 font-bold">{label}</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Imię i nazwisko" value={person.name} autoComplete="off" aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange({ ...person, name: e.target.value })} />
            <Field label="PESEL" inputMode="numeric" value={person.pesel} autoComplete="off" aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange({ ...person, pesel: e.target.value })} />
          </div>
        </fieldset>,
      );
    }
    case "child_list": {
      const children = (value as Child[] | undefined) ?? [];
      const update = (i: number, change: Partial<Child>) => onChange(children.map((c, j) => (j === i ? { ...c, ...change } : c)));
      return wrap(
        <fieldset className="flex min-w-0 flex-col gap-3">
          <legend className="mb-2 font-bold">{label}</legend>
          {children.map((child, i) => (
            <div key={i} className="grid gap-3 border-l-4 border-border pl-3 sm:grid-cols-3">
              <Field label="Imię i nazwisko dziecka" value={child.name} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => update(i, { name: e.target.value })} />
              <Field label="Data urodzenia" type="date" value={child.birthDate} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => update(i, { birthDate: e.target.value })} />
              <Field label="Miejsce urodzenia" value={child.birthPlace} onChange={(e) => update(i, { birthPlace: e.target.value })} />
              {children.length > 1 && (
                <Button variant="link" className="self-start sm:col-span-3" onClick={() => onChange(children.filter((_, j) => j !== i))}>Usuń dziecko {i + 1}</Button>
              )}
            </div>
          ))}
          <Button variant="outline" className="self-start" onClick={() => onChange([...children, { name: "", birthDate: "", birthPlace: "" }])}>Dodaj dziecko</Button>
        </fieldset>,
      );
    }
    case "table":
      return wrap(
        <div className="flex min-w-0 flex-col gap-1">
          <label htmlFor={id} className="font-bold">{label}</label>
          {/* shortcut: free-text table, add row editing when a timeline step needs a form with tables */}
          <textarea id={id} rows={3} className={inputClass} value={String(value ?? "")} aria-invalid={invalid} aria-describedby={describedBy} onChange={(e) => onChange(e.target.value)} />
        </div>,
      );
    default:
      return wrap(
        <Field
          id={id}
          label={label}
          hint={field.help}
          type={field.type === "date" ? "date" : field.type === "phone" ? "tel" : "text"}
          inputMode={["pesel", "nip", "regon", "number"].includes(field.type) ? "numeric" : undefined}
          spellCheck={field.type === "bank_account" ? false : undefined}
          value={String(value ?? "")}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
        />,
      );
  }
}
