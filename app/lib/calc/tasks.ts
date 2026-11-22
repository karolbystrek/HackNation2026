import { formatDate } from "@/lib/dates";
import type { EventWho } from "@/lib/events";
import type { FamilyTimelineEntry } from "@/lib/family-timeline";

import type { RequiredDocument } from "@/lib/journey";

export type Task = {
  id: string;
  due: string | null;
  when: string;
  who: EventWho;
  title: string;
  description: string;
  guide?: string;
  recipient?: string;
  deadlineDetail?: string;
  form?: string;
  extra: boolean;
  documents: RequiredDocument[];
  done: boolean;
  locked: boolean;
  waitingFor: FamilyTimelineEntry[];
};

/** Applications from the timeline, as a checklist. */
export function buildTasks(timeline: FamilyTimelineEntry[]): Task[] {
  const byId = new Map(timeline.map((entry) => [entry.id, entry]));

  function prerequisites(entry: FamilyTimelineEntry) {
    const seen = new Set([entry.id]);
    const pending: FamilyTimelineEntry[] = [];

    function visit(id: string) {
      const required = byId.get(id);
      if (!required || seen.has(id) || required.status === "confirmed" || required.status === "completed") return;
      seen.add(id);
      required.requires?.forEach(visit);
      pending.push(required);
    }

    entry.requires?.forEach(visit);
    return pending;
  }

  return timeline.filter((entry) => entry.kind === "application").map((entry) => ({
    id: entry.id,
    due: entry.due ?? null,
    when: entry.completedOn ? `Wykonano ${formatDate(entry.completedOn)}` : entry.due ? `do ${formatDate(entry.due)}${entry.estimated ? " (szacunkowo)" : ""}` : entry.dateNote ?? (entry.extra ? formatDate(entry.date) : "Po spełnieniu warunków"),
    who: entry.who,
    title: entry.title,
    description: entry.description,
    guide: entry.guide,
    recipient: entry.recipient,
    deadlineDetail: entry.deadlineDetail,
    form: entry.form,
    extra: !!entry.extra,
    documents: entry.documents ?? [],
    done: entry.status === "completed",
    locked: !!entry.completedOn || entry.status === "blocked",
    waitingFor: entry.status === "blocked" ? prerequisites(entry) : [],
  }));
}

/** The earliest-due task the parent can act on now; undated tasks come last. */
export function nextTask(tasks: Task[]): Task | undefined {
  return tasks.filter((task) => !task.done && !task.locked && !task.extra)
    .sort((a, b) => (a.due ?? "9999").localeCompare(b.due ?? "9999"))[0];
}

/** Done vs all main (non-extra) tasks, for the plan progress bar. */
export function progress(tasks: Task[]) {
  const main = tasks.filter((task) => !task.extra);
  return { done: main.filter((task) => task.done).length, total: main.length };
}
