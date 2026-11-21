import { readApplicationRequest } from "@/lib/forms/request";
import { validate } from "@/lib/forms/rules";
import { fillZusPdf, hasZusPdf } from "@/lib/forms/zus-pdf";

/** Returns the official ZUS form (PDF) filled with the application values. */
export async function POST(request: Request) {
  const parsed = await readApplicationRequest(request);
  if (parsed instanceof Response) return parsed;
  const { spec, ctx, values } = parsed;
  if (!hasZusPdf(spec.id)) return Response.json({ error: "No ZUS template for this form" }, { status: 404 });

  const { errors } = validate(spec, values, ctx);
  if (errors.length) return Response.json({ errors }, { status: 422 });

  const pdf = await fillZusPdf(spec.id, values, ctx);
  return new Response(Buffer.from(pdf), {
    headers: { "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${spec.id.slice(3)}.pdf"` },
  });
}
