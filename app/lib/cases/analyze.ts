import { computeBasis } from "@/lib/calc/basis";
import type { CaseExtraction, CasePeriod, PeriodKind } from "@/lib/cases/schema";
import { addDays, diffDays, formatDate, parseIso, toIso } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import type { Params } from "@/lib/params";

export const PERIOD_LABELS: Record<PeriodKind, string> = {
  maternity: "Urlop macierzyński",
  supplementary: "Urlop uzupełniający",
  parental: "Urlop rodzicielski",
  paternity: "Urlop ojcowski",
  maternity_conditions: "Urlop na warunkach macierzyńskiego",
  sickness: "Zasiłek chorobowy w ciąży",
  equal_maternity: "Zasiłek w wysokości zasiłku macierzyńskiego",
};

export type AnalyzedPeriod = CasePeriod & { days: number; rate: number; daily: number; total: number };
export type Comparison = { label: string; ours: string; zus: string; match: boolean };

export type CaseAnalysis = {
  eligible: boolean;
  eligibility: string;
  basis: { months: number; value: number; floored: boolean; capped: boolean } | null;
  monthly: number | null;
  periods: AnalyzedPeriod[];
  total: number;
  notes: string[];
  comparison: Comparison[];
};

const round2 = (x: number) => Math.round(x * 100) / 100;
const days = (p: { from: string; to: string }) => diffDays(parseIso(p.from)!, parseIso(p.to)!) + 1;
const MATERNITY_KINDS: PeriodKind[] = ["maternity", "supplementary", "parental", "paternity", "maternity_conditions", "equal_maternity"];

/** Insured days in the sickness-insurance chain that covers `day`; breaks of up to `gap` days do not interrupt it. */
function insuredDaysUntil(periods: CaseExtraction["sickInsurance"], day: Date, gap: number): number {
  const sorted = [...periods].sort((a, b) => a.from.localeCompare(b.from));
  let chain: { start: Date; end: Date } | undefined;
  for (const p of sorted) {
    const from = parseIso(p.from)!;
    const to = parseIso(p.to) ?? day;
    if (from > day) break;
    if (!chain || diffDays(chain.end, from) > gap + 1) chain = { start: from, end: to };
    else if (to > chain.end) chain.end = to;
  }
  return chain && chain.end >= day ? diffDays(chain.start, day) : 0;
}

function rateFor(kind: PeriodKind, c: CaseExtraction, p: Params): number {
  if (kind === "parental" || kind === "maternity") return c.fullLeaveDeclaration ? p.rates.flat : kind === "parental" ? p.rates.parental : p.rates.full;
  return p.rates.full;
}

function statutoryWeeks(kind: PeriodKind, c: CaseExtraction, p: Params): number | null {
  const kids = Math.max(1, c.event.kids);
  if (kind === "maternity") {
    if (c.event.kind === "stillbirth" || c.event.kind === "child_death") return p.stillbirthWeeks;
    return p.maternityWeeks[Math.min(kids, 5) - 1];
  }
  if (kind === "paternity") return p.paternityWeeks;
  if (kind === "supplementary") {
    const early = (c.event.gestationWeek !== null && c.event.gestationWeek < 28) || (c.event.birthWeightG !== null && c.event.birthWeightG <= 1000);
    return Math.min(c.event.hospitalWeeks ?? Infinity, early ? p.supplementary.capSevereWeeks : p.supplementary.capWeeks);
  }
  if (kind === "parental") {
    const pool = p.parentalPoolWeeks;
    return c.event.zaZyciem ? (kids > 1 ? pool.zaZyciemMultiple : pool.zaZyciemSingle) : kids > 1 ? pool.multiple : pool.single;
  }
  return null;
}

