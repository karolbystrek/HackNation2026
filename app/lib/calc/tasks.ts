import type { Variant } from "@/lib/calc/variants";
import { formatDate } from "@/lib/dates";
import type { EventWho, TimelineEvent } from "@/lib/events";
import { buildFamilyTimeline } from "@/lib/family-timeline";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

export type Task = {
  id: string;
  due: string | null;
  when: string;
  who: EventWho;
  title: string;
  description: string;
  guide?: string;
  form?: string;
  extra: boolean;
  done: boolean;
  locked: boolean;
  waitingFor: string[];
};

export function buildTasks(persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params, doneTasks: string[], today: string): Task[] {
  const timeline = buildFamilyTimeline(persona, events, chosen, params, doneTasks, today);
  const byId = new Map(timeline.map((entry) => [entry.id, entry]));

  return timeline.filter((entry) => entry.kind === "application").map((entry) => ({
    id: entry.id,
    due: entry.due ?? null,
    when: entry.completedOn ? `Wykonano ${formatDate(entry.completedOn)}` : entry.due ? `do ${formatDate(entry.due)}${entry.estimated ? " (szacunkowo)" : ""}` : entry.dateNote ?? (entry.extra ? formatDate(entry.date) : "Po spełnieniu warunków"),
    who: entry.who,
    title: entry.title,
    description: entry.description,
    guide: entry.guide,
    form: entry.form,
    extra: !!entry.extra,
    done: entry.status === "completed",
    locked: !!entry.completedOn || entry.status === "blocked",
    waitingFor: (entry.requires ?? [])
      .map((id) => byId.get(id)!)
      .filter((required) => required.status !== "confirmed" && required.status !== "completed")
      .map((required) => required.title),
  }));
}
