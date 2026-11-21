"use client";

import Link from "next/link";
import { useLayoutEffect, type MouseEvent, type ReactNode } from "react";
import { Button, ButtonLink, Chip } from "@/components/ui";
import { RememberedDisclosure } from "@/components/remembered-disclosure";
import { formatDate, parseIso } from "@/lib/dates";
import type { EventType, EventWho, TimelineEvent } from "@/lib/events";
import { timelineDate, type FamilyTimelineEntry } from "@/lib/family-timeline";
import { updatePlan, usePlan } from "@/lib/plan-store";
import { attentionEntries, deadlineNotice } from "@/lib/timeline-view";

const statuses = {
  confirmed: "Potwierdzone", planned: "Zaplanowane", blocked: "Oczekuje na dokument lub działanie",
  ready: "Do zrobienia", completed: "Zakończone", late: "Po terminie",
  active: "W trakcie", ended: "Okres zakończony", review: "Do sprawdzenia",
};

const calculatorLabels: Record<EventType, string> = {
  birth: "Oblicz zasiłek po narodzinach",
  adoption: "Oblicz zasiłek po przyjęciu dziecka",
  sickLeave: "Sprawdź zasiłek chorobowy",
  returnToWork: "Sprawdź pracę podczas urlopu",
  salary: "Przelicz podstawę zasiłku",
  contract: "Sprawdź dane do wyliczenia zasiłku",
  contractEnd: "Sprawdź dane do wyliczenia zasiłku",
  business: "Sprawdź dane do wyliczenia zasiłku",
};

const dayFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long", timeZone: "UTC" });

function PersonLabel({ name }: { name: string }) {
  return <Chip className="shrink-0 border bg-background whitespace-nowrap">{name}</Chip>;
}

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

function DeadlineNotice({ notice }: { notice: ReturnType<typeof deadlineNotice> }) {
  if (!notice) return null;
  return <strong className={`block text-sm ${notice.critical ? "text-destructive" : "text-foreground"}`}>{notice.label}</strong>;
}

function revealEntry(hash: string) {
  const entry = document.getElementById(hash.slice(1));
  if (!(entry instanceof HTMLDetailsElement)) return;
  const history = entry.parentElement?.closest("details");
  if (history) history.open = true;
  entry.open = true;
  return entry;
}

function openRelated(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const { hash } = event.currentTarget;
  const entry = revealEntry(hash);
  if (!entry) return;
  event.preventDefault();
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  entry.scrollIntoView({ block: "start" });
  entry.querySelector("summary")?.focus({ preventScroll: true });
}

