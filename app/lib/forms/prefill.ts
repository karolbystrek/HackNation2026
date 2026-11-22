import { GUIDE_ID } from "@/lib/guide/persona";
import { otherParent, planLeave, type LeavePeriod } from "@/lib/calc/leave";
import { leaveInputFor } from "@/lib/calc/variants";
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
  const guide = persona.id === GUIDE_ID;
  const fullName = guide ? "" : `${me.name} ${me.lastName}`;
  const period = (who: typeof parent, kind: LeavePeriod["kind"]): DateRange | undefined => {
    const found = chosen?.result.periods[who].find((p) => p.kind === kind);
    const end = chosen?.result.periods[who].filter((p) => p.kind === kind).at(-1)?.to;
    return found && end ? { from: found.from, to: toIso(addDays(parseIso(end)!, -1)) } : undefined;
  };
  const fallbackPaternity = !chosen && taskId === "paternity"
    ? planLeave(leaveInputFor(persona, params, 0), params).periods.father.find((item) => item.kind === "paternity")
    : undefined;
  const paternity = period("father", "paternity") ?? (fallbackPaternity
    ? { from: fallbackPaternity.from, to: toIso(addDays(parseIso(fallbackPaternity.to)!, -1)) }
    : { from: "", to: "" });
  const sickLeave = parent === "mother"
    ? ctx.events.find((event) => event.circumstance === "sicknessAfterInsurance") ??
      ctx.events.find((event) => event.type === "sickLeave" && event.who === parent)
    : undefined;
  const parental = period(parent, "parental");
  const isParental = taskId.startsWith("parental-");
  const birth = persona.birthDate ?? persona.dueDate;
  const shift = (date: string, days: number) => toIso(addDays(parseIso(date)!, days));
  const maternity = period("mother", "maternity") ?? { from: birth, to: shift(birth, params.maternityWeeks[Math.min(persona.kids, params.maternityWeeks.length) - 1] * 7 - 1) };
  const placed = persona.childEvents?.some((event) => event === "adoption" || event === "foster_placement");
  const recordedNames = persona.events.find((event) => event.childDetails)?.childDetails?.names;
  const foster = persona.childEvents?.includes("foster_placement");
  const childLastName = persona.childLastName ?? persona.parents.father.lastName;
  const child = { name: `${persona.childName ?? "Dziecko"} ${childLastName}`, birthDate: birth, birthPlace: persona.birthPlace ?? "" };
  const payerText = guide ? "" : `${me.payerName}, NIP ${me.payerNip}`;
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
    insured_first_name: guide ? "" : me.name,
    insured_last_name: me.lastName,
    insured_address: me.address,
    insured_phone: me.phone,
    insured_data: { name: fullName, pesel: me.pesel },
    payer_nip: me.payerNip,
    payer_name: me.payerName,
    payer_data: payerText,
    payer_ids: payerText,
    former_payer: payerText,
    other_parent: { name: guide ? "" : `${other.name} ${other.lastName}`, pesel: other.pesel },
    request_kind: "pierwszorazowy",
    bank_account: me.bankAccount,
    employee_name: fullName,
    basis: foster ? "1_rodzina_zastepcza" : placed ? "1_przysposobienie" : "1_urodzenie",
    self_employed_sickness_insured: me.contract === "jdg",
    children: persona.birthDate && !placed
      ? Array.from({ length: persona.kids }, (_, index) => ({
        name: recordedNames?.[index] ?? (index === 0 ? [persona.childName, persona.childName && persona.childLastName].filter(Boolean).join(" ") : ""), birthDate: persona.birthDate!, birthPlace: persona.birthPlace ?? "",
      }))
      : placed && recordedNames
        ? recordedNames.map((name) => ({ name, birthDate: persona.kids === 1 ? persona.adoptedChildBirthDate ?? "" : "", birthPlace: "" }))
        : [],
    other_parent_data: { name: guide ? "" : `${other.name} ${other.lastName}`, pesel: other.pesel },
    used_so_far: parent === "mother" ? "Nie korzystałam dotąd z urlopu rodzicielskiego." : "Nie korzystałem dotąd z urlopu rodzicielskiego.",
    period_relation: sickLeave?.circumstance === "sicknessAfterInsurance" ? "po_ustaniu" : "w_okresie_ubezpieczenia",
    insurance_end_date: sickLeave?.insuranceEndDate ?? "",
    period_and_certificate: sickLeave ? { from: sickLeave.date, to: sickLeave.endDate ?? "" } : { from: "", to: "" },
  };
  if (["maternity-claim", "averaged-rate", "stillbirth-claim", "conditions-request"].includes(taskId)) {
    known.scope_maternity = true;
    known.full_leave_declaration = (chosen?.result.flatRateApplied ?? !!persona.wantsAveragedRate) && (!persona.birthDate || ctx.today <= shift(persona.birthDate, params.flatRateRequestDays));
  }
  if (taskId === "supplementary-leave" || taskId === "supplementary-check") {
    known.scope_supplementary = period(parent, "supplementary") ?? {
      from: shift(maternity.to, 1),
      to: persona.supplementaryWeeks ? shift(maternity.to, persona.supplementaryWeeks * 7) : "",
    };
  }
  if (taskId === "paternity" || taskId === "paternity-request") {
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
    "lr.maternity_pre_birth": { start_date: chosen?.input.preBirthStartDate ?? "" },
    "ff.zas12": { employment_continues: true },
    "lr.maternity_resign_14w": { return_date: shift(birth, params.motherOnlyWeeks * 7) },
    "lr.maternity_resign_incapacity": { return_date: shift(birth, 56) },
    "lr.maternity_takeover": { children: [child], mother_pre_birth_use: noPreBirth, period: { from: shift(birth, params.motherOnlyWeeks * 7), to: maternity.to } },
    "lr.maternity_mother_hospital": { start_date: shift(birth, 3), mother_pre_birth_use: noPreBirth, notify_discharge: true },
    "lr.maternity_mother_death": { mother_pre_birth_use: noPreBirth, death_date: shift(birth, 2), start_date: shift(birth, 3) },
    "lr.maternity_abandonment": { mother_pre_birth_use: noPreBirth, abandonment_date: shift(birth, 2), start_date: shift(birth, 3) },
    "lr.maternity_uninsured_mother_incapacity": { start_date: birth },
    "lr.maternity_uninsured_mother_works": { start_date: shift(birth, params.motherOnlyWeeks * 7), notify_end_of_employment: true },
    "lr.supplementary_maternity": { maternity_end_date: maternity.to, period: known.scope_supplementary },
    "lr.maternity_conditions": { children: [child], period: { from: birth, to: shift(birth, params.maternityWeeks[0] * 7 - 1) } },
    "lr.combine_parental_with_work": {
      work_fraction: String(working?.workFraction ?? 0.5).replace(".", ","),
      period: working ? { from: working.from, to: toIso(addDays(parseIso(working.to)!, -1)) } : { from: "", to: "" },
      extension_declaration: "Część urlopu wydłużona z powodu pracy też będzie łączona z pracą w tym samym wymiarze.",
    },
    "civil.birth_certificate": {
      copy_kind: "skrocony", copies: "1", child_first_name: persona.childName ?? "", child_last_name: childLastName,
      child_birth_date: persona.birthDate ?? "", child_birth_place: persona.birthPlace ?? "",
      applicant: { name: fullName, pesel: me.pesel }, applicant_address: me.address, legal_interest: "rodzic", delivery: "usc",
    },
  };
  if ((!guide && !ctx.trigger) || spec.id === "civil.birth_certificate") Object.assign(known, extra[spec.id]);
  if (ctx.trigger) {
    const { date, circumstance } = ctx.trigger;
    if (spec.id === "lr.maternity_pre_birth") known.start_date = date;
    if (spec.id === "lr.maternity_resign_14w" || spec.id === "lr.maternity_resign_incapacity") known.return_date = date;
    if (spec.id === "lr.maternity_mother_death") known.death_date = date;
    if (spec.id === "lr.maternity_abandonment") known.abandonment_date = date;
    if (spec.id === "ff.zas33") {
      known.event = circumstance === "motherDeath" ? "smierc_matki" : "porzucenie";
      known.care_from = ctx.trigger.careFrom ?? "";
    }
    if (spec.id === "ff.zas40") {
      known.admitted_on = date;
      known.discharged_on = ctx.trigger.endDate ?? "";
    }
    if (spec.id === "lr.maternity_mother_hospital" || spec.id === "lr.maternity_mother_death" || spec.id === "lr.maternity_abandonment") {
      known.start_date = ctx.trigger.careFrom ?? "";
    }
    if (spec.id === "lr.maternity_takeover" && maternity.to >= date) {
      known.period = { from: date, to: maternity.to };
    }
    if (spec.id === "ff.zas26") {
      known.intake_date = date;
      known.intake_kind = foster ? "rodzina_zastepcza" : "przysposobienie";
    }
    if (spec.id === "ff.zas55") known.maternity_equivalent_from = date;
    if (spec.id === "ff.zas12") {
      known.employment_continues = true;
      known.period = { from: "", to: "" };
    }
  }
  if (spec.id === "lr.maternity_pre_birth") {
    known.start_date = [...ctx.events].reverse().find((event) => event.circumstance === "preBirthLeave")?.date ??
      chosen?.input.preBirthStartDate ?? "";
  }

  return Object.fromEntries(spec.fields.map((field) => [field.key, known[field.key] ?? empty(field)]));
}
