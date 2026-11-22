import { BIRTH_CERTIFICATE_REQUEST } from "@/lib/forms/civil";
import type { Condition, FieldType, FormAttachment, FormField, FormSpec } from "@/lib/forms/spec";
import { records } from "@/lib/knowledge";

/** Applications the timeline can open in the form wizard. */
export const FORM_IDS = [
  "ff.zam", "ff.zas53", "lr.paternity", "lr.parental", "lr.combine_parental_with_work", "lr.maternity_conditions",
  "lr.supplementary_maternity", "lr.maternity_pre_birth", "lr.maternity_resign_14w", "lr.maternity_resign_incapacity",
  "lr.maternity_takeover", "lr.maternity_mother_hospital", "lr.maternity_mother_death", "lr.maternity_abandonment",
  "lr.maternity_uninsured_mother_incapacity", "lr.maternity_uninsured_mother_works", BIRTH_CERTIFICATE_REQUEST.id,
  "ff.z3", "ff.z3a", "ff.zas12", "ff.z10", "ff.znp7", "ff.zas55", "ff.zas15", "ff.zas24", "ff.zas23", "ff.zas26", "ff.zas33", "ff.zas40", "ff.zas2",
];

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
  pierwszorazowy: "Wniosek pierwszorazowy",
  kontynuacja: "Wniosek o kontynuację",
  chorobowy: "Zasiłek chorobowy",
  opiekunczy: "Zasiłek opiekuńczy",
  macierzynski: "Zasiłek macierzyński",
  w_wysokosci_macierzynskiego: "Zasiłek w wysokości zasiłku macierzyńskiego",
  wyrownawczy: "Zasiłek wyrównawczy",
  rehabilitacyjne: "Świadczenie rehabilitacyjne",
  do_20: "Do 20 osób",
  powyzej_20: "Powyżej 20 osób",
  zasilek_chorobowy: "Zasiłek chorobowy",
  swiadczenie_rehabilitacyjne: "Świadczenie rehabilitacyjne",
  ogolny_stan_zdrowia: "Ogólny stan zdrowia",
  wypadek_przy_pracy: "Wypadek przy pracy",
  choroba_zawodowa: "Choroba zawodowa",
  nie_zapewniono: "Nie zapewniono mi innego zatrudnienia",
  zapewniono: "Zapewniono mi inne zatrudnienie",
  matka: "Matce dziecka",
  ojciec_lub_czlonek_rodziny: "Ojcu lub innemu członkowi rodziny",
  powrot_do_pracy_po_14_tyg: "Powrót do pracy po 14 tygodniach",
  moj_pobyt_w_szpitalu_po_8_tyg: "Mój pobyt w szpitalu (po 8 tygodniach)",
  pobyt_dziecka_w_szpitalu_po_8_tyg: "Pobyt dziecka w szpitalu (po 8 tygodniach)",
  orzeczenie_po_8_tyg: "Orzeczenie o niezdolności do samodzielnej egzystencji (po 8 tygodniach)",
  oddanie_dziecka_do_przysposobienia: "Oddanie dziecka do przysposobienia",
  powrot_ojca_po_wypisie_matki: "Powrót ojca do pracy po wypisie matki ze szpitala",
  rodzina_zastepcza: "Jako rodzina zastępcza",
  przysposobienie: "Wystąpienie do sądu o przysposobienie",
};

// knowledge/ marks these "conditional" with the rule only in prose; spell it out so the wizard can apply it.
const REQUIRED_IF: Record<string, Condition> = {
  insured_pesel: { not: { fact: "no_pesel", eq: true } },
};

// Fallback hints for identifier formats, used when knowledge/ gives a field no help_pl.
const TYPE_HINTS: Partial<Record<FieldType, string>> = {
  pesel: "11 cyfr – znajdziesz go w dowodzie osobistym albo w aplikacji mObywatel.",
  nip: "10 cyfr, bez kresek.",
  regon: "9 albo 14 cyfr.",
  bank_account: "26 cyfr polskiego rachunku – spacje nie przeszkadzają.",
  phone: "Np. 600 100 200.",
  address: "Ulica, numer domu i lokalu, kod pocztowy, miejscowość.",
  id_document: "Rodzaj, seria i numer, np. dowód osobisty ABC123456.",
};

type RawField = {
  key: string; label_pl: string; type: FieldType; section?: string; required: FormField["required"];
  required_if?: Condition; options?: string[]; help_pl?: string;
};
type RawAttachment = { document_id: string; required: FormAttachment["required"]; condition?: Condition; note_pl?: string };

function toField(raw: RawField, section: string): FormField {
  return {
    key: raw.key,
    label: raw.label_pl,
    type: raw.type,
    section: raw.section ?? section,
    required: raw.required,
    requiredIf: raw.required_if ?? REQUIRED_IF[raw.key],
    options: raw.options?.map((value) => ({ value, label: OPTION_LABELS[value] ?? value.replaceAll("_", " ") })),
    help: raw.help_pl ?? TYPE_HINTS[raw.type],
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
    if (id === BIRTH_CERTIFICATE_REQUEST.id) {
      specs[id] = BIRTH_CERTIFICATE_REQUEST;
      continue;
    }
    const leave = leaveRequests.find((record) => record.id === id);
    if (leave) {
      specs[id] = {
        id,
        title: leave.title_pl,
        fields: [
          ...leave.fields.map((field: RawField) => toField(field, "Wniosek")),
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
      fields: fieldSet.fields.map((field: RawField) => toField(field, "Wniosek")),
      attachments: (form?.attachment_rules ?? []).map(toAttachment),
    };
  }
  return specs;
}
