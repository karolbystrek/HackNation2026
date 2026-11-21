import { analyzeCase } from "@/lib/cases/analyze";
import { ExtractionUnavailable, extractCase } from "@/lib/cases/extract";
import { downloadSample } from "@/lib/cases/samples";
import { defaultParams } from "@/lib/params";

// Reading a long scan with the model can take a minute or two.
export const maxDuration = 300;

const MAX_BYTES = 20 * 1024 * 1024;

/** Reads a ZUS case file (upload or sample id) with AI, then checks insurance and computes the benefit deterministically. */
export async function POST(request: Request) {
  let bytes: Uint8Array | null = null;
  if (request.headers.get("content-type")?.startsWith("multipart/form-data")) {
    const file = (await request.formData().catch(() => null))?.get("file");
    if (!(file instanceof File)) return Response.json({ error: "Dołącz plik PDF w polu file." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "Plik jest większy niż 20 MB." }, { status: 413 });
    bytes = new Uint8Array(await file.arrayBuffer());
    // Check the PDF signature, not the browser-reported type.
    if (file.type !== "application/pdf" || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
      return Response.json({ error: "To nie jest plik PDF." }, { status: 400 });
    }
  } else {
    const body: unknown = await request.json().catch(() => null);
    const sampleId = typeof body === "object" && body !== null && "sampleId" in body ? body.sampleId : null;
    if (typeof sampleId !== "string") return Response.json({ error: "Wyślij plik PDF albo sampleId." }, { status: 400 });
    bytes = await downloadSample(sampleId);
    if (!bytes) return Response.json({ error: "Nie ma takiej przykładowej teczki." }, { status: 404 });
  }

  try {
    const { extraction, cached } = await extractCase(bytes);
    return Response.json({ extraction, cached, analysis: analyzeCase(extraction, defaultParams) });
  } catch (error) {
    if (error instanceof ExtractionUnavailable) return Response.json({ error: error.message }, { status: 503 });
    console.error(error);
    return Response.json({ error: "Nie udało się odczytać teczki. Spróbuj ponownie albo wpisz dane ręcznie." }, { status: 502 });
  }
}