/** Deterministic check of a case read from a ZUS file: insurance, benefit basis, periods, amounts and the ZUS decision. */
export function analyzeCase(c: CaseExtraction, p: Params): CaseAnalysis {
  const notes: string[] = [];
  // Rows the user is still typing in are skipped until both dates are valid.
  const complete = (x: CasePeriod) => !!parseIso(x.from) && !!parseIso(x.to) && x.from <= x.to;
  const requested = (c.requested.length ? c.requested : c.decision.periods).filter(complete);
  c = { ...c, sickInsurance: c.sickInsurance.filter((s) => parseIso(s.from)) };
  const start = c.benefit === "sickness_pregnancy"
    ? requested.find((r) => r.kind === "sickness")?.from ?? c.event.date
    : c.benefit === "equal_maternity"
      ? c.insuranceEnd.date && toIso(addDays(parseIso(c.insuranceEnd.date)!, 1))
      // The right arises when this person's benefit starts (birth for the mother, later for a father's parental leave).
      : [...requested].sort((a, b) => a.from.localeCompare(b.from))[0]?.from ?? c.event.date;
  const day = parseIso(start);

  // Insurance on the day the right arises.
  let eligible = false;
  let eligibility: string;
  const voluntary = c.sickInsurance.some((s) => s.voluntary);
  if (!day) {
    eligibility = "Brak daty zdarzenia, nie można sprawdzić ubezpieczenia.";
  } else if (c.benefit === "equal_maternity") {
    eligible = c.insuranceEnd.reason === "employer_insolvency";
    eligibility = eligible
      ? `Umowa ustała ${formatDate(c.insuranceEnd.date)} z powodu upadłości, likwidacji lub śmierci pracodawcy: zasiłek w wysokości macierzyńskiego do dnia porodu.`
      : "Zasiłek w wysokości macierzyńskiego przysługuje tylko, gdy umowa ustała z powodu upadłości, likwidacji lub śmierci pracodawcy.";
  } else {
    const insuredDays = insuredDaysUntil(c.sickInsurance, day, 30);
    const covered = insuredDays > 0 || c.sickInsurance.some((s) => s.from <= start! && (s.to === null || s.to >= start!));
    if (!covered) {
      eligibility = `W dniu ${formatDate(start)} osoba nie podlegała ubezpieczeniu chorobowemu, więc zasiłek nie przysługuje.`;
    } else if (c.benefit === "sickness_pregnancy") {
      const waiting = voluntary ? 90 : 30;
      eligible = insuredDays >= waiting;
      eligibility = eligible
        ? `Ubezpieczenie chorobowe w dniu ${formatDate(start)}, okres wyczekiwania ${waiting} dni spełniony (${insuredDays} dni).`
        : `Okres wyczekiwania ${waiting} dni nie upłynął (${insuredDays} dni ubezpieczenia przed zwolnieniem).`;
    } else {
      eligible = true;
      eligibility = `Ubezpieczenie chorobowe w dniu ${formatDate(start)}. Zasiłek macierzyński nie wymaga okresu wyczekiwania.`;
    }
  }
  if (c.debtOnDate) notes.push("Na dzień powstania prawa jest zadłużenie składkowe. Zasiłek zostanie wypłacony po jego spłacie.");

  // Benefit basis: the 12 calendar months before the month the right arises.
  let basis: CaseAnalysis["basis"] = null;
  const eventMonth = start?.slice(0, 7);
  const months = c.basisMonths.filter((m) => !eventMonth || m.month < eventMonth).sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  if (months.length) {
    const capped = c.contract === "jdg" && months.some((m) => m.amount > p.maxVoluntaryBasis);
    const amounts = months.map((m) => (c.contract === "jdg" ? Math.min(m.amount, p.maxVoluntaryBasis) : m.amount));
    const r = computeBasis(amounts, p, c.contract === "uop" ? "uop" : c.contract === "jdg" ? "jdg" : "zlec");
    basis = { months: r.months, value: r.basis, floored: r.floored, capped };
    if (r.months < 12) notes.push(`Podstawa z ${r.months} pełnych miesięcy ubezpieczenia (krócej niż 12).`);
  } else if (c.decision.basis) {
    basis = { months: 0, value: c.decision.basis, floored: false, capped: false };
    notes.push("W teczce nie ma miesięcznych podstaw, więc liczymy od podstawy podanej przez ZUS.");
  }

  // Periods and amounts.
  const periods: AnalyzedPeriod[] = requested.map((r) => {
    const rate = rateFor(r.kind, c, p);
    const n = days(r);
    let daily = basis ? round2((basis.value * rate) / 30) : 0;
    const topUp = MATERNITY_KINDS.includes(r.kind) && basis && basis.value * rate < p.parentalAllowanceMonthly;
    if (topUp) daily = round2(p.parentalAllowanceMonthly / 30);
    const weeks = statutoryWeeks(r.kind, c, p);
    const usedWeeks = requested.filter((x) => x.kind === r.kind).reduce((sum, x) => sum + days(x), 0) / 7;
    if (weeks !== null && usedWeeks > weeks + 0.01 && r === requested.find((x) => x.kind === r.kind)) {
      notes.push(`${PERIOD_LABELS[r.kind]}: wniosek obejmuje ${usedWeeks.toFixed(1)} tyg., a przysługuje najwyżej ${weeks} tyg.`);
    }
    return { ...r, days: n, rate, daily, total: eligible ? round2(daily * n) : 0 };
  });
  if (periods.some((x) => x.daily === round2(p.parentalAllowanceMonthly / 30) && basis && basis.value * x.rate < p.parentalAllowanceMonthly)) {
    notes.push(`Zasiłek podwyższony do kwoty świadczenia rodzicielskiego (${formatPln(p.parentalAllowanceMonthly)} miesięcznie).`);
  }
  if (c.event.kind === "stillbirth" || c.event.kind === "child_death") notes.push(`Po martwym urodzeniu lub śmierci dziecka urlop macierzyński trwa co najmniej ${p.stillbirthWeeks} tygodni.`);
  const paternity = periods.filter((x) => x.kind === "paternity");
  if (paternity.length && c.event.childBirthDate) {
    const limit = parseIso(c.event.childBirthDate)!;
    limit.setUTCMonth(limit.getUTCMonth() + p.paternityUntilChildMonths);
    if (paternity.some((x) => parseIso(x.to)! >= limit)) notes.push(`Urlop ojcowski trzeba wykorzystać do ukończenia przez dziecko ${p.paternityUntilChildMonths} miesięcy.`);
  }

  const mainRate = periods[0]?.rate ?? (c.benefit === "sickness_pregnancy" ? p.rates.full : null);
  const monthly = basis && mainRate !== null ? round2(Math.max(basis.value * mainRate, MATERNITY_KINDS.includes(periods[0]?.kind ?? "sickness") ? p.parentalAllowanceMonthly : 0)) : null;
  const total = round2(periods.reduce((sum, x) => sum + x.total, 0));

  return { eligible, eligibility, basis, monthly, periods, total, notes, comparison: compare(c, eligible, basis?.value ?? null, monthly, mainRate, periods) };
}

