import { otherParent } from "@/lib/calc/leave";
import { addDays, diffDays, formatDate, parseIso, toIso } from "@/lib/dates";
import type { FormContext } from "@/lib/forms/context";
import {
  ATTACHMENTS_STEP, attachmentKey, stepOf, type Child, type Condition, type DateRange, type FieldValue, type FormAttachment,
  type FormField, type FormSpec, type FormValues, type Person,
} from "@/lib/forms/spec";

export type Issue = { field: string; message: string };
export type Validation = { errors: Issue[]; warnings: string[] };

const INSURED_TYPE = { uop: "employee", zlec: "contractor", jdg: "self_employed" } as const;

function facts(ctx: FormContext) {
  const me = ctx.persona.parents[ctx.parent];
  return {
    insuredType: INSURED_TYPE[me.contract],
    events: ["birth"],
    flags: {
      no_pesel: false,
      has_za_zyciem: false,
      school_deferral: false,
      payer_of_benefit: me.contract === "uop" && me.payer.includes("ponad 20") ? "payer" : "zus",
    } as Record<string, unknown>,
  };
}

export function isFilled(value: FieldValue | undefined): boolean {
  if (value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.values(value).some((part) => typeof part === "string" && part.trim() !== "");
  return true;
}

/** Evaluates a knowledge/ predicate; conditions described only in prose (`note_pl`) cannot be checked and count as false. */
export function holds(condition: Condition, ctx: FormContext, values: FormValues): boolean {
  const f = facts(ctx);
  if (Array.isArray(condition.any)) return condition.any.some((c: Condition) => holds(c, ctx, values));
  if (Array.isArray(condition.all)) return condition.all.every((c: Condition) => holds(c, ctx, values));
  if (condition.not) return !holds(condition.not as Condition, ctx, values);
  if (condition.insured_type) return f.insuredType === condition.insured_type;
  if (condition.event) return f.events.includes(condition.event as string);
  if (typeof condition.fact === "string") {
    const value = condition.fact.startsWith("field:") ? values[condition.fact.slice(6)] : f.flags[condition.fact];
    return condition.eq === true ? isFilled(value as FieldValue) : value === condition.eq;
  }
  return false;
}

export function fieldState(field: FormField, ctx: FormContext, values: FormValues): "hidden" | "required" | "optional" {
  if (field.requiredIf) return holds(field.requiredIf, ctx, values) ? "required" : "hidden";
  // ZAM parts 1-6 apply only to the basis chosen in the form ("1/3/4/5" = parts 1, 3, 4 and 5).
  if (/^\d(\/\d)*$/.test(field.section)) {
    const basis = String(values.basis ?? "");
    if (!field.section.split("/").includes(basis[0])) return "hidden";
    return field.required === "optional" ? "optional" : "required";
  }
  return field.required === "always" ? "required" : "optional";
}

export function requiredAttachments(spec: FormSpec, ctx: FormContext, values: FormValues): FormAttachment[] {
  return spec.attachments.filter((a) => a.required === "always" || (a.condition && holds(a.condition, ctx, values)));
}

// Official checksum algorithms of Polish identifiers.
function weighted(digits: string, weights: number[]) {
  return weights.reduce((sum, w, i) => sum + w * Number(digits[i]), 0);
}

export function validPesel(value: string) {
  const d = value.replace(/\s/g, "");
  return /^\d{11}$/.test(d) && (10 - (weighted(d, [1, 3, 7, 9, 1, 3, 7, 9, 1, 3]) % 10)) % 10 === Number(d[10]);
}

export function validNip(value: string) {
  const d = value.replace(/[\s-]/g, "");
  const check = weighted(d, [6, 5, 7, 2, 3, 4, 5, 6, 7]) % 11;
  return /^\d{10}$/.test(d) && check !== 10 && check === Number(d[9]);
}

export function validRegon(value: string) {
  const d = value.replace(/\s/g, "");
  const w = d.length === 9 ? [8, 9, 2, 3, 4, 5, 6, 7] : [2, 4, 8, 5, 0, 9, 7, 3, 6, 1, 2, 4, 8];
  return /^(\d{9}|\d{14})$/.test(d) && (weighted(d, w) % 11) % 10 === Number(d[d.length - 1]);
}

export function validIban(value: string) {
  let s = value.replace(/\s/g, "").toUpperCase();
  if (/^\d{26}$/.test(s)) s = `PL${s}`;
  if (!/^PL\d{26}$/.test(s)) return false;
  const digits = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, (c) => String(c.charCodeAt(0) - 55));
  return digits.split("").reduce((r, c) => (r * 10 + Number(c)) % 97, 0) === 1;
}

