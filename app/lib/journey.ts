// Which steps a family must take, decided by knowledge/scenarios.json; built on the server by lib/knowledge.ts.
import type { ParentKey } from "@/lib/calc/leave";
import type { Variant } from "@/lib/calc/variants";
import { addDays, addMonths, parseIso, toIso } from "@/lib/dates";
import type { TimelineEvent } from "@/lib/events";
import type { Condition } from "@/lib/forms/spec";
import type { Persona } from "@/lib/mock/personas";

export type Deadline = {
  title: string;
  consequence?: string;
  anchor: string;
  offset: { value: number; unit: "days" | "weeks" | "months" | "years"; direction: "before" | "after" | "at" };
  /** hard / recommended deadlines set a due date; limits only bound the leave itself. */
  kind: string;
  appliesTo: Record<string, string[]> | null;
};

/** A document the step needs; without a condition it is always needed. */
export type StepDocument = { id: string; condition?: Condition };

/** One step the parent takes (actor "insured") with a `task` tag. */
export type JourneyStep = {
  scenario: string;
  task: string;
  action: string;
  recipient: string;
  condition?: Condition;
  /** Fillable spec id for the wizard: a leave request (lr.*) or a ZUS form's field set (ff.*). */
  form?: { id: string; symbol?: string; guide?: string };
  documents: StepDocument[];
  deadlines: string[];
};

export type Journey = {
  scenarios: { id: string; conditions: Condition; steps: JourneyStep[] }[];
  deadlines: Record<string, Deadline>;
  documentTitles: Record<string, string>;
  documentInstructions?: Record<string, string>;
};

/** One parent's situation in the vocabulary of knowledge/enums.json. */
export type Facts = {
  insured_type: string;
  payer_size: string;
  parent_role: ParentKey;
  events: string[];
  flags: Record<string, unknown>;
};

const INSURED_TYPE = { uop: "employee", zlec: "contractor", jdg: "self_employed" } as const;

export function factsFor(persona: Persona, parent: ParentKey, events: TimelineEvent[], chosen: Variant | null): Facts {
  const me = persona.parents[parent];
  const takesParental = (who: ParentKey) => !!chosen?.result.periods[who].some((period) => period.kind === "parental");
  const sickInPregnancy = parent === "mother" && events.some((event) => event.type === "sickLeave" && event.who === "mother");
  const worksOnParental = !!chosen?.result.periods[parent].some((period) => period.kind === "parental" && period.workFraction > 0);
  const childEvents = persona.childEvents ?? ["birth"];
  return {
    insured_type: me.insuredType ?? INSURED_TYPE[me.contract],
    payer_size: me.payerSize,
    parent_role: parent,
    events: [...new Set([
      ...childEvents, ...(me.events ?? []),
      ...(events.some((event) => event.circumstance === "supplementaryLeave") ? ["child_hospitalisation"] : []),
      ...(sickInPregnancy ? ["sickness_in_pregnancy"] : []),
      ...(worksOnParental ? ["combine_parental_with_work"] : []),
    ])],
    flags: {
      payer_of_benefit: me.payerSize === "gt20" ? "payer" : me.payerSize === "unknown" ? "unknown" : "zus",
      chooses_averaged_rate: parent === "mother" && (chosen?.result.flatRateApplied ?? !!persona.wantsAveragedRate),
      shares_parental: takesParental("mother") && takesParental("father"),
      no_pesel: false,
      has_za_zyciem: childEvents.includes("za_zyciem"),
      school_deferral: false,
    },
  };
}

/** Truthiness of an answer: ticked, typed in, or picked. */
export function isFilled(value: unknown): boolean {
  if (value === undefined || value === null || value === false) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some((part) => typeof part === "string" && part.trim() !== "");
  return true;
}

/**
 * Evaluates a knowledge/ condition. `fact` keys resolve through `lookup` (form answers use `field:<key>`).
 * Conditions written only in prose (`note_pl`) cannot be checked and count as false.
 */
