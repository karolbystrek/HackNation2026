import type { ContractType } from "@/lib/calc/pregnancy";
import { shiftIso, todayInWarsaw } from "@/lib/dates";
import { activeAnswers, nextQuestion, type Answers } from "@/lib/guide/tree";
import { findPersona, type ParentProfile, type Persona } from "@/lib/mock/personas";

/** personaId of a plan built from the questionnaire instead of a demo profile. */
export const GUIDE_ID = "guide";

function parent(name: string, nameGenitive: string, contract: ContractType, monthly: number, insuredFrom: string, age: number): ParentProfile {
  return {
    name, nameGenitive, age, contract, insuredFrom,
    employment: "Według odpowiedzi w formularzu", payer: "", insurance: "", contributions: "",
    sickLeaveFrom: null, monthlyGross: Array(12).fill(monthly),
  };
}

/** The questionnaire answers in the shape the panel and calculators read. */
export function personaFromAnswers(answers: Answers): Persona {
  const a = activeAnswers(answers);
  const today = todayInWarsaw();
  const insurance = (a.insurance ?? []) as string[];
  const contract: ContractType = insurance.includes("employment") ? "uop" : insurance.includes("business") ? "jdg" : "zlec";
  const placement = a.placementDate as string | undefined;
  const birthDate = (a.birthDate as string | undefined) ?? placement;
  // Planning a child: no date yet, so calculators start about one pregnancy from today.
  const dueDate = (a.dueDate as string | undefined) ?? birthDate ?? shiftIso(today, 280);
  const me = parent("Ty", "Ciebie", contract, Number(a.monthlyIncome) || 0, (a.insuredSince as string | undefined) ?? today, a.over50 ? 50 : 30);
  const other = parent("Drugi rodzic", "drugiego rodzica", "uop", 0, today, 30);
  const isFather = a.role === "father";
  const anchor = birthDate ?? dueDate;

  return {
    id: GUIDE_ID,
    label: "Twoje dane z formularza",
    fetchedAt: today,
    dueDate,
    birthDate,
    paternityStart: anchor,
    wantsAveragedRate: a.wantsAveragedRate === true,
    kids: Math.max(Number(a.childrenCount) || 1, 1),
    parents: isFather ? { mother: other, father: me } : { mother: me, father: other },
    events: [{
      id: "birth", type: placement ? "adoption" : "birth", who: "both", date: anchor, source: "user",
      title: placement ? "Przyjęcie dziecka" : "Narodziny dziecka", description: "",
    }],
  };
}

/** The logged-in persona: the questionnaire once it is complete, otherwise a demo profile. */
export function currentPersona(plan: { personaId: string | null; guideAnswers: Answers }): Persona | null {
  if (plan.personaId !== GUIDE_ID) return findPersona(plan.personaId);
  return nextQuestion(plan.guideAnswers) ? null : personaFromAnswers(plan.guideAnswers);
}
