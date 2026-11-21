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

  it("uses a supplied benefit basis as-is and retains the decision for comparison", () => {
    const result = analyzeCase(base, defaultParams, 6000);
    expect(result.basis?.value).toBe(6000);
    expect(result.periods[0].daily).toBe(200);
    expect(result.total).toBe(28000);
    expect(result.comparison.find((row) => row.label === "Podstawa wymiaru")?.match).toBe(false);
    expect(analyzeCase(base, defaultParams, 0).basis?.value).toBe(5177.4);
  });

  it("leaves eligibility open when no sickness insurance dates were read", () => {
    const missing = { ...base, sickInsurance: [] };
    const result = analyzeCase(missing, defaultParams);
    expect(result.eligible).toBeNull();
    expect(result.comparison.some((row) => row.label === "Prawo do zasiłku")).toBe(false);
    expect(analyzeCase({ ...missing, sickInsurance: base.sickInsurance }, defaultParams).eligible).toBe(true);
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

  it("does not treat missing dates or unsupported benefits as decisions", () => {
    const missing = analyzeCase({ ...base, event: { ...base.event, date: null }, requested: [], decision: { ...base.decision, periods: [] } }, defaultParams);
    expect(missing.eligible).toBeNull();
    expect(missing.comparison.find((row) => row.label === "Prawo do zasiłku")).toBeUndefined();
    expect(analyzeCase({ ...base, benefit: "other" }, defaultParams).eligible).toBeNull();
  });

  it("does not count an uninsured gap towards the waiting period", () => {
    const r = analyzeCase({
      ...base, benefit: "sickness_pregnancy", event: { ...base.event, date: "2026-03-10" },
      requested: [{ kind: "sickness", from: "2026-03-10", to: "2026-03-15" }],
      sickInsurance: [{ from: "2026-02-02", to: "2026-02-07", voluntary: false }, { from: "2026-02-28", to: null, voluntary: false }],
    }, defaultParams);
    expect(r.eligible).toBe(false);
  });

  it("distinguishes court-confirmed unlawful dismissal after birth from the pre-birth benefit", () => {
    const dismissed: CaseExtraction = {
      ...base, contract: "uop", sickInsurance: [],
      insuranceEnd: { date: "2026-01-31", reason: "unlawful_dismissal" },
    };
    expect(analyzeCase(dismissed, defaultParams).eligible).toBe(true);
    expect(analyzeCase({ ...dismissed, benefit: "equal_maternity" }, defaultParams).eligible).toBe(false);
  });

  it("grants zasiłek w wysokości macierzyńskiego only after employer insolvency", () => {
    const eq: CaseExtraction = { ...base, contract: "uop", benefit: "equal_maternity", insuranceEnd: { date: "2026-01-31", reason: "employer_insolvency" }, requested: [{ kind: "equal_maternity", from: "2026-02-01", to: "2026-03-09" }] };
    expect(analyzeCase(eq, defaultParams).eligible).toBe(true);
    expect(analyzeCase({ ...eq, insuranceEnd: { date: "2026-01-31", reason: "other" } }, defaultParams).eligible).toBe(false);
  });
});
