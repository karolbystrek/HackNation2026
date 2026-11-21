import { addDays, addYears, diffDays, formatDate, parseIso, toIso } from "@/lib/dates";
import { formatWeeks } from "@/lib/format";
import type { Params } from "@/lib/params";

export type ParentKey = "mother" | "father";
export const PARENTS: ParentKey[] = ["mother", "father"];
export const otherParent = (p: ParentKey): ParentKey => (p === "mother" ? "father" : "mother");

export type LeaveInput = {
  mode: "birth" | "adoption";
  names: Record<ParentKey, string>;
  /** Monthly benefit basis (podstawa wymiaru) per parent, PLN. */
  bases: Record<ParentKey, number>;
  /** Birth date, or the day the child is taken in for adoption / foster care. */
  startDate: string;
  kids: number;
  zaZyciem: boolean;
  adoptionType: "adoption" | "foster";
  childBirthDate: string;
  schoolDeferred: boolean;
  /** Parent taking maternity leave (always the mother for birth). */
  main: ParentKey;
  /** Parental leave weeks taken by the other parent, after the main parent. */
  otherWeeks: number;
  paternity: boolean;
  flatRate: boolean;
  workingParent: ParentKey | null;
  workFraction: number;
};

export type LeavePeriod = {
  parent: ParentKey;
  label: string;
  kind: "maternity" | "parental";
  from: string;
  /** Exclusive end date. */
  to: string;
  /** Benefit weeks paid. */
  weeks: number;
  /** Calendar weeks the period spans (longer when combined with part-time work). */
  spanWeeks: number;
  rate: number;
  workFraction: number;
  monthlyBenefit: number;
  monthlyWage: number;
  total: number;
};

export type LeaveResult = {
  start: string | null;
  end: string | null;
  periods: Record<ParentKey, LeavePeriod[]>;
  totals: Record<ParentKey, number>;
  familyTotal: number;
  pool: number;
  mainWeeks: number;
  otherWeeks: number;
  maxOtherWeeks: number;
  flatRateAllowed: boolean;
  flatRateApplied: boolean;
  deadline: string;
  warnings: string[];
};

