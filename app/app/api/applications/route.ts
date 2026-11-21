import { readApplicationRequest } from "@/lib/forms/request";
import { validate } from "@/lib/forms/rules";

const CHANNELS = {
  zus: { prefix: "UPO", channel: "eZUS (symulacja)" },
  employer: { prefix: "KADRY", channel: "Elektroniczny wniosek do pracodawcy (symulacja)" },
  usc: { prefix: "USC", channel: "gov.pl, rejestr stanu cywilnego (symulacja)" },
} as const;

/**
 * Simulated submission of an application to ZUS (eZUS), the employer or the civil registry office.
 * Re-validates with the same rules as the form and returns a confirmation number.
 */
export async function POST(request: Request) {
  const parsed = await readApplicationRequest(request);
  if (parsed instanceof Response) return parsed;
  const { spec, ctx, values } = parsed;

  const { errors, warnings } = validate(spec, values, ctx);
  if (errors.length) return Response.json({ errors, warnings }, { status: 422 });

  const serial = String(Math.floor(Math.random() * 1_000_000)).padStart(6, "0");
  const { prefix, channel } = CHANNELS[ctx.recipient];
  return Response.json({
    number: `${prefix}/${ctx.today.replaceAll("-", "")}/${serial}`,
    sentAt: new Date().toISOString(),
    recipient: ctx.recipientName,
    channel,
    warnings,
  });
}
