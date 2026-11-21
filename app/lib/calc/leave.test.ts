import { expect, test } from "vitest";
import { planLeave, type LeaveInput } from "@/lib/calc/leave";
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
