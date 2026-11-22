// Single source of every benefit rate and duration. The admin panel stores overrides in Supabase.
export const defaultParams = {
  // Maternity leave weeks by number of children born at once (index 0 = one child, 4 = five or more).
  maternityWeeks: [20, 31, 33, 35, 37],
  parentalPoolWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
  parentalOwnWeeks: 9,
  // Maternity weeks after birth only the mother can use; the father may take over the rest.
  motherOnlyWeeks: 14,
  paternityWeeks: 2,
  // Supplementary maternity leave: 1 week per week in hospital, up to capSevereWeeks when born before weekLow or at most weightLow grams.
  supplementary: { capSevereWeeks: 15, capWeeks: 8, weekLow: 28, weightLow: 1000 },
  // Maternity benefit after stillbirth or death before 8 weeks of life.
  stillbirthWeeks: 8,
  // Maternity leave may start up to this many weeks before the due date.
  preBirthMaxWeeks: 6,
  // Paternity leave: shortest part, notice to the employer, and the child's age limit in months.
  paternityMinPartDays: 7,
  paternityRequestDays: 7,
  paternityUntilChildMonths: 12,
  // Notice to the employer before parental leave starts.
  parentalRequestDays: 21,
  // Work during parental leave is limited to half of full time.
  combineWorkMaxFraction: 0.5,
  rates: { full: 1, parental: 0.7, flat: 0.815 },
  flatRateRequestDays: 21,
  employeeContributionRate: 0.1371,
  // 2026 minimum wage; a full-time employee's basis is never lower than this minus contributions (art. 45 u.z.).
  minWage: 4806,
  contributionDebtLimitRate: 0.01,
  // 2026 cap on the monthly voluntary sickness contribution basis (250% of the forecast average wage).
  maxVoluntaryBasis: 23550,
  // Świadczenie rodzicielskie; a lower monthly maternity benefit is topped up to this amount (art. 31 ust. 3a u.z.).
  parentalAllowanceMonthly: 1000,
  waitingDays: { uop: 30, zlec: 90, jdg: 90 },
  employerPaidDays: 33,
  employerPaidDaysOver50: 14,
  benefitPeriodDays: 270,
  parentalUntilChildAge: 6,
  adoptionAgeLimit: { adoption: 14, foster: 7, fosterDeferred: 10 },
  intakeMinimumMaternityWeeks: 9,
  intakeShortParentalWeeks: { standard: 38, zaZyciem: 62 },
};

export type Params = typeof defaultParams;