export function evalCondition(condition: Condition, facts: Facts, lookup: (fact: string) => unknown = (fact) => facts.flags[fact]): boolean {
  const test = (c: Condition) => evalCondition(c, facts, lookup);
  if (Array.isArray(condition.any)) return condition.any.some(test);
  if (Array.isArray(condition.all)) return condition.all.every(test);
  if (condition.not) return !test(condition.not as Condition);
  if (condition.insured_type) return facts.insured_type === condition.insured_type;
  if (condition.payer_size) return facts.payer_size === condition.payer_size;
  if (condition.parent_role) return facts.parent_role === condition.parent_role;
  if (condition.event) return facts.events.includes(condition.event as string);
  if (typeof condition.fact === "string") {
    const value = lookup(condition.fact);
    return condition.eq === true ? isFilled(value) : value === condition.eq;
  }
  return false;
}

function appliesTo(rule: Deadline["appliesTo"], facts: Facts) {
  // The parent who took a child in is the "adoptive" or "foster" role of knowledge/enums.json.
  const roles = [facts.parent_role, ...(facts.events.includes("adoption") ? ["adoptive"] : []), ...(facts.events.includes("foster_placement") ? ["foster"] : [])];
  return !rule || Object.entries(rule).every(([key, allowed]) =>
    key === "events" ? allowed.some((event) => facts.events.includes(event))
      : key === "parent_role" ? allowed.some((role) => roles.includes(role as ParentKey))
      : allowed.includes(String(facts[key as keyof Facts])),
  );
}

/** Steps of every scenario that matches the parent, grouped by task, in knowledge order. */
export function stepsByTask(journey: Journey, facts: Facts): Map<string, JourneyStep[]> {
  const tasks = new Map<string, JourneyStep[]>();
  for (const scenario of journey.scenarios) {
    const scenarioFacts = facts.payer_size === "unknown" && scenario.id === "scenario.employee_small_birth"
      ? { ...facts, payer_size: "le20" } : facts;
    if (!evalCondition(scenario.conditions, scenarioFacts)) continue;
    for (const step of scenario.steps) {
      if (step.condition && !evalCondition(step.condition, facts)) continue;
      tasks.set(step.task, [...(tasks.get(step.task) ?? []), step]);
    }
  }
  return tasks;
}

function shiftIso(date: string, value: number, unit: Deadline["offset"]["unit"]): string {
  const d = parseIso(date)!;
  if (unit === "days" || unit === "weeks") return toIso(addDays(d, unit === "weeks" ? value * 7 : value));
  return toIso(addMonths(d, unit === "years" ? value * 12 : value));
}

/** Earliest due date among the steps' deadlines whose anchor date is known for this task. */
export function dueDate(journey: Journey, steps: JourneyStep[], facts: Facts, anchors: Record<string, string | undefined>): string | undefined {
  const dates = steps.flatMap((step) => step.deadlines).flatMap((id) => {
    const deadline = journey.deadlines[id];
    const anchor = deadline && anchors[deadline.anchor];
    if (!anchor || deadline.kind === "limit" || !appliesTo(deadline.appliesTo, facts)) return [];
    const { value, unit, direction } = deadline.offset;
    return [shiftIso(anchor, direction === "before" ? -value : direction === "after" ? value : 0, unit)];
  });
  return dates.sort()[0];
}

/** Documents the steps need for this parent, deduplicated, with titles from knowledge/documents.json. */
export function neededDocuments(journey: Journey, steps: JourneyStep[], facts: Facts): { id: string; title: string; instruction?: string }[] {
  const ids = new Set(steps.flatMap((step) => step.documents)
    .filter((doc) => !doc.condition || evalCondition(doc.condition, facts))
    .map((doc) => doc.id));
  return [...ids].map((id) => ({ id, title: journey.documentTitles[id] ?? id, instruction: journey.documentInstructions?.[id] }));
}
