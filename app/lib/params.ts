// Single source of every benefit rate and duration. The admin panel will override these from Supabase.
export const defaultParams = {
  // Maternity leave weeks by number of children born at once (index 0 = one child, 4 = five or more).
  maternityWeeks: [20, 31, 33, 35, 37],
  parentalPoolWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
  parentalOwnWeeks: 9,
  paternityWeeks: 2,
  // Paternity leave: shortest part, notice to the employer, and the child's age limit in months.
  paternityMinPartDays: 7,
  paternityRequestDays: 7,
  paternityUntilChildMonths: 12,
  // Notice to the employer before parental leave starts.
  parentalRequestDays: 21,
  rates: { full: 1, parental: 0.7, flat: 0.815 },
  flatRateRequestDays: 21,
  employeeContributionRate: 0.1371,
  // 2026 minimum wage; a full-time employee's basis is never lower than this minus contributions (art. 45 u.z.).
  minWage: 4806,
  // Świadczenie rodzicielskie; a lower monthly maternity benefit is topped up to this amount (art. 31 ust. 3a u.z.).
  parentalAllowanceMonthly: 1000,
  waitingDays: { uop: 30, zlec: 90, jdg: 90 },
  employerPaidDays: 33,
  benefitPeriodDays: 270,
  parentalUntilChildAge: 6,
  adoptionAgeLimit: { adoption: 14, foster: 7, fosterDeferred: 10 },
};

export type Params = typeof defaultParams;
