import { formatRate } from "@/lib/format";
import { computeBasis } from "@/lib/calc/basis";
import { activeAnswers, type Answers } from "@/lib/guide/tree";
import type { Params } from "@/lib/params";

/** Monthly benefit estimates from one average monthly income, or null when it was not given. */
export function estimateAmounts(answers: Answers, topicIds: Set<string>, p: Params) {
  const a = activeAnswers(answers);
  if (typeof a.monthlyIncome !== "number" || a.monthlyIncome <= 0) return null;
  const insurance = (a.insurance ?? []) as string[];
  const employee = insurance.includes("employment");
  const capped = employee ? a.monthlyIncome : Math.min(a.monthlyIncome, p.maxVoluntaryBasis);
  const { basis } = computeBasis([capped], p, employee ? "uop" : insurance.includes("business") ? "jdg" : "zlec");
  // Maternity benefit below the parental allowance is topped up to it (art. 31 ust. 3a u.z.).
  const maternity = (rate: number) => Math.max(basis * rate, p.parentalAllowanceMonthly);
  const has = (...ids: string[]) => ids.some((id) => topicIds.has(id));
  const rows = [
    has("sicknessPregnancy", "sicknessAfterInsurance") && { label: `Zasiłek chorobowy w ciąży (${formatRate(p.rates.full)})`, amount: basis },
    has("maternity", "adoptionLeave", "stillbirth", "supplementary") && { label: "Zasiłek macierzyński za urlop macierzyński (100%)", amount: maternity(p.rates.full) },
    has("paternity") && { label: "Zasiłek za urlop ojcowski (100%)", amount: maternity(p.rates.full) },
    has("parental") && { label: `Zasiłek za urlop rodzicielski (${formatRate(p.rates.parental)})`, amount: maternity(p.rates.parental) },
    has("maternity", "adoptionLeave") && a.role !== "father" && { label: `Cały okres przy wniosku w ciągu ${p.flatRateRequestDays} dni (${formatRate(p.rates.flat)})`, amount: maternity(p.rates.flat) },
  ].filter((row) => row !== false);
  return { basis, rows };
}
