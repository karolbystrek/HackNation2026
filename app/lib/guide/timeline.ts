import type { Variant } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import { buildFamilyTimeline, type FamilyTimelineEntry } from "@/lib/family-timeline";
import type { Journey } from "@/lib/journey";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

/**
 * The plan for a demo profile or questionnaire answers: both go through the knowledge-driven timeline.
 * A birth or adoption recorded after the fact (source "new") replaces the estimated birth event.
 */
export function planTimeline(
  persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params, journey: Journey,
  doneTasks: string[], today: string,
): FamilyTimelineEntry[] {
  const isChild = (event: TimelineEvent) => event.type === "birth" || event.type === "adoption";
  const actualBirth = persona.events.find((event) => isChild(event) && event.source === "new");
  const currentEvents = actualBirth ? events.filter((event) => !isChild(event) || event.id === actualBirth.id) : events;
  return buildFamilyTimeline(persona, currentEvents, chosen, params, journey, doneTasks, today);
}
