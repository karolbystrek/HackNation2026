import { computeBasis } from "@/lib/calc/basis";
import { planLeave, type LeaveInput } from "@/lib/calc/leave";
import { calcPregnancy, type ContractType, type PregnancyInput } from "@/lib/calc/pregnancy";
import { loadParams } from "@/lib/server-params";

type Body = { type: "leave"; input: LeaveInput } | { type: "pregnancy"; input: PregnancyInput } | { type: "basis"; input: { monthlyGross: number[]; contract?: ContractType; employmentFraction?: number } };

// Bounds keep the day-by-day pregnancy loop short and the leave engine away from dividing by zero.
const inRange = (date: unknown) => typeof date !== "string" || date === "" || (date >= "2000-01-01" && date <= "2100-12-31");

function invalid(body: Body): string | null {
  const input = body.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== "object") return "input is required";
  if (!["startDate", "childBirthDate", "paternityStartDate", "adoptionOrderDate", "preBirthStartDate", "insuredFrom", "sickLeaveFrom", "sickLeaveThrough", "dueDate"].every((key) => inRange(input[key])))
    return "dates must be between 2000-01-01 and 2100-12-31";
  if (body.type === "leave") {
    if (input.supplementaryWeeks !== undefined &&
      (typeof input.supplementaryWeeks !== "number" || !Number.isInteger(input.supplementaryWeeks) || input.supplementaryWeeks < 0 || input.supplementaryWeeks > 15))
      return "supplementaryWeeks must be between 0 and 15";
    if (input.supplementaryParent !== undefined && input.supplementaryParent !== "mother" && input.supplementaryParent !== "father")
      return "supplementaryParent must be mother or father";
    const fractions = input.workFractions;
    const allowed = (value: unknown) => typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 0.5;
    if ((input.workFraction !== undefined && !allowed(input.workFraction)) ||
      (fractions !== undefined && (!fractions || typeof fractions !== "object" ||
        !["mother", "father"].every((parent) => allowed((fractions as Record<string, unknown>)[parent]))))) {
      return "work fractions must be between 0 and 0.5";
    }
    if (body.input.parentalTogether !== undefined && typeof body.input.parentalTogether !== "boolean") return "parentalTogether must be a boolean";
    const advance = body.input.monthlyPitAdvance;
    if (advance !== undefined && (!advance || typeof advance !== "object" ||
      Object.values(advance).some((n) => !Number.isFinite(n) || n < 0))) return "monthlyPitAdvance must contain nonnegative amounts";
  }
  if (body.type === "basis" && !Array.isArray(input.monthlyGross)) return "monthlyGross must be an array";
  if (body.type === "basis" && body.input.employmentFraction !== undefined &&
    (!Number.isFinite(body.input.employmentFraction) || body.input.employmentFraction <= 0 || body.input.employmentFraction > 1)) return "employmentFraction must be greater than 0 and at most 1";
  return null;
}

/** REST entry point to the same benefit engine the UI uses. */
export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "body must be JSON" }, { status: 400 });
  }
  const error = body && invalid(body);
  if (error) return Response.json({ error }, { status: 400 });
  const params = await loadParams();
  switch (body?.type) {
    case "leave":
      return Response.json(planLeave(body.input, params));
    case "pregnancy":
      return Response.json(calcPregnancy(body.input, params));
    case "basis":
      return Response.json(computeBasis(body.input.monthlyGross, params, body.input.contract, body.input.employmentFraction));
    default:
      return Response.json({ error: "type must be leave, pregnancy or basis" }, { status: 400 });
  }
}
