import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { PDFDocument } from "pdf-lib";
import { assertExtraction, caseExtractionSchema, type CaseExtraction, type CaseSourceField } from "@/lib/cases/schema";
import { records } from "@/lib/knowledge";
import { createAdminClient } from "@/lib/supabase/admin";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Bump when the prompt or schema changes, so cached readings from the old prompt are read again.
const CACHE_TAG = `${MODEL}#3`;

export class ExtractionUnavailable extends Error {}

async function prompt(): Promise<string> {
  const forms = (await records("forms.json")) as unknown as { id: string; title_pl: string; aliases?: string[]; recognition_hints_pl?: string[]; status?: string }[];
  const catalog = forms
    .map((f) => `- ${f.id}: ${f.title_pl}${f.aliases?.length ? ` (inne nazwy: ${f.aliases.join(", ")})` : ""}${f.recognition_hints_pl?.length ? `; rozpoznasz po: ${f.recognition_hints_pl.join("; ")}` : ""}`)
    .join("\n");
  return `Jesteś pracownikiem ZUS. Dostajesz zeskanowaną teczkę sprawy o zasiłek (kilka dokumentów w jednym PDF, pola zaznaczone ręcznie, dane osobowe zamazane).
Odczytaj fakty potrzebne do ustalenia prawa do zasiłku i jego wysokości. Zwróć wyłącznie JSON zgodny ze schematem.

Zasady:
- Nie przepisuj imion, nazwisk, PESEL, adresów ani numerów rachunków.
- Daty zawsze jako RRRR-MM-DD. Kwoty jako liczby (1 399,80 → 1399.8).
- Tytuł ubezpieczenia: kody 01xx to umowa o pracę (uop), 04xx zlecenie (zlec), 05xx działalność lub współpraca (jdg).
- sickInsurance: tylko okresy ubezpieczenia chorobowego (nie emerytalnego, rentowego, zdrowotnego). voluntary = true dla dobrowolnego (działalność, zlecenie).
  Szukaj dat w wydruku przebiegu ubezpieczeń ZUS, poświadczeniu oraz zaświadczeniach płatnika (np. Z-3, Z-3a, Z-3b, ZAS-12). Jeśli płatnik zaznaczył TAK przy ubezpieczeniu chorobowym, połącz to z wydrukiem tylko wtedy, gdy potwierdzają ten sam okres ubezpieczenia chorobowego.
  Nie wyprowadzaj okresu z samego kodu tytułu, daty zdarzenia, pola TAK bez dat ani z przyznania zasiłku. Jeżeli nie możesz ustalić okresu, dodaj "sickInsurance" do uncertain. Wpisz to = null tylko dla okresu trwającego.
- basisMonths: kwoty z tabeli podstaw wymiaru w poświadczeniu ubezpieczenia albo przychód z zaświadczenia płatnika (Z-3, Z-3a), po jednej pozycji na miesiąc.
- requested: okresy z wniosku (ZAM, ZUR, ZAO, ZAS-53, ZAS-55, e-ZLA). Jeśli wniosku nie ma, a okresy wynikają z decyzji, zostaw requested puste.
- fullLeaveDeclaration: zaznaczony wniosek o zasiłek w wysokości 81,5% za cały okres.
- decision: dane z decyzji lub pisma ZUS w teczce (przyznanie, odmowa, ustalenie uprawnień zgodnie z wnioskiem). present = false, jeśli takiego pisma nie ma.
- uncertain: ścieżki pól, których nie dało się pewnie odczytać, np. "event.date".
- sources: numery stron dla rodzaju świadczenia, okresów z wniosku, ubezpieczenia i podstawy. Przy pustych polach wskaż również strony, na których należy ich szukać.
- uninsuredOnStart: ustaw tylko, gdy dokument o przebiegu ubezpieczenia potwierdza brak chorobowego na dzień rozpoczęcia świadczenia. Nie wnioskuj tego z decyzji odmownej.

Formularze ZUS (pole documents[].kind):
${catalog}
Inne dokumenty: insurance_certificate (poświadczenie ubezpieczenia chorobowego, zrzuty z systemu ZUS), decision (decyzja lub pismo ZUS), birth_certificate (odpis aktu urodzenia), medical_certificate (e-ZLA, zaświadczenie lekarskie), other.`;
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

function unresolved(c: CaseExtraction): CaseSourceField[] {
  return [
    ...(c.benefit === "other" ? ["benefit" as const] : []),
    ...(!c.requested.length ? ["requested" as const] : []),
    ...(!c.sickInsurance.length && !c.uninsuredOnStart && c.benefit !== "equal_maternity" ? ["sickInsurance" as const] : []),
    ...(!c.basisMonths.length ? ["basisMonths" as const] : []),
  ];
}

async function repairPages(bytes: Uint8Array, c: CaseExtraction, fields: CaseSourceField[]) {
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const count = pdf.getPageCount();
  const valid = (n: number) => Number.isInteger(n) && n >= 1 && n <= count;
  const pages = new Set(c.sources?.filter((s) => fields.includes(s.field)).flatMap((s) => s.pages).filter(valid) ?? []);
  for (const document of c.documents) {
    const financial = /insurance_certificate|^form\.(z3[a-b]?|zas12)$/.test(document.kind);
    const application = /medical_certificate|^form\.(zam|zur|zao|zas53|zas55)$/.test(document.kind);
    if (!(financial && fields.some((f) => f === "basisMonths" || f === "sickInsurance")) &&
      !(application && fields.some((f) => f === "benefit" || f === "requested"))) continue;
    for (const match of document.pages.matchAll(/(\d+)(?:\s*[-–]\s*(\d+))?/g)) {
      const from = Number(match[1]);
      const to = Math.min(count, Number(match[2] ?? match[1]));
      if (valid(from)) for (let n = from; n <= to; n++) pages.add(n);
    }
  }
  const original = [...pages].sort((a, b) => a - b);
  if (!original.length || original.length === count) return { bytes, original: [] as number[] };
  const subset = await PDFDocument.create();
  for (const page of await subset.copyPages(pdf, original.map((n) => n - 1))) subset.addPage(page);
  return { bytes: await subset.save(), original };
}

/** Reads a scanned case PDF with Gemini; results are cached by the file's SHA-256 so each file is read once. */
export async function extractCase(bytes: Uint8Array): Promise<{ extraction: CaseExtraction; cached: boolean }> {
  const hash = sha256(bytes);
  const db = createAdminClient();
  const { data: hit } = await db.from("case_extractions").select("extraction, model").eq("sha256", hash).maybeSingle();
  // "manual-test" rows are hand-checked readings seeded for the demo; keep them across prompt changes.
  if (hit && (hit.model === CACHE_TAG || hit.model === "manual-test")) return { extraction: hit.extraction as CaseExtraction, cached: true };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ExtractionUnavailable("Odczyt dokumentów jest teraz niedostępny. Spróbuj później."); // GEMINI_API_KEY is unset
  const ai = new GoogleGenAI({ apiKey });
  // shortcut: inline PDF only (ZUS sample files are at most ~7 MB); use the Files API for files above 20 MB.
  const instructions = await prompt();
  async function read(pdf: Uint8Array, text: string) {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") } }, { text }] }],
      config: { responseMimeType: "application/json", responseJsonSchema: caseExtractionSchema, temperature: 0, httpOptions: { retryOptions: { attempts: 1 } } },
    });
    const extraction: unknown = JSON.parse(response.text ?? "null");
    assertExtraction(extraction);
    return extraction;
  }
  const extraction = await read(bytes, instructions);
  const missing = unresolved(extraction);
  if (missing.length) {
    try {
      const subset = await repairPages(bytes, extraction, missing).catch(() => ({ bytes, original: [] as number[] }));
      const second = await read(subset.bytes, `${instructions}\nOdczyt uzupełniający. Uzupełnij wyłącznie ${missing.join(", ")}. Podawaj strony w otrzymanym pliku. Sprawdź każdą stronę, także wydruki tabel i zaznaczenia w zaświadczeniach. Zostaw pola bez danych, gdy dokument ich nie potwierdza.`);
      const recovered = missing.filter((field) => !unresolved(second).includes(field));
      for (const field of recovered) {
        if (field === "benefit") extraction.benefit = second.benefit;
        if (field === "requested") extraction.requested = second.requested;
        if (field === "basisMonths") extraction.basisMonths = second.basisMonths;
        if (field === "sickInsurance") {
          extraction.sickInsurance = second.sickInsurance;
          extraction.uninsuredOnStart = second.uninsuredOnStart;
        }
      }
      extraction.sources = [
        ...(extraction.sources ?? []).filter((s) => !recovered.includes(s.field)),
        ...(second.sources ?? []).filter((s) => recovered.includes(s.field)).map((s) => ({
          ...s, pages: subset.original.length ? s.pages.map((n) => subset.original[n - 1]).filter(Boolean) : s.pages,
        })),
      ];
      extraction.uncertain = [
        ...extraction.uncertain.filter((path) => !recovered.some((field) => path.startsWith(field))),
        ...second.uncertain.filter((path) => recovered.some((field) => path.startsWith(field))),
      ];
    } catch {
      extraction.uncertain = [...new Set([...extraction.uncertain, ...missing])];
    }
  }
  const { error } = await db.from("case_extractions").upsert({ sha256: hash, model: CACHE_TAG, extraction });
  if (error) console.error("case_extractions cache write failed", error.message);
  return { extraction, cached: false };
}
