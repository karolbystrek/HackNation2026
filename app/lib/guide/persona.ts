import type { TimelineEvent } from "@/lib/events";
import type { ContractType } from "@/lib/calc/pregnancy";
import { diffDays, formatDate, parseIso, shiftIso, todayInWarsaw } from "@/lib/dates";
import { activeAnswers, supplementaryWeeks, test, visibleQuestions, type Answers } from "@/lib/guide/tree";
import { findPersona, type ParentProfile, type Persona } from "@/lib/mock/personas";
import { defaultParams } from "@/lib/params";

/** personaId of a plan built from the questionnaire instead of a demo profile. */
export const GUIDE_ID = "guide";

function parent(
  name: string, nameGenitive: string, contract: ContractType, monthly: number, insuredFrom: string, age: number, payerSize: ParentProfile["payerSize"],
): ParentProfile {
  return {
    name, nameGenitive, age, contract, insuredFrom, payerSize,
    lastName: "", pesel: "", address: "", phone: "", bankAccount: "", payerName: "", payerNip: "",
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
  const payerSize = contract === "jdg" ? "na" : a.largeEmployer === "yes" ? "gt20" : a.largeEmployer === "no" ? "le20" : "unknown";
  const me = parent("Ty", "Ciebie", contract, Number(a.monthlyIncome) || 0, (a.insuredSince as string | undefined) ?? today, a.over50 ? 50 : 30, payerSize);
  const other = parent("Drugi rodzic", "drugiego rodzica", "uop", 0, today, 30, "unknown");
  const isFather = a.role === "father";
  const anchor = birthDate ?? dueDate;
  const special = (a.special ?? []) as string[];

  // The answers in the vocabulary of knowledge/enums.json, so the plan comes from knowledge/scenarios.json (lib/journey.ts).
  me.insuredType = special.includes("insuranceEnded") ? "after_insurance" : test({ ref: "hasSickness" }, a) ? undefined : "uninsured";
  me.events = [
    ...(special.includes("jobLostInPregnancy") && !isFather ? ["job_loss_liquidation"] : []),
    ...(a.combineWithWork === true ? ["combine_parental_with_work"] : []),
  ];
  if (a.otherParentInsured === false) other.insuredType = "uninsured";
  // The guide's glossary treats a miscarriage like a stillbirth (term.martwe_urodzenie).
  const death = special.includes("childDeath") && typeof a.childDeathDate === "string" ? parseIso(a.childDeathDate) : null;
  const born = parseIso(birthDate);
  const ageAtDeath = death && born && death >= born ? diffDays(born, death) : null;
  const lost = special.some((s) => s === "stillbirth" || s === "miscarriage") ? ["stillbirth"]
    : special.includes("childDeath") ? [ageAtDeath === null ? "child_death_unknown" : ageAtDeath < defaultParams.stillbirthWeeks * 7 ? "child_death_lt8w" : "child_death_gte8w"] : [];
  const childEvents = [
    ...(a.situation === "adoption" ? ["adoption"] : a.situation === "foster" ? ["foster_placement"] : lost.length ? lost : ["birth"]),
    ...(special.includes("premature") ? ["prematurity"] : []),
    ...(special.includes("hospitalized") ? ["child_hospitalisation"] : []),
    ...(special.includes("zaZyciem") ? ["za_zyciem"] : []),
    ...(special.includes("motherIllOrHospital") ? ["mother_hospitalisation"] : []),
  ];
  const events: TimelineEvent[] = [{
    id: "birth", type: placement ? "adoption" : "birth", who: "both", date: anchor, source: "user",
    title: placement ? "Przyjęcie dziecka" : "Narodziny dziecka", description: "",
  }];

  if (special.includes("insuranceEnded") && !isFather && typeof a.sicknessStartAfterInsurance === "string") {
    events.unshift({
      id: "sick", type: "sickLeave", who: "mother", date: a.sicknessStartAfterInsurance, endDate: null, source: "user",
      title: "Zwolnienie lekarskie w ciąży",
      description: typeof a.insuranceEndDate === "string"
        ? `Ubezpieczenie ustało ${formatDate(a.insuranceEndDate)}. Sprawdź warunki zasiłku w ZUS.`
        : "Sprawdź warunki zasiłku po ustaniu ubezpieczenia.",
    });
  }

  return {
    id: GUIDE_ID,
    label: "Twoje dane z formularza",
    fetchedAt: today,
    dueDate,
    birthDate,
    // The questionnaire does not ask when paternity leave starts: at birth, or the first day a request can still reach the employer in time.
    paternityStart: [anchor, shiftIso(today, defaultParams.paternityRequestDays)].sort()[1],
    zaZyciem: Array.isArray(a.special) && a.special.includes("zaZyciem"),
    wantsAveragedRate: a.wantsAveragedRate === true,
    // A starting split for the plan; the family can change it under /warianty.
    initialVariant: isFather ? "B" : "A",
    childEvents,
    birthCardDate: typeof a.birthCardDate === "string" && a.birthCardDate >= anchor ? a.birthCardDate : undefined,
    childDeathDate: ageAtDeath !== null ? String(a.childDeathDate) : undefined,
    placementParent: placement ? (isFather ? "father" : "mother") : undefined,
    adoptionOrderDate: typeof a.adoptionOrderDate === "string" ? a.adoptionOrderDate : undefined,
    adoptedChildBirthDate: typeof a.adoptedChildBirthDate === "string" ? a.adoptedChildBirthDate : undefined,
    supplementaryParent: a.supplementaryParent === "father" ? "father" : "mother",
    supplementaryWeeks: test({ ref: "supplementaryCase" }, a) ? supplementaryWeeks(a, defaultParams) || undefined : undefined,
    kids: Math.max(Number(a.childrenCount) || 1, 1),
    parents: isFather ? { mother: other, father: me } : { mother: me, father: other },
    events,
  };
}

/** The logged-in persona: the questionnaire once it is complete, otherwise a demo profile. */
export function currentPersona(plan: { personaId: string | null; guideAnswers: Answers; events?: TimelineEvent[] }): Persona | null {
  const persona = plan.personaId === GUIDE_ID
    ? visibleQuestions(plan.guideAnswers).some((question) => !question.optional && plan.guideAnswers[question.id] === undefined) ? null : personaFromAnswers(plan.guideAnswers)
    : findPersona(plan.personaId);
  const birth = plan.events?.slice().reverse().find((event) => event.source === "new" && event.type === "birth");
  if (!persona || !birth) return persona;
  return {
    ...persona, birthDate: birth.date,
    events: [...persona.events.filter((event) => event.type !== "birth"), birth],
    paternityStart: persona.paternityStart < birth.date ? birth.date : persona.paternityStart,
  };
}
