import { addDays, diffDays, formatDate, parseIso } from "@/lib/dates";
import type { Params } from "@/lib/params";

export type ContractType = "uop" | "zlec" | "jdg";

export type PregnancyInput = {
  contract: ContractType;
  insuredFrom: string;
  sickLeaveFrom: string;
  dueDate: string;
  basis: number;
  /** Contract ended in pregnancy because the employer went bankrupt, was liquidated or died. */
  employerInsolvent: boolean;
  /** 50 or older: the employer pays 14 sick days a year instead of 33. */
  over50?: boolean;
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
  uop: "pracodawca (zgłasza ponad 20 osób)",
  zlec: "płatnik składek albo ZUS",
  jdg: "ZUS – wniosek ZAS-53",
};

export function calcPregnancy(input: PregnancyInput, p: Params): PregnancyResult {
  const insured = parseIso(input.insuredFrom);
  const sickLeave = parseIso(input.sickLeaveFrom);
  const due = parseIso(input.dueDate);
  const daily = input.basis / 30;
  const rows: PregnancyRow[] = [];
  const warnings: string[] = [];
  const payer = input.employerInsolvent ? "ZUS" : PAYERS[input.contract];

  if (!insured || !sickLeave || !due || due <= sickLeave) {
    return { total: 0, days: 0, payer, rows, warnings: ["Uzupełnijcie daty. Termin porodu musi być po dacie zwolnienia."] };
  }

  const employerDays = input.over50 ? p.employerPaidDaysOver50 : p.employerPaidDays;
  const waiting = p.waitingDays[input.contract];
  const eligibleFrom = addDays(insured, waiting);
  const payStart = input.employerInsolvent || sickLeave >= eligibleFrom ? sickLeave : eligibleFrom;
  if (!input.employerInsolvent && sickLeave < eligibleFrom)
    warnings.push(`Prawo do zasiłku powstaje ${formatDate(eligibleFrom)} – po ${waiting} dniach ubezpieczenia. Za wcześniejsze dni zwolnienia nie przysługuje.`);

  const count = { employer: 0, sickness: 0, rehab: 0, insolvency: 0 };
  const employerDaysByYear: Record<number, number> = {};
  for (let d = payStart; d < due; d = addDays(d, 1)) {
    if (input.employerInsolvent) {
      count.insolvency++;
      continue;
    }
    if (diffDays(sickLeave, d) + 1 > p.benefitPeriodDays) {
      count.rehab++;
      continue;
    }
    const year = d.getUTCFullYear();
    employerDaysByYear[year] ??= 0;
    if (input.contract === "uop" && employerDaysByYear[year] < employerDays) {
      employerDaysByYear[year]++;
      count.employer++;
    } else {
      count.sickness++;
    }
  }

  if (count.insolvency)
    rows.push({ label: "Zasiłek w wysokości macierzyńskiego", amount: count.insolvency * daily, note: `${count.insolvency} dni ze stawką 100%. Wniosek złóż bezpośrednio do ZUS.` });
  if (count.employer)
    rows.push({ label: "Wynagrodzenie chorobowe", amount: count.employer * daily, note: `${count.employer} dni ze stawką 100%. Wypłaca pracodawca (do ${employerDays} dni w roku).` });
  if (count.sickness) rows.push({ label: "Zasiłek chorobowy", amount: count.sickness * daily, note: `${count.sickness} dni ze stawką 100% (kod B).` });
  if (count.rehab) {
    rows.push({ label: "Świadczenie rehabilitacyjne", amount: count.rehab * daily, note: `${count.rehab} dni po ${p.benefitPeriodDays} dniach zwolnienia. Wymaga decyzji ZUS.` });
    warnings.push(`Zwolnienie przekracza ${p.benefitPeriodDays} dni (okres zasiłkowy). Dalej możliwe jest świadczenie rehabilitacyjne – o jego przyznaniu decyduje ZUS.`);
  }
  rows.push({ label: "Od dnia porodu", amount: null, note: "Zaczyna się zasiłek macierzyński – zobaczcie zakładkę Narodziny." });

  const days = count.employer + count.sickness + count.rehab + count.insolvency;
  return { total: days * daily, days, payer, rows, warnings };
}
