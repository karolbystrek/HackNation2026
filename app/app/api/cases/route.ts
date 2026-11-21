import { samples } from "@/lib/cases/samples";

/** Fictional case files available in the demo. */
export function GET() {
  return Response.json({ samples });
}
