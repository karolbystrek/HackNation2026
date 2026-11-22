"use client";

import Link from "next/link";
import { ApplicationAction, ApplicationReceipt } from "@/components/application-action";
import { DocumentList } from "@/components/document-list";
import type { Task } from "@/lib/calc/tasks";
import type { EventWho } from "@/lib/events";
import { canConfirmDocument } from "@/lib/family-timeline";
import { updatePlan, usePlan } from "@/lib/plan-store";
import { openRelated } from "@/lib/timeline-reveal";

/** What to prepare and do for one application, shown inside its timeline entry. */
export function TaskCard({ task, names, viewer, preparedBy }: { task: Task; names: Record<EventWho, string>; viewer: EventWho; preparedBy?: string }) {
  const submission = usePlan().submissions[task.id];
  const inputId = `task-${task.id}`;
  const statusId = `${inputId}-status`;
  const waiting = task.waitingFor;

  if (submission) return <ApplicationReceipt id={task.id} submission={submission} origin="plan" showDate={false} />;

  return (
    <div className="flex flex-col gap-4">
      {waiting.length > 0 && (
        <div id={statusId}>
          <p className="font-semibold">Do wykonania wcześniej</p>
          <ul className="space-y-1">
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
          </ul>
        </div>
      )}
      {preparedBy && <p>Wypełnia {preparedBy.toLowerCase()}.</p>}
      {task.recipient && !task.done && (
        <p>{task.form && !preparedBy && task.recipient === "Pracodawca" ? "Złóż u pracodawcy."
          : task.form ? `Adresat: ${task.recipient}` : `Gdzie: ${task.recipient}`}</p>
      )}
      <ApplicationAction origin="plan" task={task} preview={!!preparedBy} />
      {!task.form && task.description && <p>{task.description}</p>}
      {!task.form && task.deadlineDetail && <p>{task.deadlineDetail}</p>}
      {!task.done && task.documents.length > 0 && (
        <div className="space-y-1">
          <p className="font-semibold">Dokumenty do przygotowania</p>
          <DocumentList documents={task.documents} />
        </div>
      )}
      {task.guide && <a href={task.guide} className="text-link min-h-11 content-center self-start text-sm">Oficjalna instrukcja</a>}
      <div id={waiting.length === 0 && task.locked ? statusId : undefined} className="flex flex-col items-start">
        {!(task.done && task.locked) && (
          <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
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
