import { addDays, diffDays, formatDate, parseIso } from "@/lib/dates";
import type { Params } from "@/lib/params";

export type ContractType = "uop" | "zlec" | "jdg";

export type PregnancyInput = {
  contract: ContractType;
  insuredFrom: string;
  sickLeaveFrom: string;
  dueDate: string;
  /** Last certified day of incapacity, inclusive. */
  sickLeaveThrough?: string;
  basis: number;
  /** Contract ended in pregnancy because the employer went bankrupt, was liquidated or died. */
  employerInsolvent: boolean;
  /** No waiting period (art. 4 ust. 3 u.z.). */
  waitingWaived?: boolean;
  employmentEnd?: string;
  uninsured?: boolean;
  /** Legacy input: the reduced sick-pay limit already applies. */
  over50?: boolean;
  yearTurned50?: number;
  payerSize?: "gt20" | "le20" | "na" | "unknown";
  simulateRehabilitation?: boolean;
  contributionDebt?: number;
};

export type PregnancyRow = { label: string; amount: number | null; note: string };

export type PregnancyResult = {
  total: number;
  days: number;
  payer: string;
  rows: PregnancyRow[];
  warnings: string[];
};

export function calcPregnancy(input: PregnancyInput, p: Params): PregnancyResult {
  const insured = parseIso(input.insuredFrom);
  const sickLeave = parseIso(input.sickLeaveFrom);
  const due = parseIso(input.dueDate);
  const certifiedEnd = parseIso(input.sickLeaveThrough);
  const daily = input.basis * p.rates.full / 30;
  const rows: PregnancyRow[] = [];
  const warnings: string[] = [];
  const payer = input.employerInsolvent ? "ZUS"
    : input.contract === "jdg" ? "ZUS – wniosek ZAS-53"
    : input.payerSize === "le20" ? "ZUS"
    : input.payerSize === "gt20" ? "Płatnik składek"
    : "Płatnik składek albo ZUS (zależnie od liczby ubezpieczonych)";

  const employmentEnd = parseIso(input.employmentEnd);
  if (input.employerInsolvent && (input.contract !== "uop" || !employmentEnd || !due || due <= employmentEnd)) {
    return { total: 0, days: 0, payer, rows, warnings: ["Wpisz datę ustania umowy o pracę przed porodem."] };
  }
  if (input.employerInsolvent && employmentEnd && due) {
    const days = diffDays(employmentEnd, due) - 1;
    const total = days * daily;
    rows.push({ label: "Zasiłek w wysokości macierzyńskiego", amount: total, note: `${days} dni od dnia po ustaniu zatrudnienia do dnia poprzedzającego poród. Wniosek złóż bezpośrednio do ZUS.` });
    return { total, days, payer, rows, warnings };
  }
  if (input.uninsured) {
    return { total: 0, days: 0, payer: "—", rows, warnings: ["Przy braku ubezpieczenia chorobowego zasiłek co do zasady nie przysługuje. Jeśli ubezpieczenie niedawno ustało, sprawdź warunki wypłaty po jego ustaniu w ZUS."] };
  }
  if (!insured || !sickLeave || !due || due <= sickLeave) {
    return { total: 0, days: 0, payer, rows, warnings: ["Uzupełnijcie daty. Termin porodu musi być po dacie zwolnienia."] };
  }

  const employerLimit = (year: number) => (input.yearTurned50 ? year > input.yearTurned50 : input.over50) ? p.employerPaidDaysOver50 : p.employerPaidDays;
  const waiting = input.waitingWaived ? 0 : p.waitingDays[input.contract];
  const eligibleFrom = addDays(insured, waiting);
  const payStart = sickLeave >= eligibleFrom ? sickLeave : eligibleFrom;
  if (sickLeave < eligibleFrom)
    warnings.push(`Szacunek przyjmuje ${waiting} dni wyczekiwania do ${formatDate(eligibleFrom)}. Sprawdź wcześniejsze okresy ubezpieczenia i wyjątki od wyczekiwania.`);

  if (input.sickLeaveThrough && (!certifiedEnd || certifiedEnd < sickLeave)) {
    return { total: 0, days: 0, payer, rows, warnings: ["Ostatni dzień zwolnienia musi przypadać w dniu rozpoczęcia zwolnienia lub później."] };
  }
  const end = certifiedEnd && certifiedEnd < due ? addDays(certifiedEnd, 1) : due;
  const debtLimit = p.minWage * p.contributionDebtLimitRate;
  if (input.contract === "jdg" && (input.contributionDebt ?? 0) > debtLimit) {
    warnings.push("Zadłużenie składkowe przekracza ustawowy próg. Wypłata świadczenia jest wstrzymana do spłaty całości.");
    return { total: 0, days: 0, payer, rows, warnings };
  }
  if (!certifiedEnd) warnings.push("Szacunek zakłada niezdolność do pracy do dnia poprzedzającego poród.");

  const count = { employer: 0, sickness: 0, rehab: 0 };
  const employerDaysByYear: Record<number, number> = {};
  for (let d = payStart; d < end; d = addDays(d, 1)) {
    if (diffDays(sickLeave, d) + 1 > p.benefitPeriodDays) {
      count.rehab = diffDays(d, end);
      break;
    }
    const year = d.getUTCFullYear();
    employerDaysByYear[year] ??= 0;
    if (input.contract === "uop" && employerDaysByYear[year] < employerLimit(year)) {
      employerDaysByYear[year]++;
      count.employer++;
    } else {
      count.sickness++;
    }
  }

  if (count.employer)
    rows.push({ label: "Wynagrodzenie chorobowe", amount: count.employer * daily, note: `${count.employer} dni ze stawką 100%. Wypłaca pracodawca. Szacunek zakłada, że wcześniej w tym roku nie wykorzystano dni wynagrodzenia chorobowego.` });
  if (count.sickness) rows.push({ label: "Zasiłek chorobowy", amount: count.sickness * daily, note: `${count.sickness} dni ze stawką 100% po potwierdzeniu ciąży.` });
  if (diffDays(sickLeave, end) >= p.benefitPeriodDays - 6 * 7) {
    const recommendedDate = addDays(sickLeave, p.benefitPeriodDays - 1 - 6 * 7);
    warnings.push(`Jeśli nadal potrzebujesz leczenia po wyczerpaniu chorobowego, złóż ZNp-7 co najmniej 6 tygodni przed końcem okresu zasiłkowego (w tym szacunku do ${formatDate(recommendedDate)}). O świadczeniu decyduje ZUS.`);
  }
  if (count.rehab) {
    rows.push({ label: "Świadczenie rehabilitacyjne (oddzielna symulacja)", amount: input.simulateRehabilitation ? count.rehab * daily : null, note: `${count.rehab} dni po wyczerpaniu chorobowego. Złóż ZNp-7 z dokumentacją medyczną. ZUS ocenia, czy dalsze leczenie rokuje odzyskanie zdolności do pracy.` });
    warnings.push(`Po wyczerpaniu ${p.benefitPeriodDays} dni chorobowego dalsze świadczenie wymaga decyzji ZUS.`);
  }
  rows.push({ label: "Od dnia porodu", amount: null, note: "Sprawdź warunki zasiłku macierzyńskiego w kalkulatorze Narodziny." });

  const days = count.employer + count.sickness;
  return { total: days * daily, days, payer, rows, warnings };
}
