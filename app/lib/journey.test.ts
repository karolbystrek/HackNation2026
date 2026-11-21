// Checks that the family timeline follows knowledge/scenarios.json. Run from app/: npm test
import assert from "node:assert/strict";
import { test } from "vitest";
import { buildVariants } from "@/lib/calc/variants";
import { addDays, parseIso, toIso } from "@/lib/dates";
import { buildFamilyTimeline } from "@/lib/family-timeline";
import { formContext } from "@/lib/forms/context";
import { personaFromAnswers } from "@/lib/guide/persona";
import type { Answers } from "@/lib/guide/tree";
import { loadJourney } from "@/lib/knowledge";
import { personas, type ParentProfile, type Persona } from "@/lib/mock/personas";
import { defaultParams as params } from "@/lib/params";

const [anna, maja] = personas;
const shift = (date: string, days: number) => toIso(addDays(parseIso(date)!, days));

async function timeline(persona: Persona, variant: "A" | "B" = persona.initialVariant === "A" ? "A" : "B") {
  const chosen = buildVariants(persona, params).find((v) => v.key === variant)!;
  const entries = buildFamilyTimeline(persona, persona.events, chosen, params, await loadJourney(), [], "2026-11-21");
  return { chosen, entries, get: (id: string) => entries.find((entry) => entry.id === id) };
}

const fromAnswers = (answers: Answers) => timeline(personaFromAnswers(answers));

function withParent(persona: Persona, parent: "mother" | "father", change: Partial<ParentProfile>): Persona {
  return { ...persona, parents: { ...persona.parents, [parent]: { ...persona.parents[parent], ...change } } };
}

test("every task tag in knowledge/ is known to the timeline", async () => {
  for (const mother of ["uop", "zlec", "jdg"] as const)
    for (const father of ["uop", "zlec", "jdg"] as const)
      for (const payerSize of ["gt20", "le20"] as const) {
        const family = withParent(withParent({ ...anna, wantsAveragedRate: true }, "mother", { contract: mother, payerSize }), "father", { contract: father, payerSize });
        await assert.doesNotReject(timeline(family), `${mother}/${father}/${payerSize}`);
      }
});

test("employee mother at a large payer: no ZAM unless she picks 81.5%", async () => {
  const { get } = await timeline(anna);
  const claim = get("maternity-claim")!;
  assert.equal(claim.form, undefined);
  assert.equal(claim.due, undefined);
  assert.deepEqual(claim.requires, ["birth-certificate"]);
  assert.equal(get("birth-certificate-copy")?.extra, true);

  const averaged = (await timeline({ ...anna, wantsAveragedRate: true })).get("maternity-claim")!;
  assert.equal(averaged.form, "ff.zam");
  assert.equal(averaged.due, shift(anna.dueDate, params.flatRateRequestDays));
});

test("employee leave requests are due 7 and 21 days before the leave", async () => {
  const { get, chosen } = await timeline(anna);
  assert.equal(get("paternity")!.form, "lr.paternity");
  assert.equal(get("paternity")!.due, shift(anna.paternityStart, -params.paternityRequestDays));
  const parental = chosen.result.periods.father.find((p) => p.kind === "parental")!;
  assert.equal(get("parental-father")!.form, "lr.parental");
  assert.equal(get("parental-father")!.due, shift(parental.from, -params.parentalRequestDays));
  assert.equal(get("parental-father")!.recipient, "Pracodawca");
});

test("self-employed mother files ZAM with ZUS, checks arrears and re-registers", async () => {
  const { get, chosen } = await timeline(maja);
  const claim = get("maternity-claim")!;
  assert.equal(claim.form, "ff.zam");
  assert.equal(claim.recipient, "ZUS");
  assert.equal(claim.due, shift(maja.birthDate!, params.flatRateRequestDays));
  assert.deepEqual(claim.documents, []);
  assert.ok(get("arrears-check-mother"));
  const lastEnd = chosen.result.periods.mother.map((p) => p.to).sort().at(-1)!;
  assert.equal(get("resume-sickness-mother")!.due, shift(lastEnd, 7));
  assert.equal(get("sickness-claim")!.form, "ff.zas53");
  // The 21-day notice is a Labour Code rule for employees; ZAM only has to come before the period.
  const parental = chosen.result.periods.mother.find((p) => p.kind === "parental")!;
  assert.equal(get("parental-mother")!.due, shift(parental.from, -1));
});

