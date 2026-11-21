import { computeBasis } from "@/lib/calc/basis";
import { planLeave, type LeaveInput, type LeaveResult, type ParentKey } from "@/lib/calc/leave";
import { diffDays, formatDate, parseIso } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

export type VariantKey = "A" | "B" | "C" | "custom";
export type CustomLeave = Pick<LeaveInput, "bases" | "kids" | "zaZyciem" | "otherWeeks" | "paternity" | "flatRate" | "workFractions">;

export function readCustomLeave(value: unknown): CustomLeave | undefined {
  if (!value || typeof value !== "object") return;
  const { bases, kids, zaZyciem, otherWeeks, paternity, flatRate, workFractions } = value as CustomLeave;
  const bounded = (number: unknown, max: number) => typeof number === "number" && Number.isFinite(number) && number >= 0 && number <= max;
  if (!bounded(bases?.mother, 1_000_000) || !bounded(bases?.father, 1_000_000) ||
    !Number.isInteger(kids) || kids < 1 || kids > 10 || !bounded(otherWeeks, 104) ||
    ![zaZyciem, paternity, flatRate].every((flag) => typeof flag === "boolean") ||
    !bounded(workFractions?.mother, 0.5) || !bounded(workFractions?.father, 0.5)) return;
  return { bases, kids, zaZyciem, otherWeeks, paternity, flatRate, workFractions };
}

export type Variant = {
  key: VariantKey;
  name: string;
  tag: string;
  input: LeaveInput;
  result: LeaveResult;
  incomeLoss: number;
  childcareWeeks: number;
  lastReturn: { who: ParentKey; date: string };
  points: { sign: "+" | "−"; text: string }[];
};

export function leaveInputFor(persona: Persona, p: Params, otherWeeks: number): LeaveInput {
  const { mother, father } = persona.parents;
  return {
    mode: "birth",
    names: { mother: mother.name, father: father.name },
    bases: { mother: computeBasis(mother.monthlyGross, p, mother.contract).basis, father: computeBasis(father.monthlyGross, p, father.contract).basis },
    startDate: persona.birthDate ?? persona.dueDate,
    kids: persona.kids,
    zaZyciem: persona.zaZyciem ?? false,
    adoptionType: "adoption",
    childBirthDate: "",
    schoolDeferred: false,
    main: "mother",
    otherWeeks,
    paternity: true,
    paternityStartDate: persona.paternityStart,
    flatRate: persona.id === "guide" && (persona.wantsAveragedRate ?? false),
    workFractions: { mother: 0, father: 0 },
  };
}

function lastEnd(result: LeaveResult, parent: ParentKey): string | null {
  return result.periods[parent].reduce<string | null>((max, x) => (!max || x.to > max ? x.to : max), null);
}

/** Three ways to split the parental leave pool, all computed by the same engine as the calculator. */
export function buildVariants(persona: Persona, p: Params, custom?: CustomLeave): Variant[] {
  const { mother, father } = persona.parents;
  const maxOther = planLeave(leaveInputFor(persona, p, 0), p).maxOtherWeeks;
  const defs: { key: VariantKey; name: string; otherWeeks: number }[] = [
    { key: "A", name: `${mother.name} zostaje cały rok`, otherWeeks: 0 },
    { key: "B", name: "Dzielicie się urlopem", otherWeeks: Math.round(maxOther / 1.6) },
    { key: "C", name: `${father.name} dłużej w domu`, otherWeeks: maxOther },
    ...(custom ? [{ key: "custom" as const, name: "Plan z kalkulatora", otherWeeks: custom.otherWeeks }] : []),
  ];

  const variants = defs.map((def) => {
    const input = { ...leaveInputFor(persona, p, def.otherWeeks), ...(def.key === "custom" ? custom : undefined) };
    const result = planLeave(input, p);
    const all = [...result.periods.mother, ...result.periods.father];
    const incomeLoss = all.reduce((sum, x) => sum + ((input.bases[x.parent] - x.monthlyBenefit) * x.weeks * 7) / 30, 0);
    const childcareWeeks = Math.round(diffDays(parseIso(result.start)!, parseIso(result.end)!) / 7);
    const motherEnd = lastEnd(result, "mother")!;
    const fatherParental = result.periods.father.filter((x) => x.kind === "parental");
    const fatherEnd = fatherParental.length ? fatherParental[fatherParental.length - 1].to : null;
    const lastReturn = fatherEnd && fatherEnd > motherEnd ? { who: "father" as const, date: fatherEnd } : { who: "mother" as const, date: motherEnd };

    const points: Variant["points"] = [];
    const motherParental = result.periods.mother.find((x) => x.kind === "parental");
    if (motherParental) {
      const lossPerMonth = input.bases.mother - motherParental.monthlyBenefit;
      points.push({
        sign: "+",
        text: `${mother.name} dostaje ${formatPln(motherParental.monthlyBenefit)}/mies. na rodzicielskim (traci ok. ${formatPln(lossPerMonth)}/mies.).`,
      });
    }
    if (def.otherWeeks === 0 && def.key !== "custom") {
      points.push({ sign: "+", text: `${father.name} cały czas pracuje, więc Wasz dochód spada najmniej.` });
      points.push({ sign: "−", text: `${p.parentalOwnWeeks} tygodni rodzicielskiego ${father.nameGenitive} przepada.` });
    } else if (def.otherWeeks > 0 && def.key !== "custom") {
      const fatherLoss = input.bases.father * (1 - p.rates.parental);
      points.push({ sign: "−", text: `${father.name} traci ok. ${formatPln(fatherLoss)}/mies. przez ${def.otherWeeks} tygodni.` });
    }
    points.push({ sign: "+", text: `${mother.name} wraca do pracy ${formatDate(motherEnd)}.` });
    points.push({ sign: "−", text: `Od ${formatDate(lastReturn.date)} potrzebny żłobek lub opiekunka.` });

    return { ...def, tag: "", input, result, incomeLoss, childcareWeeks, lastReturn, points };
  });

  const minLoss = Math.min(...variants.map((v) => v.incomeLoss));
  const earliestMotherReturn = variants.map((v) => lastEnd(v.result, "mother")!).sort()[0];
  for (const v of variants) {
    v.tag =
      v.incomeLoss === minLoss
        ? "Najmniejsza strata dochodu"
        : lastEnd(v.result, "mother") === earliestMotherReturn
          ? `${mother.name} najszybciej wraca do pracy`
          : "Najdłużej z dzieckiem w domu";
  }
  return variants;
}