/** The family timeline: earlier entries folded, a "Dzisiaj" panel with what to do now, then upcoming entries. */
export function FamilyTimeline({ entries, names, today, actions, profileEvents = [] }: {
  entries: FamilyTimelineEntry[]; names: Record<EventWho, string>; today: string; actions?: ReactNode; profileEvents?: TimelineEvent[];
}) {
  const plan = usePlan();
  const { submissions } = plan;
  const attention = attentionEntries(entries, today);
  const active = entries.filter((entry) => entry.status === "active" ||
    (entry.kind === "event" && entry.status === "confirmed" && entry.end && today <= entry.end));
  const points = entries.flatMap((entry) => [
    { entry, date: timelineDate(entry), end: false },
    ...(entry.end ? [{ entry, date: entry.end, end: true }] : []),
  ]).sort((a, b) => a.date.localeCompare(b.date));
  const firstUpcoming = points.findIndex((point) => point.date >= today);
  const todayIndex = firstUpcoming < 0 ? points.length : firstUpcoming;

  useLayoutEffect(() => {
    function revealHash() {
      const hash = window.location.hash;
      if (!hash) return;
      const target = revealEntry(hash) ?? document.getElementById(hash.slice(1));
      target?.scrollIntoView({ block: "start" });
    }

    revealHash();
    window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, []);

  const eventsByEntry = new Map(plan.events.map((event) => [`event-${event.id}`, event]));
  const rows = points.map(({ entry, date, end }) => {
    if (end) return (
      <li key={`${entry.id}-end`} className="relative pb-2 pl-4 sm:pl-6">
        <span aria-hidden="true" className="absolute top-5 -left-[6px] size-2.5 rounded-full border-2 border-input bg-background" />
        <div className="grid gap-1 border-b px-3 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4 sm:px-4">
          <div className="text-sm leading-snug text-muted-foreground">
            <time dateTime={date} className="whitespace-nowrap font-bold text-foreground">{formatDate(date)}</time>
            {entry.estimated && <span className="block">Szacunkowo</span>}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{date >= today ? "Planowany koniec" : "Koniec"}</p>
            <div className="flex items-baseline gap-2">
              <p className="min-w-0 leading-snug font-bold">{entry.title}</p>
              <PersonLabel name={names[entry.who]} />
            </div>
          </div>
        </div>
      </li>
    );

    const event = eventsByEntry.get(entry.id);
    const profileBirth = event?.type === "birth" && profileEvents.some((item) => item.id === event.id);
    const notice = deadlineNotice(entry, today);
    const isPeriod = entry.end !== undefined;
    const required = entries.filter((item) => entry.requires?.includes(item.id));
    const birthCertificate = entry.id === "birth-certificate" && !entry.completedOn;
    const certificateConfirmed = birthCertificate && plan.doneTasks.includes(entry.id);
    const showStatus = entry.kind === "application" && entry.status !== "blocked";
    const submission = submissions[entry.id];

    return (
      <li key={entry.id} className="relative pb-2 pl-4 sm:pl-6">
        <span aria-hidden="true" className={`absolute top-5 rounded-full border-2 border-input bg-background ${isPeriod ? "-left-1 h-4 w-1.5" : "-left-[6px] size-2.5"}`} />
        <RememberedDisclosure section={`plan/${entry.id}`} id={`timeline-${entry.id}`} className="scroll-mt-4 border-b open:bg-secondary target:bg-secondary" label={
          <span className="grid gap-1 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
            <span className="text-sm leading-snug text-muted-foreground">
              <EntryDate entry={entry} />
            </span>
            <span className="min-w-0">
              <DeadlineNotice notice={notice} />
              {isPeriod && <span className="block text-sm text-muted-foreground">Początek</span>}
              <span className="flex items-baseline gap-2">
                <span className="min-w-0 leading-snug font-bold">{entry.title}</span>
                <PersonLabel name={names[entry.who]} />
              </span>
            </span>
          </span>
        }>
          <div className="max-w-[70ch] space-y-3 px-3 pb-4 sm:px-4">
            <p>{entry.description}</p>
            {birthCertificate && (
              <p>{certificateConfirmed
                ? "Potwierdziliście, że USC sporządził akt urodzenia."
                : entry.status === "blocked"
                  ? "Najpierw zgłoście urodzenie i oznaczcie zgłoszenie jako wykonane na liście zadań."
                  : "Gdy USC sporządzi akt, potwierdźcie to tutaj, żeby odblokować powiązane zadania."}</p>
            )}
            {birthCertificate && (certificateConfirmed || entry.status === "planned") && (
              <Button variant="outline" onClick={() => updatePlan((state) => ({
                ...state,
                doneTasks: certificateConfirmed
                  ? state.doneTasks.filter((id) => id !== entry.id)
                  : [...state.doneTasks, entry.id],
              }))}>
                {certificateConfirmed ? "Cofnij potwierdzenie aktu" : "Potwierdź sporządzenie aktu"}
              </Button>
            )}
            {event && (
              <ButtonLink variant="outline" href={profileBirth ? `/warianty?wydarzenie=${encodeURIComponent(event.id)}` : `/kalkulator?wydarzenie=${encodeURIComponent(event.id)}`}>
                {profileBirth ? "Porównaj podział opieki" : calculatorLabels[event.type]}
              </ButtonLink>
            )}
            {(entry.end || entry.recipient || entry.review || required.length > 0 || entry.guide || entry.form || showStatus) && (
              <dl className="divide-y border-y [&>div]:grid [&>div]:gap-1 [&>div]:py-3 [&_dt]:font-bold sm:[&>div]:grid-cols-[10rem_minmax(0,1fr)] sm:[&>div]:gap-4">
                {entry.end && (
                  <div><dt>{entry.estimated ? "Szacowany okres" : "Okres"}</dt><dd>
                    <span className="whitespace-nowrap"><time dateTime={entry.date}>{formatDate(entry.date)}</time>
                      {" – "}<time dateTime={entry.end}>{formatDate(entry.end)}</time>
                    </span>
                  </dd></div>
                )}
                {showStatus && <div><dt>Status</dt><dd>{statuses[entry.status]}</dd></div>}
                {entry.recipient && <div><dt>Gdzie</dt><dd>{entry.recipient}</dd></div>}
                {required.length > 0 && (
                  <div>
                    <dt>Co jest potrzebne</dt>
                    <dd>
                      <ul role="list" className="space-y-1">
                        {required.map((item) => (
                          <li key={item.id} className="flex flex-wrap items-baseline gap-x-2">
                            <a href={`#timeline-${item.id}`} onClick={openRelated} className="text-link">{item.title}</a>
                            {entry.status === "blocked" && item.status !== "completed" && item.status !== "confirmed" && (
                              <span className="text-sm text-muted-foreground">Oczekuje</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </dd>
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
                {entry.form && (submission || entry.status !== "completed") && (
                  <div><dt>Wniosek</dt><dd>
                    {submission
                      ? <>Wysłano {formatDate(submission.sentAt.slice(0, 10))}, nr <span className="font-mono">{submission.number}</span>. <Link href={`/wnioski/${entry.id}`} className="text-link">Zobacz wysłany wniosek</Link></>
                      : <ButtonLink href={`/wnioski/${entry.id}`}>Wypełnij wniosek</ButtonLink>}
                  </dd></div>
                )}
                {entry.guide && <div><dt>Instrukcja</dt><dd><a href={entry.guide} className="text-link">Przeczytaj instrukcję</a></dd></div>}
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
      {todayIndex > 0 && (
        <li className="relative pb-2">
          <span aria-hidden="true" className="absolute top-5 -left-[6px] size-2.5 rounded-full border-2 border-input bg-background" />
          <RememberedDisclosure section="plan/wczesniejsze" id="wczesniejsze-wpisy" className="[&>summary]:ml-4 sm:[&>summary]:ml-6" label={
            <span className="font-bold">Wcześniejsze wpisy <span className="font-normal text-muted-foreground">({todayIndex})</span></span>
          }>
            <ol role="list" className="pt-1">{rows.slice(0, todayIndex)}</ol>
          </RememberedDisclosure>
        </li>
      )}
      <li id="dzisiaj" tabIndex={-1} className="relative scroll-mt-4 pb-4 pl-4 sm:pl-6">
        <span aria-hidden="true" className="absolute top-4 -left-2 size-3.5 rounded-full border-2 border-background bg-primary ring-1 ring-primary" />
        <section aria-labelledby="today-title" className="rounded-sm border border-primary bg-secondary p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline gap-x-3">
            <h3 id="today-title" className="text-lg font-bold text-primary">Dzisiaj</h3>
            <time dateTime={today} className="text-sm text-muted-foreground">{dayFormat.format(parseIso(today)!)}</time>
          </div>
          {attention.length > 0 ? (
            <>
              <p className="mt-1 font-bold">Co zrobić teraz</p>
              <ul className="divide-y">
                {attention.map((item) => {
                  const notice = deadlineNotice(item, today);
                  return (
                    <li key={item.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                      <div className="flex flex-wrap items-center gap-x-2">
                        <a href={`#timeline-${item.id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center">
                          {item.title}
                        </a>
                        <PersonLabel name={names[item.who]} />
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
          ) : <p className="mt-1 text-muted-foreground">Nie masz teraz spraw wymagających działania.</p>}
          {active.length === 1 && (
            <div className="mt-2 flex flex-wrap items-center gap-x-3">
              <span className="text-sm font-bold">W trakcie</span>
              <a href={`#timeline-${active[0].id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center text-sm">
                {active[0].title}
              </a>
              <PersonLabel name={names[active[0].who]} />
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
                    <PersonLabel name={names[item.who]} />
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
