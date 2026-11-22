import { PDFDocument } from "pdf-lib";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/cases/analyze/route";
import type { CaseExtraction } from "@/lib/cases/schema";
import { defaultParams } from "@/lib/params";

const { generateContent, cache } = vi.hoisted(() => ({
  generateContent: vi.fn(),
  cache: new Map<string, { extraction: CaseExtraction; model: string }>(),
}));

vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: (_column: string, key: string) => ({
          maybeSingle: async () => ({ data: cache.get(key) ?? null }),
        }),
      }),
      upsert: async ({ sha256, ...row }: { sha256: string; model: string; extraction: CaseExtraction }) => {
        cache.set(sha256, row);
        return { error: null };
      },
    }),
  }),
}));

vi.mock("@/lib/server-params", () => ({ loadParams: async () => defaultParams }));

const parental = { kind: "parental", from: "2026-06-01", to: "2026-06-30" } as const;
const caseData: CaseExtraction = {
  documents: [{ kind: "form.zam", title: "Fikcyjny wniosek ZAM", pages: "1" }],
  benefit: "maternity",
  contract: "jdg",
  insuranceTitleCode: "0510",
  claimant: "mother",
  event: { kind: "birth", date: "2026-01-12", childBirthDate: "2026-01-12", kids: 1, zaZyciem: false, gestationWeek: null, birthWeightG: null, hospitalWeeks: null },
  requested: [parental],
  fullLeaveDeclaration: false,
  sickInsurance: [{ from: "2025-01-01", to: null, voluntary: true }],
  insuranceEnd: { date: null, reason: "none" },
  debtOnDate: false,
  basisMonths: [{ month: "2026-04", amount: 6000 }, { month: "2026-05", amount: 6000 }],
  decision: { present: true, granted: true, reason: null, periods: [], ratePercent: null, basis: null, monthlyAmount: null },
  uncertain: [],
};

async function makePdf(description: string) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage();
  page.drawText("Fikcyjna sprawa testowa", { x: 40, y: 750 });
  page.drawText(description, { x: 40, y: 720 });
  return Uint8Array.from(await pdf.save());
}

function upload(content: BlobPart, type = "application/pdf") {
  const form = new FormData();
  form.append("file", new Blob([content], { type }), "test.pdf");
  return POST(new Request("http://localhost/api/cases/analyze", { method: "POST", body: form }));
}

describe("PDF upload and benefit calculation", () => {
  beforeEach(() => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    cache.clear();
    generateContent.mockReset();
  });

  afterEach(() => vi.unstubAllEnvs());

  it("calculates basis, dates and amount from the input and reuses a second upload", async () => {
    const pdf = await makePdf("ZAM: 01-30.06.2026. Podstawa skladek: 6000 PLN miesiecznie.");
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({
      ...caseData,
      // Use a deliberately different decision amount to verify that it cannot determine our amount.
      decision: { ...caseData.decision, monthlyAmount: 3500, periods: [parental] },
    }) });

    const response = await upload(pdf);
    expect(response.status).toBe(200);
    const result = await response.json();
    expect(result).toMatchObject({
      cached: false,
      analysis: {
        eligible: true,
        basis: { months: 2, value: 5177.4 },
        monthly: 3624.18,
        periods: [{ ...parental, days: 30, rate: 0.7, daily: 120.81, total: 3624.3 }],
        total: 3624.3,
      },
    });
    expect(result.analysis.comparison).toContainEqual(expect.objectContaining({ label: "Kwota miesięczna", match: false }));
    expect(generateContent).toHaveBeenCalledWith(expect.objectContaining({
      contents: [{ role: "user", parts: [
        { inlineData: { mimeType: "application/pdf", data: Buffer.from(pdf).toString("base64") } },
        { text: expect.any(String) },
      ] }],
    }));

    const repeated = await upload(pdf);
    expect(repeated.status).toBe(200);
    expect(await repeated.json()).toEqual({ ...result, cached: true });
    expect(generateContent).toHaveBeenCalledTimes(1);
  });

  it.each([
    { title: "refusal when insurance ended before leave", periods: [{ from: "2025-01-01", to: "2026-05-31", voluntary: true }], eligible: false },
    { title: "unknown when insurance dates are missing", periods: [], eligible: null },
  ])("returns $title instead of assuming entitlement from the decision", async ({ periods, eligible }) => {
    const pdf = await makePdf("ZAM: 01-30.06.2026. Sprawdzenie ubezpieczenia.");
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({ ...caseData, sickInsurance: periods }) });
    const response = await upload(pdf);
    expect(response.status).toBe(200);
    const { analysis } = await response.json();
    expect(analysis).toMatchObject({ eligible, monthly: null, total: 0 });
    expect(analysis.comparison.find((row: { label: string }) => row.label === "Prawo do zasiłku"))
      .toEqual(eligible === false
        ? { label: "Prawo do zasiłku", ours: "nie przysługuje", zus: "przysługuje", match: false }
        : undefined);
  });

  it("rejects a non-PDF before invoking extraction", async () => {
    expect((await upload("plain text pretending to be a PDF")).status).toBe(400);
    expect(generateContent).not.toHaveBeenCalled();
  });

  it("makes at most one supplementary read, using only the relevant pages", async () => {
    const original = await PDFDocument.create();
    original.addPage();
    original.addPage();
    original.addPage();
    const pdf = Uint8Array.from(await original.save());
    generateContent.mockResolvedValueOnce({ text: JSON.stringify({
      ...caseData,
      sickInsurance: [],
      basisMonths: [],
      uncertain: ["sickInsurance", "basisMonths"],
      documents: [{ kind: "insurance_certificate", title: "Poświadczenie", pages: "3" }],
    }) });
    generateContent.mockImplementationOnce(async ({ contents }) => {
      const subset = await PDFDocument.load(Buffer.from(contents[0].parts[0].inlineData.data, "base64"));
      expect(subset.getPageCount()).toBe(1);
      expect(contents[0].parts[1].text).toContain("sickInsurance, basisMonths");
      return { text: JSON.stringify({
        ...caseData,
        decision: { ...caseData.decision, granted: false },
        sources: [{ field: "sickInsurance", pages: [1] }, { field: "basisMonths", pages: [1] }],
      }) };
    });
    const response = await upload(pdf);
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      extraction: { sources: [{ field: "sickInsurance", pages: [3] }, { field: "basisMonths", pages: [3] }], decision: { granted: true } },
      analysis: { eligible: true, monthly: 3624.18 },
    });
    expect((await (await upload(pdf)).json()).cached).toBe(true);
    expect(generateContent).toHaveBeenCalledTimes(2);
  });
});
