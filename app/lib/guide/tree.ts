// Evaluator for guide.json: which questions to ask, in what order, which topics apply and their timeline steps.
// No imports with runtime code here, so `node --test` can load this file directly.
import type { FamilyTimelineEntry } from "@/lib/family-timeline";
import type { Params } from "@/lib/params";
import guide from "./guide.json" with { type: "json" };
import knowledge from "./knowledge.json" with { type: "json" };

export type Answer = string | number | boolean | string[];
export type Answers = Record<string, Answer | undefined>;

/** JSON predicate: one operator per object. Field names refer to question ids. */
export type Predicate =
  | { eq: [string, Answer] }
  | { in: [string, string[]] }
  | { has: [string, string | string[]] } // a multi answer contains any of the values
  | { lt: [string, number] }
  | { gte: [string, number] }
  | { all: Predicate[] }
  | { any: Predicate[] }
  | { not: Predicate }
  | { ref: string };

/** exclusive: in a multi question, picking this option unticks the others and the other way round. */
export type Option = { value: string; label: string; hint?: string; exclusive?: boolean; showIf?: Predicate };
export type Question = {
  id: string;
  priority: number;
  type: "single" | "multi" | "boolean" | "date" | "number";
  label: string;
  hint?: string;
  optional?: boolean;
  min?: number;
  max?: number;
  options?: Option[];
  showIf?: Predicate;
};
type Anchor = "birth" | "placement" | "today";
export type Step = {
  id: string;
  kind: FamilyTimelineEntry["kind"];
  who: "mother" | "father" | "both" | "me";
  anchor: Anchor;
  offsetDays?: number;
  dueDays?: number;
  lengthParam?: "maternity" | "paternity" | "paternityPart" | "parentalOwn" | "stillbirth" | "supplementary";
  /** Starts the day after this leave ends instead of at the anchor plus offsetDays. */
  startAfter?: "maternity";
  title: string;
  description: string;
  recipient?: string;
  guide?: string;
  dateNote?: string;
  requires?: string[];
  when?: Predicate;
};
type Ref = { id: string; when?: Predicate };
export type Choice = { title: string; body: string; when?: Predicate };
export type Topic = {
  id: string;
  priority: number;
  title: string;
  when: Predicate;
  steps: Step[];
  benefitIds?: string[];
  scenarios?: Ref[];
  riskIds?: (string | Ref)[];
  choices?: Choice[];
  support?: { situation: string; when: Predicate }[];
};
type Guide = { version: number; predicates: Record<string, Predicate>; questions: Question[]; topics: Topic[] };

const spec = guide as unknown as Guide;
const byPriority = <T extends { priority: number }>(items: T[]) => [...items].sort((a, b) => a.priority - b.priority);
export const questions = byPriority(spec.questions);
export const topics = byPriority(spec.topics);

export function test(p: Predicate | undefined, a: Answers): boolean {
  if (!p) return true;
  if ("eq" in p) return a[p.eq[0]] === p.eq[1];
  if ("in" in p) return p.in[1].includes(a[p.in[0]] as string);
  if ("has" in p) {
    const value = a[p.has[0]];
    const wanted = ([] as string[]).concat(p.has[1]);
    return Array.isArray(value) && wanted.some((w) => value.includes(w));
  }
  if ("lt" in p) return typeof a[p.lt[0]] === "number" && (a[p.lt[0]] as number) < p.lt[1];
  if ("gte" in p) return typeof a[p.gte[0]] === "number" && (a[p.gte[0]] as number) >= p.gte[1];
  if ("all" in p) return p.all.every((x) => test(x, a));
  if ("any" in p) return p.any.some((x) => test(x, a));
  if ("not" in p) return !test(p.not, a);
  const named = spec.predicates[p.ref];
  if (!named) throw new Error(`Unknown predicate ref: ${p.ref}`);
  return test(named, a);
}

/** Drops answers to questions that are hidden now, e.g. after the user went back and changed an earlier one. */
export function activeAnswers(a: Answers): Answers {
  const kept: Answers = {};
  for (const q of questions) if (test(q.showIf, kept) && a[q.id] !== undefined) kept[q.id] = a[q.id];
  return kept;
}

/** Glossary markup in question texts: [visible text](term.id). */
export const TERM = /\[([^\]]+)\]\((term\.[a-z0-9_]+)\)/g;
/** The text with glossary markup removed, for places that cannot show a popup. */
export const plainText = (s: string) => s.replace(TERM, "$1");

export const visibleQuestions = (a: Answers) => questions.filter((q) => test(q.showIf, activeAnswers(a)));
export const visibleOptions = (q: Question, a: Answers) => (q.options ?? []).filter((o) => test(o.showIf, activeAnswers(a)));
/** The next question to ask, or undefined when the questionnaire is complete. */
export const nextQuestion = (a: Answers) => visibleQuestions(a).find((q) => a[q.id] === undefined);
export const matchedTopics = (a: Answers) => topics.filter((t) => test(t.when, activeAnswers(a)));

