import { otherParent } from "@/lib/calc/leave";
import { addDays, parseIso, toIso } from "@/lib/dates";
import type { FormContext } from "@/lib/forms/context";
import type { DateRange, FieldValue, FormField, FormSpec, FormValues } from "@/lib/forms/spec";

function empty(field: FormField): FieldValue {
  switch (field.type) {
    case "boolean": case "signature": return false;
    case "date_range": return { from: "", to: "" };
    case "person": return { name: "", pesel: "" };
    case "child_list": case "multi_choice": return [];
    default: return "";
  }
}

/** Values the simulated mObywatel/ZUS profile, the chosen leave variant and the timeline already know. */
export function prefill(spec: FormSpec, ctx: FormContext): FormValues {
  const { persona, parent, chosen, params, taskId } = ctx;
  const me = persona.parents[parent];
  const other = persona.parents[otherParent(parent)];
  const fullName = `${me.name} ${me.lastName}`;
  const period = (who: typeof parent, kind: "maternity" | "parental"): DateRange | undefined => {
    const found = chosen?.result.periods[who].find((p) => p.kind === kind);
    return found && { from: found.from, to: toIso(addDays(parseIso(found.to)!, -1)) };
  };
  const paternity = { from: persona.paternityStart, to: toIso(addDays(parseIso(persona.paternityStart)!, params.paternityWeeks * 7 - 1)) };
  const sickLeave = ctx.events.find((event) => event.type === "sickLeave" && event.who === parent);
  const parental = period(parent, "parental");
  const isParental = taskId.startsWith("parental-");

  const known: FormValues = {
    insured_pesel: me.pesel,
    insured_first_name: me.name,
    insured_last_name: me.lastName,
    insured_address: me.address,
    insured_phone: me.phone,
    insured_data: { name: fullName, pesel: me.pesel },
    payer_nip: me.payerNip,
    payer_name: me.payerName,
    payer_data: `${me.payerName}, NIP ${me.payerNip}`,
    bank_account: me.bankAccount,
    employee_name: fullName,
    basis: "1_urodzenie",
    self_employed_sickness_insured: me.contract === "jdg",
    children: persona.birthDate
      ? Array.from({ length: persona.kids }, () => ({ name: persona.childName ?? "", birthDate: persona.birthDate!, birthPlace: persona.birthPlace ?? "" }))
      : [],
    other_parent_data: { name: `${other.name} ${other.lastName}`, pesel: other.pesel },
    used_so_far: parent === "mother" ? "Nie korzystałam dotąd z urlopu rodzicielskiego." : "Nie korzystałem dotąd z urlopu rodzicielskiego.",
    period_relation: "w_okresie_ubezpieczenia",
    period_and_certificate: sickLeave ? { from: sickLeave.date, to: sickLeave.endDate ?? "" } : { from: "", to: "" },
  };
  if (taskId === "maternity-claim") {
    known.scope_maternity = true;
    known.full_leave_declaration = !!persona.wantsAveragedRate;
  }
  if (taskId === "paternity") {
    known.period = paternity;
    known.scope_paternity = paternity;
    known.scope_paternity_part_no = "1";
    known.paternity_other_title = false;
  }
  if (isParental && parental) {
    known.period = parental;
    known.scope_parental = parental;
    known.scope_parental_part_no = "1";
    known.other_parent_uses = !!period(otherParent(parent), "parental");
  }

  return Object.fromEntries(spec.fields.map((field) => [field.key, known[field.key] ?? empty(field)]));
}
