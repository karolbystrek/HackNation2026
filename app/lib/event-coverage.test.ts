// "Dodaj wydarzenie": every event type and special situation must change the plan, or say why it does not,
// and an event must give the same tasks as the matching questionnaire answer (one situation, one plan). Run from app/: npm test
import { beforeAll, expect, test, vi } from "vitest";
import { buildVariants } from "@/lib/calc/variants";
import { shiftIso } from "@/lib/dates";
import { CIRCUMSTANCES, EVENT_TYPES, type TimelineEvent } from "@/lib/events";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { planTimeline } from "@/lib/guide/timeline";
import { nextQuestion, visibleOptions, type Answers } from "@/lib/guide/tree";
import { loadJourney } from "@/lib/knowledge";
import { defaultParams as params } from "@/lib/params";
import { personas } from "@/lib/mock/personas";

const TODAY = "2026-11-22";
type Effect = "actions" | "dates" | { none: string };

/** What adding each event changes: tasks, forms, recipients or documents ("actions"), only dates, or nothing (with the reason). */
const EFFECTS: Record<string, Effect> = {
  sickLeave: "actions", birth: "dates", adoption: "actions", contract: "actions", contractEnd: "actions", business: "actions", returnToWork: "actions",
  salary: { none: "Changes only the pay used for the benefit basis; the steps and dates stay, the calculator recalculates the amount." },
  ...Object.fromEntries(Object.keys(CIRCUMSTANCES).map((key) => [`circumstance:${key}`, "actions" as Effect])),
};

const journey = loadJourney();
async function plan(personaId: string, guideAnswers: Answers, events: TimelineEvent[]) {
  const persona = currentPersona({ personaId, guideAnswers, events })!;
  const chosen = buildVariants(persona, params).find((v) => v.key === persona.initialVariant) ?? null;
  return planTimeline(persona, events, chosen, params, await journey, [], TODAY);
}

const event = (type: TimelineEvent["type"], who: TimelineEvent["who"], date: string, circumstance?: string): TimelineEvent =>
  ({ id: `added-${type}-${who}`, type, who, date, source: "new", title: type, description: "", circumstance: circumstance as TimelineEvent["circumstance"] });

/** The kinds of event to try for an EFFECTS key: each parent it can concern, dated during the pregnancy. */
function variantsOf(key: string, childDate: string): TimelineEvent[] {
  const date = shiftIso(childDate, -60);
  if (key.startsWith("circumstance:")) return [event("circumstance", "both", date, key.slice("circumstance:".length))];
  if (key === "sickLeave") return [event("sickLeave", "mother", date)];
  if (key === "birth" || key === "adoption") return [event(key, "mother", shiftIso(childDate, 3))];
  return [event(key as TimelineEvent["type"], "mother", date), event(key as TimelineEvent["type"], "father", date)];
}

const [, maja] = personas;
// The demo families, plus the self-employed mother before her sick leave (an employee files nothing: the e-ZLA goes to the employer).
const STARTS = [
  ...personas.map((p) => ({ id: p.id, events: p.events, childDate: p.birthDate ?? p.dueDate })),
  { id: maja.id, events: maja.events.filter((e) => e.type !== "sickLeave"), childDate: maja.birthDate ?? maja.dueDate },
];

function signature(entries: Awaited<ReturnType<typeof plan>>) {
  const steps = entries.filter((e) => e.kind !== "event" && e.kind !== "period");
  return {
    actions: steps.map((e) => [e.id.replace(/-added-.*$/, ""), e.who, e.form, e.recipient, (e.documents ?? []).map((d) => d.id).join("+")].join(":")).sort().join("\n"),
    dates: entries.filter((e) => e.kind !== "event").map((e) => [e.id, e.date, e.end, e.due].join(":")).sort().join("\n"),
  };
}

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));
});

test("every event type and special situation is listed in EFFECTS", () => {
  const keys = [...EVENT_TYPES.filter((t) => t.type !== "circumstance").map((t) => t.type), ...Object.keys(CIRCUMSTANCES).map((key) => `circumstance:${key}`)];
  expect(new Set(keys)).toEqual(new Set(Object.keys(EFFECTS)));
});

for (const [key, effect] of Object.entries(EFFECTS)) {
  test(`${key}: ${typeof effect === "string" ? `changes ${effect}` : "changes nothing"}`, async () => {
    const changed = { actions: false, dates: false };
    for (const start of STARTS) {
      const before = signature(await plan(start.id, {}, start.events));
      for (const added of variantsOf(key, start.childDate)) {
        const after = signature(await plan(start.id, {}, [...start.events, added]));
        if (after.actions !== before.actions) changed.actions = true;
        if (after.dates !== before.dates) changed.dates = true;
      }
    }
    if (typeof effect === "string") expect(changed[effect], `${key} should change ${effect}`).toBe(true);
    else expect(changed, `${key} should change nothing: ${effect.none}`).toEqual({ actions: false, dates: false });
  });
}

