import { paternityEndLimit } from "@/lib/calc/leave";
import { computeBasis } from "@/lib/calc/basis";
import { supplementaryLeave } from "@/lib/calc/supplementary";
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
  eligible: boolean | null;
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
const MATERNITY_KINDS: PeriodKind[] = ["maternity", "supplementary", "parental", "maternity_conditions"];

/** Insured days in the sickness-insurance chain that covers `day`; breaks of up to `gap` days do not interrupt it. */
function insuredDaysUntil(periods: CaseExtraction["sickInsurance"], day: Date, gap: number): number {
  const sorted = [...periods].sort((a, b) => a.from.localeCompare(b.from));
  let chain: { end: Date; days: number } | undefined;
  for (const p of sorted) {
    const from = parseIso(p.from)!;
    const end = p.to === null ? day : parseIso(p.to);
    if (from > day) break;
    if (!end || end < from) continue;
    const to = end > day ? day : end;
    if (!chain || diffDays(chain.end, from) > gap + 1) {
      chain = { end: to, days: diffDays(from, to) + 1 };
    } else if (to > chain.end) {
      chain.days += Math.min(diffDays(chain.end, to), diffDays(from, to) + 1);
      chain.end = to;
    }
  }
  return chain && chain.end >= day ? chain.days - 1 : 0;
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
    const { cap } = supplementaryLeave({ gestationWeek: c.event.gestationWeek, birthWeightG: c.event.birthWeightG, hospitalDays: 0 }, p);
    return Math.min(c.event.hospitalWeeks ?? Infinity, cap);
  }
  if (kind === "parental") {
    const pool = p.parentalPoolWeeks;
    return c.event.zaZyciem ? (kids > 1 ? pool.zaZyciemMultiple : pool.zaZyciemSingle) : kids > 1 ? pool.multiple : pool.single;
  }
  return null;
}

