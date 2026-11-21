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
  /** Legacy input: the reduced sick-pay limit already applies. */
  over50?: boolean;
  yearTurned50?: number;
};

export type PregnancyRow = { label: string; amount: number | null; note: string };

export type PregnancyResult = {
  total: number;
  days: number;
  payer: string;
  rows: PregnancyRow[];
  warnings: string[];
};

const PAYERS: Record<ContractType, string> = {
  uop: "Zasiłek wypłaca pracodawca zgłaszający ponad 20 osób do ubezpieczenia chorobowego albo ZUS",
  zlec: "płatnik składek albo ZUS",
  jdg: "ZUS – wniosek ZAS-53",
};

export function calcPregnancy(input: PregnancyInput, p: Params): PregnancyResult {
  const insured = parseIso(input.insuredFrom);
  const sickLeave = parseIso(input.sickLeaveFrom);
  const due = parseIso(input.dueDate);
  const certifiedEnd = parseIso(input.sickLeaveThrough);
  const daily = input.basis * p.rates.full / 30;
  const rows: PregnancyRow[] = [];
  const warnings: string[] = [];
  const payer = input.employerInsolvent ? "ZUS" : PAYERS[input.contract];

  if (!insured || !sickLeave || !due || due <= sickLeave) {
    return { total: 0, days: 0, payer, rows, warnings: ["Uzupełnijcie daty. Termin porodu musi być po dacie zwolnienia."] };
  }

  const employerLimit = (year: number) => (input.yearTurned50 ? year > input.yearTurned50 : input.over50) ? p.employerPaidDaysOver50 : p.employerPaidDays;
  const waiting = p.waitingDays[input.contract];
  const eligibleFrom = addDays(insured, waiting);
  const payStart = input.employerInsolvent || sickLeave >= eligibleFrom ? sickLeave : eligibleFrom;
  if (!input.employerInsolvent && sickLeave < eligibleFrom)
    warnings.push(`Szacunek przyjmuje ${waiting} dni wyczekiwania do ${formatDate(eligibleFrom)}. Sprawdź wcześniejsze okresy ubezpieczenia i wyjątki od wyczekiwania.`);

  if (!input.employerInsolvent && input.sickLeaveThrough && (!certifiedEnd || certifiedEnd < sickLeave)) {
    return { total: 0, days: 0, payer, rows, warnings: ["Ostatni dzień zwolnienia musi przypadać w dniu rozpoczęcia zwolnienia lub później."] };
  }
  const end = !input.employerInsolvent && certifiedEnd && certifiedEnd < due ? addDays(certifiedEnd, 1) : due;
  if (!input.employerInsolvent && !certifiedEnd) warnings.push("Szacunek zakłada niezdolność do pracy do dnia poprzedzającego poród.");

  const count = { employer: 0, sickness: 0, insolvency: 0 };
  const employerDaysByYear: Record<number, number> = {};
  for (let d = payStart; d < end; d = addDays(d, 1)) {
    if (input.employerInsolvent) {
      count.insolvency++;
      continue;
    }
    if (diffDays(sickLeave, d) + 1 > p.benefitPeriodDays) break;
    const year = d.getUTCFullYear();
    employerDaysByYear[year] ??= 0;
    if (input.contract === "uop" && employerDaysByYear[year] < employerLimit(year)) {
      employerDaysByYear[year]++;
      count.employer++;
    } else {
      count.sickness++;
    }
  }

  if (count.insolvency)
    rows.push({ label: "Zasiłek w wysokości macierzyńskiego", amount: count.insolvency * daily, note: `${count.insolvency} dni ze stawką 100%. Wniosek złóż bezpośrednio do ZUS.` });
  if (count.employer)
    rows.push({ label: "Wynagrodzenie chorobowe", amount: count.employer * daily, note: `${count.employer} dni ze stawką 100%. Wypłaca pracodawca. Szacunek zakłada, że wcześniej w tym roku nie wykorzystano dni wynagrodzenia chorobowego.` });
  if (count.sickness) rows.push({ label: "Zasiłek chorobowy", amount: count.sickness * daily, note: `${count.sickness} dni ze stawką 100% po potwierdzeniu ciąży.` });
  if (!input.employerInsolvent && diffDays(sickLeave, end) >= p.benefitPeriodDays - 6 * 7) {
    const recommendedDate = addDays(sickLeave, p.benefitPeriodDays - 1 - 6 * 7);
    warnings.push(`Jeśli nadal potrzebujesz leczenia po wyczerpaniu chorobowego, złóż ZNp-7 co najmniej 6 tygodni przed końcem okresu zasiłkowego (w tym szacunku do ${formatDate(recommendedDate)}). O świadczeniu decyduje ZUS.`);
  }
  rows.push({ label: "Od dnia porodu", amount: null, note: "Sprawdź warunki zasiłku macierzyńskiego w kalkulatorze Narodziny." });

  const days = count.employer + count.sickness + count.insolvency;
  return { total: days * daily, days, payer, rows, warnings };
}
