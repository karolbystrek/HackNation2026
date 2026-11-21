import type { Variant } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import { applyProgress, buildFamilyTimeline, type FamilyTimelineEntry } from "@/lib/family-timeline";
import { GUIDE_ID } from "@/lib/guide/persona";
import { buildGuideTimeline, type Answers } from "@/lib/guide/tree";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

export function planTimeline(
  persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params,
  doneTasks: string[], today: string, answers: Answers,
): FamilyTimelineEntry[] {
  const actualBirth = persona.events.find((event) => event.type === "birth" && event.source === "new");
  const currentEvents = actualBirth ? events.filter((event) => event.type !== "birth" || event.id === actualBirth.id) : events;
  const family = buildFamilyTimeline(persona, currentEvents, chosen, params, doneTasks, today);
  if (persona.id !== GUIDE_ID) return family;

  const guide = buildGuideTimeline(answers, params, today, actualBirth?.date);
  const addedIds = new Set(currentEvents.filter((event) => event.source === "new").map((event) => `event-${event.id}`));
  const added = family.filter((entry) => addedIds.has(entry.id));
  const hasBirthRegistration = guide.some((entry) => entry.id === "birth-registration");
  if (hasBirthRegistration) {
    const card = family.find((entry) => entry.id === "birth-card");
    const copy = family.find((entry) => entry.id === "birth-certificate-copy");
    const registration = guide.find((entry) => entry.id === "birth-registration")!;
    if (!actualBirth && !guide.some((entry) => entry.id === "birth")) {
      guide.push({
        id: "birth", kind: "event", who: "both", date: persona.birthDate ?? persona.dueDate,
        title: "Narodziny dziecka", description: "Po porodzie wpisz datę urodzenia w Planie.",
        estimated: !persona.birthDate, status: "planned",
      });
    }
    if (card && copy) {
      guide.push({ ...card, requires: [actualBirth ? `event-${actualBirth.id}` : "birth"] }, copy);
      registration.requires = ["birth-card"];
    }
  }
  const variantEntries = chosen ? family.filter((entry) => /^(parental-(mother|father)(-period)?|combine-(mother|father))$/.test(entry.id)) : [];
  return applyProgress([
    ...guide.filter((entry) => (!variantEntries.length || !["parental-request", "parental-period", "combine-request"].includes(entry.id)) && (chosen?.input.paternity !== false || !["paternity-request", "paternity-period"].includes(entry.id)) && (!actualBirth || entry.id !== "birth")),
    ...added, ...variantEntries, ...family.filter((entry) => entry.trigger && !guide.some((step) => step.form === entry.form)),
  ], doneTasks, today);
}
