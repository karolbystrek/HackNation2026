import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFCheckBox, PDFDocument, PDFTextField } from "pdf-lib";
import { addDays, formatDate, parseIso, toIso } from "@/lib/dates";
import type { FormContext } from "@/lib/forms/context";
import { isFilled } from "@/lib/forms/rules";
import { ZUS_TEMPLATES, type Child, type DateRange, type FieldValue, type FormValues, type Person } from "@/lib/forms/spec";

// Interactive ZUS templates from zus.pl ("wypełnij i wydrukuj" / "do zapisu"), stored in app/assets/zus-forms.
const ASSETS = path.join(process.cwd(), "assets");
export const hasZusPdf = (specId: string) => specId in ZUS_TEMPLATES;

/** "2:Okres" = topmostSubform[0].Page2[0].Okres[0]; "4:Miesiac[5]" keeps its own index. */
type Fill = Record<string, string | boolean | undefined>;

const text = (v: FieldValue | undefined) => (typeof v === "string" ? v.trim() : "");
const date = (v: FieldValue | string | undefined) => (typeof v === "string" && v ? formatDate(v) : "");
const range = (v: FieldValue | undefined) => {
  const r = v as DateRange | undefined;
  return r?.from ? `${formatDate(r.from)} – ${r.to ? formatDate(r.to) : ""}` : "";
};
const digits = (v: string) => v.replace(/\D/g, "");
const children = (v: FieldValue | undefined) =>
  ((v as Child[] | undefined) ?? []).map((c) => `${c.name}, ur. ${formatDate(c.birthDate)}${c.birthPlace ? ` w ${c.birthPlace}` : ""}`).join("; ");
const person = (v: FieldValue | undefined) => {
  const p = v as Person | undefined;
  return p?.name ? `${p.name}${p.pesel ? `, PESEL ${p.pesel}` : ""}` : "";
};

function parseAddress(address: string) {
  const m = /^(?:ul\.\s*)?(.+?)\s+(\d+\w*)(?:\/(\w+))?,\s*(\d{2}-\d{3})\s+(.+)$/.exec(address.trim());
  return m ? { street: m[1], house: m[2], flat: m[3] ?? "", postcode: m[4], city: m[5] } : { street: address, house: "", flat: "", postcode: "", city: "" };
}

