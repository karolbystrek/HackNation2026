import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { TERM, activeAnswers, buildGuideTimeline, matchedTopics, nextQuestion, plainText, questions, resolveGuide, supplementaryWeeks, topics, visibleQuestions } from "../lib/guide/tree.ts";
import guide from "../lib/guide/guide.json" with { type: "json" };
import knowledge from "../lib/guide/knowledge.json" with { type: "json" };

const ids = (a) => matchedTopics(a).map((t) => t.id);
const params = { maternityWeeks: [20, 31, 33, 35, 37], paternityWeeks: 2, parentalOwnWeeks: 9, stillbirthWeeks: 8, supplementary: { capSevereWeeks: 15, capWeeks: 8, weekLow: 28, weightLow: 1000 } };

// Collects every answer field and named predicate a predicate reads.
function reads(p, out = new Set()) {
  if (!p) return out;
  const [op, arg] = Object.entries(p)[0];
  if (op === "ref") reads(guide.predicates[arg], out);
  else if (op === "not") reads(arg, out);
  else if (op === "all" || op === "any") arg.forEach((x) => reads(x, out));
  else out.add(arg[0]);
  return out;
}

test("every question reads only answers to questions with a lower priority", () => {
  const priority = Object.fromEntries(questions.map((q) => [q.id, q.priority]));
  for (const q of questions) {
    const preds = [q.showIf, ...(q.options ?? []).map((o) => o.showIf)];
    for (const field of preds.flatMap((p) => [...reads(p)])) {
      assert.ok(field in priority, `${q.id} reads unknown ${field}`);
      assert.ok(priority[field] < q.priority, `${q.id} reads ${field}`);
    }
  }
  for (const t of topics) {
    const preds = [t.when, ...[t.scenarios, t.riskIds, t.choices, t.support, t.steps].flatMap((list) => (list ?? []).map((x) => x.when))];
    for (const field of preds.flatMap((p) => [...reads(p)])) assert.ok(field in priority, `${t.id} reads unknown ${field}`);
  }
});

test("questions come in priority order and stop when all are answered", () => {
  assert.equal(nextQuestion({}).id, "situation");
  assert.equal(nextQuestion({ situation: "pregnant" }).id, "role");
  const a = { situation: "planning", role: "mother", insurance: ["employment"], insuredSince: "2026-01-01", largeEmployer: "yes", otherParentInsured: true, combineWithWork: false, over50: false, monthlyIncome: 6000 };
  assert.equal(nextQuestion(a), undefined);
});

test("changing an earlier answer drops answers to questions that are now hidden", () => {
  const a = activeAnswers({ situation: "born", birthDate: "2026-11-01", insurance: ["business"], voluntarySickness: true, special: ["stillbirth"] });
  assert.equal(activeAnswers({ ...a, situation: "planning" }).birthDate, undefined);
  assert.equal(activeAnswers({ ...a, insurance: ["employment"] }).voluntarySickness, undefined);
});

test("pregnant JDG mother without voluntary insurance sees risks, no sickness benefit", () => {
  const a = { situation: "pregnant", role: "mother", insurance: ["business"], voluntarySickness: false };
  assert.ok(ids(a).includes("risks"));
  assert.ok(!ids(a).includes("sicknessPregnancy"));
  assert.ok(!visibleQuestions(a).some((q) => q.id === "insuredSince"));
});

test("employed father of a newborn sees paternity, parental and filing", () => {
  const got = ids({ situation: "born", role: "father", insurance: ["employment"] });
  for (const id of ["paternity", "parental", "employeeProtection"]) assert.ok(got.includes(id), id);
});

test("adoption of a 10-year-old gives leave on maternity terms", () => {
  assert.ok(ids({ situation: "adoption", insurance: ["employment"], childAge: 10 }).includes("adoptionLeave"));
});

test("timeline for an employed mother expecting twins", () => {
  const a = { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: true, childrenCount: 2, wantsAveragedRate: true };
  const byId = Object.fromEntries(buildGuideTimeline(a, params, "2026-11-21").map((e) => [e.id, e]));
  assert.equal(byId["pre-birth-leave"].date, "2027-01-18");
  assert.equal(byId["averaged-rate"].due, "2027-03-22");
  assert.equal(byId["maternity-period"].end, "2027-10-03"); // 31 weeks
  assert.ok(byId["maternity-period"].estimated);
  assert.equal(byId["parental-period"].who, "mother");
  assert.ok(!byId["sick-claim-zas53"]);
});

test("planning has no birth date, so only undated-anchor steps appear", () => {
  const got = buildGuideTimeline({ situation: "planning", role: "mother", insurance: ["employment"] }, params, "2026-11-21");
  assert.ok(got.every((e) => e.date === "2026-11-21"));
  assert.ok(got.some((e) => e.id === "sick-ezla"));
});

const forms = (r) => r.scenarios.flatMap((s) => s.steps.flatMap((step) => step.forms.map((f) => f.symbol)));
const has = (list, id) => list.some((x) => x.id === id);

