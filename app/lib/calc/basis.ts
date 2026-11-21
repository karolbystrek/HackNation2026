import type { ContractType } from "@/lib/calc/pregnancy";
import type { Params } from "@/lib/params";

export type BasisResult = {
  months: number;
  average: number;
  contributions: number;
  basis: number;
  daily: number;
  /** Basis was raised to the full-time minimum (art. 45 u.z.). */
  floored: boolean;
};

/** Benefit basis: average gross pay of the last 12 months minus the employee's social contributions. */
export function computeBasis(monthlyGross: number[], p: Params, contract: ContractType = "uop"): BasisResult {
  const values = monthlyGross.filter((x) => x > 0);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const contributions = average * p.employeeContributionRate;
  const raw = Math.round((average - contributions) * 100) / 100;
  // shortcut: treats every employment contract as full-time; part-time needs the floor scaled by the FTE fraction.
  const floor = contract === "uop" && values.length ? Math.round(p.minWage * (1 - p.employeeContributionRate) * 100) / 100 : 0;
  const basis = Math.max(raw, floor);
  return { months: values.length, average, contributions, basis, daily: basis / 30, floored: basis > raw };
}