function compare(c: CaseExtraction, eligible: boolean, basis: number | null, monthly: number | null, rate: number | null, periods: AnalyzedPeriod[]): Comparison[] {
  const d = c.decision;
  if (!d.present) return [];
  const rows: Comparison[] = [];
  const yes = (x: boolean) => (x ? "przysługuje" : "nie przysługuje");
  if (d.granted !== null) rows.push({ label: "Prawo do zasiłku", ours: yes(eligible), zus: yes(d.granted), match: eligible === d.granted });
  if (d.basis !== null && basis !== null) rows.push({ label: "Podstawa wymiaru", ours: formatPln(basis, 2), zus: formatPln(d.basis, 2), match: Math.abs(basis - d.basis) < 1 });
  if (d.ratePercent !== null && rate !== null) rows.push({ label: "Stawka", ours: `${round2(rate * 100)}%`, zus: `${d.ratePercent}%`, match: Math.abs(rate * 100 - d.ratePercent) < 0.1 });
  if (d.monthlyAmount !== null && monthly !== null) rows.push({ label: "Kwota miesięczna", ours: formatPln(monthly, 2), zus: formatPln(d.monthlyAmount, 2), match: Math.abs(monthly - d.monthlyAmount) < 1 });
  for (const z of d.periods) {
    const ours = periods.find((x) => x.kind === z.kind && x.from === z.from) ?? periods.find((x) => x.kind === z.kind);
    rows.push({
      label: PERIOD_LABELS[z.kind],
      ours: ours ? `${formatDate(ours.from)} – ${formatDate(ours.to)}` : "brak",
      zus: `${formatDate(z.from)} – ${formatDate(z.to)}`,
      match: !!ours && ours.from === z.from && ours.to === z.to,
    });
  }
  return rows;
}
