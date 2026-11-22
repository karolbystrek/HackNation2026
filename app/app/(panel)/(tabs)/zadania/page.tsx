"use client";

import Link from "next/link";
import { ApplicationAction } from "@/components/application-action";
import { Chip, PageBand, SectionTitle } from "@/components/ui";
import { buildTasks } from "@/lib/calc/tasks";
import { canConfirmDocument } from "@/lib/family-timeline";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Tasks() {
  const { plan, names, viewer, timeline } = useFamily();

  const tasks = buildTasks(timeline).filter((task) => task.who === "both" || task.who === viewer);
  const main = tasks.filter((task) => !task.extra);
  const remaining = main.filter((task) => !task.done);
  const completed = main.filter((task) => task.done);

  function renderTask(task: (typeof tasks)[number]) {
    const inputId = `task-${task.id}`;
    const submission = plan.submissions[task.id];
    const waiting = task.waitingFor;
    const statusId = `${inputId}-status`;
    return (
      <li id={`checklist-${task.id}`} key={task.id} className="flex scroll-mt-4 items-start gap-2 border-t py-7 sm:gap-4">
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            id={inputId}
            type="checkbox"
            checked={task.done}
            disabled={task.locked || !!submission}
            aria-label={task.title}
            aria-describedby={task.locked || submission ? statusId : undefined}
            onChange={() => {
              updatePlan((state) => ({
                ...state,
                doneTasks: task.done ? state.doneTasks.filter((id) => id !== task.id) : [...state.doneTasks, task.id],
              }));
              requestAnimationFrame(() => document.getElementById(task.done ? inputId : "pozostale-zadania")?.focus());
            }}
            className="size-5"
          />
        </label>
        <div className="flex min-w-0 grow flex-col gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-2">
            <h3 className="min-w-0 text-xl leading-snug font-bold">{task.title}</h3>
            <Chip className="shrink-0 border bg-background whitespace-nowrap">{names[task.who]}</Chip>
          </div>
          {(task.recipient || task.when !== "Po spełnieniu warunków") && (
            <dl className="flex flex-wrap gap-x-8 gap-y-3 border-b pb-4 text-sm">
              {task.recipient && (
                <div>
                  <dt className="text-muted-foreground">Gdzie załatwić</dt>
                  <dd className="font-semibold">{task.recipient}</dd>
                </div>
              )}
              {task.when !== "Po spełnieniu warunków" && (
                <div>
                  <dt className="text-muted-foreground">{task.done && task.locked ? "Ukończenie" : task.due ? "Termin" : "Kiedy"}</dt>
                  <dd className="font-semibold">{task.when}</dd>
                </div>
              )}
            </dl>
          )}
          {task.description && <p className="max-w-[70ch] leading-relaxed">{task.description}</p>}
          {(task.deadlineDetail || task.documents.length > 0) && (
            <dl className="max-w-[70ch] space-y-4">
              {task.deadlineDetail && (
                <div><dt className="font-bold">Po przekroczeniu terminu</dt><dd>{task.deadlineDetail}</dd></div>
              )}
              {task.documents.length > 0 && (
                <div>
                  <dt className="font-bold">Dokumenty do przygotowania</dt>
                  <dd>
                    <ul className="list-disc space-y-1 pl-5">
                      {task.documents.map((doc) => (
                        <li key={doc.id}>
                          {doc.title}
                          {doc.instruction && <span className="block text-muted-foreground">{doc.instruction}</span>}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              )}
            </dl>
          )}
          {waiting.length > 0 && (
            <div id={statusId} className="max-w-[70ch] border-l-4 border-action bg-warning-soft px-4 py-3 text-sm">
              <p className="font-bold">Aby oznaczyć zadanie jako wykonane</p>
              <ol className="list-decimal pl-5">
                {waiting.map((entry) => {
                  const plannedBirth = entry.kind === "event" && entry.estimated;
                  const otherProfile = entry.who !== "both" && entry.who !== viewer;
                  const label = plannedBirth ? "Po porodzie dodaj rzeczywistą datę urodzenia"
                    : canConfirmDocument(entry.id) ? `Potwierdź w Planie: ${entry.title}`
                    : entry.kind === "application" ? `Wykonaj i oznacz jako ukończone: ${entry.title}` : entry.title;
                  const href = plannedBirth ? "/dodaj"
                    : remaining.some((task) => task.id === entry.id) ? `#checklist-${entry.id}` : `/plan#timeline-${entry.id}`;
                  return (
                    <li key={entry.id}>
                      {otherProfile
                        ? <span className="block py-2">{entry.title} (profil: {names[entry.who]})</span>
                        : <Link href={href} className="text-link inline-flex min-h-11 items-center">{label}</Link>}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
          {task.guide && <a href={task.guide} className="text-link min-h-11 content-center self-start text-sm">Oficjalna instrukcja</a>}
          {(task.form || submission || (task.done && task.locked)) && (
            <div id={waiting.length === 0 && (task.locked || submission) ? statusId : undefined}>
              {task.done && task.locked && !submission && (
                <p className="text-sm text-muted-foreground">Wykonanie zapisano w danych sprawy.</p>
              )}
              <ApplicationAction origin="zadania" task={task} submission={submission} />
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title="Do zrobienia"
        lead="Wnioski i formalności z Waszego planu, w kolejności terminów."
      />

      <div className="page">
      <section aria-labelledby="pozostale-zadania">
        <SectionTitle id="pozostale-zadania" tabIndex={-1} className="mb-3">Pozostałe zadania ({remaining.length})</SectionTitle>
        {remaining.length > 0 ? <ul role="list">{remaining.map(renderTask)}</ul> : <p className="text-muted-foreground">Wszystkie zadania są wykonane.</p>}
        <p className="mt-4 text-muted-foreground">
          Wnioski na szczególne sytuacje i sprawdzanie teczki ZUS znajdziesz w zakładce <Link href="/wnioski" className="text-link">Wnioski</Link>.
        </p>
      </section>

      {completed.length > 0 && (
        <section aria-labelledby="ukonczone-zadania">
          <SectionTitle id="ukonczone-zadania" className="mb-3">Ukończone zadania ({completed.length})</SectionTitle>
          <ul role="list">{completed.map(renderTask)}</ul>
        </section>
      )}
      </div>
    </main>
  );
}