/** Deterministic check of a case read from a ZUS file: insurance, benefit basis, periods, amounts and the ZUS decision. */
export function analyzeCase(c: CaseExtraction, p: Params, individualBasis?: number): CaseAnalysis {
  const notes: string[] = [];
  // Rows the user is still typing in are skipped until both dates are valid.
  const complete = (x: CasePeriod) => !!parseIso(x.from) && !!parseIso(x.to) && x.from <= x.to;
  const requested = c.requested.filter(complete);
  const ruling = parseIso(c.notInsuredFrom ?? "") ? c.notInsuredFrom! : null;
  // A ZUS ruling on not being insured ends every insurance period read from other documents.
  const ruledEnd = ruling && toIso(addDays(parseIso(ruling)!, -1));
  c = { ...c, sickInsurance: c.sickInsurance.filter((s) => parseIso(s.from) && (!ruling || s.from < ruling))
    .map((s) => (ruledEnd && (s.to === null || s.to > ruledEnd) ? { ...s, to: ruledEnd } : s)) };
  const start = c.benefit === "sickness_pregnancy"
    ? requested.find((r) => r.kind === "sickness")?.from ?? c.event.date
    : c.benefit === "equal_maternity"
      ? parseIso(c.insuranceEnd.date) && toIso(addDays(parseIso(c.insuranceEnd.date)!, 1))
      // The right arises when this person's benefit starts (birth for the mother, later for a father's parental leave).
      : [...requested].sort((a, b) => a.from.localeCompare(b.from))[0]?.from ?? c.event.date;
  const day = parseIso(start);

  // Insurance on the day the right arises.
  let eligible: boolean | null = false;
  let eligibility: string;
  const coveredPeriods = c.sickInsurance.filter((s) => start && s.from <= start && (s.to === null || (parseIso(s.to) && s.to >= start)));
  if (c.benefit === "other") {
    eligible = null;
    eligibility = "Wybierz obsługiwany rodzaj zasiłku.";
  } else if (!day) {
    eligible = null;
    eligibility = "Brak daty zdarzenia, nie można sprawdzić ubezpieczenia.";
  } else if (c.benefit === "equal_maternity") {
    eligible = c.insuranceEnd.reason === "employer_insolvency";
    eligibility = eligible
      ? `Umowa ustała ${formatDate(c.insuranceEnd.date)} z powodu upadłości, likwidacji lub śmierci pracodawcy: zasiłek w wysokości macierzyńskiego do dnia porodu.`
      : "Zasiłek w wysokości macierzyńskiego przysługuje tylko, gdy umowa ustała z powodu upadłości, likwidacji lub śmierci pracodawcy.";
  } else if (c.benefit === "maternity" && c.claimant === "mother" && c.contract === "uop" &&
    c.insuranceEnd.reason === "unlawful_dismissal" && c.event.kind === "birth" &&
    c.event.date && parseIso(c.event.date) && c.insuranceEnd.date && parseIso(c.insuranceEnd.date) &&
    c.insuranceEnd.date < c.event.date && toIso(day) >= c.event.date) {
    eligible = true;
    eligibility = "Zasiłek macierzyński po urodzeniu dziecka przysługuje przy rozwiązaniu umowy w ciąży z naruszeniem prawa potwierdzonym prawomocnym wyrokiem (art. 30 ust. 1 pkt 2).";
  } else {
    const insuredDays = insuredDaysUntil(c.sickInsurance, day, 30);
    const covered = coveredPeriods.length > 0;
    if (ruling && start && ruling <= start) {
      eligibility = `ZUS ustalił, że od ${formatDate(ruling)} osoba nie podlega ubezpieczeniu chorobowemu. W dniu ${formatDate(start)} nie miała ubezpieczenia, więc zasiłek nie przysługuje.`;
    } else if (!covered && c.uninsuredOnStart !== true && (!c.sickInsurance.length || c.uncertain.some((key) => key.startsWith("sickInsurance")))) {
      eligible = null;
      eligibility = "Sprawdź dokument i uzupełnij okresy ubezpieczenia chorobowego, aby ocenić prawo do zasiłku.";
    } else if (!covered && c.benefit === "sickness_pregnancy") {
      eligible = null;
      eligibility = "Wymaga sprawdzenia. Ustal, kiedy rozpoczęła się niezdolność do pracy względem końca ubezpieczenia.";
    } else if (!covered) {
      eligibility = `W dniu ${formatDate(start)} osoba nie podlegała ubezpieczeniu chorobowemu, więc zasiłek nie przysługuje.`;
    } else if (c.benefit === "sickness_pregnancy") {
      const waiting = coveredPeriods.some((s) => !s.voluntary) ? p.waitingDays.uop : p.waitingDays.jdg;
      eligible = insuredDays >= waiting ? true : null;
      eligibility = eligible
        ? `Ubezpieczenie chorobowe w dniu ${formatDate(start)}, okres wyczekiwania ${waiting} dni spełniony (${insuredDays} dni).`
        : `Wymaga sprawdzenia. Sprawdź okresy zaliczane do wyczekiwania i wyjątki od wymogu ${waiting} dni.`;
    } else {
      eligible = true;
      eligibility = `Ubezpieczenie chorobowe w dniu ${formatDate(start)}. Zasiłek macierzyński nie wymaga okresu wyczekiwania.`;
    }
  }
  if (c.debtOnDate) notes.push("Na dzień powstania prawa jest zadłużenie składkowe. Zasiłek zostanie wypłacony po jego spłacie.");

  // Benefit basis: the 12 calendar months before the month the right arises.
  let basis: CaseAnalysis["basis"] = null;
  const eventMonth = start?.slice(0, 7);
  const validMonths = c.basisMonths.filter((m) => /^\d{4}-(0[1-9]|1[0-2])$/.test(m.month) && Number.isFinite(m.amount) && m.amount > 0 && (!eventMonth || m.month < eventMonth));
  const months = [...new Map(validMonths.map((m) => [m.month, m])).values()].sort((a, b) => a.month.localeCompare(b.month)).slice(-12);
  if (individualBasis !== undefined && Number.isFinite(individualBasis) && individualBasis > 0) {
    basis = { months: 0, value: individualBasis, floored: false, capped: false };
  } else if (months.length) {
    const capped = c.contract === "jdg" && months.some((m) => m.amount > p.maxVoluntaryBasis);
    const r = computeBasis(months.map((m) => m.amount), p, c.contract === "unknown" ? "zlec" : c.contract);
    basis = { months: r.months, value: r.basis, floored: r.floored, capped };
    if (r.months < 12) notes.push(`Podstawa z ${r.months} pełnych miesięcy ubezpieczenia (krócej niż 12).`);
  }
  // ZUS wrote that the benefit is below the parental allowance, so the payout is the allowance even without the basis.
  const allowanceOnly = !basis && c.parentalAllowanceTopUp === true;
  if (allowanceOnly) notes.push(`ZUS ustalił zasiłek niższy niż świadczenie rodzicielskie, więc wypłaca ${formatPln(p.parentalAllowanceMonthly)} miesięcznie (art. 31 ust. 3a ustawy zasiłkowej).`);
  else if (eligible && !basis) notes.push("Uzupełnij podstawę wymiaru, aby obliczyć kwotę.");
  if (eligible && !requested.length) notes.push("Uzupełnij okresy z wniosku, aby obliczyć łączną kwotę.");

  // Periods and amounts.
  const birth = c.event.kind === "birth" ? parseIso(c.event.childBirthDate ?? c.event.date) : null;
  const paternityLimit = paternityEndLimit(birth, null, p);
  let paternityDaysLeft = p.paternityWeeks * 7;
  const periods: AnalyzedPeriod[] = (eligible === null ? [] : [...requested].sort((a, b) => a.from.localeCompare(b.from))).flatMap((r) => {
    const rate = rateFor(r.kind, c, p);
    let n = days(r);
    if (r.kind === "paternity") {
      const deadlineDays = paternityLimit ? diffDays(parseIso(r.from)!, paternityLimit) : n;
      const available = birth && r.from < toIso(birth) ? 0 : Math.min(n, paternityDaysLeft, deadlineDays);
      const payable = Math.max(0, Math.floor(available / p.paternityMinPartDays) * p.paternityMinPartDays);
      if (payable < n) notes.push(`Urlop ojcowski: zgłoszono ${n} dni, w wyliczeniu uwzględniono ${payable} dni po zastosowaniu limitu i minimalnego wymiaru części.`);
      if (!payable) return [];
      n = payable;
      paternityDaysLeft -= payable;
    }
    let daily = basis ? round2((basis.value * rate) / 30) : 0;
    const topUp = MATERNITY_KINDS.includes(r.kind) && (basis ? basis.value * rate < p.parentalAllowanceMonthly : allowanceOnly);
    if (topUp) daily = round2(p.parentalAllowanceMonthly / 30);
    const weeks = statutoryWeeks(r.kind, c, p);
    const usedWeeks = requested.filter((x) => x.kind === r.kind).reduce((sum, x) => sum + days(x), 0) / 7;
    if (weeks !== null && usedWeeks > weeks + 0.01 && r === requested.find((x) => x.kind === r.kind)) {
      notes.push(`${PERIOD_LABELS[r.kind]}: wniosek obejmuje ${usedWeeks.toFixed(1)} tyg., a przysługuje najwyżej ${weeks} tyg.`);
    }
    return [{ ...r, to: toIso(addDays(parseIso(r.from)!, n - 1)), days: n, rate, daily, total: eligible ? round2(daily * n) : 0 }];
  });
  if (periods.some((x) => x.daily === round2(p.parentalAllowanceMonthly / 30) && basis && basis.value * x.rate < p.parentalAllowanceMonthly)) {
    notes.push(`Zasiłek podwyższony do kwoty świadczenia rodzicielskiego (${formatPln(p.parentalAllowanceMonthly)} miesięcznie).`);
  }
  if (c.event.kind === "stillbirth" || c.event.kind === "child_death") notes.push(`Po martwym urodzeniu lub śmierci dziecka urlop macierzyński trwa co najmniej ${p.stillbirthWeeks} tygodni.`);
  const mainRate = periods[0]?.rate ?? (c.benefit === "sickness_pregnancy" ? p.rates.full : null);
  const allowanceFloor = MATERNITY_KINDS.includes(periods[0]?.kind ?? "sickness") ? p.parentalAllowanceMonthly : 0;
  const monthly = !eligible || mainRate === null ? null
    : basis ? round2(Math.max(basis.value * mainRate, allowanceFloor)) : allowanceOnly && allowanceFloor ? allowanceFloor : null;
  const total = round2(periods.reduce((sum, x) => sum + x.total, 0));

  return { eligible, eligibility, basis, monthly, periods, total, notes, comparison: compare(c, eligible, basis?.value ?? null, monthly, mainRate, periods) };
}

