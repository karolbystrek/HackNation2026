import type { ParentKey } from "@/lib/calc/leave";
import { buildVariants, type Variant, type VariantKey } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import { buildFamilyTimeline, type FamilyTimelineEntry } from "@/lib/family-timeline";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

/** Everything prefill and validation need about the family; built the same way in the browser and in the API. */
export type FormContext = {
  taskId: string;
  persona: Persona;
  parent: ParentKey;
  chosen: Variant | null;
  events: TimelineEvent[];
  params: Params;
  today: string;
  recipient: "zus" | "employer";
  recipientName: string;
  waitingFor: string[];
};

export function formContext(
  persona: Persona, events: TimelineEvent[], chosenKey: VariantKey | null, params: Params,
  doneTasks: string[], today: string, taskId: string,
): { entry: FamilyTimelineEntry; ctx: FormContext } | null {
  const chosen = buildVariants(persona, params).find((variant) => variant.key === chosenKey) ?? null;
  const timeline = buildFamilyTimeline(persona, events, chosen, params, doneTasks, today);
  const entry = timeline.find((item) => item.id === taskId && item.form);
  if (!entry || entry.who === "both") return null;

  const byId = new Map(timeline.map((item) => [item.id, item]));
  const toZus = entry.recipient === "ZUS";
  return {
    entry,
    ctx: {
      taskId, persona, parent: entry.who, chosen, events, params, today,
      recipient: toZus ? "zus" : "employer",
      recipientName: toZus ? "ZUS" : persona.parents[entry.who].payerName,
      waitingFor: (entry.requires ?? [])
        .map((id) => byId.get(id)!)
        .filter((required) => required.status !== "confirmed" && required.status !== "completed")
        .map((required) => required.title),
    },
  };
}
