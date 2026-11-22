// Every questionnaire answer must change the plan, or say why it does not.
// For each question, the test changes only that answer in many starting families and compares the plans.
// A new question fails here until it is listed in EFFECTS. Run from app/: npm test
import { beforeAll, expect, test, vi } from "vitest";
import { buildVariants } from "@/lib/calc/variants";
import { buildFamilyTimeline } from "@/lib/family-timeline";
import { personaFromAnswers } from "@/lib/guide/persona";
import { activeAnswers, nextQuestion, questions, test as holds, visibleOptions, type Answer, type Answers, type Question } from "@/lib/guide/tree";
import { loadJourney } from "@/lib/knowledge";
import { defaultParams as params } from "@/lib/params";

type Effect = "actions" | "dates" | "money" | { none: string };

/** What each answer must change: tasks, forms, recipients or documents ("actions"), only dates, only amounts, or nothing (with the reason). */
const EFFECTS: Record<string, Effect> = {
  situation: "actions", role: "actions", insurance: "actions", voluntarySickness: "actions", special: "actions",
  largeEmployer: "actions", otherParentInsured: "actions", wantsAveragedRate: "actions", combineWithWork: "actions",
  hospitalWeeks: "actions", supplementaryParent: "actions", birthDate: "actions", childDeathDate: "actions",
  childAge: "actions", adoptedChildBirthDate: "actions", insuranceEndDate: "actions", sicknessStartAfterInsurance: "actions",
  paternityParts: "actions",
  dueDate: "dates", placementDate: "dates", multiplePregnancy: "dates", multipleBirth: "dates", multiplePlacement: "dates",
  childrenCount: "dates", birthCardDate: "dates", gestationWeek: "dates", birthWeight: "dates", adoptionOrderDate: "dates",
  monthlyIncome: "money",
  insuredSince: { none: "Maternity benefit has no waiting period (ustawa zasiłkowa art. 29); the plan does not size sickness benefit." },
  waitingWaiver: { none: "Only waives the sickness-benefit waiting period (art. 4 ust. 3); the plan does not size sickness benefit." },
  employmentPeriod: { none: "Only sets the insured-from date, like insuredSince; the plan does not size sickness benefit." },
  over50: { none: "Only changes how many sick days the employer pays (14 instead of 33, KP art. 92); not part of the plan." },
};

// Two or more values per question, chosen on both sides of the legal limits.
const NUMBERS: Record<string, number[]> = { childAge: [2, 15], childrenCount: [2, 3], gestationWeek: [26, 34], birthWeight: [900, 2500], hospitalWeeks: [0, 12], monthlyIncome: [3000, 12000] };
const DATES: Record<string, string[]> = {
  dueDate: ["2027-03-01", "2027-06-01"], birthDate: ["2026-11-01", "2026-06-01"], placementDate: ["2026-11-10", "2026-09-01"],
  insuredSince: ["2020-01-01", "2026-10-01"], insuranceEndDate: ["2026-11-08", "2026-10-01"], sicknessStartAfterInsurance: ["2026-11-10", "2026-12-20"],
  birthCardDate: ["2026-11-02", "2026-11-15"], childDeathDate: ["2026-11-20", "2027-02-01"], adoptedChildBirthDate: ["2023-01-01", "2010-01-01"],
  adoptionOrderDate: ["2027-02-01", "2026-12-01"],
};

function values(q: Question, a: Answers): Answer[] {
  const options = visibleOptions(q, a).map((o) => o.value);
  if (q.type === "single") return options;
  if (q.type === "multi") return q.id === "special" ? [[], ...options.map((o) => [o])] : options.map((o) => [o]);
  if (q.type === "boolean") return [false, true];
  if (q.type === "number") return NUMBERS[q.id] ?? [1, 2];
  return DATES[q.id] ?? ["2026-11-01", "2027-01-01"];
}

/** Answers every still-open question with its first value, like a user clicking through. */
function complete(a: Answers): Answers {
  const out = { ...a };
  for (let q = nextQuestion(out); q; q = nextQuestion(out)) out[q.id] = q.id === "insurance" ? ["employment"] : values(q, out)[0];
  return out;
}

const STARTS: Answers[] = [
  { situation: "born", role: "mother" }, { situation: "pregnant", role: "mother" }, { situation: "planning", role: "mother" },
  { situation: "born", role: "father" }, { situation: "pregnant", role: "father" },
  { situation: "adoption", role: "mother" }, { situation: "adoption", role: "father" }, { situation: "foster", role: "mother" },
  { situation: "born", role: "mother", insurance: ["business"], voluntarySickness: true },
  { situation: "born", role: "mother", insurance: ["mandate"], voluntarySickness: true },
  { situation: "born", role: "father", insurance: ["business"], voluntarySickness: true },
  { situation: "adoption", role: "mother", otherParentInsured: true },
  // Above both thresholds (week 28, 1000 g), so either answer alone can move the cap from 8 to 15 weeks.
  { situation: "born", role: "mother", special: ["premature"], hospitalWeeks: 12, gestationWeek: 34, birthWeight: 2500 },
  { situation: "born", role: "mother", special: ["childDeath"] },
  { situation: "pregnant", role: "mother", special: ["insuranceEnded"] },
  { situation: "born", role: "mother", multipleBirth: true },
].map(complete);

const journey = loadJourney();
async function plan(a: Answers) {
  const persona = personaFromAnswers(a);
  const chosen = buildVariants(persona, params).find((v) => v.key === persona.initialVariant) ?? null;
  const entries = buildFamilyTimeline(persona, persona.events, chosen, params, await journey, [], "2026-11-22");
  const steps = entries.filter((e) => e.kind !== "event" && e.kind !== "period");
  return {
    actions: steps.map((e) => [e.id, e.who, e.form, e.recipient, (e.documents ?? []).map((d) => d.id).join("+"), e.extra].join(":")).sort().join("\n"),
    dates: entries.map((e) => [e.id, e.date, e.end, e.due].join(":")).sort().join("\n"),
    money: chosen ? Math.round(chosen.result.familyTotal) : 0,
  };
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-22T10:00:00Z"));
});

test("every question is listed in EFFECTS", () => {
  expect(new Set(questions.map((q) => q.id))).toEqual(new Set(Object.keys(EFFECTS)));
});

for (const id of Object.keys(EFFECTS)) {
  test(`${id}: ${typeof EFFECTS[id] === "string" ? `changes ${EFFECTS[id]}` : "changes nothing"}`, async () => {
    const changed = { actions: false, dates: false, money: false };
    let asked = 0;
    for (const q of questions.filter((q) => q.id === id)) for (const start of STARTS) {
      if (!holds(q.showIf, activeAnswers(start))) continue;
      asked++;
      const plans = await Promise.all(values(q, start).map((v) => plan(complete({ ...start, [id]: v }))));
      for (const key of ["actions", "dates", "money"] as const) if (new Set(plans.map((p) => p[key])).size > 1) changed[key] = true;
    }
    expect(asked, `${id} is never asked in the starting families`).toBeGreaterThan(0);
    const effect = EFFECTS[id];
    if (typeof effect === "string") expect(changed[effect], `${id} should change ${effect}`).toBe(true);
    else expect(changed, `${id} should change nothing: ${effect.none}`).toEqual({ actions: false, dates: false, money: false });
  });
}
