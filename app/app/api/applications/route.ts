import type { VariantKey } from "@/lib/calc/variants";
import { todayInWarsaw } from "@/lib/dates";
import type { TimelineEvent } from "@/lib/events";
import { formContext } from "@/lib/forms/context";
import { loadSpecs } from "@/lib/forms/load";
import { validate } from "@/lib/forms/rules";
import type { FormValues } from "@/lib/forms/spec";
import { findPersona } from "@/lib/mock/personas";
import { defaultParams } from "@/lib/params";

type Body = {
  taskId: string;
  personaId: string;
  chosenVariant: VariantKey | null;
  events: TimelineEvent[];
  doneTasks: string[];
  values: FormValues;
};

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Simulated submission of an application to ZUS (eZUS) or to the employer.
 * Re-validates with the same rules as the form and returns a confirmation number.
 */
export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => null);
  if (!isObject(body) || typeof body.taskId !== "string" || typeof body.personaId !== "string" ||
    !Array.isArray(body.events) || !Array.isArray(body.doneTasks) || !isObject(body.values) ||
    !(body.chosenVariant === null || ["A", "B", "C"].includes(body.chosenVariant as string))) {
    return Response.json({ error: "Expected taskId, personaId, chosenVariant, events, doneTasks and values" }, { status: 400 });
  }
  const { taskId, personaId, chosenVariant, events, doneTasks, values } = body as Body;
  const persona = findPersona(personaId);
  if (!persona) return Response.json({ error: "Unknown persona" }, { status: 404 });

  const today = todayInWarsaw();
  const found = formContext(persona, events, chosenVariant, defaultParams, doneTasks, today, taskId);
  if (!found) return Response.json({ error: "This task has no application form" }, { status: 404 });

  const spec = (await loadSpecs([found.entry.form!]))[found.entry.form!];
  const { errors, warnings } = validate(spec, values, found.ctx);
  if (errors.length) return Response.json({ errors, warnings }, { status: 422 });

  const zus = found.ctx.recipient === "zus";
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return Response.json({
    number: `${zus ? "UPO" : "KADRY"}/${today.replaceAll("-", "")}/${serial}`,
    sentAt: new Date().toISOString(),
    recipient: found.ctx.recipientName,
    channel: zus ? "eZUS (symulacja)" : "Elektroniczny wniosek do pracodawcy (symulacja)",
    warnings,
  });
}
