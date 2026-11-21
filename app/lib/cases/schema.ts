// What the AI reads from a scanned ZUS case file. Only facts the benefit engine needs: no names, PESEL or addresses.

export type ContractType = "uop" | "zlec" | "jdg" | "unknown";
export type BenefitKind = "maternity" | "sickness_pregnancy" | "equal_maternity" | "other";
export type EventKind = "birth" | "stillbirth" | "child_death" | "adoption" | "foster" | "pregnancy" | "other";
export type PeriodKind = "maternity" | "supplementary" | "parental" | "paternity" | "maternity_conditions" | "sickness" | "equal_maternity";

export type CasePeriod = { kind: PeriodKind; from: string; to: string };

export type CaseExtraction = {
  documents: { kind: string; title: string; pages: string }[];
  benefit: BenefitKind;
  contract: ContractType;
  insuranceTitleCode: string | null;
  claimant: "mother" | "father" | "other";
  event: {
    kind: EventKind;
    /** Birth, stillbirth, intake for adoption, or the first day of sick leave in pregnancy. */
    date: string | null;
    childBirthDate: string | null;
    kids: number;
    zaZyciem: boolean;
    gestationWeek: number | null;
    birthWeightG: number | null;
    hospitalWeeks: number | null;
  };
  requested: CasePeriod[];
  fullLeaveDeclaration: boolean;
  sickInsurance: { from: string; to: string | null; voluntary: boolean }[];
  insuranceEnd: { date: string | null; reason: "none" | "employer_insolvency" | "other" };
  debtOnDate: boolean | null;
  /** Monthly gross pay (employees, contractors) or declared contribution base (self-employed). */
  basisMonths: { month: string; amount: number }[];
  decision: {
    present: boolean;
    granted: boolean | null;
    reason: string | null;
    periods: CasePeriod[];
    ratePercent: number | null;
    basis: number | null;
    monthlyAmount: number | null;
  };
  uncertain: string[];
};

const date = { type: "string", description: "Data w formacie RRRR-MM-DD" };
const nullableDate = { type: ["string", "null"], description: "Data w formacie RRRR-MM-DD albo null" };
const periodKinds = ["maternity", "supplementary", "parental", "paternity", "maternity_conditions", "sickness", "equal_maternity"];
const period = {
  type: "object",
  properties: { kind: { type: "string", enum: periodKinds }, from: date, to: date },
  required: ["kind", "from", "to"],
};