function shift(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Supplementary maternity leave: a week per started week in hospital, capped by gestation week and birth weight (art. 180² k.p.). */
export function supplementaryWeeks(a: Answers, params: Params) {
  const { capSevereWeeks, capWeeks, weekLow, weightLow } = params.supplementary;
  const severe = Number(a.gestationWeek) < weekLow || Number(a.birthWeight) <= weightLow;
  return Math.min(Math.ceil(Number(a.hospitalWeeks) || 0), severe ? capSevereWeeks : capWeeks);
}

function weeks(step: Step, a: Answers, params: Params) {
  const children = Math.min(Math.max(Number(a.childrenCount ?? 1), 1), params.maternityWeeks.length);
  switch (step.lengthParam) {
    case "maternity": return params.maternityWeeks[children - 1];
    case "paternity": return params.paternityWeeks;
    case "paternityPart": return params.paternityWeeks / 2;
    case "parentalOwn": return params.parentalOwnWeeks;
    case "stillbirth": return params.stillbirthWeeks;
    case "supplementary": return supplementaryWeeks(a, params) || undefined;
    default: return undefined;
  }
}

/** Timeline entries for the matched topics. Steps whose anchor date is not known yet are left out. */
export function buildGuideTimeline(answers: Answers, params: Params, today: string): FamilyTimelineEntry[] {
  const a = activeAnswers(answers);
  const anchors: Record<Anchor, string | undefined> = {
    birth: (a.birthDate ?? a.dueDate) as string | undefined,
    placement: a.placementDate as string | undefined,
    today,
  };
  const me = a.role === "mother" || a.role === "father" ? a.role : "both";

  return matchedTopics(a)
    .flatMap((t) => t.steps.filter((s) => test(s.when, a)))
    .flatMap((s): FamilyTimelineEntry[] => {
      const anchor = anchors[s.anchor];
      if (!anchor) return [];
      const date = s.startAfter ? shift(anchor, weeks({ ...s, lengthParam: s.startAfter }, a, params)! * 7) : shift(anchor, s.offsetDays ?? 0);
      const length = weeks(s, a, params);
      const due = s.dueDays === undefined ? undefined : shift(anchor, s.dueDays);
      const status = s.kind === "application" ? (due && due < today ? "late" : "ready") : "planned";
      return [{
        id: s.id, kind: s.kind, who: s.who === "me" ? me : s.who, title: s.title, description: s.description,
        date, due, end: length ? shift(date, length * 7 - 1) : undefined,
        estimated: s.anchor === "birth" && !a.birthDate, dateNote: s.dateNote,
        recipient: s.recipient, guide: s.guide, requires: s.requires, status,
      }];
    })
    .sort((x, y) => (x.due ?? x.date).localeCompare(y.due ?? y.date));
}

type KStep = { order: number; actor: string; action_pl: string; recipient?: string; form_ids?: string[]; document_ids?: string[]; leave_request_ids?: string[] };
type Knowledge = {
  actors: Record<string, string>;
  benefits: Record<string, { title_pl: string; summary_pl: string }>;
  scenarios: Record<string, { title_pl: string; summary_pl: string; steps: KStep[]; risk_ids?: string[] }>;
  forms: Record<string, { symbol: string; title_pl: string; page_url?: string }>;
  documents: Record<string, { title_pl: string; how_to_obtain_pl?: string }>;
  leave_requests: Record<string, { code: string; title_pl: string }>;
  risks: Record<string, { title_pl: string; consequence_pl: string; prevention_pl: string }>;
  support_orgs: Record<string, { title_pl: string; summary_pl: string; website?: string; phones?: string[]; situations: string[] }>;
};
const kb = knowledge as unknown as Knowledge;
const withId = <T>(table: Record<string, T>, ids: string[]) => [...new Set(ids)].map((id) => ({ id, ...table[id] }));

/** Everything the end screen shows: benefits, choices, procedures with forms and documents, risks and support. */
export function resolveGuide(answers: Answers) {
  const a = activeAnswers(answers);
  const matched = matchedTopics(a);
  const refs = (list: (string | Ref)[] | undefined) =>
    (list ?? []).filter((r) => typeof r === "string" || test(r.when, a)).map((r) => (typeof r === "string" ? r : r.id));
  const scenarioIds = matched.flatMap((t) => refs(t.scenarios));
  const scenarios = withId(kb.scenarios, scenarioIds).map((s) => ({
    id: s.id,
    title: s.title_pl,
    summary: s.summary_pl,
    steps: s.steps.map((step) => ({
      order: step.order,
      action: step.action_pl,
      actor: kb.actors[step.actor] ?? step.actor,
      byInsured: step.actor === "insured",
      recipient: step.recipient ? kb.actors[step.recipient] ?? step.recipient : undefined,
      forms: withId(kb.forms, step.form_ids ?? []),
      documents: withId(kb.documents, step.document_ids ?? []),
      leaveRequests: withId(kb.leave_requests, step.leave_request_ids ?? []),
    })),
  }));
  const situations = new Set(matched.flatMap((t) => (t.support ?? []).filter((s) => test(s.when, a)).map((s) => s.situation)));
  return {
    topics: matched,
    benefits: withId(kb.benefits, matched.flatMap((t) => t.benefitIds ?? [])),
    choices: matched.flatMap((t) => (t.choices ?? []).filter((c) => test(c.when, a))),
    scenarios,
    risks: withId(kb.risks, [...matched.flatMap((t) => refs(t.riskIds)), ...scenarioIds.flatMap((id) => kb.scenarios[id].risk_ids ?? [])]),
    orgs: Object.entries(kb.support_orgs).filter(([, o]) => o.situations.some((s) => situations.has(s))).map(([id, o]) => ({ id, ...o })),
  };
}