test("pregnant JDG mother with voluntary insurance files ZAS-53 and ZAM with ZUS", () => {
  const r = resolveGuide({ situation: "pregnant", role: "mother", insurance: ["business"], voluntarySickness: true, dueDate: "2027-03-01", multiplePregnancy: false, otherParentInsured: true });
  assert.ok(has(r.scenarios, "scenario.self_employed"));
  for (const symbol of ["ZAS-53", "ZAM"]) assert.ok(forms(r).includes(symbol), symbol);
  assert.ok(has(r.risks, "risk.jdg_debt"));
  assert.ok(has(r.benefits, "benefit.maternity_leave") && has(r.benefits, "benefit.sickness_pregnancy"));
  assert.ok(r.choices.some((c) => c.title.includes("81,5%")));
});

test("employee mother: payer size picks the procedure, unknown shows both", () => {
  const base = { situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false };
  const big = resolveGuide({ ...base, largeEmployer: "yes" });
  assert.ok(has(big.scenarios, "scenario.employee_large_birth") && !has(big.scenarios, "scenario.employee_small_birth"));
  const unknown = resolveGuide({ ...base, largeEmployer: "unknown" });
  assert.ok(has(unknown.scenarios, "scenario.employee_large_birth") && has(unknown.scenarios, "scenario.employee_small_birth"));
});

test("premature birth adds supplementary leave and prematurity support", () => {
  const r = resolveGuide({ situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false, special: ["premature"], gestationWeek: 32, birthWeight: 1800, hospitalWeeks: 3 });
  assert.ok(has(r.benefits, "benefit.supplementary_maternity"));
  assert.ok(has(r.orgs, "org.wczesniak"));
  assert.ok(!has(r.orgs, "org.poronienie"));
});

test("uninsured parent learns about the parental allowance", () => {
  const r = resolveGuide({ situation: "pregnant", role: "mother", insurance: ["none"], dueDate: "2027-03-01" });
  assert.ok(has(r.benefits, "benefit.parental_allowance"));
  assert.ok(!has(r.benefits, "benefit.maternity_leave"));
});

test("supplementary leave: a week per week in hospital, capped by gestation week and weight", () => {
  assert.equal(supplementaryWeeks({ gestationWeek: 26, birthWeight: 1200, hospitalWeeks: 10 }, params), 10);
  assert.equal(supplementaryWeeks({ gestationWeek: 32, birthWeight: 1500, hospitalWeeks: 12 }, params), 8);
  assert.equal(supplementaryWeeks({ gestationWeek: 30, birthWeight: 900, hospitalWeeks: 20 }, params), 15);
  assert.equal(supplementaryWeeks({ gestationWeek: 38, birthWeight: 3200, hospitalWeeks: 1.5 }, params), 2);
});

test("premature baby: supplementary period starts the day after maternity ends", () => {
  const a = { situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false, special: ["premature"], gestationWeek: 30, birthWeight: 1400, hospitalWeeks: 4 };
  assert.ok(visibleQuestions(a).some((q) => q.id === "hospitalWeeks"));
  const byId = Object.fromEntries(buildGuideTimeline(a, params, "2026-11-21").map((e) => [e.id, e]));
  assert.equal(byId["maternity-period"].end, "2027-03-20");
  assert.equal(byId["supplementary-period"].date, "2027-03-21");
  assert.equal(byId["supplementary-period"].end, "2027-04-17");
  assert.ok(!ids({ ...a, hospitalWeeks: 0 }).includes("supplementary"));
});

test("employer pays 14 sick days after 50, 33 before", () => {
  const a = { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01" };
  const ezla = (x) => buildGuideTimeline(x, params, "2026-11-21").find((e) => e.id === "sick-ezla").description;
  assert.match(ezla({ ...a, over50: false }), /33 dni/);
  assert.match(ezla({ ...a, over50: true }), /14 dni/);
});

test("paternity in two parts gives two periods", () => {
  const a = { situation: "born", role: "father", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false, paternityParts: "two" };
  const got = buildGuideTimeline(a, params, "2026-11-21").map((e) => e.id);
  assert.ok(got.includes("paternity-part-1") && got.includes("paternity-part-2") && !got.includes("paternity-period"));
});

test("insurance ended in pregnancy: claim with ZAS-53 and Z-10", () => {
  const r = resolveGuide({ situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", special: ["insuranceEnded"] });
  assert.ok(has(r.scenarios, "scenario.sickness_after_insurance"));
  assert.ok(forms(r).includes("Z-10"));
});

const snapshot = new URL("../../scripts/guide-knowledge.mjs", import.meta.url);
test("knowledge snapshot matches knowledge/", { skip: !existsSync(snapshot) && "knowledge/ not available" }, async () => {
  const { buildSnapshot, serialize } = await import(snapshot.href);
  assert.equal(readFileSync(new URL("../lib/guide/knowledge.json", import.meta.url), "utf8"), serialize(buildSnapshot()), "run node scripts/guide-knowledge.mjs");
});

test("every glossary term marked in question texts has a definition", () => {
  const texts = questions.flatMap((q) => [q.label, q.hint, ...(q.options ?? []).flatMap((o) => [o.label, o.hint])]).filter(Boolean);
  const terms = texts.flatMap((t) => [...t.matchAll(TERM)].map((m) => m[2]));
  assert.ok(terms.includes("term.nieprzerwane_ubezpieczenie"));
  for (const id of terms) assert.ok(knowledge.glossary[id]?.definition_pl, id);
  assert.equal(plainText("Od kiedy masz [nieprzerwane](term.nieprzerwane_ubezpieczenie) ubezpieczenie?"), "Od kiedy masz nieprzerwane ubezpieczenie?");
});
