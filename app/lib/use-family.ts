"use client";

import { useEffect, useMemo, useState } from "react";
import { useJourney } from "@/components/journey-provider";
import { todayInWarsaw } from "@/lib/dates";
import { buildVariants } from "@/lib/calc/variants";
import { planTimeline } from "@/lib/guide/timeline";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { useParamsConfig } from "@/lib/use-params";
import { usePlan } from "@/lib/plan-store";

/** Logged-in family data for pages inside the (panel) group; its layout guarantees a persona. */
export function useFamily() {
  const plan = usePlan();
  const [today, setToday] = useState(todayInWarsaw);

  useEffect(() => {
    const refresh = () => setToday(todayInWarsaw());
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  const journey = useJourney();
  const fromGuide = plan.personaId === GUIDE_ID;
  const persona = useMemo(() => currentPersona(plan)!, [plan]);
  const params = useParamsConfig();
  const variants = useMemo(() => buildVariants(persona, params, plan.customLeave), [persona, params, plan.customLeave]);
  const chosen = variants.find((v) => v.key === plan.chosenVariant) ?? null;
  const names = { mother: persona.parents.mother.name, father: persona.parents.father.name, both: "Oboje" };
  // Demo profiles and questionnaire answers go through the same knowledge-driven timeline.
  const entries = planTimeline(persona, plan.events, chosen, params, journey, plan.doneTasks, today);
  return { plan, persona, fromGuide, params, journey, variants, chosen, names, entries, today };
}
