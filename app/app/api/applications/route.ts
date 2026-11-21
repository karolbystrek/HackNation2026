import { readApplicationRequest } from "@/lib/forms/request";
import { validate } from "@/lib/forms/rules";

/**
 * Simulated submission of an application to ZUS (eZUS) or to the employer.
 * Re-validates with the same rules as the form and returns a confirmation number.
 */
export async function POST(request: Request) {
  const parsed = await readApplicationRequest(request);
  if (parsed instanceof Response) return parsed;
  const { spec, ctx, values } = parsed;

  const { errors, warnings } = validate(spec, values, ctx);
  if (errors.length) return Response.json({ errors, warnings }, { status: 422 });

  const zus = ctx.recipient === "zus";
  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  return Response.json({
    number: `${zus ? "UPO" : "KADRY"}/${ctx.today.replaceAll("-", "")}/${serial}`,
    sentAt: new Date().toISOString(),
    recipient: ctx.recipientName,
    channel: zus ? "eZUS (symulacja)" : "Elektroniczny wniosek do pracodawcy (symulacja)",
    warnings,
  });
}
