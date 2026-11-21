import type { VariantKey } from "@/lib/calc/variants";
import { todayInWarsaw } from "@/lib/dates";
import type { TimelineEvent } from "@/lib/events";
import { formContext, type FormContext } from "@/lib/forms/context";
import { loadSpecs } from "@/lib/forms/load";
import { loadJourney } from "@/lib/knowledge";
import type { FormSpec, FormValues } from "@/lib/forms/spec";
import { currentPersona } from "@/lib/guide/persona";
import type { Answers } from "@/lib/guide/tree";
import { defaultParams } from "@/lib/params";

type Body = {
  taskId: string;
  personaId: string;
  chosenVariant: VariantKey | null;
  events: TimelineEvent[];
  doneTasks: string[];
  values: FormValues;
  /** Questionnaire answers; the server rebuilds a questionnaire case from them. */
  guideAnswers?: Answers;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses an application request from the wizard and rebuilds its family context; returns an error Response when invalid. */
export async function readApplicationRequest(request: Request): Promise<{ spec: FormSpec; ctx: FormContext; values: FormValues } | Response> {
  const body: unknown = await request.json().catch(() => null);
  if (!isObject(body) || typeof body.taskId !== "string" || typeof body.personaId !== "string" ||
    !Array.isArray(body.events) || !Array.isArray(body.doneTasks) || !isObject(body.values) ||
    !(body.chosenVariant === null || ["A", "B", "C"].includes(body.chosenVariant as string))) {
    return Response.json({ error: "Expected taskId, personaId, chosenVariant, events, doneTasks and values" }, { status: 400 });
  }
  const { taskId, personaId, chosenVariant, events, doneTasks, values, guideAnswers } = body as Body;
  const persona = currentPersona({ personaId, guideAnswers: isObject(guideAnswers) ? guideAnswers : {} });
  if (!persona) return Response.json({ error: "Unknown persona" }, { status: 404 });

  const found = formContext(persona, events, chosenVariant, defaultParams, await loadJourney(), doneTasks, todayInWarsaw(), taskId);
  if (!found) return Response.json({ error: "This task has no application form" }, { status: 404 });
  const spec = (await loadSpecs([found.entry.form!]))[found.entry.form!];
  return { spec, ctx: found.ctx, values };
}
