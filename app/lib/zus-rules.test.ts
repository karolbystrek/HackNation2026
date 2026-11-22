// What ZUS rules say the plan must contain, for each main questionnaire path.
// Expected values are written by hand from the ZUS parent guide (poradnik 1184/26) and the Labour Code (KP),
// never copied from app output: `source` names the rule, and dates were worked out from it independently.
// A row with `gap` is a known disagreement between the app and the rule; it is expected to fail until fixed.
// Run from app/: npm test
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { buildVariants } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import { buildFamilyTimeline, type FamilyTimelineEntry } from "@/lib/family-timeline";
import { personaFromAnswers } from "@/lib/guide/persona";
import type { Answers } from "@/lib/guide/tree";
import { loadJourney } from "@/lib/knowledge";
import { defaultParams as params } from "@/lib/params";

const TODAY = "2026-11-22";

/** Fields of one timeline entry that must match; null means none (no form, no fixed deadline). Documents match by substring. */
type Want = { form?: string | null; recipient?: string; date?: string; end?: string; due?: string | null; documents?: string[] };
type Row = { name: string; source: string; answers: Answers; expect: Record<string, Want | "present" | "absent">; gap?: string; events?: TimelineEvent[] };

const born = { situation: "born", birthDate: "2026-11-01", multipleBirth: false, insurance: ["employment"] };

const earlyLeave: TimelineEvent = { id: "early-leave", type: "circumstance", circumstance: "preBirthLeave",
  who: "mother", date: "2027-01-18", source: "new", title: "Urlop przed porodem", description: "" };

