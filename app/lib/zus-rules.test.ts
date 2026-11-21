// What ZUS rules say the plan must contain, for each main questionnaire path.
// Expected values are written by hand from the ZUS parent guide (poradnik 1184/26) and the Labour Code (KP),
// never copied from app output: `source` names the rule, and dates were worked out from it independently.
// A row with `gap` is a known disagreement between the app and the rule; it is expected to fail until fixed.
// Run from app/: npm test
import { afterAll, beforeAll, expect, test, vi } from "vitest";
import { buildVariants } from "@/lib/calc/variants";
import { buildFamilyTimeline, type FamilyTimelineEntry } from "@/lib/family-timeline";
import { personaFromAnswers } from "@/lib/guide/persona";
import type { Answers } from "@/lib/guide/tree";
import { loadJourney } from "@/lib/knowledge";
import { defaultParams as params } from "@/lib/params";

const TODAY = "2026-11-22";

/** Fields of one timeline entry that must match; `form: null` means no form to file. Documents match by substring. */
type Want = { form?: string | null; recipient?: string; date?: string; end?: string; due?: string; documents?: string[] };
type Row = { name: string; source: string; answers: Answers; expect: Record<string, Want | "present" | "absent">; gap?: string };

const born = { situation: "born", birthDate: "2026-11-01", multipleBirth: false, insurance: ["employment"] };

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
    source: "Poradnik p.27: maternity leave can start up to 6 weeks before the due date, with a doctor's certificate.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: false },
    expect: { "pre-birth-leave": { date: "2027-01-18", form: "lr.maternity_pre_birth", recipient: "Pracodawca", documents: ["przewidywanej dacie porodu"] } },
  },
  {
    name: "pregnant employee: request for leave before birth 14 days ahead",
    source: "Poradnik p.27: the request for leave before birth goes in at least 14 days before it starts.",
    answers: { situation: "pregnant", role: "mother", insurance: ["employment"], dueDate: "2027-03-01", multiplePregnancy: false },
    expect: { "pre-birth-leave": { due: "2027-01-04" } },
  },
  {
    name: "self-employed mother with voluntary sickness insurance",
    source: "Poradnik p.34: self-employed file ZAM with ZUS. Poradnik p.35: voluntary sickness insurance ends with maternity benefit and must be re-registered.",
    answers: { ...born, role: "mother", insurance: ["business"], voluntarySickness: true },
    expect: {
      "maternity-claim": { form: "ff.zam", recipient: "ZUS" },
      "parental-mother": { form: "ff.zam", recipient: "ZUS" },
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

async function plan(answers: Answers): Promise<FamilyTimelineEntry[]> {
  const persona = personaFromAnswers(answers);
  const chosen = buildVariants(persona, params).find((v) => v.key === persona.initialVariant) ?? null;
  return buildFamilyTimeline(persona, persona.events, chosen, params, await loadJourney(), [], TODAY);
}

// The questionnaire reads today's date (e.g. for when paternity leave can start), so freeze it.
beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(`${TODAY}T10:00:00Z`));
});
afterAll(() => vi.useRealTimers());

for (const row of rows) {
  (row.gap ? test.fails : test)(`${row.name}${row.gap ? ` [known gap: ${row.gap}]` : ""}`, async () => {
    const entries = await plan(row.answers);
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