const days = (range: DateRange) => diffDays(parseIso(range.from)!, parseIso(range.to)!) + 1;
const shift = (date: string, n: number) => toIso(addDays(parseIso(date)!, n));
const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? few : many;

function formatIssue(field: FormField, value: FieldValue | undefined): string | null {
  const text = typeof value === "string" ? value.trim() : "";
  if (field.type === "pesel" && text && !validPesel(text)) return "Numer PESEL jest niepoprawny. Sprawdź 11 cyfr.";
  if (field.type === "nip" && text && !validNip(text)) return "Numer NIP jest niepoprawny. Sprawdź 10 cyfr.";
  if (field.type === "regon" && text && !validRegon(text)) return "Numer REGON jest niepoprawny. Sprawdź 9 albo 14 cyfr.";
  if (field.type === "bank_account" && text && !validIban(text)) return "Numer rachunku jest niepoprawny. Wpisz 26 cyfr polskiego rachunku.";
  if (field.type === "phone" && text && text.replace(/\D/g, "").length < 9) return "Wpisz numer telefonu, co najmniej 9 cyfr.";
  if (field.type === "number" && text && !/^\d+([.,]\d+)?$/.test(text)) return "Wpisz liczbę, np. 1 albo 0,5.";
  if (field.type === "date_range" && value) {
    const range = value as DateRange;
    if (isFilled(range) && (!range.from || !range.to)) return "Podaj datę początku i końca.";
    if (range.from && range.to && range.to < range.from) return "Data końca jest wcześniejsza niż data początku.";
  }
  if (field.type === "person" && value) {
    const person = value as Person;
    if (person.pesel && !validPesel(person.pesel)) return "Numer PESEL jest niepoprawny. Sprawdź 11 cyfr.";
  }
  if (field.type === "child_list" && Array.isArray(value)) {
    if ((value as Child[]).some((child) => !child.name.trim() || !child.birthDate)) return "Podaj imię i datę urodzenia każdego dziecka.";
  }
  return null;
}

const requiredMessage: Partial<Record<FormField["type"], string>> = {
  signature: "Potwierdź wniosek podpisem mObywatel.",
  date_range: "Podaj datę początku i końca.",
  child_list: "Dodaj dane dziecka.",
  choice: "Wybierz jedną odpowiedź.",
};

