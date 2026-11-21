import { computeBasis } from "@/lib/calc/basis";
import { planLeave, type LeaveInput } from "@/lib/calc/leave";
import { calcPregnancy, type ContractType, type PregnancyInput } from "@/lib/calc/pregnancy";
import { defaultParams } from "@/lib/params";

type Body = { type: "leave"; input: LeaveInput } | { type: "pregnancy"; input: PregnancyInput } | { type: "basis"; input: { monthlyGross: number[]; contract?: ContractType } };

// Bounds keep the day-by-day pregnancy loop short and the leave engine away from dividing by zero.
const inRange = (date: unknown) => typeof date !== "string" || date === "" || (date >= "2000-01-01" && date <= "2100-12-31");

function invalid(body: Body): string | null {
  const input = body.input as Record<string, unknown> | undefined;
  if (!input || typeof input !== "object") return "input is required";
  if (!["startDate", "childBirthDate", "paternityStartDate", "insuredFrom", "sickLeaveFrom", "dueDate"].every((key) => inRange(input[key])))
    return "dates must be between 2000-01-01 and 2100-12-31";
  if (body.type === "leave" && !(Number(input.workFraction) >= 0 && Number(input.workFraction) <= 0.5)) return "workFraction must be between 0 and 0.5";
  if (body.type === "basis" && !Array.isArray(input.monthlyGross)) return "monthlyGross must be an array";
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
  switch (body?.type) {
    case "leave":
      return Response.json(planLeave(body.input, defaultParams));
    case "pregnancy":
      return Response.json(calcPregnancy(body.input, defaultParams));
    case "basis":
      return Response.json(computeBasis(body.input.monthlyGross, defaultParams, body.input.contract));
    default:
      return Response.json({ error: "type must be leave, pregnancy or basis" }, { status: 400 });
  }
}
