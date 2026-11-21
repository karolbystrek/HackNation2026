"use client";

import { useMemo } from "react";
import { buildVariants } from "@/lib/calc/variants";
import { findPersona } from "@/lib/mock/personas";
import { defaultParams } from "@/lib/params";
import { usePlan } from "@/lib/plan-store";

/** Logged-in family data for pages inside the (panel) group; its layout guarantees a persona. */
export function useFamily() {
  const plan = usePlan();
  const persona = findPersona(plan.personaId)!;
  const params = defaultParams;
  const variants = useMemo(() => buildVariants(persona, params), [persona, params]);
  const chosen = variants.find((v) => v.key === plan.chosenVariant) ?? null;
  const names = { mother: persona.parents.mother.name, father: persona.parents.father.name, both: "Oboje" };
  return { plan, persona, params, variants, chosen, names };
}
