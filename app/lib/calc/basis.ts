import type { ContractType } from "@/lib/calc/pregnancy";
import type { Params } from "@/lib/params";

export type BasisResult = {
  months: number;
  /** Monthly average including `bonus`. */
  average: number;
  /** 1/12 of the quarterly and annual bonuses added to the average. */
  bonus: number;
  contributions: number;
  basis: number;
  daily: number;
  /** Basis was raised to the minimum for the specified employment fraction. */
  floored: boolean;
};

/** Bonuses paid for longer periods: 1/12 of the last 4 quarters' bonuses and of the previous year's bonus join the average (art. 42 u.z.). */
export type Bonuses = { quarterly?: number; annual?: number };

/**
 * Benefit basis: average gross pay of the last 12 months minus the employee's social contributions.
 * Months worked for less than half the working time are left out (pass 0 or leave them empty); months worked for at
 * least half are passed after completing them to a full month.
 */
export function computeBasis(monthlyGross: number[], p: Params, contract: ContractType = "uop", employmentFraction = 1, bonuses: Bonuses = {}): BasisResult {
  const values = monthlyGross.filter((x) => Number.isFinite(x) && x > 0)
    .map((x) => contract === "jdg" ? Math.min(x, p.maxVoluntaryBasis) : x);
  const bonus = contract === "jdg" ? 0 : [bonuses.quarterly, bonuses.annual].reduce<number>((sum, x) => sum + (Number.isFinite(x) && x! > 0 ? x! / 12 : 0), 0);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length + bonus : 0;
  const contributions = average * p.employeeContributionRate;
  const raw = Math.round((average - contributions) * 100) / 100;
  const fraction = Number.isFinite(employmentFraction) && employmentFraction > 0 && employmentFraction <= 1 ? employmentFraction : 1;
  const floor = contract === "uop" && values.length ? Math.round(p.minWage * fraction * (1 - p.employeeContributionRate) * 100) / 100 : 0;
  const basis = Math.max(raw, floor);
  return { months: values.length, average, bonus: values.length ? bonus : 0, contributions, basis, daily: basis / 30, floored: basis > raw };
}
