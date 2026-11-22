"use client";

import { DocumentList } from "@/components/document-list";

import { Check } from "lucide-react";
import { useLayoutEffect, type ReactNode } from "react";
import { ApplicationAction, ApplicationReceipt } from "@/components/application-action";
import { Button, ButtonLink } from "@/components/ui";
import { RememberedDisclosure } from "@/components/remembered-disclosure";
import { useJourney } from "@/components/journey-provider";
import { TaskCard } from "@/components/task-card";
import { nextTask, type Task } from "@/lib/calc/tasks";
import { formatDate, parseIso } from "@/lib/dates";
import type { EventType, EventWho, TimelineEvent } from "@/lib/events";
import { canConfirmDocument, timelineDate, type FamilyTimelineEntry } from "@/lib/family-timeline";
import { updatePlan, usePlan } from "@/lib/plan-store";
import { openRelated, revealEntry, scrollBehavior } from "@/lib/timeline-reveal";
import { applicationEventIds, attentionEntries, deadlineNotice } from "@/lib/timeline-view";

const statuses: Partial<Record<FamilyTimelineEntry["status"], string>> = {
  completed: "Zakończone", late: "Po terminie", review: "Sprawdź po zmianie planu",
};

/** Text type of each row, so tasks and events differ by more than shape or colour. */
const kinds: Record<FamilyTimelineEntry["kind"], string> = {
  event: "Wydarzenie", document: "Dokument", application: "Do załatwienia", period: "Początek okresu",
};

/** Who issues each confirmable document; the button says what the parent confirms. */
const confirmLabels: Record<string, string> = {
  "birth-card": "Szpital wydał kartę urodzenia",
  "birth-certificate": "USC sporządził akt urodzenia",
  "sick-ezla": "Lekarz wystawił e-ZLA",
};

const calculatorLabels: Partial<Record<EventType, string>> = {
  birth: "Oblicz zasiłek po narodzinach",
  adoption: "Oblicz zasiłek po przyjęciu dziecka",
  sickLeave: "Sprawdź zasiłek chorobowy",
  returnToWork: "Sprawdź, jak praca wpłynie na zasiłek",
  salary: "Przelicz podstawę zasiłku",
  contract: "Przelicz zasiłek po zmianie pracy",
  contractEnd: "Przelicz zasiłek po zmianie pracy",
  business: "Przelicz zasiłek po zmianie pracy",
};

/** Periods set by law; the leave split in /warianty does not change them. */
const fixedPeriods = new Set(["maternity-period", "supplementary-period"]);

/** Rail marker: square for tasks (checked when done), filled dot for events, outline dot for documents, bar for periods. */
function Marker({ entry, done }: { entry: FamilyTimelineEntry; done: boolean }) {
  const base = "absolute top-5 border-2";
  if (entry.kind === "application") return done
    ? <span aria-hidden="true" className={`${base} -left-[9px] grid size-4 place-items-center rounded-[3px] border-primary bg-primary text-primary-foreground`}><Check className="size-3" strokeWidth={3} /></span>
    : <span aria-hidden="true" className={`${base} -left-[9px] size-4 rounded-[3px] border-foreground bg-background`} />;
  if (entry.kind === "period") return <span aria-hidden="true" className={`${base} -left-1 h-4 w-1.5 rounded-full border-input bg-background`} />;
  return <span aria-hidden="true" className={`${base} -left-[6px] size-2.5 rounded-full ${entry.kind === "event" ? "border-foreground bg-foreground" : "border-input bg-background"}`} />;
}

const submissionDay = new Intl.DateTimeFormat("sv-SE", { dateStyle: "short", timeZone: "Europe/Warsaw" });
const dayFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "UTC" });

function EntryDate({ entry }: { entry: FamilyTimelineEntry }) {
  const date = timelineDate(entry);
  if (entry.dateNote) return <span>{entry.dateNote}</span>;

  return (
    <span>
      <span className="whitespace-nowrap font-bold text-foreground">
        {!entry.completedOn && entry.due && "Do "}
        <time dateTime={date}>{formatDate(date)}</time>
      </span>
      {entry.estimated && <span className="block">Szacunkowo</span>}
      {entry.end === null && <span className="block">Koniec do ustalenia</span>}
    </span>
  );
}