/** Business rules from the parent's situation; numbers come from params. */
function ruleIssues(spec: FormSpec, values: FormValues, ctx: FormContext): Validation {
  const { persona, params, parent, chosen, today } = ctx;
  const errors: Issue[] = [];
  const warnings: string[] = [];
  const birth = persona.birthDate ?? persona.dueDate;
  const employee = spec.id.startsWith("lr.");
  const range = (key: string) => {
    const value = values[key] as DateRange | undefined;
    return value?.from && value.to && value.from <= value.to ? value : null;
  };

  const paternityKey = spec.id === "lr.paternity" ? "period" : spec.id === "ff.zam" ? "scope_paternity" : null;
  const paternity = paternityKey && range(paternityKey);
  if (paternityKey && paternity) {
    const max = params.paternityWeeks * 7;
    const limit = new Date(parseIso(birth)!);
    limit.setUTCMonth(limit.getUTCMonth() + params.paternityUntilChildMonths);
    const lastDay = shift(toIso(limit), -1);
    const n = days(paternity);
    if (n > max) errors.push({ field: paternityKey, message: `Urlop ojcowski trwa najwyżej ${max} dni, a wybrany okres ma ${n}.` });
    else if (n < params.paternityMinPartDays) errors.push({ field: paternityKey, message: `Część urlopu ojcowskiego trwa co najmniej ${params.paternityMinPartDays} dni.` });
    if (paternity.from < birth) errors.push({ field: paternityKey, message: `Urlop ojcowski zaczyna się najwcześniej w dniu urodzenia dziecka (${formatDate(birth)}).` });
    if (paternity.to > lastDay) errors.push({ field: paternityKey, message: `Urlop ojcowski trzeba wykorzystać do ${formatDate(lastDay)}, zanim dziecko skończy ${params.paternityUntilChildMonths} miesięcy.` });
    const notice = shift(paternity.from, -params.paternityRequestDays);
    if (employee && today > notice) warnings.push(`Wniosek składasz później niż ${params.paternityRequestDays} dni przed urlopem (termin minął ${formatDate(notice)}). Pracodawca może nie zgodzić się na ten termin.`);
  }

  const parentalKey = spec.id === "lr.parental" ? "period" : spec.id === "ff.zam" ? "scope_parental" : null;
  const parental = parentalKey && range(parentalKey);
  if (parentalKey && parental) {
    const other = otherParent(parent);
    const pool = persona.kids > 1 ? params.parentalPoolWeeks.multiple : params.parentalPoolWeeks.single;
    const otherWeeks = (chosen?.result.periods[other] ?? []).filter((p) => p.kind === "parental").reduce((sum, p) => sum + p.weeks, 0);
    const reserved = Math.max(params.parentalOwnWeeks, otherWeeks);
    const max = pool - reserved;
    const weeks = days(parental) / 7;
    const otherName = persona.parents[other].nameGenitive;
    if (weeks > max) errors.push({ field: parentalKey, message: `Możesz wziąć najwyżej ${max} ${plural(max, "tydzień", "tygodnie", "tygodni")} urlopu rodzicielskiego: pula ma ${pool} tygodni, a ${reserved} to część ${otherName}.` });
    const maternity = chosen?.result.periods[parent].find((p) => p.kind === "maternity");
    if (maternity && parental.from < maternity.to) errors.push({ field: parentalKey, message: `Urlop rodzicielski zaczyna się po macierzyńskim, najwcześniej ${formatDate(maternity.to)}.` });
    else if (parental.from < birth) errors.push({ field: parentalKey, message: `Urlop rodzicielski zaczyna się najwcześniej w dniu urodzenia dziecka (${formatDate(birth)}).` });
    const lastDay = `${parseIso(birth)!.getUTCFullYear() + params.parentalUntilChildAge}-12-31`;
    if (parental.to > lastDay) errors.push({ field: parentalKey, message: `Urlop rodzicielski trzeba wykorzystać do ${formatDate(lastDay)}, czyli do końca roku, w którym dziecko kończy ${params.parentalUntilChildAge} lat.` });
    const notice = shift(parental.from, -params.parentalRequestDays);
    if (employee && today > notice) warnings.push(`Wniosek składasz później niż ${params.parentalRequestDays} dni przed urlopem (termin minął ${formatDate(notice)}). Pracodawca udzieli urlopu najpóźniej ${params.parentalRequestDays} dni od złożenia wniosku, więc początek może się przesunąć.`);
  }

  if (values.full_leave_declaration === true && persona.birthDate) {
    const deadline = shift(persona.birthDate, params.flatRateRequestDays);
    if (today > deadline) errors.push({
      field: "full_leave_declaration",
      message: `Oświadczenie o zasiłku 81,5% można było złożyć do ${formatDate(deadline)} (${params.flatRateRequestDays} dni po porodzie). Odznacz je: zasiłek wyniesie 100% za macierzyński i 70% za rodzicielski.`,
    });
  }

  const afterMandatory = shift(birth, params.motherOnlyWeeks * 7);
  if (spec.id === "lr.combine_parental_with_work" && isFilled(values.work_fraction)) {
    const fraction = Number(String(values.work_fraction).replace(",", "."));
    if (!(fraction > 0 && fraction <= params.combineWorkMaxFraction)) {
      errors.push({ field: "work_fraction", message: `Podaj wymiar pracy większy od zera i nie wyższy niż ${String(params.combineWorkMaxFraction).replace(".", ",")} etatu, np. 0,5.` });
    }
    const period = range("period");
    if (period && today > shift(period.from, -params.parentalRequestDays)) warnings.push(`Wniosek o łączenie urlopu z pracą składa się ${params.parentalRequestDays} dni przed podjęciem pracy. Pracodawca może nie zgodzić się na ten termin.`);
  }
  if (spec.id === "lr.maternity_resign_14w" && isFilled(values.return_date) && String(values.return_date) < afterMandatory) {
    errors.push({ field: "return_date", message: `Z urlopu macierzyńskiego można zrezygnować po wykorzystaniu ${params.motherOnlyWeeks} tygodni, czyli od ${formatDate(afterMandatory)}.` });
  }
  if (spec.id === "lr.maternity_takeover") {
    const period = range("period");
    if (period && period.from < afterMandatory) errors.push({ field: "period", message: `Tata przejmuje urlop po ${params.motherOnlyWeeks} tygodniach wykorzystanych przez mamę, najwcześniej ${formatDate(afterMandatory)}.` });
  }
  if (spec.id === "lr.supplementary_maternity") {
    const period = range("period");
    const max = params.supplementary.capSevereWeeks;
    if (period && days(period) > max * 7) errors.push({ field: "period", message: `Uzupełniający urlop macierzyński trwa najwyżej ${max} tygodni (${params.supplementary.capWeeks} tygodni, gdy dziecko urodziło się po 28. tygodniu ciąży z masą powyżej 1000 g).` });
  }
  if (spec.id === "lr.maternity_conditions") {
    const limit = params.adoptionAgeLimit.adoption;
    for (const child of (values.children as Child[] | undefined) ?? []) {
      if (child.birthDate && diffDays(parseIso(child.birthDate)!, parseIso(today)!) / 365.25 >= limit) {
        errors.push({ field: "children", message: `Urlop na warunkach macierzyńskiego przysługuje na dziecko do ${limit}. roku życia.` });
        break;
      }
    }
  }

  const payerIds = ["payer_nip", "payer_regon", "payer_pesel"];
  if (payerIds.every((key) => spec.fields.some((f) => f.key === key)) && !payerIds.some((key) => isFilled(values[key]))) {
    errors.push({ field: "payer_nip", message: "Podaj NIP płatnika składek, a gdy go nie ma, REGON albo PESEL." });
  }

  if (ctx.waitingFor.length) warnings.push(`Ten krok czeka jeszcze na: ${ctx.waitingFor.join(", ")}. Wniosek zostanie rozpatrzony, gdy to się wydarzy.`);
  return { errors, warnings };
}

