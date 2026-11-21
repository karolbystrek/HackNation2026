"use client";

// Client-only session state of the family's plan, kept in sessionStorage so a refresh keeps it.
import { useSyncExternalStore } from "react";
import type { VariantKey } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import type { Answers } from "@/lib/guide/tree";
import { currentPersona } from "@/lib/guide/persona";

export type PlanState = {
  personaId: string | null;
  events: TimelineEvent[];
  chosenVariant: VariantKey | null;
  doneTasks: string[];
  /** Answers from the guide questionnaire that starts a new timeline. */
  guideAnswers: Answers;
};

const KEY = "przewodnik-rodzica-plan";
const initial: PlanState = { personaId: null, events: [], chosenVariant: null, doneTasks: [], guideAnswers: {} };
let state = initial;
let loaded = false;
const listeners = new Set<() => void>();

function read(): PlanState {
  if (!loaded) {
    loaded = true;
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) state = { ...initial, ...JSON.parse(raw) };
    } catch {
      // Storage unavailable: start with an empty plan.
    }
  }
  return state;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function usePlan(): PlanState {
  return useSyncExternalStore(subscribe, read, () => initial);
}

export function updatePlan(change: (s: PlanState) => PlanState) {
  state = change(read());
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: the plan still works until the tab closes.
  }
  listeners.forEach((l) => l());
}

/** Starts a plan for a demo profile or, with GUIDE_ID, for the questionnaire answers, which are kept. */
export function logIn(personaId: string) {
  const { guideAnswers } = read();
  const persona = currentPersona({ personaId, guideAnswers })!;
  updatePlan(() => ({ personaId, events: persona.events, chosenVariant: persona.initialVariant ?? null, doneTasks: [], guideAnswers }));
}

export function logOut() {
  updatePlan(() => initial);
}

/** False during server render and hydration, true once the browser state is readable. */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}