const rows: Row[] = [
  {
    name: "employee mother, large employer, 100%/70%",
    source: "Poradnik p.34: a large payer pays, no separate ZUS form. KP art. 180 §1: 20 weeks. KP art. 182^1d §1: parental request ≥21 days before.",
    answers: { ...born, role: "mother", largeEmployer: "yes" },
    expect: {
      "maternity-period": { date: "2026-11-01", end: "2027-03-20" },
      "maternity-claim": { form: null, recipient: "Pracodawca" },
      "parental-mother": { form: "lr.parental", recipient: "Pracodawca", due: "2027-02-28", documents: ["aktu urodzenia"] },
      "parental-mother-period": { date: "2027-03-21", end: "2027-10-30" },
    },
  },
  {
    name: "employee mother picks 81.5%",
    source: "Poradnik p.33–34: averaged rate needs the full-period request within 21 days after birth.",
    answers: { ...born, role: "mother", largeEmployer: "yes", wantsAveragedRate: true },
    expect: { "maternity-claim": { form: "ff.zam", due: "2026-11-22" } },
  },
  {
    name: "triplets",
    source: "KP art. 180 §1 pkt 3: 33 weeks for three children. Poradnik p.31: 43 weeks parental, 9 reserved for the other parent.",
    answers: { ...born, role: "mother", largeEmployer: "yes", multipleBirth: true, childrenCount: 3 },
    expect: {
      "maternity-period": { end: "2027-06-19" },
      "parental-mother-period": { date: "2027-06-20", end: "2028-02-12" },
    },
  },
  {
    name: "pregnant employee: leave before birth",
    events: [earlyLeave],
    source: "Poradnik p.27: maternity leave can start up to 6 weeks before the due date, with a doctor's certificate.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: false },
    expect: { "pre-birth-leave": { date: "2027-01-18", form: "lr.maternity_pre_birth", recipient: "Pracodawca", documents: ["przewidywanej dacie porodu"] } },
  },
  {
    name: "pregnant employee: request for leave before birth 14 days ahead",
    events: [earlyLeave],
    source: "Poradnik p.27: the request for leave before birth goes in at least 14 days before it starts.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: false },
    expect: { "pre-birth-leave": { due: "2027-01-04" } },
  },
  {
    name: "pregnant family: paternity request after the birth is registered",
    source: "Rozporządzenie w sprawie wniosków § 17 ust. 2: the paternity request carries the birth certificate. Prawo o aktach stanu cywilnego art. 61: registration within 21 days. KP art. 182³ § 2: request ≥7 days before.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-04-15", multiplePregnancy: false, largeEmployer: "yes", otherParentInsured: true },
    expect: {
      "birth-registration": { due: "2027-05-06" },
      paternity: { form: "lr.paternity", due: "2027-05-06", documents: ["aktu urodzenia"] },
      "paternity-period": { date: "2027-05-13", end: "2027-05-26" },
    },
  },
  {
    name: "mandate contract: the payer re-registers voluntary sickness insurance",
    source: "Poradnik p.35 and zus.pl (dobrowolne ubezpieczenie chorobowe): after maternity benefit the insurance must be reported again on ZUS ZUA, filed by the zleceniodawca, within 7 days.",
    answers: { ...born, role: "mother", insurance: ["mandate"], voluntarySickness: true, largeEmployer: "no" },
    expect: { "resume-sickness-mother": { recipient: "Zleceniodawca" } },
  },
  {
    name: "self-employed mother with voluntary sickness insurance",
    source: "Poradnik p.34: self-employed file ZAM with ZUS. Poradnik p.35: voluntary sickness insurance ends with maternity benefit and must be re-registered.",
    answers: { ...born, role: "mother", insurance: ["business"], voluntarySickness: true },
    expect: {
      "maternity-claim": { form: "ff.zam", recipient: "ZUS" },
      // No legal deadline before the period; the claim lapses 6 months after it (poradnik p.34).
      "parental-mother": { form: "ff.zam", recipient: "ZUS", due: null },
      "arrears-check-mother": "present",
      "resume-sickness-mother": "present",
    },
  },
  {
    name: "self-employed mother without sickness insurance",
    source: "Poradnik p.29: sickness insurance on the day of birth is the key condition. Poradnik p.35: otherwise parental allowance (świadczenie rodzicielskie).",
    answers: { ...born, role: "mother", insurance: ["business"], voluntarySickness: false },
    expect: { "maternity-claim": "absent", "parental-allowance": { recipient: "Gmina (ośrodek pomocy społecznej)" } },
  },
  {
    name: "mother without sickness insurance: no maternity leave period",
    source: "Poradnik p.29: no sickness insurance on the day of birth means no maternity benefit, so no maternity period to plan.",
    answers: { ...born, role: "mother", insurance: ["none"] },
    expect: { "maternity-period": "absent" },
  },
  {
    name: "uninsured mother, employed father",
    source: "Poradnik p.35: parental allowance from the municipality. Poradnik p.32: paternity leave does not depend on the mother's insurance.",
    answers: { ...born, role: "mother", insurance: ["none"] },
    expect: {
      "maternity-claim": "absent",
      "parental-allowance": { recipient: "Gmina (ośrodek pomocy społecznej)" },
      paternity: { form: "lr.paternity" },
    },
  },
  {
    name: "mother on a mandate contract at a large payer",
    source: "Poradnik p.34: a large payer handles the claim for a civil-law contract. Poradnik p.35: voluntary sickness insurance must be re-registered.",
    answers: { ...born, role: "mother", insurance: ["mandate"], voluntarySickness: true, largeEmployer: "yes" },
    expect: {
      "maternity-claim": { form: "ff.zam", recipient: "Zleceniodawca" },
      "resume-sickness-mother": "present",
      "arrears-check-mother": "absent",
    },
  },
  {
    name: "employed father: paternity leave",
    source: "KP art. 182^3 §2: request ≥7 days before. Poradnik p.32–33: 14 days, before the child turns 1.",
    answers: { ...born, role: "father", largeEmployer: "yes" },
    expect: {
      paternity: { form: "lr.paternity", recipient: "Pracodawca", due: "2026-11-22", documents: ["aktu urodzenia"] },
      "paternity-period": { date: "2026-11-29", end: "2026-12-12" },
    },
  },
  {
    name: "self-employed father: paternity benefit from ZUS",
    source: "Poradnik p.34: self-employed file ZAM with ZUS; no Labour Code request.",
    answers: { ...born, role: "father", insurance: ["business"], voluntarySickness: true },
    expect: { paternity: { form: "ff.zam", recipient: "ZUS" }, "arrears-check-father": "present" },
  },
  {
    name: "adoption",
    source: "KP art. 183 §1 and §6: 20 weeks on maternity terms, requested within 7 days of taking the child. KP art. 183 §4^1: parental leave follows; §5 applies the 21-day request rule of art. 182^1d.",
    answers: { situation: "adoption", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 3, multiplePlacement: false },
    expect: {
      "conditions-leave": { form: "lr.maternity_conditions", recipient: "Pracodawca", due: "2026-11-17", documents: ["sądu"] },
      "parental-mother": { form: "lr.parental", due: "2027-03-09" },
      "parental-mother-period": { date: "2027-03-30" },
      "birth-registration": "absent",
    },
  },
  {
    name: "foster family (non-professional): parental leave too",
    source: "KP art. 183 §1 and §6: leave on maternity terms within 7 days. KP art. 183 §4: foster parents also get parental leave; §5: requested ≥21 days before.",
    answers: { situation: "foster", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 2, multiplePlacement: false },
    expect: {
      "conditions-leave": { due: "2026-11-17" },
      "parental-mother": { form: "lr.parental", recipient: "Pracodawca", due: "2027-03-09" },
      "parental-mother-period": { date: "2027-03-30" },
    },
  },
  {
    name: "foster child aged 12: past the age limit",
    source: "KP art. 183 §1 and ustawa zasiłkowa art. 29: a foster child up to 7 (10 with school deferral).",
    answers: { situation: "foster", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 12, multiplePlacement: false },
    expect: { "conditions-leave": "absent", "maternity-claim": "absent", "parental-mother": "absent" },
  },
  {
    name: "adopted child aged 15: past the age limit",
    source: "KP art. 183 §1 and ustawa zasiłkowa art. 29: adoption of a child up to 14.",
    answers: { situation: "adoption", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 15, multiplePlacement: false },
    expect: { "conditions-leave": "absent", "maternity-claim": "absent", "parental-mother": "absent" },
  },
  {
    name: "adoption: father's paternity leave after the order is final",
    source: "KP art. 182^3 §1 pkt 2: paternity leave within 12 months of the final adoption order. KP art. 182^3 §2: request ≥7 days before.",
    answers: { situation: "adoption", role: "mother", insurance: ["employment"], placementDate: "2026-11-10", childAge: 3, multiplePlacement: false, adoptionOrderDate: "2027-02-01" },
    expect: {
      paternity: { form: "lr.paternity", due: "2027-01-25" },
      "paternity-period": { date: "2027-02-01", end: "2027-02-14" },
    },
  },
  {
    name: "father takes paternity leave in two parts",
    source: "KP art. 182^3 §1: up to two parts of at least 7 days. KP art. 182^3 §2: a request ≥7 days before each part.",
    answers: { ...born, role: "father", largeEmployer: "yes", paternityParts: "two" },
    expect: {
      paternity: { form: "lr.paternity", due: "2026-11-22" },
      "paternity-period": { date: "2026-11-29", end: "2026-12-05" },
      "paternity-2": { form: "lr.paternity", due: null },
    },
  },
  {
    name: "insurance ended, sick leave 2 days later",
    source: "Ustawa zasiłkowa art. 7: sickness benefit after insurance ends if the illness starts within 14 days. Poradnik p.29: no insurance on the day of birth, no maternity benefit.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", special: ["insuranceEnded"], insuranceEndDate: "2026-11-08", sicknessStartAfterInsurance: "2026-11-10" },
    expect: { "sickness-claim": { form: "ff.zas53" }, "maternity-period": "absent", "maternity-claim": "absent" },
  },
  {
    name: "insurance ended, sick leave 42 days later",
    source: "Ustawa zasiłkowa art. 7: the general limit is 14 days after insurance ends (longer only for some illnesses, so check).",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", special: ["insuranceEnded"], insuranceEndDate: "2026-11-08", sicknessStartAfterInsurance: "2026-12-20" },
    expect: { "sickness-claim": "absent", "sickness-check": "present" },
  },
  {
    name: "child died after 8 weeks",
    source: "KP art. 180^1 §2 and poradnik p.33: leave lasts 7 days from the death. Poradnik p.33: funeral grant. No childcare leave after the death.",
    answers: { ...born, birthDate: "2026-08-01", role: "mother", special: ["childDeath"], childDeathDate: "2026-11-01" },
    expect: {
      "maternity-period": { date: "2026-08-01", end: "2026-11-07" },
      "funeral-claim": { recipient: "ZUS" },
      paternity: "absent",
      "parental-mother": "absent",
    },
  },
  {
    name: "stillbirth",
    source: "KP art. 180^1 §1: 8 weeks of maternity leave. Poradnik p.33–35: funeral grant from ZUS. No child to care for, so no paternity or parental leave.",
    answers: { ...born, role: "mother", special: ["stillbirth"] },
    expect: {
      "maternity-period": { end: "2026-12-26" },
      "funeral-claim": { recipient: "ZUS" },
      paternity: "absent",
      "parental-mother": "absent",
    },
  },
  {
    name: "child died in week 8",
    source: "KP art. 180^1 §1: 8 weeks after birth, but at least 7 days from the day of death.",
    answers: { ...born, role: "mother", special: ["childDeath"], childDeathDate: "2026-12-24" },
    expect: { "maternity-period": { end: "2026-12-30" }, "funeral-claim": "present" },
  },
  {
    name: "born in week 26, 10 weeks in hospital",
    source: "Poradnik p.30–31: up to 15 weeks, one week per week in hospital, right after maternity leave. KP art. 180^2 §4: request ≥21 days before maternity leave ends, with the hospital certificate and the other parent's statement.",
    answers: { ...born, role: "mother", special: ["premature"], gestationWeek: 26, birthWeight: 900, hospitalWeeks: 10 },
    expect: {
      "supplementary-period": { date: "2027-03-21", end: "2027-05-29" },
      "supplementary-leave": { form: "lr.supplementary_maternity", due: "2027-02-27", documents: ["szpital", "drugiego rodzica"] },
    },
  },
  {
    name: "child with a „Za życiem” certificate",
    source: "Poradnik p.32: 65 weeks of parental leave for one child, 9 of them reserved for the other parent.",
    answers: { ...born, role: "mother", largeEmployer: "yes", special: ["zaZyciem"] },
    expect: { "parental-mother-period": { date: "2027-03-21", end: "2028-04-15" } },
  },
  {
    name: "parental leave combined with work",
    source: "KP art. 182^1e §2: request to work during parental leave ≥21 days before the work starts.",
    answers: { ...born, role: "mother", largeEmployer: "yes", combineWithWork: true },
    expect: { "combine-mother": { form: "lr.combine_parental_with_work", recipient: "Pracodawca", due: "2027-02-28" } },
  },
];