function fills(specId: string, values: FormValues, ctx: FormContext): Fill {
  const me = ctx.persona.parents[ctx.parent];
  const insured = (values.insured_data as Person | undefined) ?? { name: `${me.name} ${me.lastName}`, pesel: me.pesel };
  const [first, ...rest] = insured.name.split(" ");
  const last = rest.join(" ");
  const addr = parseAddress(text(values.insured_address) || me.address);
  const today = formatDate(ctx.today);
  const account = digits(text(values.bank_account));
  const birth = ctx.persona.birthDate ?? ctx.persona.dueDate;
  const maternity = ctx.chosen?.result.periods.mother.find((p) => p.kind === "maternity");
  // Without a chosen variant the maternity period is the statutory length from the birth date.
  const maternityEnd = maternity ? toIso(addDays(parseIso(maternity.to)!, -1)) : toIso(addDays(parseIso(birth)!, ctx.params.maternityWeeks[ctx.persona.kids - 1] * 7 - 1));
  const maternityRange = `${formatDate(maternity?.from ?? birth)} – ${formatDate(maternityEnd)}`;
  const yesNo = (key: string, yes: string, no: string): Fill => ({ [yes]: values[key] === true, [no]: values[key] !== true });
  const address = (p: number, suffix = ""): Fill => ({
    [`${p}:Ulica${suffix}`]: addr.street, [`${p}:Numerdomu${suffix}`]: addr.house, [`${p}:Numerlokalu${suffix}`]: addr.flat,
    [`${p}:Kodpocztowy${suffix}`]: addr.postcode, [`${p}:Poczta${suffix}`]: addr.city,
  });
  const payer = (p: number, nip = "NIP", name = "Nazwaplatnika"): Fill => ({ [`${p}:${nip}`]: me.payerNip, [`${p}:${name}`]: me.payerName });

  switch (specId) {
    case "ff.zam": {
      const basis = text(values.basis);
      const situation = text(values.mother_situation);
      const supplementary = text(values.supplementary_category);
      const reason = text(values.employer_end_reason);
      const otherData = (values.other_parent_data as Person | undefined) ?? { name: "", pesel: "" };
      const [otherFirst, ...otherLast] = otherData.name.split(" ");
      return {
        "1:PESEL": text(values.insured_pesel), "1:Imie": text(values.insured_first_name), "1:Nazwisko": text(values.insured_last_name),
        ...address(1), "1:Numertelefonu": text(values.insured_phone),
        "1:NIP": digits(text(values.payer_nip)), "1:REGON": digits(text(values.payer_regon)), "1:PESEL_1": digits(text(values.payer_pesel)),
        "1:Nazwaplatnika": text(values.payer_name),
        "2:Numerrachunku": account,
        "2:macierzynskiego": values.scope_maternity === true, "2:Okres": values.scope_maternity === true ? maternityRange : "",
        "2:rodzicielskiego": isFilled(values.scope_parental), "2:Okres2": range(values.scope_parental), "2:czesc": text(values.scope_parental_part_no),
        "2:uzMacierzynskiego": isFilled(values.scope_supplementary), "2:Okres3": range(values.scope_supplementary),
        "2:ojcowskiego": isFilled(values.scope_paternity), "2:Okres4": range(values.scope_paternity), "2:Numerlokalu2": text(values.scope_paternity_part_no),
        "2:Data2": date(values.maternity_end_date),
        "2:informuje": values.full_leave_declaration === true,
        ...(me.contract === "jdg" ? yesNo("self_employed_sickness_insured", "2:TAK", "2:NIE") : {}),
        "2:ZaznaczX1a": basis === "1_urodzenie", "2:ZaznaczX1b": basis === "1_przysposobienie", "2:ZaznaczX1c": basis === "1_rodzina_zastepcza",
        "2:Data": date(values.intake_date),
        "3:Tekst1": basis.startsWith("1") ? children(values.children) : "",
        "3:ZaznaczX1": basis.startsWith("1") && isFilled(values.za_zyciem_children), "3:podajimie1": basis.startsWith("1") ? text(values.za_zyciem_children) : "",
        "3:_2": basis.startsWith("2"), "3:Data2a": date(values.expected_birth_date),
        "3:_3": basis.startsWith("3"), "3:upadlosc": reason === "upadlosc", "3:likwidacje": reason === "likwidacja",
        "3:rozwiazal": reason === "naruszenie_prawa_wyrok", "3:zmarl": reason === "smierc_pracodawcy",
        "3:Tekst13B": basis.startsWith("3") ? children(values.children) : "",
        "3:_4": basis.startsWith("4"), "3:skroceniem": supplementary === "przed_28_tyg", "3:przerwaniem4A": supplementary === "masa_do_1000g",
        "3:przerwaniem4B": supplementary === "28_37_tyg_masa_powyzej_1000g", "3:podjeciem": supplementary === "po_37_tyg_szpital_2_dni_od_5_do_28_dnia",
        "3:Tekst4a": range(values.child_hospital_period),
        "4:_5": basis.startsWith("5"), "4:Tekst13": person(values.mother_data),
        "4:skroceniem": situation === "skrocenie_po_14_tyg", "4:przerwaniem4A": situation === "przerwa_szpital_po_8_tyg",
        "4:przerwaniem4B": situation === "przerwa_orzeczenie_po_8_tyg", "4:podjeciem": situation === "praca_matki_min_pol_etatu",
        "4:porzuceniem": situation === "porzucenie", "4:smiercia": situation === "smierc_matki", "4:Data5": date(values.mother_situation_date),
        "4:Tekst4b": basis.startsWith("5") ? children(values.children) : "",
        "5:_6": basis.startsWith("6"), "5:mnie5": values.discharge === "mnie", "5:dziecka5": values.discharge === "dziecka",
        ...(isFilled(values.scope_parental) || isFilled(values.scope_supplementary) ? yesNo("other_parent_uses", "5:TAK2", "5:NIE2") : {}),
        "5:PESEL": otherData.pesel, "5:Imie": otherFirst, "5:Nazwisko": otherLast.join(" "),
        "5:Data": today,
      };
    }
    case "ff.zas53":
      return {
        "1:PESEL": insured.pesel, "1:Imie": first, "1:Nazwisko": last, ...address(1), "1:Numertelefonu": me.phone, ...payer(1),
        "2:Numerrachunku": account, "2:Tekst": range(values.period_and_certificate),
        "2:wniosek1A": values.period_relation === "w_okresie_ubezpieczenia", "2:wniosek1B": values.period_relation === "po_ustaniu",
        "2:Data": date(values.insurance_end_date), "2:TAK_5": isFilled(values.accident), "2:NIE_5": !isFilled(values.accident), "2:Tekst5": text(values.accident),
        "2:Data2": today,
      };
    case "ff.zas55":
      return {
        "1:WWYSOKOSCI": isFilled(values.maternity_equivalent_from), "1:WYROWNAWCZY": isFilled(values.equalising_period),
        "1:PESEL": insured.pesel, "1:Imię": first, "1:Nazwisko": last, ...address(1), "1:Numertelefonu": me.phone,
        ...payer(2), "2:Numerrachunku": account, "2:Data1": date(values.maternity_equivalent_from),
        "2:Zakres1A": values.other_employment === "nie_zapewniono", "2:Zakres1B": values.other_employment === "zapewniono",
        "2:Data2": date((values.equalising_period as DateRange | undefined)?.from), "2:Data3": date((values.equalising_period as DateRange | undefined)?.to),
        "2:Data4": today,
      };
    case "ff.zas23": {
      const reason = text(values.reason);
      const reasons = ["powrot_do_pracy_po_14_tyg", "moj_pobyt_w_szpitalu_po_8_tyg", "pobyt_dziecka_w_szpitalu_po_8_tyg", "orzeczenie_po_8_tyg", "oddanie_dziecka_do_przysposobienia", "powrot_ojca_po_wypisie_matki"];
      return {
        "1:Imię": first, "1:Nazwisko": last, ...address(1), "1:Numertelefonu": me.phone, "1:PESEL2": insured.pesel, "1:NIP": me.payerNip,
        "2:Nazwapłatnika": me.payerName, "2:Data": date(values.stop_from), "2:Tekst1": maternityRange,
        ...Object.fromEntries(reasons.map((r, i) => [`2:ZaznaczX${i + 1}`, reason === r])),
        "2:Tekst2": reason === "oddanie_dziecka_do_przysposobienia" ? children(values.children) : "", "2:Data2": today,
      };
    }
    case "ff.zas26":
      return {
        "1:PESEL": insured.pesel, "1:Imię": first, "1:Nazwisko": last, "1:Ulica": addr.street, "1:Numerdomu": addr.house, "1:Numerlokalu": addr.flat,
        "1:Kodpocztowy": addr.postcode, "1:Miejscowość": addr.city, "1:Numertelefonu": me.phone, "1:NIP": me.payerNip, "1:Nazwapłatnika": me.payerName,
        "2:oswiadczenie1": values.intake_kind === "rodzina_zastepcza", "2:Data1": values.intake_kind === "rodzina_zastepcza" ? date(values.intake_date) : "",
        "2:oswiadczenie2": values.intake_kind === "przysposobienie", "2:Data2": values.intake_kind === "przysposobienie" ? date(values.court_filing_date) : "",
        "2:Tekst1": children(values.children), "2:Data3": today,
      };
    case "ff.zas33":
      return {
        "1:PESEL": insured.pesel, "1:Imię": first, "1:Nazwisko": last, "1:Ulica": addr.street, "1:Numerdomu": addr.house, "1:Numerlokalu": addr.flat,
        "1:Kodpocztowy": addr.postcode, "1:Miejscowość": addr.city, "1:Numertelefonu": me.phone, "1:NIP": me.payerNip, "1:Nazwapłatnika": me.payerName,
        "2:oswiadczenie1": values.event === "porzucenie", "2:oswiadczenie2": values.event === "smierc_matki",
        "2:Data[1]": date(values.event_date), "2:Data2": date(values.care_from), "2:Tekst1": children(values.children), "2:Data[0]": today,
      };
    case "ff.z10": {
      const sick = ctx.events.find((e) => e.type === "sickLeave" && e.who === ctx.parent);
      return {
        "1:PESEL": insured.pesel, "1:Imie": first, "1:Nazwisko": last, ...address(1), "1:Numertelefonu": me.phone, ...payer(1),
        "2:Numerrachunku": account,
        "2:zasilekchorobowy": values.claim === "zasilek_chorobowy", "2:Tekst": values.claim === "zasilek_chorobowy" && sick ? `${formatDate(sick.date)} – ${sick.endDate ? formatDate(sick.endDate) : ""}` : "",
        "2:swiadczenierehab": values.claim === "swiadczenie_rehabilitacyjne",
        ...yesNo("pension_rights", "2:TAK1", "2:NIE1"), ...yesNo("pension_applications", "2:TAK3", "2:NIE3"),
        ...yesNo("unemployment_rights", "2:TAK4", "2:NIE4"), ...yesNo("pup_benefits", "3:TAK6", "3:NIE6"),
        "4:Tekst1": text(values.earning_activity), "4:Data": today,
      };
    }
    case "ff.znp7":
      return {
        "1:ZaznaczXpierwszorazowy": values.request_kind === "pierwszorazowy", "1:ZaznaczXkontynuacja": values.request_kind === "kontynuacja",
        "1:PESEL": insured.pesel, "1:Imię": first, "1:Nazwisko": last, ...address(1), "1:Numertelefonu": me.phone, "1:Numerrachunku": account,
        "1:Oswiadczenie1": values.cause === "ogolny_stan_zdrowia", "1:Oswiadczenie2": values.cause === "wypadek_przy_pracy", "1:Oswiadczenie3": values.cause === "choroba_zawodowa",
        "2:Data": today, ...payer(3),
      };
    case "ff.zas2": {
      const incapacity = values.incapacity_in_pregnancy as DateRange | undefined;
      return {
        "1:PESEL": insured.pesel, "1:Imię": first, "1:Nazwisko": last, ...address(1),
        "1:_1": !!incapacity?.from, "1:Dataoddo": range(incapacity),
        "1:_2": values.pregnant_last_employment_day === true,
        "1:_3": isFilled(values.expected_birth_date), "1:Data2": date(values.expected_birth_date),
        "1:Data3": today,
      };
    }
    case "ff.z3": {
      const benefits = (values.benefit_type_period as string[] | undefined) ?? [];
      // Salary rows written by prefill as "MM.RRRR: 6 000 zł brutto", one per line.
      const rows = text(values.salary_monthly).split("\n").map((line) => /^(\d{2})\.(\d{4}):\s*([\d\s ]+)/.exec(line.trim())).filter((m) => m !== null);
      const salary: Fill = {};
      // The template numbers its 12 table rows 7-11, then 0-6, from the top.
      const order = [7, 8, 9, 10, 11, 0, 1, 2, 3, 4, 5, 6];
      rows.slice(0, 12).forEach(([, month, year, amount], row) => {
        const i = order[row];
        Object.assign(salary, {
          [`4:ROK[${i}]`]: year, [`4:Miesiac[${i * 5}]`]: month,
          [`4:Podstawawymiaru[${i}]`]: `${digits(amount)},00`, [`4:Miesiac[${i * 5 + 4}]`]: "13,71",
        });
      });
      return {
        "1:pierwszywniosek": values.request_kind === "pierwszorazowy", "1:wniosekkontynuacja": values.request_kind === "kontynuacja",
        ...payer(1), "1:PESEL2": insured.pesel, "1:Imie": first, "1:Nazwisko": last, ...address(2, "2"), "2:Numerrachunku": account,
        "2:_1": benefits.includes("chorobowy"), "2:_2": benefits.includes("opiekunczy"),
        "2:_3": benefits.includes("macierzynski"), "2:Tekstzm": benefits.includes("macierzynski") ? maternityRange : "",
        "2:zasilekwwysokosci": benefits.includes("w_wysokosci_macierzynskiego"), "2:zasilekwyrownawczy": benefits.includes("wyrownawczy"),
        "2:_4": benefits.includes("rehabilitacyjne"),
        "3:A6": isFilled(values.granted_leaves), "3:Tekst6": text(values.granted_leaves),
        ...yesNo("temporary_work", "3:TAK_2", "3:NIE_2"), ...yesNo("work_abroad", "3:TAK_3", "3:NIE_3"),
        "3:UCHpodlega": `od ${formatDate(me.insuredFrom)}`, "3:UZpodlega": "pełny etat", "3:Podajdate": formatDate(me.insuredFrom),
        "3:Tekst1": children(values.children), "3:Tekst2": person(values.other_parent),
        ...salary,
      };
    }
    case "ff.z3a":
      return {
        "1:pierwszywniosek": true, ...payer(1), "1:PESEL2": insured.pesel, "1:Imie": first, "1:Nazwisko": last,
        ...address(2, "2"), "2:Numerrachunku": account,
        "2:_3": true, "2:Tekstzm": maternityRange,
        "2:Dane_tekst": children(values.children), "3:dane_2tekst": person(values.other_parent),
        "3:Informacje1A": true, "3:UCHpodlega": text(values.sickness_insurance_periods), "3:Informacje3NIE": true,
      };
    default:
      return {};
  }
}

