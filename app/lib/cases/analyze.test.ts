import { describe, expect, it } from "vitest";
import { analyzeCase } from "@/lib/cases/analyze";
import type { CaseExtraction } from "@/lib/cases/schema";
import { defaultParams } from "@/lib/params";

// Fictional cases shaped like the ZUS sample files (no data copied from them).
const base: CaseExtraction = {
  documents: [],
  benefit: "maternity",
  contract: "jdg",
  insuranceTitleCode: "0510",
  claimant: "mother",
  event: { kind: "birth", date: "2026-03-10", childBirthDate: "2026-03-10", kids: 1, zaZyciem: false, gestationWeek: null, birthWeightG: null, hospitalWeeks: null },
  requested: [{ kind: "maternity", from: "2026-03-10", to: "2026-07-27" }],
  fullLeaveDeclaration: false,
  sickInsurance: [{ from: "2025-01-01", to: null, voluntary: true }],
  insuranceEnd: { date: null, reason: "none" },
  debtOnDate: false,
  // March 2025 to February 2026, the 12 months before the birth month.
  basisMonths: Array.from({ length: 12 }, (_, i) => ({ month: new Date(Date.UTC(2025, 2 + i)).toISOString().slice(0, 7), amount: 6000 })),
  decision: { present: true, granted: true, reason: null, periods: [{ kind: "maternity", from: "2026-03-10", to: "2026-07-27" }], ratePercent: 100, basis: 5177.4, monthlyAmount: 5177.4 },
  uncertain: [],
};

describe("analyzeCase", () => {
  it("computes the basis minus 13.71% and a 20-week maternity period at 100%", () => {
    const r = analyzeCase(base, defaultParams);
    expect(r.eligible).toBe(true);
    expect(r.basis?.value).toBe(5177.4);
    expect(r.periods[0].days).toBe(140);
    expect(r.comparison.every((row) => row.match)).toBe(true);
  });

  it("refuses when the birth falls outside sickness insurance", () => {
    const r = analyzeCase({ ...base, sickInsurance: [{ from: "2025-01-01", to: "2026-02-28", voluntary: true }], decision: { ...base.decision, granted: false } }, defaultParams);
    expect(r.eligible).toBe(false);
    expect(r.comparison[0]).toMatchObject({ label: "Prawo do zasiłku", match: true });
  });

  it("tops a low parental benefit up to the parental allowance", () => {
    const low = { ...base, basisMonths: base.basisMonths.map((m) => ({ ...m, amount: 1400 })), requested: [{ kind: "parental" as const, from: "2026-07-28", to: "2026-09-21" }] };
    const r = analyzeCase(low, defaultParams);
    expect(r.periods[0].daily).toBe(33.33);
    expect(r.notes.some((n) => n.includes("podwyższony"))).toBe(true);
  });

  it("requires the 90-day waiting period for voluntary sickness insurance in pregnancy", () => {
    const sick: CaseExtraction = { ...base, benefit: "sickness_pregnancy", event: { ...base.event, kind: "pregnancy", date: null }, sickInsurance: [{ from: "2025-11-01", to: null, voluntary: true }], requested: [{ kind: "sickness", from: "2026-01-05", to: "2026-02-03" }] };
    expect(analyzeCase(sick, defaultParams).eligible).toBe(false);
    expect(analyzeCase({ ...sick, sickInsurance: [{ from: "2025-09-01", to: null, voluntary: true }] }, defaultParams).eligible).toBe(true);
  });

  it("grants zasiłek w wysokości macierzyńskiego only after employer insolvency", () => {
    const eq: CaseExtraction = { ...base, contract: "uop", benefit: "equal_maternity", insuranceEnd: { date: "2026-01-31", reason: "employer_insolvency" }, requested: [{ kind: "equal_maternity", from: "2026-02-01", to: "2026-03-09" }] };
    expect(analyzeCase(eq, defaultParams).eligible).toBe(true);
    expect(analyzeCase({ ...eq, insuranceEnd: { date: "2026-01-31", reason: "other" } }, defaultParams).eligible).toBe(false);
  });
});
