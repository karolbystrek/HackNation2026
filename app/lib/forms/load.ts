import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Condition, FieldType, FormAttachment, FormField, FormSpec } from "@/lib/forms/spec";

// knowledge/ sits next to app/ in the repo and is copied to /knowledge in the container.
const KNOWLEDGE_DIR = path.join(process.cwd(), "..", "knowledge");

/** Applications the timeline can open in the form wizard. */
export const FORM_IDS = ["ff.zam", "ff.zas53", "lr.paternity", "lr.parental"];

// Polish labels for the coded options of the forms above; unknown codes fall back to the code itself.
const OPTION_LABELS: Record<string, string> = {
  "1_urodzenie": "Urodzenie dziecka",
  "1_przysposobienie": "Przyjęcie dziecka na wychowanie i wniosek do sądu o przysposobienie",
  "1_rodzina_zastepcza": "Przyjęcie dziecka jako rodzina zastępcza (niezawodowa)",
  "2_przewidywana_data_porodu": "Część urlopu przed przewidywaną datą porodu",
  "3_urodzenie_po_ustaniu_zatrudnienia": "Urodzenie dziecka po ustaniu zatrudnienia w czasie ciąży",
  "4_uzupelniajacy_szpital": "Uzupełniający urlop macierzyński (wcześniak lub pobyt dziecka w szpitalu)",
  "5_sytuacja_matki": "Przejęcie zasiłku po matce dziecka",
  "6_wypis_ze_szpitala": "Wznowienie zasiłku po wypisie ze szpitala",
  upadlosc: "Upadłość pracodawcy",
  likwidacja: "Likwidacja pracodawcy",
  naruszenie_prawa_wyrok: "Rozwiązanie umowy z naruszeniem prawa (prawomocny wyrok)",
  smierc_pracodawcy: "Śmierć pracodawcy",
  przed_28_tyg: "Urodzenie przed 28. tygodniem ciąży",
  masa_do_1000g: "Masa urodzeniowa do 1000 g",
  "28_37_tyg_masa_powyzej_1000g": "Urodzenie w 28.–37. tygodniu ciąży, masa powyżej 1000 g",
  po_37_tyg_szpital_2_dni_od_5_do_28_dnia: "Urodzenie po 37. tygodniu, co najmniej 2 dni w szpitalu między 5. a 28. dniem życia",
  skrocenie_po_14_tyg: "Matka rezygnuje z reszty zasiłku po 14 tygodniach",
  przerwa_szpital_po_8_tyg: "Matka jest w szpitalu (po 8 tygodniach zasiłku)",
  przerwa_orzeczenie_po_8_tyg: "Matka jest niezdolna do samodzielnej egzystencji (po 8 tygodniach zasiłku)",
  praca_matki_min_pol_etatu: "Matka pracuje co najmniej na pół etatu",
  porzucenie: "Matka porzuciła dziecko",
  smierc_matki: "Śmierć matki",
  mnie: "Mój wypis ze szpitala",
  dziecka: "Wypis dziecka ze szpitala",
  w_okresie_ubezpieczenia: "W czasie ubezpieczenia",
  po_ustaniu: "Po ustaniu tytułu ubezpieczenia",
};

// knowledge/ marks these "conditional" with the rule only in prose; spell it out so the wizard can apply it.
const REQUIRED_IF: Record<string, Condition> = {
  insured_pesel: { not: { fact: "no_pesel", eq: true } },
};

type RawField = {
  key: string; label_pl: string; type: FieldType; section?: string; required: FormField["required"];
  required_if?: Condition; options?: string[]; help_pl?: string;
};
type RawAttachment = { document_id: string; required: FormAttachment["required"]; condition?: Condition; note_pl?: string };
type RawRecord = {
  id: string; title_pl: string; fields?: RawField[]; field_set_id?: string; status?: string;
  attachments?: RawAttachment[]; attachment_rules?: RawAttachment[];
};

async function records(file: string): Promise<RawRecord[]> {
  "use cache";
  return JSON.parse(await readFile(path.join(KNOWLEDGE_DIR, file), "utf8")).records;
}

function toField(raw: RawField, section: string): FormField {
  return {
    key: raw.key,
    label: raw.label_pl,
    type: raw.type,
    section: raw.section ?? section,
    required: raw.required,
    requiredIf: raw.required_if ?? REQUIRED_IF[raw.key],
    options: raw.options?.map((value) => ({ value, label: OPTION_LABELS[value] ?? value.replaceAll("_", " ") })),
    help: raw.help_pl,
  };
}

export async function loadSpecs(ids: string[]): Promise<Record<string, FormSpec>> {
  const [fieldSets, leaveRequests, forms, documents] = await Promise.all(
    ["form_fields.json", "leave_requests.json", "forms.json", "documents.json"].map(records),
  );
  const docTitle = new Map(documents.map((doc) => [doc.id, doc.title_pl]));
  const toAttachment = (raw: RawAttachment): FormAttachment => ({
    id: raw.document_id,
    title: docTitle.get(raw.document_id) ?? raw.document_id,
    required: raw.required,
    condition: raw.condition,
    note: raw.note_pl,
  });

  const specs: Record<string, FormSpec> = {};
  for (const id of ids) {
    const leave = leaveRequests.find((record) => record.id === id);
    if (leave) {
      specs[id] = {
        id,
        title: leave.title_pl,
        fields: [
          ...leave.fields!.map((field) => toField(field, "Wniosek")),
          // Leave requests are signed like any letter to the employer; the simulated mObywatel signature replaces it.
          { key: "signature", label: "Podpis", type: "signature", section: "Podpis", required: "always" },
        ],
        attachments: (leave.attachments ?? []).map(toAttachment),
      };
      continue;
    }
    const fieldSet = fieldSets.find((record) => record.id === id);
    if (!fieldSet) throw new Error(`Unknown form spec ${id}`);
    const form = forms.find((record) => record.field_set_id === id && record.status === "current");
    specs[id] = {
      id,
      title: form?.title_pl ?? fieldSet.title_pl,
      fields: fieldSet.fields!.map((field) => toField(field, "Wniosek")),
      attachments: (form?.attachment_rules ?? []).map(toAttachment),
    };
  }
  return specs;
}