async function plan(answers: Answers, addedEvents: TimelineEvent[] = []): Promise<FamilyTimelineEntry[]> {
  const persona = personaFromAnswers(answers);
  const events = [...persona.events, ...addedEvents];
  const chosen = buildVariants(persona, params, undefined, events).find((v) => v.key === persona.initialVariant) ?? null;
  return buildFamilyTimeline(persona, events, chosen, params, await loadJourney(), [], TODAY);
}

// The questionnaire reads today's date (e.g. for when paternity leave can start), so freeze it.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));
});
afterAll(() => vi.useRealTimers());

for (const row of rows) {
  (row.gap ? test.fails : test)(`${row.name}${row.gap ? ` [known gap: ${row.gap}]` : ""}`, async () => {
    const entries = await plan(row.answers, row.events);
    for (const [id, want] of Object.entries(row.expect)) {
      const entry = entries.find((e) => e.id === id);
      if (want === "absent") { expect(entry, `${id} should not be in the plan`).toBeUndefined(); continue; }
      expect(entry, `${id} should be in the plan`).toBeDefined();
      if (want === "present") continue;
      const { documents, ...fields } = want;
      const got = Object.fromEntries(Object.keys(fields).map((key) => [key, entry![key as keyof FamilyTimelineEntry] ?? null]));
      expect(got, id).toEqual(fields);
      const titles = (entry!.documents ?? []).map((doc) => doc.title);
      for (const doc of documents ?? []) expect(titles.some((title) => title.includes(doc)), `${id} documents should mention "${doc}"`).toBe(true);
    }
  });
}
