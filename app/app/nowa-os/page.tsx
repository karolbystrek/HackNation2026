"use client";

// GOV.UK-style questionnaire: one question per page, then "check your answers", then the login simulation and the panel.
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { TermText } from "@/components/term-text";
import { BackLink, Button, Checkbox, Field, PageTitle, RadioOption } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { activeAnswers, nextQuestion, plainText, visibleOptions, visibleQuestions, type Answer, type Answers, type Question } from "@/lib/guide/tree";
import { GUIDE_ID } from "@/lib/guide/persona";
import { updatePlan, useIsClient, usePlan } from "@/lib/plan-store";

const heading = "text-2xl leading-tight font-bold sm:text-3xl";

function display(q: Question, a: Answers) {
  const value = a[q.id];
  const label = (v: string) => plainText(q.options?.find((o) => o.value === v)?.label ?? v);
  if (q.type === "boolean") return value ? "Tak" : "Nie";
  if (q.type === "date") return formatDate(value as string);
  if (Array.isArray(value)) return value.length ? value.map(label).join(", ") : "Nic z powyższych";
  return typeof value === "string" ? label(value) : String(value);
}

export default function NewTimeline() {
  const isClient = useIsClient();
  const plan = usePlan();
  const answers = plan.guideAnswers;
  const router = useRouter();
  const [editing, setEditing] = useState<{ id: string; fromSummary: boolean } | null>(null);
  if (!isClient) return null;

  const visible = visibleQuestions(answers);
  const question = visible.find((q) => q.id === editing?.id) ?? nextQuestion(answers);

  if (!question) {
    return (
      <main id="main-content" tabIndex={-1} className="page max-w-3xl">
        <PageTitle lead="Sprawdź, czy wszystko się zgadza. Na tej podstawie przygotujemy Twoją oś czasu i listę zadań.">Sprawdź odpowiedzi</PageTitle>
        <dl className="divide-y border-y">
          {visible.map((q) => (
            <div key={q.id} className="grid gap-1 py-3 sm:grid-cols-[1fr_1fr_auto] sm:gap-4">
              <dt className="font-bold">{plainText(q.label)}</dt>
              <dd>{display(q, answers)}</dd>
              <dd>
                <Button variant="link" className="h-auto min-h-11 p-0" onClick={() => setEditing({ id: q.id, fromSummary: true })}>
                  Zmień<span className="sr-only"> odpowiedź: {plainText(q.label)}</span>
                </Button>
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex flex-wrap items-center gap-4">
          {plan.personaId === GUIDE_ID
            ? <Button onClick={() => router.push("/plan")}>Wróć do planu</Button>
            : <Button onClick={() => router.push("/logowanie")}>Dalej: zaloguj się</Button>}
          <Button variant="link" onClick={() => updatePlan((s) => ({ ...s, guideAnswers: {} }))}>Zacznij od nowa</Button>
        </div>
      </main>
    );
  }

  const index = visible.indexOf(question);
  const previous = visible[index - 1];
  const save = (value: Answer) => {
    const next = activeAnswers({ ...answers, [question.id]: value });
    updatePlan((s) => ({ ...s, guideAnswers: next }));
    // Walking forward revisits later answers; a change from the summary goes back to it.
    const following = visibleQuestions(next).find((q) => q.priority > question.priority || (q.priority === question.priority && q.id > question.id));
    setEditing(editing?.fromSummary || !following ? null : { id: following.id, fromSummary: false });
  };

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      {previous
        ? <Button variant="link" className="self-start p-0 font-bold" onClick={() => setEditing({ id: previous.id, fromSummary: false })}><span aria-hidden="true">← </span>Wstecz</Button>
        : <BackLink href="/">Strona główna</BackLink>}
      <QuestionForm key={question.id} question={question} answers={answers} onSave={save} />
    </main>
  );
}

function QuestionForm({ question: q, answers, onSave }: { question: Question; answers: Answers; onSave: (v: Answer) => void }) {
  const [value, setValue] = useState<Answer | undefined>(answers[q.id] ?? (q.type === "multi" ? [] : undefined));
  const [error, setError] = useState<string | null>(null);
  const options = q.type === "boolean"
    ? [{ value: "true", label: "Tak" }, { value: "false", label: "Nie" }]
    : visibleOptions(q, answers);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const empty = value === undefined || value === "" || (Array.isArray(value) && value.length === 0);
    if (empty && !q.optional) return setError(q.type === "multi" ? "Zaznacz co najmniej jedną odpowiedź." : "Odpowiedz na pytanie, aby przejść dalej.");
    if (q.type === "number" && (Number.isNaN(value) || (q.min !== undefined && (value as number) < q.min) || (q.max !== undefined && (value as number) > q.max)))
      return setError(`Podaj liczbę od ${q.min} do ${q.max}.`);
    onSave(value ?? []);
  };

  const errorText = error && <p id={`${q.id}-error`} role="alert" className="font-bold text-destructive">{error}</p>;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col items-start gap-5">
      {q.type === "date" || q.type === "number" ? (
        <div className="flex w-full flex-col gap-2">
          <Field
            label={<span className={heading}><TermText text={q.label} /></span>}
            hint={q.hint && <TermText text={q.hint} />}
            type={q.type}
            min={q.min}
            max={q.max}
            inputMode={q.type === "number" ? "numeric" : undefined}
            value={value === undefined ? "" : String(value)}
            aria-invalid={!!error}
            aria-describedby={error ? `${q.id}-error` : undefined}
            onChange={(e) => setValue(e.target.value === "" ? undefined : q.type === "number" ? e.target.valueAsNumber : e.target.value)}
          />
          {errorText}
        </div>
      ) : (
        <fieldset className="w-full min-w-0" aria-describedby={error ? `${q.id}-error` : undefined}>
          <legend className={`${heading} mb-2`}><TermText text={q.label} /></legend>
          {q.hint && <p className="mb-3 text-muted-foreground"><TermText text={q.hint} /></p>}
          {errorText}
          <div className="mt-2 grid gap-2">
            {q.type === "multi"
              ? options.map((o) => {
                const list = (value as string[]) ?? [];
                const checked = list.includes(o.value);
                const exclusive = new Set(options.filter((x) => x.exclusive).map((x) => x.value));
                const ticked = o.exclusive ? [o.value] : [...list.filter((v) => !exclusive.has(v)), o.value];
                return <Checkbox key={o.value} title={<TermText text={o.label} />} checked={checked} onChange={() => setValue(checked ? list.filter((v) => v !== o.value) : ticked)} />;
              })
              : options.map((o) => (
                <RadioOption
                  key={o.value}
                  name={q.id}
                  checked={String(value) === o.value}
                  onChange={() => setValue(q.type === "boolean" ? o.value === "true" : o.value)}
                >
                  <TermText text={o.label} />
                </RadioOption>
              ))}
          </div>
        </fieldset>
      )}
      <Button type="submit">Dalej</Button>
    </form>
  );
}