/** JSON Schema of CaseExtraction for the model's structured output. */
export const caseExtractionSchema = {
  type: "object",
  properties: {
    documents: {
      type: "array",
      description: "Każdy rozpoznany dokument w teczce",
      items: {
        type: "object",
        properties: {
          kind: { type: "string", description: "Id formularza z listy (np. form.zam, form.zur, form.z3) albo insurance_certificate, decision, birth_certificate, medical_certificate, other" },
          title: { type: "string", description: "Krótki opis po polsku" },
          pages: { type: "string", description: "Strony w pliku, np. 1-3" },
        },
        required: ["kind", "title", "pages"],
      },
    },
    benefit: { type: "string", enum: ["maternity", "sickness_pregnancy", "equal_maternity", "other"], description: "O jakie świadczenie toczy się sprawa" },
    contract: { type: "string", enum: ["uop", "zlec", "jdg", "unknown"], description: "Tytuł ubezpieczenia: uop = umowa o pracę, zlec = zlecenie, jdg = działalność gospodarcza lub współpraca" },
    insuranceTitleCode: { type: ["string", "null"], description: "Kod tytułu ubezpieczenia, np. 0110, 0411, 0510, 0570" },
    claimant: { type: "string", enum: ["mother", "father", "other"] },
    event: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["birth", "stillbirth", "child_death", "adoption", "foster", "pregnancy", "other"] },
        date: { ...nullableDate, description: "Data porodu, martwego urodzenia, przyjęcia dziecka albo pierwszy dzień zwolnienia w ciąży" },
        childBirthDate: nullableDate,
        kids: { type: "integer", description: "Liczba dzieci urodzonych przy jednym porodzie lub przyjętych" },
        zaZyciem: { type: "boolean", description: "Zaświadczenie „Za życiem”" },
        gestationWeek: { type: ["integer", "null"] },
        birthWeightG: { type: ["integer", "null"] },
        hospitalWeeks: { type: ["integer", "null"], description: "Tygodnie pobytu dziecka w szpitalu (wcześniak)" },
      },
      required: ["kind", "date", "childBirthDate", "kids", "zaZyciem", "gestationWeek", "birthWeightG", "hospitalWeeks"],
    },
    requested: { type: "array", description: "Okresy, za które wnioskodawca ubiega się o zasiłek", items: period },
    fullLeaveDeclaration: { type: "boolean", description: "Wniosek o 81,5% za cały okres (złożony do 21 dni po porodzie)" },
    sickInsurance: {
      type: "array",
      description: "Okresy podlegania ubezpieczeniu chorobowemu z poświadczenia lub zaświadczenia płatnika",
      items: {
        type: "object",
        properties: { from: date, to: nullableDate, voluntary: { type: "boolean" } },
        required: ["from", "to", "voluntary"],
      },
    },
    insuranceEnd: {
      type: "object",
      properties: {
        date: nullableDate,
        reason: { type: "string", enum: ["none", "employer_insolvency", "other"], description: "employer_insolvency = upadłość, likwidacja albo śmierć pracodawcy" },
      },
      required: ["date", "reason"],
    },
    debtOnDate: { type: ["boolean", "null"], description: "Zadłużenie z tytułu składek na dzień powstania prawa" },
    basisMonths: {
      type: "array",
      description: "Przychód brutto (pracownik, zleceniobiorca) albo zadeklarowana podstawa składek (działalność) za kolejne miesiące",
      items: {
        type: "object",
        properties: { month: { type: "string", description: "RRRR-MM" }, amount: { type: "number" } },
        required: ["month", "amount"],
      },
    },
    decision: {
      type: "object",
      description: "Decyzja albo pismo ZUS w teczce, jeśli jest",
      properties: {
        present: { type: "boolean" },
        granted: { type: ["boolean", "null"] },
        reason: { type: ["string", "null"], description: "Uzasadnienie w jednym zdaniu, bez danych osobowych" },
        periods: { type: "array", items: period },
        ratePercent: { type: ["number", "null"] },
        basis: { type: ["number", "null"], description: "Podstawa wymiaru zasiłku podana przez ZUS" },
        monthlyAmount: { type: ["number", "null"] },
      },
      required: ["present", "granted", "reason", "periods", "ratePercent", "basis", "monthlyAmount"],
    },
    uncertain: { type: "array", items: { type: "string" }, description: "Pola nieczytelne albo niepewne, np. event.date" },
  },
  required: ["documents", "benefit", "contract", "insuranceTitleCode", "claimant", "event", "requested", "fullLeaveDeclaration", "sickInsurance", "insuranceEnd", "debtOnDate", "basisMonths", "decision", "uncertain"],
} as const;

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Light runtime check of a model response; throws with the first broken field. */
export function assertExtraction(value: unknown): asserts value is CaseExtraction {
  const v = value as CaseExtraction;
  const fail = (path: string) => { throw new Error(`Invalid extraction: ${path}`); };
  if (!v || typeof v !== "object") fail("root");
  if (!Array.isArray(v.documents) || !Array.isArray(v.requested) || !Array.isArray(v.sickInsurance) || !Array.isArray(v.basisMonths) || !Array.isArray(v.uncertain)) fail("arrays");
  if (!v.event || typeof v.event.kids !== "number") fail("event");
  if (v.event.date !== null && !DATE.test(v.event.date)) fail("event.date");
  for (const p of [...v.requested, ...(v.decision?.periods ?? [])]) if (!DATE.test(p.from) || !DATE.test(p.to) || !periodKinds.includes(p.kind)) fail("periods");
  for (const m of v.basisMonths) if (!/^\d{4}-\d{2}$/.test(m.month) || typeof m.amount !== "number") fail("basisMonths");
  if (!v.decision || typeof v.decision.present !== "boolean") fail("decision");
}