/** Field and rule check of the whole application; `errors` block sending, `warnings` only inform. */
export function validate(spec: FormSpec, values: FormValues, ctx: FormContext): Validation {
  const errors: Issue[] = [];
  for (const field of spec.fields) {
    const state = fieldState(field, ctx, values);
    if (state === "hidden") continue;
    const value = values[field.key];
    // An unticked yes/no checkbox is a valid "no"; only the signature must be ticked.
    if (state === "required" && field.type !== "boolean" && !isFilled(value)) {
      errors.push({ field: field.key, message: requiredMessage[field.type] ?? "Uzupełnij to pole." });
      continue;
    }
    const issue = formatIssue(field, value);
    if (issue) errors.push({ field: field.key, message: issue });
  }
  for (const attachment of requiredAttachments(spec, ctx, values)) {
    if (values[attachmentKey(attachment.id)] !== true) errors.push({ field: attachmentKey(attachment.id), message: "Dołącz ten dokument albo potwierdź, że go przekażesz." });
  }
  const rules = ruleIssues(spec, values, ctx);
  const taken = new Set(errors.map((e) => e.field));
  return { errors: [...errors, ...rules.errors.filter((e) => !taken.has(e.field))], warnings: rules.warnings };
}

/** Wizard steps with the fields currently visible in each. */
export function formSteps(spec: FormSpec, ctx: FormContext, values: FormValues) {
  const steps: { title: string; fields: FormField[] }[] = [];
  for (const field of spec.fields) {
    if (fieldState(field, ctx, values) === "hidden") continue;
    const title = stepOf(field);
    const step = steps.find((s) => s.title === title) ?? steps[steps.push({ title, fields: [] }) - 1];
    step.fields.push(field);
  }
  // Attachments and the signature always close the wizard.
  return steps.sort((a, b) => Number(a.title === ATTACHMENTS_STEP) - Number(b.title === ATTACHMENTS_STEP));
}