/** Fills the official ZUS PDF with the application values; fields stay editable in the browser's PDF viewer. */
export async function fillZusPdf(specId: string, values: FormValues, ctx: FormContext): Promise<Uint8Array> {
  const [template, fontBytes] = await Promise.all([
    readFile(path.join(ASSETS, "zus-forms", `${ZUS_TEMPLATES[specId]}.pdf`)),
    readFile(path.join(ASSETS, "fonts", "LiberationSans-Regular.ttf")),
  ]);
  const pdf = await PDFDocument.load(template);
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(fontBytes, { subset: false });
  const form = pdf.getForm();
  // The templates also carry an XFA layer that viewers would prefer over the filled AcroForm fields.
  form.deleteXFA();

  for (const [key, value] of Object.entries(fills(specId, values, ctx))) {
    const [page, name] = key.split(":");
    const field = form.getFieldMaybe(`topmostSubform[0].Page${page}[0].${name.includes("[") ? name : `${name}[0]`}`);
    if (!field || value === undefined || value === "" || value === false) continue;
    if (field instanceof PDFCheckBox && value === true) field.check();
    if (field instanceof PDFTextField && typeof value === "string") {
      const max = field.getMaxLength();
      // Comb fields (PESEL, dates, account) take one character per box without separators.
      field.setText(max ? value.replace(/[^0-9A-Za-z]/g, "").slice(0, max) : value.toLocaleUpperCase("pl-PL"));
    }
  }
  form.updateFieldAppearances(font);
  return pdf.save();
}
