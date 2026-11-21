import { formatDate } from "@/lib/dates";
import type { EventWho } from "@/lib/events";
import type { FamilyTimelineEntry } from "@/lib/family-timeline";

export type Task = {
  id: string;
  due: string | null;
  when: string;
  who: EventWho;
  title: string;
  description: string;
  guide?: string;
  done: boolean;
  locked: boolean;
  waitingFor: string[];
};

/** Applications from the timeline, as a checklist. */
export function buildTasks(timeline: FamilyTimelineEntry[]): Task[] {
  const byId = new Map(timeline.map((entry) => [entry.id, entry]));

  return timeline.filter((entry) => entry.kind === "application").map((entry) => ({
    id: entry.id,
    due: entry.due ?? null,
    when: entry.completedOn ? `Wykonano ${formatDate(entry.completedOn)}` : entry.due ? `do ${formatDate(entry.due)}${entry.estimated ? " (szacunkowo)" : ""}` : "Po spełnieniu warunków",
    who: entry.who,
    title: entry.title,
    description: entry.description,
    guide: entry.guide,
    done: entry.status === "completed",
    locked: !!entry.completedOn || entry.status === "blocked",
    waitingFor: (entry.requires ?? [])
      .flatMap((id) => byId.get(id) ?? [])
      .filter((required) => required.status !== "confirmed" && required.status !== "completed")
      .map((required) => required.title),
  }));
}
