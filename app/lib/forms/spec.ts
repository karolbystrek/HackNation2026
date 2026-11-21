// Client-safe shape of one fillable application, built on the server from knowledge/ (see load.ts).

export type FieldType =
  | "text" | "number" | "date" | "phone" | "pesel" | "nip" | "regon" | "bank_account" | "address" | "id_document" | "table"
  | "boolean" | "signature" | "choice" | "multi_choice" | "date_range" | "person" | "child_list";

/** Predicate from knowledge/ (`required_if`, attachment `condition`). */
export type Condition = { [key: string]: unknown };

export type FormField = {
  key: string;
  label: string;
  type: FieldType;
  section: string;
  required: "always" | "conditional" | "optional";
  requiredIf?: Condition;
  options?: { value: string; label: string }[];
  help?: string;
};

export type FormAttachment = {
  id: string;
  title: string;
  required: "always" | "conditional";
  condition?: Condition;
  note?: string;
};

export type FormSpec = {
  id: string;
  title: string;
  fields: FormField[];
  attachments: FormAttachment[];
};

export type DateRange = { from: string; to: string };
export type Person = { name: string; pesel: string };
export type Child = { name: string; birthDate: string; birthPlace: string };
export type FieldValue = string | boolean | string[] | DateRange | Person | Child[];
export type FormValues = Record<string, FieldValue>;

export const ATTACHMENTS_STEP = "Załączniki i podpis";

/** Groups the form's sections into wizard steps; ZAM's numbered parts depend on the chosen basis, so they follow it. */
export function stepOf(field: FormField): string {
  const { section } = field;
  if (field.type === "signature") return ATTACHMENTS_STEP;
  if (/^\d/.test(section) || section === "Wnioskuję o zasiłek w związku z") return "Podstawa wniosku";
  if (section === "Oświadczenie" || section === "Informacja") return "Oświadczenia";
  if (section.startsWith("Rachunek")) return "Wypłata zasiłku";
  return section;
}

export const attachmentKey = (id: string) => `attachment:${id}`;
