import { parseIso } from "@/lib/dates";
import { computeBasis } from "@/lib/calc/basis";
import { otherParent, planLeave, type LeaveInput, type LeaveResult } from "@/lib/calc/leave";
import type { TimelineEvent } from "@/lib/events";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

export type VariantKey = "A" | "B" | "C" | "custom";
export type CustomLeave = Pick<LeaveInput, "bases" | "kids" | "zaZyciem" | "otherWeeks" | "paternity" | "paternityStartDate" | "flatRate" | "workFractions"
  | "parentalTogether" | "preBirthStartDate" | "supplementaryWeeks" | "monthlyPitAdvance" | "uninsuredParents">;

export function readCustomLeave(value: unknown): CustomLeave | undefined {
  if (!value || typeof value !== "object") return;
  const { bases, kids, zaZyciem, otherWeeks, paternity, paternityStartDate, flatRate, workFractions, parentalTogether, preBirthStartDate, supplementaryWeeks, monthlyPitAdvance, uninsuredParents } = value as CustomLeave;
  const bounded = (number: unknown, max: number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= max;
  if (!bounded(bases?.mother, 1_000_000) || !bounded(bases?.father, 1_000_000) ||
    (paternityStartDate !== undefined && (typeof paternityStartDate !== "string" || !parseIso(paternityStartDate))) ||
    (uninsuredParents !== undefined && (!Array.isArray(uninsuredParents) || uninsuredParents.some((parent) => parent !== "mother" && parent !== "father"))) ||
    !Number.isInteger(kids) || kids < 1 || kids > 10 || !bounded(otherWeeks, 104) ||
    ![zaZyciem, paternity, flatRate].every((flag) => typeof flag === "boolean") ||
    !bounded(workFractions?.mother, 0.5) || !bounded(workFractions?.father, 0.5)) return;
  if (parentalTogether !== undefined && typeof parentalTogether !== "boolean" ||
    preBirthStartDate !== undefined && (typeof preBirthStartDate !== "string" || (preBirthStartDate !== "" && !parseIso(preBirthStartDate))) ||
    supplementaryWeeks !== undefined && (!bounded(supplementaryWeeks, 15) || !Number.isInteger(supplementaryWeeks)) ||
    monthlyPitAdvance !== undefined && (!monthlyPitAdvance || !bounded(monthlyPitAdvance.mother ?? 0, 1_000_000) || !bounded(monthlyPitAdvance.father ?? 0, 1_000_000))) return;
  return { bases, kids, zaZyciem, otherWeeks, paternity, ...(paternityStartDate ? { paternityStartDate } : {}), flatRate, workFractions, parentalTogether, preBirthStartDate, supplementaryWeeks, monthlyPitAdvance, ...(uninsuredParents === undefined ? {} : { uninsuredParents }) };
}

export type Variant = {
  key: VariantKey;
  name: string;
  input: LeaveInput;
  result: LeaveResult;
};

export function leaveInputFor(persona: Persona, p: Params, otherWeeks: number): LeaveInput {
  const { mother, father } = persona.parents;
  const main = persona.placementParent ?? "mother";
  return {
    mode: persona.childEvents?.some((event) => event === "adoption" || event === "foster_placement") ? "adoption" : "birth",
    names: { mother: mother.name, father: father.name },
    bases: { mother: computeBasis(mother.monthlyGross, p, mother.contract).basis, father: computeBasis(father.monthlyGross, p, father.contract).basis },
    startDate: persona.birthDate ?? persona.dueDate,
    kids: persona.kids,
    zaZyciem: persona.zaZyciem ?? false,
    uninsuredParents: (["mother", "father"] as const).filter((parent) => persona.parents[parent].insuredType === "uninsured"),
    adoptionType: persona.childEvents?.includes("foster_placement") ? "foster" : "adoption",
    childBirthDate: persona.adoptedChildBirthDate ?? "",
    adoptionOrderDate: persona.adoptionOrderDate,
    schoolDeferred: persona.schoolDeferred ?? false,
    main,
    otherWeeks: persona.parents[otherParent(main)].insuredType === "uninsured" ? 0 : otherWeeks,
    paternity: father.insuredType !== "uninsured" && !persona.childEvents?.includes("foster_placement"),
    supplementaryWeeks: persona.supplementaryWeeks,
    supplementaryParent: persona.supplementaryParent,
    paternityStartDate: [persona.paternityStart, persona.adoptionOrderDate ?? ""].sort()[1],
    flatRate: !!persona.wantsAveragedRate,
    workFractions: { mother: 0, father: 0 },
  };
}

/** Three ways to split the parental leave pool, all computed by the same engine as the calculator. */
export function buildVariants(persona: Persona, p: Params, custom?: CustomLeave, events: TimelineEvent[] = []): Variant[] {
  const { father } = persona.parents;
  const base = leaveInputFor(persona, p, 0);
  const canShare = persona.parents[otherParent(base.main)].insuredType !== "uninsured";
  const maxOther = planLeave(base, p).maxOtherWeeks;
  const defs: { key: VariantKey; name: string; otherWeeks: number }[] = [
    { key: "A", name: "Rodzicielski głównie dla matki", otherWeeks: 0 },
    { key: "B", name: "Dzielicie się urlopem", otherWeeks: Math.round(maxOther / 1.6) },
    { key: "C", name: `${father.name} dłużej w domu`, otherWeeks: maxOther },
    ...(custom ? [{ key: "custom" as const, name: "Ustalony podział urlopu", otherWeeks: custom.otherWeeks }] : []),
  ];

  const preBirth = [...persona.events, ...events].reverse().find((event) => event.circumstance === "preBirthLeave");
  const recordedChild = persona.events.some((event) => event.childDetails);
  const recordedCertificate = events.some((event) => event.circumstance === "zaZyciem");
  const recordedHospital = events.some((event) => event.hospitalStay);
  const variants = defs.filter((def) => canShare || def.key === "A" || def.key === "custom").map((def) => {
    const configured = leaveInputFor(persona, p, def.otherWeeks);
    const choice = def.key === "custom" ? custom : undefined;
    const input = { ...configured, ...choice,
      ...(recordedChild && { kids: configured.kids }),
      ...((recordedChild || recordedCertificate) && { zaZyciem: configured.zaZyciem }),
      supplementaryWeeks: recordedChild || recordedHospital ? configured.supplementaryWeeks : choice?.supplementaryWeeks ?? configured.supplementaryWeeks,
      preBirthStartDate: preBirth?.date ?? choice?.preBirthStartDate };
    if (!canShare && def.key !== "custom") input.otherWeeks = 0;
    const result = planLeave(input, p);
    return { ...def, input, result };
  });

  return variants;
}

/** Highest gross benefits at the current rates, over the same whole-week splits as the slider. */
export function bestLeaveSplit(input: LeaveInput, params: Params, maxOtherWeeks: number): LeaveResult {
  let best = planLeave({ ...input, otherWeeks: 0 }, params);
  for (let otherWeeks = 1; otherWeeks <= maxOtherWeeks; otherWeeks++) {
    const candidate = planLeave({ ...input, otherWeeks }, params);
    if (Math.round(candidate.familyTotal * 100) > Math.round(best.familyTotal * 100)) best = candidate;
  }
  return best;
}
