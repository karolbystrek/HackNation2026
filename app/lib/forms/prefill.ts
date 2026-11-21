import { otherParent } from "@/lib/calc/leave";
import { addDays, formatDate, parseIso, toIso } from "@/lib/dates";
import { formatPln } from "@/lib/format";
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
  const birth = persona.birthDate ?? persona.dueDate;
  const shift = (date: string, days: number) => toIso(addDays(parseIso(date)!, days));
  const maternity = period("mother", "maternity") ?? { from: birth, to: shift(birth, params.maternityWeeks[persona.kids - 1] * 7 - 1) };
  const child = { name: `${persona.childName ?? "Dziecko"} ${persona.parents.father.lastName}`, birthDate: birth, birthPlace: persona.birthPlace ?? "" };
  const payerText = `${me.payerName}, NIP ${me.payerNip}`;
  // Twelve calendar months before the birth month, oldest first, matching monthlyGross.
  const months = me.monthlyGross.map((gross, i) => {
    const d = parseIso(birth)!;
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - me.monthlyGross.length + i);
    return `${String(d.getUTCMonth() + 1).padStart(2, "0")}.${d.getUTCFullYear()}: ${formatPln(gross)} brutto`;
  }).join("\n");
  const hospital = "Szpital Miejski, Oddział Położniczy";
  const noPreBirth = "Matka nie korzystała z urlopu macierzyńskiego przed porodem.";
  const working = chosen?.result.periods[parent].find((p) => p.kind === "parental" && p.workFraction > 0);

  const known: FormValues = {
    insured_pesel: me.pesel,
    insured_first_name: me.name,
    insured_last_name: me.lastName,
    insured_address: me.address,
    insured_phone: me.phone,
    insured_data: { name: fullName, pesel: me.pesel },
    payer_nip: me.payerNip,
    payer_name: me.payerName,
    payer_data: payerText,
    payer_ids: payerText,
    former_payer: payerText,
    other_parent: { name: `${other.name} ${other.lastName}`, pesel: other.pesel },
    request_kind: "pierwszorazowy",
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

  // Demo answers for the employer, doctor and special-situation forms listed as extra timeline steps.
  const sickPay = me.sickLeaveFrom ? `Od ${formatDate(me.sickLeaveFrom)}, ${params.employerPaidDays} dni w roku` : "Nie wypłacano";
  const extra: Record<string, FormValues> = {
    "ff.zas2": {
      facility_stamp: "Przychodnia Ginekologiczno-Położnicza, ul. Zdrowa 1",
      expected_birth_date: persona.dueDate,
      incapacity_in_pregnancy: me.sickLeaveFrom ? { from: me.sickLeaveFrom, to: shift(persona.dueDate, -1) } : { from: "", to: "" },
    },
    "ff.z3": {
      benefit_type_period: ["macierzynski"],
      employment_fte: `Pełny etat od ${formatDate(me.insuredFrom)}`,
      sick_pay_periods: sickPay,
      payer_size: "do_20",
      salary_monthly: months,
      granted_leaves: `Urlop macierzyński od ${formatDate(maternity.from)} do ${formatDate(maternity.to)}`,
    },
    "ff.z3a": {
      insurance_title: "Umowa zlecenia",
      sickness_insurance_periods: `Od ${formatDate(me.insuredFrom)} do nadal`,
      payer_size: "12",
      income_monthly: months,
      benefit_type_period: `Zasiłek macierzyński od ${formatDate(maternity.from)}`,
    },
    "ff.zas15": {
      granted_leave: `Urlop ojcowski od ${formatDate(paternity.from)} do ${formatDate(paternity.to)}`,
    },
    "ff.zas24": {
      recipient_role: "matka",
      entitled_period_rate: `Od ${formatDate(maternity.from)} do ${formatDate(maternity.to)}, 100%`,
      paid_period: { from: maternity.from, to: shift(birth, params.motherOnlyWeeks * 7 - 1) },
    },
    "ff.zas23": { stop_from: shift(birth, params.motherOnlyWeeks * 7), reason: "powrot_do_pracy_po_14_tyg" },
    "ff.zas40": { facility_stamp: hospital, admitted_on: birth, discharged_on: shift(birth, 5) },
    "ff.zas33": { event: "smierc_matki", care_from: birth, children: [child] },
    "ff.zas26": { intake_date: birth, intake_kind: "rodzina_zastepcza", children: [child] },
    "ff.zas55": { maternity_equivalent_from: me.sickLeaveFrom ?? persona.dueDate, other_employment: "nie_zapewniono" },
    "ff.z10": { claim: "zasilek_chorobowy", earning_activity: "Nie prowadzę działalności ani gospodarstwa rolnego." },
    "ff.znp7": { cause: "ogolny_stan_zdrowia", pension_and_benefits: "Nie pobieram emerytury, renty ani zasiłku dla bezrobotnych." },
    "lr.maternity_pre_birth": { start_date: shift(persona.dueDate, -14) },
    "lr.maternity_resign_14w": { return_date: shift(birth, params.motherOnlyWeeks * 7) },
    "lr.maternity_resign_incapacity": { return_date: shift(birth, 56) },
    "lr.maternity_takeover": { children: [child], mother_pre_birth_use: noPreBirth, period: { from: shift(birth, params.motherOnlyWeeks * 7), to: maternity.to } },
    "lr.maternity_mother_hospital": { start_date: shift(birth, 3), mother_pre_birth_use: noPreBirth, notify_discharge: true },
    "lr.maternity_mother_death": { mother_pre_birth_use: noPreBirth, death_date: shift(birth, 2), start_date: shift(birth, 3) },
    "lr.maternity_abandonment": { mother_pre_birth_use: noPreBirth, abandonment_date: shift(birth, 2), start_date: shift(birth, 3) },
    "lr.maternity_uninsured_mother_incapacity": { start_date: birth },
    "lr.maternity_uninsured_mother_works": { start_date: shift(birth, params.motherOnlyWeeks * 7), notify_end_of_employment: true },
    "lr.supplementary_maternity": { maternity_end_date: maternity.to, period: { from: shift(maternity.to, 1), to: shift(maternity.to, 4 * 7) } },
    "lr.maternity_conditions": { children: [child], period: { from: birth, to: shift(birth, params.maternityWeeks[0] * 7 - 1) } },
    "lr.combine_parental_with_work": {
      work_fraction: String(working?.workFraction ?? 0.5).replace(".", ","),
      period: working ? { from: working.from, to: toIso(addDays(parseIso(working.to)!, -1)) } : { from: "", to: "" },
      extension_declaration: "Część urlopu wydłużona z powodu pracy też będzie łączona z pracą w tym samym wymiarze.",
    },
    "civil.birth_certificate": {
      copy_kind: "skrocony", copies: "1", child_first_name: persona.childName ?? "", child_last_name: persona.parents.father.lastName,
      child_birth_date: persona.birthDate ?? "", child_birth_place: persona.birthPlace ?? "",
      applicant: { name: fullName, pesel: me.pesel }, applicant_address: me.address, legal_interest: "rodzic", delivery: "usc",
    },
  };
  Object.assign(known, extra[spec.id]);

  return Object.fromEntries(spec.fields.map((field) => [field.key, known[field.key] ?? empty(field)]));
}
