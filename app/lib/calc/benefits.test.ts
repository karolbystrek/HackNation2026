import { expect, test } from "vitest";
import { computeBasis } from "./basis";
import { planLeave } from "./leave";
import { calcPregnancy, type PregnancyInput } from "./pregnancy";
import { leaveInputFor } from "./variants";
import { debtOn, personas } from "@/lib/mock/personas";
import { defaultParams } from "@/lib/params";

test("overlapping parental periods share the pool and their rates follow the reserved weeks", () => {
  const input = { ...leaveInputFor(personas[0], defaultParams, 16), startDate: "2026-06-01", flatRate: true, paternity: false };
  const sequential = planLeave(input, defaultParams);
  const overlap = planLeave({ ...input, parentalTogether: true }, defaultParams);
  const mother = overlap.periods.mother.find((period) => period.kind === "parental")!;
  expect(overlap.periods.father.map(({ weeks, rate }) => ({ weeks, rate }))).toEqual([{ weeks: 9, rate: 0.7 }, { weeks: 7, rate: 0.815 }]);
  expect(overlap.periods.father[0].from).toBe(mother.from);
  expect(overlap.mainWeeks + overlap.otherWeeks).toBe(overlap.pool);
  expect(overlap.familyTotal).toBe(sequential.familyTotal);
  expect(overlap.end! < sequential.end!).toBe(true);
});

test("pre-birth and supplementary leave keep the parental dates consistent", () => {
  const input = { ...leaveInputFor(personas[0], defaultParams, 9), startDate: "2026-06-01", preBirthStartDate: "2026-05-18", supplementaryWeeks: 4 };
  const result = planLeave(input, defaultParams);
  expect(result.periods.mother.map(({ from, to }) => [from, to])).toEqual([
    ["2026-05-18", "2026-10-05"],
    ["2026-10-05", "2026-11-02"],
    ["2026-11-02", "2027-06-14"],
  ]);
});

test("basis floor follows the employment fraction", () => {
  expect(computeBasis([2000], defaultParams, "uop", 0.5).basis).toBe(2073.55);
});

test("adoption shortly before the age limit keeps the minimum maternity leave", () => {
  const input = { ...leaveInputFor(personas[0], defaultParams, 9), mode: "adoption" as const,
    childBirthDate: "2012-06-25", startDate: "2026-06-01", adoptionOrderDate: "2026-06-02", paternityStartDate: undefined, zaZyciem: true };
  const result = planLeave(input, defaultParams);
  expect(result.pool).toBe(62);
  expect(result.periods.mother[0]).toMatchObject({ weeks: 9, to: "2026-08-03" });
  expect(result.periods.mother[1]).toMatchObject({ kind: "parental", from: "2026-08-03", weeks: 53 });
  expect(result.periods.father.find((period) => period.label === "Urlop ojcowski")?.from).toBe("2026-06-02");
  expect(planLeave({ ...input, startDate: "2026-06-25" }, defaultParams).familyTotal).toBe(0);
});

test("rehabilitation is separate from confirmed sickness benefits", () => {
  const input: PregnancyInput = { contract: "uop", insuredFrom: "2024-01-01", sickLeaveFrom: "2025-01-01", dueDate: "2025-10-01", basis: 6000, employerInsolvent: false, payerSize: "le20" };
  const result = calcPregnancy(input, defaultParams);
  expect(result).toMatchObject({ payer: "ZUS", days: 270, total: 54000 });
  const calculation = calcPregnancy({ ...input, simulateRehabilitation: true }, defaultParams);
  expect(calculation.total).toBe(result.total);
  expect(calculation.rows.find((row) => row.label.startsWith("Świadczenie rehabilitacyjne"))?.amount).toBe(600);
});

test("sickness benefit payout is suspended for a self-employed parent above the debt threshold", () => {
  const input: PregnancyInput = { contract: "jdg", insuredFrom: "2024-01-01", sickLeaveFrom: "2026-03-01", dueDate: "2026-03-11", basis: 6000, employerInsolvent: false };
  expect(calcPregnancy({ ...input, contributionDebt: 48.06 }, defaultParams).total).toBe(2000);
  expect(calcPregnancy({ ...input, contributionDebt: 48.07 }, defaultParams).total).toBe(0);
});

test("contribution debt applies from its date until repaid", () => {
  const maja = personas.find((p) => p.id === "maja-piotr")!.parents.mother;
  expect(debtOn(maja, "2026-11-17")).toBe(375);
  expect(debtOn(maja, "2026-10-01")).toBe(0);
  expect(debtOn({ ...maja, contributionDebt: { date: "2026-11-02", amount: 375, repaidOn: "2026-11-10" } }, "2026-11-17")).toBe(0);
  expect(debtOn(personas[0].parents.mother, "2027-03-15")).toBe(0);
});
