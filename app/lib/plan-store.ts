"use client";

// Client-only session state of the family's plan, kept in sessionStorage so a refresh keeps it.
import { useSyncExternalStore } from "react";
import type { ParentKey } from "@/lib/calc/leave";
import type { CustomLeave, VariantKey } from "@/lib/calc/variants";
import type { TimelineEvent } from "@/lib/events";
import type { Answers } from "@/lib/guide/tree";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import type { FormValues } from "@/lib/forms/spec";

type CaseState = {
  events: TimelineEvent[];
  chosenVariant: VariantKey | null;
  customLeave?: CustomLeave;
  doneTasks: string[];
  /** Answers from the guide questionnaire that starts a new timeline. */
  guideAnswers: Answers;
  /** Simulated submissions of applications, by timeline task id. */
  submissions: Record<string, Submission>;
  drafts?: Record<string, unknown>;
  calculatorHref?: string;
};

type SavedCase = { id: string; label: string; state: CaseState };

export type PlanState = CaseState & {
  personaId: string | null;
  viewer?: ParentKey;
  solo?: boolean;
  activeCaseId?: string;
  savedCases?: SavedCase[];
};

export type Submission = { number: string; sentAt: string; recipient: string; channel: string; values: FormValues };

const KEY = "przewodnik-rodzica-plan";
const initial: PlanState = { personaId: null, events: [], chosenVariant: null, doneTasks: [], guideAnswers: {}, submissions: {} };
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

export function usePlanDraft<T>(key: string, initialValue: T) {
  const value = (usePlan().drafts?.[key] as T | undefined) ?? initialValue;
  function save(next: T | ((previous: T) => T)) {
    updatePlan((plan) => ({
      ...plan,
      drafts: {
        ...plan.drafts,
        [key]: typeof next === "function"
          ? (next as (previous: T) => T)((plan.drafts?.[key] as T | undefined) ?? initialValue)
          : next,
      },
    }));
  }
  return [value, save] as const;
}

/** Starts a plan for a demo profile or, with GUIDE_ID, for the questionnaire answers, which are kept. */
export function logIn(personaId: string, viewer: ParentKey = "mother", solo = false) {
  const { guideAnswers } = read();
  const persona = currentPersona({ personaId, guideAnswers })!;
  if (personaId === GUIDE_ID) {
    viewer = guideAnswers.role === "father" ? "father" : "mother";
    solo = true;
  }
  const demoCase = persona.demoOtherCase;
  updatePlan((plan) => plan.personaId === personaId ? { ...plan, viewer, solo } : {
    personaId, viewer, solo, events: persona.events, chosenVariant: persona.initialVariant ?? null,
    doneTasks: [], guideAnswers, submissions: {},
    savedCases: demoCase ? [{
      id: demoCase.event.id,
      label: demoCase.label,
      state: { events: [demoCase.event], chosenVariant: "A", doneTasks: [], guideAnswers, submissions: {} },
    }] : undefined,
  });
}

function snapshotCase(state: PlanState, label: string): SavedCase {
  const { events, chosenVariant, customLeave, doneTasks, guideAnswers, submissions, drafts, calculatorHref } = state;
  return {
    id: state.activeCaseId ?? "initial",
    label,
    state: { events, chosenVariant, customLeave, doneTasks, guideAnswers, submissions,
      drafts: { ...drafts, dodaj: undefined, "dodaj/szczegoly": undefined }, calculatorHref,
    },
  };
}

export function startChildCase(event: TimelineEvent, previousLabel: string) {
  updatePlan((state) => ({
    ...state,
    activeCaseId: event.id,
    savedCases: [...(state.savedCases ?? []), snapshotCase(state, previousLabel)],
    events: [{ ...event, startsCase: true }],
    chosenVariant: null,
    customLeave: undefined,
    doneTasks: [],
    submissions: {},
    drafts: {},
    calculatorHref: undefined,
  }));
}

export function switchChildCase(id: string, previousLabel: string) {
  updatePlan((state) => {
    const target = state.savedCases?.find((entry) => entry.id === id);
    if (!target) return state;
    return {
      ...state,
      ...target.state,
      activeCaseId: id,
      savedCases: [...(state.savedCases ?? []).filter((entry) => entry.id !== id), snapshotCase(state, previousLabel)],
    };
  });
}

export function submitApplication(taskId: string, submission: Submission) {
  updatePlan((s) => ({
    ...s,
    submissions: { ...s.submissions, [taskId]: submission },
    doneTasks: s.doneTasks.includes(taskId) ? s.doneTasks : [...s.doneTasks, taskId],
  }));
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
