import { computeBasis } from "@/lib/calc/basis";
import { planLeave, type LeaveInput } from "@/lib/calc/leave";
import { calcPregnancy, type ContractType, type PregnancyInput } from "@/lib/calc/pregnancy";
import { defaultParams } from "@/lib/params";

type Body = { type: "leave"; input: LeaveInput } | { type: "pregnancy"; input: PregnancyInput } | { type: "basis"; input: { monthlyGross: number[]; contract?: ContractType } };

/** REST entry point to the same benefit engine the UI uses. */
export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  switch (body.type) {
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
