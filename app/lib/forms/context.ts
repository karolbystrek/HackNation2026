import type { ParentKey } from "@/lib/calc/leave";
import { buildVariants, type CustomLeave, type Variant, type VariantKey } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import type { FamilyTimelineEntry } from "@/lib/family-timeline";
import { planTimeline } from "@/lib/guide/timeline";
import type { Answers } from "@/lib/guide/tree";
import type { Journey } from "@/lib/journey";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

/** Everything prefill and validation need about the family; built the same way in the browser and in the API. */
export type FormContext = {
  taskId: string;
  guideAnswers: Answers;
  customLeave?: CustomLeave;
  trigger?: TimelineEvent;
  persona: Persona;
  parent: ParentKey;
  viewer?: ParentKey;
  chosen: Variant | null;
  events: TimelineEvent[];
  params: Params;
  today: string;
  recipient: "zus" | "employer" | "usc";
  recipientName: string;
  waitingFor: string[];
};

export function formContext(
  persona: Persona, events: TimelineEvent[], chosenKey: VariantKey | null, params: Params, journey: Journey,
  doneTasks: string[], today: string, taskId: string, guideAnswers: Answers = {}, customLeave?: CustomLeave, viewer?: ParentKey,
): { entry: FamilyTimelineEntry; ctx: FormContext } | null {
  const chosen = buildVariants(persona, params, customLeave, events).find((variant) => variant.key === chosenKey) ?? null;
  const timeline = planTimeline(persona, events, chosen, params, journey, doneTasks, today);
  const entry = timeline.find((item) => item.id === taskId && item.form && (!viewer || item.who === "both" || item.who === viewer));
  if (!entry) return null;

  const byId = new Map(timeline.map((item) => [item.id, item]));
  const parent = entry.who === "both" ? (viewer ?? "mother") : entry.who;
  const recipient = entry.recipient === "ZUS" ? "zus" : entry.recipient === "Urząd stanu cywilnego" ? "usc" : "employer";
  return {
    entry,
    ctx: {
      taskId, guideAnswers, customLeave, viewer, trigger: entry.trigger, persona, parent, chosen, events, params, today,
      recipient,
      recipientName: recipient === "zus" ? "ZUS" : recipient === "usc" ? `Urząd stanu cywilnego${persona.birthPlace ? ` (${persona.birthPlace})` : ""}` : (persona.parents[parent].payerName || entry.recipient || "Pracodawca"),
      waitingFor: (entry.requires ?? [])
        .map((id) => byId.get(id))
        .filter((required) => required && required.status !== "confirmed" && required.status !== "completed")
        .flatMap((required) => required ? [required.title] : []),
    },
  };
}