test("self-employed father claims paternity benefit from ZUS before it starts", async () => {
  const { get } = await timeline(withParent(anna, "father", { contract: "jdg", payerSize: "na" }));
  const paternity = get("paternity")!;
  assert.equal(paternity.form, "ff.zam");
  assert.equal(paternity.recipient, "ZUS");
  assert.equal(paternity.due, shift(anna.paternityStart, -1));
  assert.equal(get("arrears-check-mother"), undefined);
  assert.ok(get("arrears-check-father"));
});

// Questionnaire answers (/nowa-os) go through the same engine as the demo profiles.
test("questionnaire: employed mother expecting twins, 81.5%", async () => {
  const { get } = await fromAnswers({ situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: true, childrenCount: 2, wantsAveragedRate: true });
  assert.equal(get("pre-birth-leave")!.date, "2027-01-18");
  assert.ok(get("pre-birth-leave")!.extra, "leave before birth is optional");
  assert.equal(get("maternity-claim")!.form, "ff.zam");
  assert.equal(get("maternity-claim")!.due, "2027-03-22");
  assert.equal(get("maternity-period")!.end, "2027-10-03"); // 31 weeks
  assert.ok(get("maternity-period")!.estimated);
  assert.equal(get("parental-mother")!.form, "lr.parental");
});

test("questionnaire: premature baby gets supplementary leave right after maternity", async () => {
  const a = { situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false, special: ["premature"], gestationWeek: 30, birthWeight: 1400, hospitalWeeks: 4 };
  const { get } = await fromAnswers(a);
  assert.equal(get("supplementary-period")!.date, "2027-03-21");
  assert.equal(get("supplementary-period")!.end, "2027-04-17");
  assert.equal(get("parental-mother-period")?.date, "2027-04-18");
  assert.equal(get("supplementary-leave")!.form, "lr.supplementary_maternity");
  assert.equal(get("supplementary-leave")!.due, "2027-02-27"); // 21 days before maternity ends
  assert.equal((await fromAnswers({ ...a, hospitalWeeks: 0 })).get("supplementary-leave"), undefined);
});

test("questionnaire: uninsured mother applies for the parental allowance, not maternity benefit", async () => {
  const { get } = await fromAnswers({ situation: "pregnant", role: "mother", insurance: ["none"], dueDate: "2027-03-01" });
  assert.equal(get("maternity-claim"), undefined);
  assert.equal(get("parental-allowance")!.recipient, "Gmina (ośrodek pomocy społecznej)");
});

test("questionnaire: adoption gives leave on maternity terms, requested within 7 days", async () => {
  const { get } = await fromAnswers({ situation: "adoption", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 3, multiplePlacement: false });
  assert.equal(get("conditions-leave")!.form, "lr.maternity_conditions");
  assert.equal(get("conditions-leave")!.due, "2026-11-17");
  assert.equal(get("birth-registration"), undefined);
});

test("questionnaire: stillbirth leaves 8 weeks of maternity benefit and the funeral grant", async () => {
  const { get, entries } = await fromAnswers({ situation: "born", role: "mother", insurance: ["employment"], birthDate: "2026-11-01", multipleBirth: false, special: ["stillbirth"] });
  assert.equal(get("maternity-period")!.end, "2026-12-26");
  assert.ok(get("funeral-claim"));
  assert.equal(get("birth-registration")?.due, undefined);
  assert.match(get("birth-registration")?.dateNote ?? "", /3 dni/);
  assert.equal(get("birth-certificate-copy"), undefined);
  assert.ok(!entries.some((e) => e.id === "paternity" || e.id.startsWith("parental-")));
});

test("questionnaire: insurance ended in pregnancy, sickness benefit claimed with ZAS-53", async () => {
  const { get } = await fromAnswers({ situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", special: ["insuranceEnded"] });
  assert.equal(get("sickness-claim"), undefined);
  assert.ok(get("sickness-check"));
  assert.equal(get("maternity-claim"), undefined);
  const withLeave = await fromAnswers({ situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01",
    special: ["insuranceEnded"], insuranceEndDate: "2026-11-08", sicknessStartAfterInsurance: "2026-11-10" });
  assert.equal(withLeave.get("sickness-claim")?.form, "ff.zas53");
  assert.equal(withLeave.get("sickness-claim")?.date, "2026-11-10");
});

test("questionnaire: the wizard finds the application, so the ZUS PDF can be filled", async () => {
  const persona = personaFromAnswers({ situation: "born", role: "mother", insurance: ["business"], voluntarySickness: true, birthDate: "2026-11-01", multipleBirth: false, wantsAveragedRate: true });
  const found = formContext(persona, persona.events, persona.initialVariant ?? null, params, await loadJourney(), [], "2026-11-21", "maternity-claim");
  assert.equal(found?.entry.form, "ff.zam");
  assert.equal(found?.ctx.recipient, "zus");
});
