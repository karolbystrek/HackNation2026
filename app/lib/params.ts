// Single source of every benefit rate and duration. The admin panel will override these from Supabase.
export const defaultParams = {
  // Maternity leave weeks by number of children born at once (index 0 = one child, 4 = five or more).
  maternityWeeks: [20, 31, 33, 35, 37],
  parentalPoolWeeks: { single: 41, multiple: 43, zaZyciemSingle: 65, zaZyciemMultiple: 67 },
  parentalOwnWeeks: 9,
  paternityWeeks: 2,
  rates: { full: 1, parental: 0.7, flat: 0.815 },
  flatRateRequestDays: 21,
  employeeContributionRate: 0.1371,
  waitingDays: { uop: 30, zlec: 90, jdg: 90 },
  employerPaidDays: 33,
  benefitPeriodDays: 270,
  parentalUntilChildAge: 6,
  adoptionAgeLimit: { adoption: 14, foster: 7, fosterDeferred: 10 },
};

export type Params = typeof defaultParams;
