import type { Params } from "@/lib/params";

export type BasisResult = {
  months: number;
  average: number;
  contributions: number;
  basis: number;
  daily: number;
};

/** Benefit basis: average gross pay of the last 12 months minus the employee's social contributions. */
export function computeBasis(monthlyGross: number[], p: Params): BasisResult {
  const values = monthlyGross.filter((x) => x > 0);
  const average = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const contributions = average * p.employeeContributionRate;
  const basis = Math.round((average - contributions) * 100) / 100;
  return { months: values.length, average, contributions, basis, daily: basis / 30 };
}