export function planLeave(input: LeaveInput, p: Params): LeaveResult {
  const adoption = input.mode === "adoption";
  const main = adoption ? input.main : "mother";
  const other = otherParent(main);
  const kids = Math.min(Math.max(input.kids, 1), 5);
  const multiple = kids > 1;
  const zaZyciem = !adoption && input.zaZyciem;
  const pools = p.parentalPoolWeeks;
  const pool = zaZyciem ? (multiple ? pools.zaZyciemMultiple : pools.zaZyciemSingle) : multiple ? pools.multiple : pools.single;
  const maxOtherWeeks = pool - p.parentalOwnWeeks;
  const otherWeeks = Math.min(Math.max(input.otherWeeks, 0), maxOtherWeeks);
  const mainWeeks = pool - Math.max(otherWeeks, p.parentalOwnWeeks);
  const lostOwnWeeks = Math.max(0, p.parentalOwnWeeks - otherWeeks);
  const flatRateAllowed = !zaZyciem && otherWeeks <= p.parentalOwnWeeks;
  const flatRateApplied = input.flatRate && flatRateAllowed;

  const start = parseIso(input.startDate);
  let cap: Date | null = null;
  let capYears = 0;
  let noRight = false;
  if (adoption) {
    const childBirth = parseIso(input.childBirthDate);
    const limits = p.adoptionAgeLimit;
    capYears = input.adoptionType === "adoption" ? limits.adoption : input.schoolDeferred ? limits.fosterDeferred : limits.foster;
    if (childBirth) cap = addYears(childBirth, capYears);
    if (cap && start && start >= cap) noRight = true;
  }

  const periods: Record<ParentKey, LeavePeriod[]> = { mother: [], father: [] };
  let lostToCap = 0;

  function add(parent: ParentKey, label: string, kind: LeavePeriod["kind"], from: Date, weeks: number, rate: number, workFraction: number): Date {
    if (weeks <= 0) return from;
    let days = (weeks * 7) / (1 - workFraction);
    let end = addDays(from, days);
    let paid = weeks;
    if (cap) {
      if (from >= cap) {
        lostToCap += weeks;
        return from;
      }
      if (end > cap) {
        const kept = diffDays(from, cap) / days;
        lostToCap += weeks * (1 - kept);
        paid = weeks * kept;
        days = diffDays(from, cap);
        end = cap;
      }
    }
    const base = input.bases[parent];
    periods[parent].push({
      parent,
      label,
      kind,
      from: toIso(from),
      to: toIso(end),
      weeks: paid,
      spanWeeks: days / 7,
      rate,
      workFraction,
      monthlyBenefit: base * rate * (1 - workFraction),
      monthlyWage: workFraction > 0 ? (base / (1 - p.employeeContributionRate)) * workFraction : 0,
      total: ((paid * 7 * base) / 30) * rate,
    });
    return end;
  }

  let end = start;
  if (start && !noRight) {
    const maternityRate = flatRateApplied ? p.rates.flat : p.rates.full;
    const parentalRate = flatRateApplied ? p.rates.flat : p.rates.parental;
    const work = (parent: ParentKey) => (input.workingParent === parent ? input.workFraction : 0);
    const maternityLabel = adoption ? "Na warunkach urlopu macierzyńskiego" : "Urlop macierzyński";
    const e1 = add(main, maternityLabel, "maternity", start, p.maternityWeeks[kids - 1], maternityRate, 0);
    const e2 = add(main, "Urlop rodzicielski", "parental", e1, mainWeeks, parentalRate, work(main));
    const e3 = add(other, "Urlop rodzicielski", "parental", e2, otherWeeks, p.rates.parental, work(other));
    const showPaternity = !adoption || input.adoptionType === "adoption";
    if (showPaternity && input.paternity) {
      // Paternity leave right after birth when the father is the "other" parent, else after the parental leave.
      const paternityStart = other === "father" ? start : e3 > e2 ? e3 : e2;
      add("father", "Urlop ojcowski", "maternity", paternityStart, p.paternityWeeks, p.rates.full, 0);
    }
    for (const parent of PARENTS) {
      for (const period of periods[parent]) {
        const to = parseIso(period.to)!;
        if (to > end!) end = to;
      }
      periods[parent].sort((a, b) => a.from.localeCompare(b.from));
    }
  }

  const totals = {
    mother: periods.mother.reduce((sum, x) => sum + x.total, 0),
    father: periods.father.reduce((sum, x) => sum + x.total, 0),
  };

  const deadline = adoption
    ? cap
      ? `Urlop najpóźniej do ${formatDate(cap)} (${capYears}. urodziny dziecka)`
      : "Wpiszcie datę urodzenia dziecka"
    : start
      ? `Urlop rodzicielski trzeba wykorzystać do 31.12.${start.getUTCFullYear() + p.parentalUntilChildAge} (rok ${p.parentalUntilChildAge}. urodzin dziecka)`
      : "";

  const warnings: string[] = [];
  if (!start) warnings.push("Wpiszcie datę.");
  if (noRight) warnings.push(`Dziecko ukończyło ${capYears} lat przed przyjęciem – urlop i zasiłek nie przysługują.`);
  if (lostOwnWeeks > 0)
    warnings.push(`${lostOwnWeeks} tyg. urlopu rodzicielskiego (${input.names[other]}) przepada – ${p.parentalOwnWeeks} tygodni każdego rodzica jest nieprzenoszalne.`);
  if (lostToCap > 0.05) warnings.push(`Urlop kończy się w dniu ${capYears}. urodzin dziecka – przepada ok. ${formatWeeks(lostToCap)} urlopu.`);
  if (zaZyciem) warnings.push("„Za życiem” wymaga zaświadczenia lekarza specjalisty – dołączcie je do wniosku.");
  if (input.workingParent) warnings.push("Praca do połowy etatu wydłuża urlop rodzicielski proporcjonalnie. Suma zasiłku się nie zmienia, dochodzi pensja.");

  return {
    start: start ? toIso(start) : null,
    end: end ? toIso(end) : null,
    periods,
    totals,
    familyTotal: totals.mother + totals.father,
    pool,
    mainWeeks,
    otherWeeks,
    maxOtherWeeks,
    flatRateAllowed,
    flatRateApplied,
    deadline,
    warnings,
  };
}
