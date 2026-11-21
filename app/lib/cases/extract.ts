import { createHash } from "node:crypto";
import { GoogleGenAI } from "@google/genai";
import { assertExtraction, caseExtractionSchema, type CaseExtraction } from "@/lib/cases/schema";
import { records } from "@/lib/forms/load";
import { createAdminClient } from "@/lib/supabase/admin";

export const CASE_BUCKET = "zus-cases";
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

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
- basisMonths: kwoty z tabeli podstaw wymiaru w poświadczeniu ubezpieczenia albo przychód z zaświadczenia płatnika (Z-3, Z-3a), po jednej pozycji na miesiąc.
- requested: okresy z wniosku (ZAM, ZUR, ZAO, ZAS-53, ZAS-55, e-ZLA). Jeśli wniosku nie ma, a okresy wynikają z decyzji, zostaw requested puste.
- fullLeaveDeclaration: zaznaczony wniosek o zasiłek w wysokości 81,5% za cały okres.
- decision: dane z decyzji lub pisma ZUS w teczce (przyznanie, odmowa, ustalenie uprawnień zgodnie z wnioskiem). present = false, jeśli takiego pisma nie ma.
- uncertain: ścieżki pól, których nie dało się pewnie odczytać, np. "event.date".

Formularze ZUS (pole documents[].kind):
${catalog}
Inne dokumenty: insurance_certificate (poświadczenie ubezpieczenia chorobowego, zrzuty z systemu ZUS), decision (decyzja lub pismo ZUS), birth_certificate (odpis aktu urodzenia), medical_certificate (e-ZLA, zaświadczenie lekarskie), other.`;
}

export const sha256 = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");

/** Reads a scanned case PDF with Gemini; results are cached by the file's SHA-256 so each file is read once. */
export async function extractCase(bytes: Uint8Array): Promise<{ extraction: CaseExtraction; cached: boolean }> {
  const hash = sha256(bytes);
  const db = createAdminClient();
  const { data: hit } = await db.from("case_extractions").select("extraction").eq("sha256", hash).maybeSingle();
  if (hit) return { extraction: hit.extraction as CaseExtraction, cached: true };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new ExtractionUnavailable("Brak klucza GEMINI_API_KEY, więc nowej teczki nie da się odczytać.");
  const ai = new GoogleGenAI({ apiKey });
  // shortcut: inline PDF only (ZUS sample files are at most ~7 MB); use the Files API for files above 20 MB.
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { mimeType: "application/pdf", data: Buffer.from(bytes).toString("base64") } }, { text: await prompt() }] }],
    config: { responseMimeType: "application/json", responseJsonSchema: caseExtractionSchema, temperature: 0 },
  });
  const extraction: unknown = JSON.parse(response.text ?? "null");
  assertExtraction(extraction);
  const { error } = await db.from("case_extractions").upsert({ sha256: hash, model: MODEL, extraction });
  if (error) console.error("case_extractions cache write failed", error.message);
  return { extraction, cached: false };
}
