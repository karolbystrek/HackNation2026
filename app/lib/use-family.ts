"use client";

import { useEffect, useMemo, useState } from "react";
import { todayInWarsaw } from "@/lib/dates";
import { buildVariants } from "@/lib/calc/variants";
import { applyProgress, buildFamilyTimeline } from "@/lib/family-timeline";
import { buildGuideTimeline } from "@/lib/guide/tree";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { defaultParams } from "@/lib/params";
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

  const fromGuide = plan.personaId === GUIDE_ID;
  const persona = useMemo(() => currentPersona(plan)!, [plan]);
  const params = defaultParams;
  const variants = useMemo(() => buildVariants(persona, params), [persona, params]);
  const chosen = variants.find((v) => v.key === plan.chosenVariant) ?? null;
  const names = { mother: persona.parents.mother.name, father: persona.parents.father.name, both: "Oboje" };
  // A questionnaire plan follows the guide's steps; a demo profile its downloaded events and leave variant.
  const entries = fromGuide
    ? applyProgress(buildGuideTimeline(plan.guideAnswers, params, today), plan.doneTasks, today)
    : buildFamilyTimeline(persona, plan.events, chosen, params, plan.doneTasks, today);
  return { plan, persona, fromGuide, params, variants, chosen, names, entries, today };
}