/** A chronological list with one expandable row per entry and a summary of current actions. */
export function FamilyTimeline({ entries, names, today, actions, tasks = [], viewer, solo = false, profileEvents = [] }: {
  entries: FamilyTimelineEntry[]; names: Record<EventWho, string>; today: string; actions?: ReactNode;
  tasks?: Task[]; viewer: EventWho; solo?: boolean; profileEvents?: TimelineEvent[];
}) {
  const person = (who: EventWho) => !solo && who !== "both" && who !== viewer && <span className="text-sm text-muted-foreground">{names[who]}</span>;
  const plan = usePlan();
  const { formGuidance } = useJourney();
  const { submissions } = plan;
  const next = nextTask(tasks);
  const attention = attentionEntries(entries, today).filter((entry) => entry.id !== next?.id);
  const active = entries.filter((entry) => entry.status === "active" ||
    (entry.kind === "event" && entry.status === "confirmed" && entry.end && today <= entry.end));
  const entriesById = new Map(entries.map((entry) => [entry.id, entry]));
  const formsByEvent = new Map<string, FamilyTimelineEntry[]>();
  for (const entry of entries) {
    if (!entry.form || !submissions[entry.id]) continue;
    for (const id of applicationEventIds(entry, entriesById)) {
      const forms = formsByEvent.get(id) ?? [];
      forms.push(entry);
      formsByEvent.set(id, forms);
    }
  }
  const timelineEntries = entries.map((entry) => {
    const submission = submissions[entry.id];
    return submission ? {
      ...entry, completedOn: submissionDay.format(new Date(submission.sentAt)), dateNote: undefined, estimated: false,
    } : entry;
  });
  const points = timelineEntries.flatMap((entry) => [
    { entry, date: timelineDate(entry), end: false },
    ...(entry.end ? [{ entry, date: entry.end, end: true }] : []),
  ]).sort((a, b) => a.date.localeCompare(b.date));
  const firstUpcoming = points.findIndex((point) => point.date >= today);
  const todayIndex = firstUpcoming < 0 ? points.length : firstUpcoming;

  useLayoutEffect(() => {
    function revealHash(arriving = false) {
      const hash = window.location.hash;
      if (!hash) return;
      const target = revealEntry(hash) ?? document.getElementById(hash.slice(1));
      if (!target) return;
      // Next frame: after Next.js's own instant route scroll, which would cancel a smooth one.
      requestAnimationFrame(() => {
        const behavior = scrollBehavior();
        // Arriving from another page: start at the top so the glide shows where the entry sits.
        if (arriving && behavior === "smooth") window.scrollTo(0, 0);
        target.scrollIntoView({ block: "start", behavior });
      });
    }

    revealHash(true);
    const onHashChange = () => revealHash();
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const tasksById = new Map(tasks.map((task) => [task.id, task]));
  const eventsByEntry = new Map(plan.events.map((event) => [`event-${event.id}`, event]));
  const rows = points.map(({ entry, date, end }) => {
    if (end) return (
      <li key={`${entry.id}-end`} className="relative border-b pl-4 sm:pl-6">
        <span aria-hidden="true" className="absolute top-5 -left-[6px] size-2.5 rounded-full border-2 border-input bg-background" />
        <div className="grid gap-1 border border-transparent px-3 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4 sm:px-4">
          <div className="text-sm leading-snug text-muted-foreground">
            <time dateTime={date} className="whitespace-nowrap font-bold text-foreground">{formatDate(date)}</time>
            {entry.estimated && <span className="block">Szacunkowo</span>}
            <p>{date >= today ? "Planowany koniec" : "Koniec"}</p>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="min-w-0 leading-snug font-bold">{entry.title}</p>
              {person(entry.who)}
            </div>
          </div>
        </div>
      </li>
    );

    const event = eventsByEntry.get(entry.id);
    const profileBirth = event?.type === "birth" && profileEvents.some((item) => item.id === event.id);
    const notice = deadlineNotice(entry, today);
    const required = entries.filter((item) => entry.requires?.includes(item.id) && item.status !== "completed" && item.status !== "confirmed");
    const confirmDocument = canConfirmDocument(entry.id) && !entry.completedOn;
    const birthCertificate = entry.id === "birth-certificate" && confirmDocument;
    const certificateConfirmed = confirmDocument && plan.doneTasks.includes(entry.id);
    const submission = submissions[entry.id];
    const relatedForms = formsByEvent.get(entry.id) ?? [];
    const task = tasksById.get(entry.id);
    const firstRequired = task?.waitingFor[0] ?? (entry.status === "blocked" ? required[0] : undefined);
    const status = submission ? "Zapisano w symulacji"
      : notice?.label ?? statuses[entry.status];

    const done = !!submission || entry.status === "completed";
    const calculator = event && calculatorLabels[event.type];
    const estimatedBirth = entry.kind === "event" && entry.estimated;
    const leavePeriod = entry.kind === "period" && !fixedPeriods.has(entry.id);

    return (
      <li key={entry.id} className="relative border-b pl-4 sm:pl-6">
        <Marker entry={entry} done={done} />
        <RememberedDisclosure section={`plan/${entry.id}`} id={`timeline-${entry.id}`} className="scroll-mt-4 target:bg-primary-soft" label={
          <span className="grid gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
            <span className="text-sm leading-snug text-muted-foreground">
              <EntryDate entry={entry} />
              <span className="block">{entry.form ? formGuidance?.[entry.form]?.kindLabel ?? "Wniosek" : kinds[entry.kind]}</span>
            </span>
            <span className="min-w-0">
              <span className="flex items-baseline gap-2">
                <span className={`min-w-0 leading-snug ${!task ? "font-semibold" : done ? "font-semibold text-muted-foreground" : "font-bold"}`}>{entry.title}</span>
                {person(entry.who)}
              </span>
              {status && (
                <span className={`block text-sm ${notice?.critical || entry.status === "late" ? "text-destructive" : "text-muted-foreground"}`}>{status}</span>
              )}
              {firstRequired && <span className="block text-sm text-muted-foreground">Najpierw: {firstRequired.title}</span>}
            </span>
          </span>
        }>
          <div className="max-w-[70ch] space-y-3 px-3 pb-4 sm:ml-56 sm:px-4">
            {task && <TaskCard task={task} names={names} viewer={viewer} preparedBy={entry.form ? formGuidance?.[entry.form]?.preparedBy : undefined} />}
            {!task && entry.kind !== "period" && entry.description && <p>{entry.description}</p>}
            {birthCertificate && entry.status === "blocked" && (
              <p>Najpierw oznacz jako wykonane{" "}
                <a href="#timeline-birth-registration" onClick={openRelated} className="text-link">zgłoszenie urodzenia</a>.</p>
            )}
            {confirmDocument && (certificateConfirmed || entry.status === "planned") && (
              <div className="flex flex-col items-start gap-1">
                <Button variant="outline" onClick={() => updatePlan((state) => ({
                  ...state,
                  doneTasks: certificateConfirmed
                    ? state.doneTasks.filter((id) => id !== entry.id)
                    : [...state.doneTasks, entry.id],
                }))}>
                  {certificateConfirmed ? "Cofnij potwierdzenie" : confirmLabels[entry.id]}
                </Button>
                <p className="text-sm text-muted-foreground">{certificateConfirmed ? "Potwierdzone." : "Potwierdzenie odblokuje powiązane sprawy."}</p>
              </div>
            )}
            {(calculator || estimatedBirth || event?.source === "new" || leavePeriod) && (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {calculator && (
                  <ButtonLink variant="outline" href={profileBirth ? `/warianty?wydarzenie=${encodeURIComponent(event.id)}` : `/kalkulator?wydarzenie=${encodeURIComponent(event.id)}`}>
                    {profileBirth ? "Porównaj podział opieki" : calculator}
                  </ButtonLink>
                )}
                {estimatedBirth && <ButtonLink variant="outline" href="/dodaj">Wpisz datę porodu</ButtonLink>}
                {leavePeriod && <ButtonLink variant="outline" href="/warianty">Zmień podział urlopu</ButtonLink>}
                {event?.source === "new" && (
                  <Button variant="link" onClick={() => {
                    if (window.confirm(`Usunąć wydarzenie „${entry.title}” z planu?`)) {
                      updatePlan((state) => ({ ...state, events: state.events.filter((item) => item.id !== event.id) }));
                    }
                  }}>Usuń wydarzenie</Button>
                )}
              </div>
            )}
            {relatedForms.length > 0 && (
              <section className="space-y-2">
                <h3 className="font-semibold">Zapisane wnioski i dokumenty</h3>
                <ul className="divide-y border-y">
                  {relatedForms.map((form) => (
                    <li key={form.id} className="py-3">
                      <ApplicationReceipt id={form.id} submission={submissions[form.id]} origin="plan" title={form.title} />
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {(entry.end || entry.review || (!task && (entry.recipient || required.length > 0 || entry.documents?.length || entry.guide || entry.form))) && (
              <dl className="space-y-2 [&>div]:space-y-1 [&_dt]:text-sm [&_dt]:text-muted-foreground">
                {entry.end && (
                  <div><dt>{entry.estimated ? "Szacowany koniec" : "Koniec"}</dt><dd><time dateTime={entry.end}>{formatDate(entry.end)}</time></dd></div>
                )}
                {!task && entry.recipient && <div><dt>Gdzie</dt><dd>{entry.recipient}</dd></div>}
                {!task && entry.deadlineDetail && <div><dt>Skutek przekroczenia terminu</dt><dd>{entry.deadlineDetail}</dd></div>}
                {!task && required.length > 0 && (
                  <div>
                    <dt>Co jest potrzebne</dt>
                    <dd>
                      <ul role="list" className="space-y-1">
                        {required.map((item) => (
                          <li key={item.id} className="flex flex-wrap items-baseline gap-x-2">
                            <a href={`#timeline-${item.id}`} onClick={openRelated} className="text-link">{item.title}</a>
                          </li>
                        ))}
                      </ul>
                    </dd>
                  </div>
                )}
                {!task && !!entry.documents?.length && (
                  <div>
                    <dt>Dokumenty</dt>
                    <dd><DocumentList documents={entry.documents} /></dd>
                  </div>
                )}
                {entry.review && (
                  <div>
                    <dt>Zmiana planu</dt>
                    <dd>Poprzedni wniosek dotyczył innego podziału urlopu. Uzgodnij nowy okres z pracodawcą.
                      {entry.due && <> Termin według nowego planu: {formatDate(entry.due)}.</>}
                    </dd>
                  </div>
                )}
                {!task && entry.form && (submission || entry.status !== "completed") && (
                  <div><dt>Wniosek</dt><dd>
                    {submission
                      ? <ApplicationReceipt id={entry.id} submission={submission} origin="plan" />
                      : <ButtonLink href={`/wnioski/${entry.id}`}>Wypełnij wniosek</ButtonLink>}
                  </dd></div>
                )}
                {!task && entry.guide && <div><dt>Instrukcja</dt><dd><a href={entry.guide} className="text-link">Przeczytaj instrukcję</a></dd></div>}
              </dl>
            )}
          </div>
        </RememberedDisclosure>
      </li>
    );
  });

  return (
  <section aria-labelledby="timeline-title">
    <h2 id="timeline-title" className="mb-3 text-2xl font-bold">Oś czasu</h2>
    <ol role="list" className="relative ml-2 border-l-2 border-input/60">
      {rows.slice(0, todayIndex)}
      <li id="dzisiaj" tabIndex={-1} className="relative scroll-mt-4 pb-4 pl-4 sm:pl-6">
        <span aria-hidden="true" className="absolute top-4 -left-2 size-3.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary" />
        <section aria-labelledby="today-title" className="rounded-sm border border-primary bg-secondary p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 id="today-title" className="text-lg font-bold text-primary">Dzisiaj</h3>
            <time dateTime={today} className="text-sm text-muted-foreground">{dayFormat.format(parseIso(today)!)}</time>
          </div>
          {next && (
            <div className="mt-3 flex flex-col items-start gap-1 border-t pt-3">
              <p className="text-sm font-bold text-muted-foreground">Następny krok</p>
              <a href={`#timeline-${next.id}`} onClick={openRelated} className="text-link text-lg font-bold">{next.title}</a>
              {next.due && <p className="text-sm text-muted-foreground">{next.when}</p>}
              <ApplicationAction origin="plan" task={next} submission={submissions[next.id]} />
            </div>
          )}
          {attention.length > 0 ? (
            <>
              <p className="mt-3 font-bold">{next ? "Też wkrótce" : "Co zrobić teraz"}</p>
              <ul className="divide-y">
                {attention.map((item) => {
                  const notice = deadlineNotice(item, today);
                  return (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <a href={`#timeline-${item.id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center">
                          {item.title}
                        </a>
                        {person(item.who)}
                      </div>
                      {item.due && (
                        <span className={`inline-flex items-center gap-2 rounded-sm border bg-background px-2 py-1 text-sm whitespace-nowrap ${notice?.critical ? "border-destructive text-destructive" : notice ? "border-input text-foreground" : "text-muted-foreground"}`}>
                          <span>{item.estimated ? "Szacunkowo do " : "Do "}<time dateTime={item.due} className="font-bold">{formatDate(item.due)}</time></span>
                          {notice && <span className="border-l border-current pl-2">{notice.compactLabel}</span>}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : !next && <p className="mt-1 text-muted-foreground">Nie masz teraz spraw wymagających działania.</p>}
          {active.length === 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3">
              <span className="text-sm font-bold">W trakcie</span>
              <a href={`#timeline-${active[0].id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center text-sm">
                {active[0].title}
              </a>
              {person(active[0].who)}
            </div>
          )}
          {active.length > 1 && (
            <RememberedDisclosure section="plan/w-trakcie" className="mt-2 border-y" label={<span className="text-sm font-bold">W trakcie ({active.length})</span>}>
              <ul className="divide-y px-3 pb-2 sm:px-4">
                {active.map((item) => (
                  <li key={item.id} className="flex flex-wrap items-center gap-x-3">
                    <a href={`#timeline-${item.id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center text-sm">
                      {item.title}
                    </a>
                    {person(item.who)}
                  </li>
                ))}
              </ul>
            </RememberedDisclosure>
          )}
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">{actions}</div>
        </section>
      </li>
      {rows.slice(todayIndex)}
    </ol>
  </section>
  );
}
