"use client";

// GOV.UK-style questionnaire: one question per page, then "check your answers", then the family plan.
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { TermText } from "@/components/term-text";
import { AlertCircle, ChevronLeft } from "lucide-react";
import { BackLink, Button, Checkbox, Field, RadioOption } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { activeAnswers, nextQuestion, plainText, visibleOptions, visibleQuestions, type Answer, type Answers, type Question } from "@/lib/guide/tree";
import { GUIDE_ID } from "@/lib/guide/persona";
import { logIn, updatePlan, useIsClient, usePlan } from "@/lib/plan-store";

const heading = "text-2xl leading-tight font-bold sm:text-3xl";
const STAGES = ["Odpowiedz na pytania", "Sprawdź odpowiedzi", "Zobacz swoją oś czasu"];

/** Page frame: optional green band, the task on the left, the stages on the right. */
function Frame({ stage, band, children }: { stage: number; band?: ReactNode; children: ReactNode }) {
  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      {band && (
        <div className="bg-primary-soft">
          <div className="shell flex flex-col gap-4 py-6 sm:py-8">
            {band}
          </div>
        </div>
      )}
      <div className="shell grid gap-10 py-8 sm:py-10 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="flex max-w-[70ch] min-w-0 flex-col gap-6">{children}</div>
        <aside aria-labelledby="stages-title" className="self-start border-t-4 border-t-brand bg-secondary p-5">
          <h2 id="stages-title" className="text-lg font-bold">Jak to działa</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {STAGES.map((title, i) => (
              <li key={title} className="flex items-center gap-3" aria-current={i === stage ? "step" : undefined}>
                <span aria-hidden className={`grid size-8 shrink-0 place-items-center font-bold ${i <= stage ? "bg-primary text-primary-foreground" : "border border-input bg-background text-muted-foreground"}`}>{i + 1}</span>
                <span className={i === stage ? "font-bold" : "text-muted-foreground"}>{title}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 border-t pt-4 text-sm text-muted-foreground">Odpowiedzi zostają w tej przeglądarce. Wynik otworzysz bez konta.</p>
        </aside>
      </div>
    </main>
  );
}

function display(q: Question, a: Answers) {
  const value = a[q.id];
  const label = (v: string) => plainText(q.options?.find((o) => o.value === v)?.label ?? v);
  if (Array.isArray(value) && q.optional && !value.length) return "Pominięto";
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
      <Frame stage={1} band={<>
        <h1 className="text-3xl leading-tight font-bold sm:text-5xl">Sprawdź odpowiedzi</h1>
        <p className="max-w-[60ch] text-lg">Sprawdź, czy wszystko się zgadza. Na tej podstawie przygotujemy Twoją oś czasu i listę zadań.</p>
      </>}>
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
            ? <Button variant="action" onClick={() => router.push("/plan")}>Wróć do planu</Button>
            : <Button variant="action" onClick={() => { logIn(GUIDE_ID); router.push("/plan"); }}>Pokaż mój plan</Button>}
          <Button variant="link" onClick={() => updatePlan((s) => ({ ...s, guideAnswers: {} }))}>Zacznij od nowa</Button>
        </div>
      </Frame>
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
    <Frame stage={0}>
      <div className="flex flex-col gap-2">
        {previous
          ? <Button variant="link" className="h-auto min-h-11 gap-1 self-start p-0 font-bold" onClick={() => setEditing({ id: previous.id, fromSummary: false })}><ChevronLeft aria-hidden className="size-5 shrink-0" />Wstecz</Button>
          : <BackLink href="/">Strona główna</BackLink>}
        <QuestionForm key={question.id} question={question} answers={answers} onSave={save} />
      </div>
    </Frame>
  );
}

function QuestionForm({ question: q, answers, onSave }: { question: Question; answers: Answers; onSave: (v: Answer) => void }) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { titleRef.current?.focus(); }, []);
  const [value, setValue] = useState<Answer | undefined>(Array.isArray(answers[q.id]) && q.type !== "multi" ? undefined : answers[q.id] ?? (q.type === "multi" ? [] : undefined));
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

  const errorText = error && <p id={`${q.id}-error`} className="font-bold text-destructive">{error}</p>;

  return (
    <form noValidate onSubmit={submit} className="flex flex-col items-start gap-6">
      {error && (
        <div role="alert" className="flex w-full gap-3 border-l-4 border-destructive bg-background p-4 outline outline-1 outline-destructive">
          <AlertCircle aria-hidden className="mt-0.5 size-5 shrink-0 text-destructive" />
          <div>
            <p className="font-bold">Popraw odpowiedź</p>
            <a href={`#${q.id}-error`} className="text-link text-destructive">{error}</a>
          </div>
        </div>
      )}
      <h1 ref={titleRef} tabIndex={-1} className={heading}>{plainText(q.label)}</h1>
      {q.type === "date" || q.type === "number" ? (
        <div className="flex w-full flex-col gap-2">
          <Field
            label={<span className="sr-only">{plainText(q.label)}</span>}
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
          <legend className="sr-only">{plainText(q.label)}</legend>
          {q.hint && <p className="mb-3 text-muted-foreground"><TermText text={q.hint} /></p>}
          {errorText}
          <div className="mt-2 grid gap-2">
            {q.type === "multi"
              ? options.map((o) => {
                const list = (value as string[]) ?? [];
                const checked = list.includes(o.value);
                const exclusive = new Set(options.filter((x) => x.exclusive).map((x) => x.value));
                const ticked = o.exclusive ? [o.value] : [...list.filter((v) => !exclusive.has(v)), o.value];
                return (
                  <div key={o.value} className="rounded-sm border border-input px-3 py-1 hover:bg-secondary has-checked:border-primary has-checked:bg-primary-soft">
                    <Checkbox title={plainText(o.label)} checked={checked} onChange={() => setValue(checked ? list.filter((v) => v !== o.value) : ticked)} />
                  </div>
                );
              })
              : options.map((o) => (
                <RadioOption
                  key={o.value}
                  name={q.id}
                  checked={String(value) === o.value}
                  onChange={() => setValue(q.type === "boolean" ? o.value === "true" : o.value)}
                >
                  {plainText(o.label)}
                </RadioOption>
              ))}
          </div>
        </fieldset>
      )}
      <Button type="submit" className="min-w-32">Dalej</Button>
    </form>
  );
}

