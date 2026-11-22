import type { ParentKey } from "@/lib/calc/leave";
import { readCustomLeave, type VariantKey } from "@/lib/calc/variants";
import { parseIso, todayInWarsaw } from "@/lib/dates";
import type { TimelineEvent } from "@/lib/events";
import { formContext, type FormContext } from "@/lib/forms/context";
import { loadSpecs } from "@/lib/forms/load";
import { loadJourney } from "@/lib/knowledge";
import type { FormSpec, FormValues } from "@/lib/forms/spec";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { visibleQuestions, type Answers } from "@/lib/guide/tree";
import { loadParams } from "@/lib/server-params";

type Body = {
  taskId: string;
  personaId: string;
  chosenVariant: VariantKey | null;
  events: TimelineEvent[];
  doneTasks: string[];
  values: FormValues;
  /** Questionnaire answers; the server rebuilds a questionnaire case from them. */
  guideAnswers?: Answers;
  customLeave?: unknown;
  viewer?: ParentKey;
};

const optionalDate = (value: unknown) => value === undefined || value === null ||
  (typeof value === "string" && !!parseIso(value));
const finiteNumber = (value: unknown) => typeof value === "number" && Number.isFinite(value);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/** Parses an application request from the wizard and rebuilds its family context; returns an error Response when invalid. */
export async function readApplicationRequest(request: Request): Promise<{ spec: FormSpec; ctx: FormContext; values: FormValues } | Response> {
  const body: unknown = await request.json().catch(() => null);
  if (!isObject(body) || typeof body.taskId !== "string" || typeof body.personaId !== "string" ||
    (body.viewer !== undefined && body.viewer !== "mother" && body.viewer !== "father") ||
    !Array.isArray(body.events) || !Array.isArray(body.doneTasks) || !isObject(body.values) ||
    !(body.chosenVariant === null || ["A", "B", "C", "custom"].includes(body.chosenVariant as string))) {
    return Response.json({ error: "Expected taskId, personaId, chosenVariant, events, doneTasks and values" }, { status: 400 });
  }
  const { taskId, personaId, chosenVariant, events, doneTasks, values, guideAnswers = {}, customLeave, viewer } = body as Body;
  if (personaId === GUIDE_ID && (!isObject(guideAnswers) || Object.values(guideAnswers).some((answer) =>
    !["string", "number", "boolean"].includes(typeof answer) &&
    !(Array.isArray(answer) && answer.every((value) => typeof value === "string"))))) {
    return Response.json({ error: "Invalid questionnaire answers" }, { status: 400 });
  }
  if (personaId === GUIDE_ID && visibleQuestions(guideAnswers).some((question) => {
    const answer = guideAnswers[question.id];
    if (answer === undefined || (question.optional && Array.isArray(answer) && answer.length === 0)) return false;
    if (question.type === "number") return typeof answer !== "number" || !Number.isFinite(answer) ||
      answer < (question.min ?? -Infinity) || answer > (question.max ?? Infinity);
    if (question.type === "date") return typeof answer !== "string" || !parseIso(answer);
    if (question.type === "boolean") return typeof answer !== "boolean";
    if (question.type === "multi") return !Array.isArray(answer);
    return typeof answer !== "string";
  })) return Response.json({ error: "Invalid questionnaire answers" }, { status: 400 });
  if (events.some((event) => !isObject(event) || typeof event.id !== "string" ||
    typeof event.date !== "string" || !parseIso(event.date) || typeof event.type !== "string" ||
    ![event.endDate, event.careFrom, event.insuranceEndDate].every(optionalDate) ||
    (event.childDetails !== undefined && (!isObject(event.childDetails) ||
      !Number.isInteger(event.childDetails.count) || event.childDetails.count < 1 || event.childDetails.count > 10 ||
      ![event.childDetails.birthCardDate, event.childDetails.childBirthDate, event.childDetails.adoptionOrderDate].every(optionalDate) ||
      (event.childDetails.names !== undefined && (!Array.isArray(event.childDetails.names) ||
        event.childDetails.names.length > event.childDetails.count ||
        event.childDetails.names.some((name) => typeof name !== "string"))))) ||
    (event.hospitalStay !== undefined && (!isObject(event.hospitalStay) ||
      ![event.hospitalStay.gestationWeek, event.hospitalStay.birthWeight, event.hospitalStay.hospitalWeeks].every(finiteNumber))))) {
    return Response.json({ error: "Invalid events" }, { status: 400 });
  }
  const persona = currentPersona({ personaId, guideAnswers, events });
  if (!persona) return Response.json({ error: "Unknown persona" }, { status: 404 });

  const custom = readCustomLeave(customLeave);
  if (chosenVariant === "custom" && !custom) return Response.json({ error: "Invalid saved leave calculation" }, { status: 400 });
  const params = await loadParams();
  const found = formContext(persona, events, chosenVariant, params, await loadJourney(), doneTasks, todayInWarsaw(), taskId, guideAnswers, custom, viewer);
  if (!found) return Response.json({ error: "This task has no application form" }, { status: 404 });
  const spec = (await loadSpecs([found.entry.form!]))[found.entry.form!];
  return { spec, ctx: found.ctx, values };
}
