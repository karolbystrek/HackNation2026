"use client";

import Link from "next/link";
import { ApplicationAction } from "@/components/application-action";
import { DocumentList } from "@/components/document-list";
import type { Task } from "@/lib/calc/tasks";
import type { EventWho } from "@/lib/events";
import { canConfirmDocument } from "@/lib/family-timeline";
import { updatePlan, usePlan } from "@/lib/plan-store";
import { openRelated } from "@/lib/timeline-reveal";

/** What to prepare and do for one application, shown inside its timeline entry. */
export function TaskCard({ task, names, viewer }: { task: Task; names: Record<EventWho, string>; viewer: EventWho }) {
  const submission = usePlan().submissions[task.id];
  const inputId = `task-${task.id}`;
  const statusId = `${inputId}-status`;
  const waiting = task.waitingFor;

  return (
    <div className="flex flex-col gap-4">
      {(task.recipient || task.when !== "Po spełnieniu warunków") && (
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
          {task.recipient && <div><dt className="text-muted-foreground">Gdzie załatwić</dt><dd className="font-semibold">{task.recipient}</dd></div>}
          {task.when !== "Po spełnieniu warunków" && (
            <div>
              <dt className="text-muted-foreground">{task.done && task.locked ? "Ukończenie" : task.due ? "Termin" : "Kiedy"}</dt>
              <dd className="font-semibold">{task.when}</dd>
            </div>
          )}
        </dl>
      )}
      {task.description && <p>{task.description}</p>}
      {task.deadlineDetail && <div><p className="font-bold">Po przekroczeniu terminu</p><p>{task.deadlineDetail}</p></div>}
      {task.documents.length > 0 && (
        <div>
          <p className="font-bold">Dokumenty do przygotowania</p>
          <DocumentList documents={task.documents} />
        </div>
      )}
      {waiting.length > 0 && (
        <div id={statusId} className="border-l-4 border-action bg-warning-soft px-4 py-3 text-sm">
          <p className="font-bold">Aby oznaczyć zadanie jako wykonane</p>
          <ol className="list-decimal pl-5">
            {waiting.map((entry) => {
              const plannedBirth = entry.kind === "event" && entry.estimated;
              const otherProfile = entry.who !== "both" && entry.who !== viewer;
              const label = plannedBirth ? "Po porodzie dodaj rzeczywistą datę urodzenia"
                : canConfirmDocument(entry.id) ? `Potwierdź w planie: ${entry.title}`
                : entry.kind === "application" ? `Wykonaj i oznacz jako ukończone: ${entry.title}` : entry.title;
              return (
                <li key={entry.id}>
                  {otherProfile ? <span className="block py-2">{entry.title} (profil: {names[entry.who]})</span>
                    : plannedBirth ? <Link href="/dodaj" className="text-link inline-flex min-h-11 items-center">{label}</Link>
                    : <a href={`#timeline-${entry.id}`} onClick={openRelated} className="text-link inline-flex min-h-11 items-center">{label}</a>}
                </li>
              );
            })}
          </ol>
        </div>
      )}
      {task.guide && <a href={task.guide} className="text-link min-h-11 content-center self-start text-sm">Oficjalna instrukcja</a>}
      <div id={waiting.length === 0 && (task.locked || submission) ? statusId : undefined} className="flex flex-col items-start gap-3">
        {task.done && task.locked && !submission && <p className="text-sm text-muted-foreground">Wykonanie zapisano w danych sprawy.</p>}
        <ApplicationAction origin="plan" task={task} submission={submission} />
        {!submission && !(task.done && task.locked) && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 font-semibold">
            <input
              id={inputId}
              type="checkbox"
              checked={task.done}
              disabled={task.locked}
              aria-describedby={task.locked ? statusId : undefined}
              onChange={() => updatePlan((state) => ({
                ...state,
                doneTasks: task.done ? state.doneTasks.filter((id) => id !== task.id) : [...state.doneTasks, task.id],
              }))}
              className="size-5"
            />
            {task.form ? "Wniosek złożony w inny sposób (np. eZUS, u pracodawcy)" : task.title.startsWith("Sprawdź") ? "Sprawdzone" : "Zrobione"}
          </label>
        )}
      </div>
    </div>
  );
}
