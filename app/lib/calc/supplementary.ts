import type { Params } from "@/lib/params";

export type SupplementaryInput = {
  /** Completed weeks of pregnancy at birth. */
  gestationWeek: number | null;
  birthWeightG: number | null;
  /** Days the child stayed in hospital (all stays summed); for a child born at term, count from the 5th day after birth. */
  hospitalDays: number;
};

/**
 * Supplementary maternity leave (KP art. 180¹): one week per started week in hospital, up to 15 weeks for a child born
 * before the 28th week or weighing at most 1000 g, otherwise up to 8 weeks. A child born at term qualifies only after
 * at least 2 days in hospital between the 5th and 28th day of life. For twins pass the lowest weight and longest stay.
 */
export function supplementaryLeave({ gestationWeek, birthWeightG, hospitalDays }: SupplementaryInput, p: Params): { weeks: number; cap: number } {
  const s = p.supplementary;
  const severe = (gestationWeek !== null && gestationWeek < s.weekLow) || (birthWeightG !== null && birthWeightG <= s.weightLow);
  const cap = severe ? s.capSevereWeeks : s.capWeeks;
  const atTerm = !severe && gestationWeek !== null && gestationWeek >= s.weekTerm;
  const days = Number.isFinite(hospitalDays) ? Math.max(0, Math.floor(hospitalDays)) : 0;
  if (atTerm && days < s.termMinDays) return { weeks: 0, cap };
  return { weeks: Math.min(Math.ceil(days / 7), cap), cap };
}