/** Answers the rest of the questionnaire like a user clicking through: first option, "no", or a sample date. */
function complete(a: Answers): Answers {
  const out = { ...a };
  for (let q = nextQuestion(out); q; q = nextQuestion(out)) {
    out[q.id] = q.type === "single" ? visibleOptions(q, out)[0]?.value : q.type === "multi" ? [] : q.type === "boolean" ? false : q.type === "number" ? 0 : "2026-10-01";
  }
  return out;
}

const pregnant = { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", largeEmployer: "yes", otherParentInsured: true };
const born = { situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", largeEmployer: "yes", otherParentInsured: true };

/** A "Dodaj wydarzenie" event and the questionnaire answers for the same situation: the listed tasks must match. */
const SAME_SITUATION: { name: string; base: Answers; added: TimelineEvent; answers: Answers; present: string[]; absent?: string[] }[] = [
  { name: "mother in hospital", base: born, added: event("circumstance", "both", "2026-11-20", "motherHospital"), answers: { ...born, special: ["motherIllOrHospital"] }, present: ["takeover-father"] },
  { name: "employer insolvency in pregnancy", base: pregnant, added: event("circumstance", "both", "2026-11-20", "employerInsolvency"), answers: { ...pregnant, special: ["jobLostInPregnancy"] }, present: ["job-loss-benefit"] },
  {
    name: "sick leave after insurance ended", base: pregnant, added: event("circumstance", "both", "2026-11-10", "sicknessAfterInsurance"),
    answers: { ...pregnant, special: ["insuranceEnded"], insuranceEndDate: "2026-11-08", sicknessStartAfterInsurance: "2026-11-10" },
    present: ["sickness-claim"], absent: ["maternity-claim"],
  },
  { name: "adoption", base: born, added: event("adoption", "mother", "2026-11-10"), answers: { situation: "adoption", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 3, largeEmployer: "yes", otherParentInsured: true }, present: ["conditions-leave", "maternity-claim"], absent: ["birth-registration"] },
  { name: "return to work during parental leave", base: born, added: event("returnToWork", "mother", "2027-05-01"), answers: { ...born, combineWithWork: true }, present: ["combine-mother"] },
  { name: "premature baby in hospital", base: born, added: event("circumstance", "both", "2026-11-05", "supplementaryLeave"), answers: { ...born, special: ["premature"], gestationWeek: 34, birthWeight: 2500, hospitalWeeks: 0 }, present: ["supplementary-check"] },
];

// docs/project-conventions.md: a job event alone does not establish the insurance, so it adds a check and keeps the plan's benefits.
test("job events ask to check the insurance instead of changing it", async () => {
  const base = complete(pregnant);
  const events = [...currentPersona({ personaId: GUIDE_ID, guideAnswers: base })!.events];
  for (const type of ["contractEnd", "contract", "business"] as const) {
    const added = event(type, "mother", "2026-07-01");
    const entries = await plan(GUIDE_ID, base, [...events, added]);
    expect(entries.find((e) => e.id === `insurance-check-${added.id}`), type).toMatchObject({ who: "mother", date: "2026-07-01" });
    expect(entries.find((e) => e.id === "parental-mother"), `${type} keeps parental leave`).toBeDefined();
  }
});

for (const row of SAME_SITUATION) {
  test(`same plan from the event and the questionnaire: ${row.name}`, async () => {
    const base = complete(row.base);
    const fromEvent = await plan(GUIDE_ID, base, [...(currentPersona({ personaId: GUIDE_ID, guideAnswers: base })!.events), row.added]);
    const answers = complete(row.answers);
    const fromAnswers = await plan(GUIDE_ID, answers, currentPersona({ personaId: GUIDE_ID, guideAnswers: answers })!.events);
    const pick = (entries: typeof fromEvent, id: string) => entries.find((e) => e.id === id);
    for (const id of row.present) {
      expect(pick(fromEvent, id), `${id} from the event`).toBeDefined();
      expect(pick(fromAnswers, id), `${id} from the answers`).toBeDefined();
      expect(pick(fromEvent, id)!.form, `${id} form`).toBe(pick(fromAnswers, id)!.form);
    }
    for (const id of row.absent ?? []) {
      expect(pick(fromEvent, id), `${id} from the event`).toBeUndefined();
      expect(pick(fromAnswers, id), `${id} from the answers`).toBeUndefined();
    }
  });
}
