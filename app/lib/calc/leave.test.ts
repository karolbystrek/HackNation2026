import { expect, test } from "vitest";
import { planLeave, type LeaveInput } from "@/lib/calc/leave";
import { computeBasis } from "@/lib/calc/basis";
import { calcPregnancy } from "@/lib/calc/pregnancy";
import { defaultParams as params } from "@/lib/params";

const input: LeaveInput = {
  mode: "birth", names: { mother: "Matka", father: "Ojciec" }, bases: { mother: 6000, father: 6000 },
  startDate: "2026-01-01", kids: 1, zaZyciem: false, adoptionType: "adoption",
  childBirthDate: "", schoolDeferred: false, main: "mother", otherWeeks: 12, paternity: false, flatRate: true,
};

test("averaged rate splits the second parent's reserved and shared weeks", () => {
  const { periods } = planLeave(input, params);
  expect(periods.father.map(({ weeks, rate }) => [weeks, rate])).toEqual([[9, 0.7], [3, 0.815]]);
  expect(periods.father[1].from).toBe(periods.father[0].to);
});

test("averaged rate also covers the extended Za życiem pool", () => {
  const { periods, flatRateApplied, pool } = planLeave({ ...input, kids: 2, zaZyciem: true, otherWeeks: 9 }, params);
  expect(pool).toBe(67);
  expect(flatRateApplied).toBe(true);
  expect(periods.mother.map(({ kind, weeks, rate }) => [kind, weeks, rate])).toEqual([["maternity", 31, 0.815], ["parental", 58, 0.815]]);
  expect(periods.father.map(({ weeks, rate }) => [weeks, rate])).toEqual([[9, 0.7]]);
});

test("paternity expires before the first birthday or the adoption age limit", () => {
  const plan = (patch: Partial<LeaveInput>) => planLeave({ ...input, otherWeeks: 0, paternity: true, ...patch }, params);
  expect(plan({ paternityStartDate: "2027-01-01" }).periods.father.some((p) => p.kind === "paternity")).toBe(false);
  expect(plan({ paternityStartDate: "2026-12-25" }).periods.father.find((p) => p.kind === "paternity")?.weeks).toBe(1);
  const adoption = plan({ mode: "adoption", adoptionOrderDate: "2026-08-01", childBirthDate: "2013-12-01", paternityStartDate: "2027-07-01" });
  expect(adoption.periods.father.find((p) => p.kind === "paternity")?.from).toBe("2027-07-01");
  expect(plan({ mode: "adoption", adoptionOrderDate: "2026-08-01", childBirthDate: "2012-09-01", paternityStartDate: "2026-09-01" })
    .periods.father.some((p) => p.kind === "paternity")).toBe(false);
});

test("sickness estimate excludes rehabilitation and uses the reduced limit from the following year", () => {
  const outcome = calcPregnancy({ contract: "uop", insuredFrom: "2024-01-01", sickLeaveFrom: "2026-01-01", dueDate: "2026-10-15",
    employerInsolvent: false, basis: 6000, yearTurned50: 2026 }, params);
  expect(outcome.days).toBe(270);
  expect(outcome.total).toBe(54000);
  expect(outcome.rows[0].amount).toBe(6600);
  expect(outcome.warnings.join(" ")).toContain("ZNp-7");
});

test("uses the extended parental pool for adoption and non-professional foster care", () => {
  // KP art. 183 § 4³ and § 4⁴.
  const placement = { ...input, mode: "adoption" as const, childBirthDate: "2025-01-01", zaZyciem: true };
  expect(planLeave(placement, params).pool).toBe(65);
  expect(planLeave({ ...placement, adoptionType: "foster", kids: 2 }, params).pool).toBe(67);
});

test("concurrent parental leave consumes the same pool and pays the same amounts", () => {
  // KP art. 182¹a § 6.
  const sequential = planLeave(input, params);
  const concurrent = planLeave({ ...input, parentalTogether: true }, params);
  expect(concurrent.periods.father[0].from).toBe(concurrent.periods.mother[1].from);
  expect(concurrent.end).toBe(concurrent.periods.mother[1].to);
  expect(concurrent.familyTotal).toBe(sequential.familyTotal);
});

test("a parent without entitlement has no paid periods and keeps their non-transferable weeks", () => {
  const result = planLeave({ ...input, otherWeeks: 32, uninsuredParents: ["mother"] }, params);
  expect(result.periods.mother).toEqual([]);
  expect(result.otherWeeks).toBe(32);
  expect(result.totals.mother).toBe(0);
  const withPaternity = planLeave({ ...input, otherWeeks: 32, uninsuredParents: ["mother"], paternity: true }, params);
  expect(withPaternity.periods.father.map(({ kind, from }) => [kind, from])).toEqual([
    ["paternity", "2026-01-01"], ["parental", "2026-01-15"],
  ]);
});

test("distinguishes no insurance from loss of employment during pregnancy", () => {
  const pregnancy = { contract: "uop" as const, insuredFrom: "2024-01-01", sickLeaveFrom: "2026-01-15",
    dueDate: "2026-03-01", employerInsolvent: false, uninsured: true, basis: 6000 };
  expect(calcPregnancy(pregnancy, params).days).toBe(0);
  // Art. 30 ust. 3 u.z. The last day of employment is 31 January.
  const result = calcPregnancy({ ...pregnancy, employerInsolvent: true, employmentEnd: "2026-01-31" }, params);
  expect(result.days).toBe(28);
  expect(result.total).toBe(5600);
});

test("sets a proportional minimum basis for part-time employees", () => {
  // Art. 45 ust. 1 u.z. and KP art. 29² § 1.
  expect(computeBasis([2000], params, "uop", 0.5).basis).toBe(2073.55);
  expect(computeBasis([2000], params, "zlec").basis).toBe(1725.8);
  // Empty months (under half the working time) are skipped; bonuses add 1/12 to the average (art. 42 u.z.).
  expect(computeBasis([6000, 0, 6000], params).months).toBe(2);
  expect(computeBasis(Array(12).fill(6000), params, "uop", 1, { quarterly: 4000, annual: 8000 }).basis).toBe(6040.3);
  expect(computeBasis(Array(12).fill(6000), params, "jdg", 1, { annual: 8000 }).basis).toBe(5177.4);
});