function compare(c: CaseExtraction, eligible: boolean | null, basis: number | null, monthly: number | null, rate: number | null, periods: AnalyzedPeriod[]): Comparison[] {
  const d = c.decision;
  if (!d.present) return [];
  const rows: Comparison[] = [];
  const yes = (x: boolean) => (x ? "przysługuje" : "nie przysługuje");
  if (d.granted !== null && eligible !== null) rows.push({ label: "Prawo do zasiłku", ours: yes(eligible), zus: yes(d.granted), match: eligible === d.granted });
  // A refusal lists the claimed periods and amounts, not granted ones, so only the right itself is compared.
  if (d.granted === false) return rows;
  if (d.basis !== null && basis !== null) rows.push({ label: "Podstawa wymiaru", ours: formatPln(basis, 2), zus: formatPln(d.basis, 2), match: Math.abs(basis - d.basis) < 1 });
  if (d.ratePercent !== null && rate !== null) rows.push({ label: "Stawka", ours: `${round2(rate * 100)}%`, zus: `${d.ratePercent}%`, match: Math.abs(rate * 100 - d.ratePercent) < 0.1 });
  if (d.monthlyAmount !== null && monthly !== null) rows.push({ label: "Kwota miesięczna", ours: formatPln(monthly, 2), zus: formatPln(d.monthlyAmount, 2), match: Math.abs(monthly - d.monthlyAmount) < 1 });
  for (const z of d.periods) {
    const exact = periods.find((x) => x.kind === z.kind && x.from === z.from && x.to === z.to);
    // ZUS often states one maternity benefit period covering maternity, supplementary and parental leave together.
    const chain = exact ? null : maternityChain(periods, z);
    const ours = exact ?? chain ?? periods.find((x) => x.kind === z.kind && x.from === z.from) ?? periods.find((x) => x.kind === z.kind);
    rows.push({
      label: chain ? "Zasiłek macierzyński (łącznie)" : PERIOD_LABELS[z.kind],
      ours: ours ? `${formatDate(ours.from)} – ${formatDate(ours.to)}` : "brak",
      zus: `${formatDate(z.from)} – ${formatDate(z.to)}`,
      match: !!ours && ours.from === z.from && ours.to === z.to,
    });
  }
  return rows;
}

/** Our consecutive maternity-benefit periods that together span exactly the ZUS period, or null. */
function maternityChain(periods: AnalyzedPeriod[], z: CasePeriod): { from: string; to: string } | null {
  if (!MATERNITY_KINDS.includes(z.kind)) return null;
  const inside = periods.filter((x) => MATERNITY_KINDS.includes(x.kind) && x.from >= z.from && x.to <= z.to)
    .sort((a, b) => a.from.localeCompare(b.from));
  if (inside.length < 2 || inside[0].from !== z.from || inside.at(-1)!.to !== z.to) return null;
  const contiguous = inside.every((x, i) => i === 0 || x.from === toIso(addDays(parseIso(inside[i - 1].to)!, 1)));
  return contiguous ? { from: z.from, to: z.to } : null;
}
