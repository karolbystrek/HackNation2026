import type { ParentKey } from "@/lib/calc/leave";
import { buildVariants, type CustomLeave, type Variant, type VariantKey } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import type { FamilyTimelineEntry } from "@/lib/family-timeline";
import { planTimeline } from "@/lib/guide/timeline";
import type { Answers } from "@/lib/guide/tree";
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
  chosen: Variant | null;
  events: TimelineEvent[];
  params: Params;
  today: string;
  recipient: "zus" | "employer" | "usc";
  recipientName: string;
  waitingFor: string[];
};

export function formContext(
  persona: Persona, events: TimelineEvent[], chosenKey: VariantKey | null, params: Params,
  doneTasks: string[], today: string, taskId: string, guideAnswers: Answers = {}, customLeave?: CustomLeave,
): { entry: FamilyTimelineEntry; ctx: FormContext } | null {
  const chosen = buildVariants(persona, params, customLeave).find((variant) => variant.key === chosenKey) ?? null;
  const timeline = planTimeline(persona, events, chosen, params, doneTasks, today, guideAnswers);
  const entry = timeline.find((item) => item.id === taskId && item.form);
  if (!entry) return null;

  const byId = new Map(timeline.map((item) => [item.id, item]));
  // Steps for both parents (birth registration, birth certificate) are filed by the mother in the demo.
  const parent = entry.who === "both" ? "mother" : entry.who;
  const recipient = entry.recipient === "ZUS" ? "zus" : entry.recipient === "Urząd stanu cywilnego" ? "usc" : "employer";
  return {
    entry,
    ctx: {
      taskId, guideAnswers, customLeave, trigger: entry.trigger, persona, parent, chosen, events, params, today,
      recipient,
      recipientName: recipient === "zus" ? "ZUS" : recipient === "usc" ? `Urząd stanu cywilnego${persona.birthPlace ? ` (${persona.birthPlace})` : ""}` : (persona.parents[parent].payerName || entry.recipient || "Pracodawca"),
      waitingFor: (entry.requires ?? [])
        .map((id) => byId.get(id))
        .filter((required) => required && required.status !== "confirmed" && required.status !== "completed")
        .flatMap((required) => required ? [required.title] : []),
    },
  };
}
