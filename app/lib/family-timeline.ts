import { formatDate, shiftIso } from "@/lib/dates";
import type { EventWho, TimelineEvent } from "@/lib/events";
import type { Variant } from "@/lib/calc/variants";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

type Kind = "event" | "document" | "application" | "period";
type Status = "confirmed" | "planned" | "blocked" | "ready" | "completed" | "late" | "active" | "ended" | "review";

type Entry = {
  id: string;
  kind: Kind;
  who: EventWho;
  title: string;
  description: string;
  date: string;
  due?: string;
  end?: string | null;
  completedOn?: string;
  requires?: string[];
  estimated?: boolean;
  dateNote?: string;
  review?: boolean;
  decision?: boolean;
  recipient?: string;
  guide?: string;
  /** Knowledge-base spec of the application the user can fill in (form_fields or leave_requests id). */
  form?: string;
  /** Situational or third-party form, listed for completeness; it never counts as an open task. */
  extra?: boolean;
};

export type FamilyTimelineEntry = Entry & { status: Status };

export function timelineDate(entry: FamilyTimelineEntry) {
  return entry.completedOn ?? entry.due ?? entry.date;
}

export function buildFamilyTimeline(persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params, doneTasks: string[], today: string): FamilyTimelineEntry[] {
  const birth = persona.birthDate ?? persona.dueDate;
  const birthEvent = persona.events.find((event) => event.type === "birth")!;
  const birthId = `event-${birthEvent.id}`;
  const provisional = !persona.birthDate;
  const { birthCardDate, birthRegistrationDate, birthCertificateDate, parents } = persona;
  const cardDate = birthCardDate ?? birth;
  const rateDeadline = persona.wantsAveragedRate && (chosen?.result.flatRateAllowed ?? true)
    ? shiftIso(birth, params.flatRateRequestDays) : undefined;
  const entries: Entry[] = events.map((event) => ({
    ...event,
    id: `event-${event.id}`,
    kind: "event",
    end: event.endDate === undefined && event.type === "sickLeave" ? null : event.endDate,
    estimated: event.id === birthEvent.id && provisional,
  }));

  entries.push(
    {
      id: "birth-card", kind: "document", who: "both", title: "Karta urodzenia",
      description: "Placówka medyczna przekazuje kartę urodzenia do USC.",
      date: cardDate, completedOn: birthCardDate, requires: [birthId], dateNote: birthCardDate ? undefined : "Po porodzie",
    },
    {
      id: "birth-registration", kind: "application", who: "both", title: "Zgłoszenie urodzenia",
      description: "Zgłoszenie umożliwia USC sporządzenie aktu urodzenia. Wystarczy zgłoszenie jednego rodzica.",
      date: cardDate, due: shiftIso(cardDate, 21), recipient: "Urząd stanu cywilnego",
      guide: "https://www.gov.pl/web/gov/zglos-urodzenie-dziecka",
      completedOn: birthRegistrationDate, requires: ["birth-card"], estimated: !birthCardDate,
    },
    {
      id: "birth-certificate", kind: "document", who: "both", title: "Akt urodzenia dziecka",
      description: "ZUS może pobrać akt z rejestru. Skrócony odpis jest potrzebny m.in. do wniosków urlopowych u pracodawcy.",
      date: birthRegistrationDate ?? cardDate, completedOn: birthCertificateDate,
      requires: ["birth-registration"], dateNote: birthCertificateDate ? undefined : "Po zgłoszeniu do USC",
    },
    {
      id: "birth-certificate-copy", kind: "application", who: "both", title: "Wniosek o odpis aktu urodzenia",
      description: "Odpis skrócony dołączasz do wniosków urlopowych u pracodawcy. Wniosek złożysz przez gov.pl.",
      date: birthCertificateDate ?? birthRegistrationDate ?? cardDate, recipient: "Urząd stanu cywilnego",
      guide: "https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-urodzenia", requires: ["birth-certificate"],
      estimated: !birthCertificateDate, form: "civil.birth_certificate",
    },
    {
      id: "maternity-claim", kind: "application", who: "mother",
      title: parents.mother.contract === "uop" ? "Dokumenty do wypłaty zasiłku macierzyńskiego" : "Wniosek o zasiłek macierzyński (ZAM)",
      description: parents.mother.contract === "uop"
        ? "Po porodzie urlop macierzyński rozpoczyna się z mocy prawa. Ten krok dotyczy wypłaty zasiłku."
        : rateDeadline
          ? "ZUS pobiera akt z rejestru. Podany termin dotyczy wyboru stawki 81,5% we wniosku ZAM."
          : "Złóż wniosek o zasiłek. ZUS pobiera akt urodzenia z rejestru na podstawie danych dziecka i rodzica.",
      date: birth, due: rateDeadline, estimated: provisional, requires: ["birth-certificate"],
      recipient: parents.mother.contract === "jdg" ? "ZUS" : "Płatnik składek",
      guide: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski",
      form: parents.mother.contract === "uop" ? undefined : "ff.zam",
    },
  );

  if (parents.mother.contract === "jdg" && parents.mother.sickLeaveFrom) {
    const sickLeave = events.find((event) => event.type === "sickLeave" && event.who === "mother");
    if (sickLeave) entries.push({
      id: "sickness-claim", kind: "application", who: "mother", title: "Wniosek o zasiłek chorobowy (ZAS-53)",
      description: "Wniosek dotyczy zwolnienia w ciąży wystawionego przed porodem.",
      date: sickLeave.date, recipient: "ZUS", guide: "https://www.zus.pl/-/zaswiadczenie-zas-53", form: "ff.zas53", requires: [`event-${sickLeave.id}`],
    });
  }

  entries.push(
    {
      id: "paternity", kind: "application", who: "father", title: "Wniosek o urlop ojcowski",
      description: `Złóż co najmniej ${params.paternityRequestDays} dni przed planowanym startem (${formatDate(persona.paternityStart)}).`,
      date: birth, due: shiftIso(persona.paternityStart, -params.paternityRequestDays), estimated: provisional,
      recipient: "Pracodawca", requires: ["birth-certificate"],
      guide: "https://www.gov.pl/web/rodzina/urlop-ojcowski",
      form: parents.father.contract === "uop" ? "lr.paternity" : "ff.zam",
    },
    {
      id: "paternity-period", kind: "period", who: "father", title: "Urlop ojcowski",
      description: "Może przypadać w tym samym czasie co urlop macierzyński.",
      date: persona.paternityStart, end: shiftIso(persona.paternityStart, params.paternityWeeks * 7 - 1),
      requires: ["paternity"], estimated: provisional,
    },
  );

  const maternity = chosen?.result.periods.mother.find((period) => period.kind === "maternity");
  if (maternity) entries.push({
    id: "maternity-period", kind: "period", who: "mother",
    title: parents.mother.contract === "uop" ? "Urlop macierzyński" : "Okres zasiłku macierzyńskiego",
    description: "Rozpoczęcie okresu wynika z daty porodu.",
    date: maternity.from, end: shiftIso(maternity.to, -1), estimated: provisional, requires: [birthId],
  });

  // The example cases use one parental period per parent.
  for (const parent of ["mother", "father"] as const) {
    const period = chosen?.result.periods[parent].find((item) => item.kind === "parental");
    if (!period) continue;
    const id = `parental-${parent}`;
    const employee = parents[parent].contract === "uop";
    const due = shiftIso(period.from, employee ? -params.parentalRequestDays : -1);
    const review = !!persona.completedSteps?.[id] && chosen?.key !== persona.initialVariant;
    entries.push(
      {
        id, kind: "application", who: parent,
        title: employee ? "Wniosek o urlop rodzicielski" : "Wniosek o zasiłek za okres rodzicielskiego (ZAM)",
        description: `Planowany start: ${formatDate(period.from)}. Podaj, kiedy drugi rodzic korzysta z rodzicielskiego.`,
        date: birth, due, recipient: employee ? "Pracodawca" : "ZUS",
        guide: employee ? "https://www.gov.pl/web/rodzina/urlop-rodzicielski" : "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski",
        requires: ["birth-certificate"], estimated: provisional, review,
        form: employee ? "lr.parental" : "ff.zam",
      },
      ...(employee && period.workFraction > 0 ? [{
        id: `combine-${parent}`, kind: "application" as const, who: parent, title: "Wniosek o łączenie urlopu rodzicielskiego z pracą",
        description: `Wybrany wariant zakłada pracę na ${Math.round(period.workFraction * 100)}% etatu w czasie urlopu rodzicielskiego.`,
        date: birth, due, recipient: "Pracodawca", guide: "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
        requires: [id], estimated: provisional, form: "lr.combine_parental_with_work",
      }] : []),
      {
        id: `${id}-period`, kind: "period", who: parent,
        title: employee ? "Urlop rodzicielski" : "Okres zasiłku za rodzicielski",
        description: "Termin wynika z wybranego podziału opieki.",
        date: period.from, end: shiftIso(period.to, -1), requires: [id], estimated: provisional,
      },
    );
  }

  // Other ZUS forms: filled by the employer, a doctor, or only in special situations.
  const payerOfBenefit = parents.mother.contract === "uop" && parents.mother.payer.includes("ponad 20") ? "Płatnik składek" : "ZUS";
  const afterMandatoryWeeks = shiftIso(birth, params.motherOnlyWeeks * 7);
  const situational = "Tylko w szczególnej sytuacji";
  const extras: [form: string, who: EventWho, title: string, description: string, date: string, recipient: string, dateNote?: string][] = [
    ["ff.zas2", "mother", "Zaświadczenie lekarskie w związku z ciążą (ZAS-2)", "Wystawia lekarz prowadzący ciążę. Potwierdza przewidywaną datę porodu i niezdolność do pracy w ciąży.", shiftIso(persona.dueDate, -42), "ZUS"],
    ["ff.z3", "mother", "Zaświadczenie płatnika składek (Z-3)", "Wypełnia pracodawca, który zgłasza do 20 osób. ZUS wylicza z niego zasiłek pracownika.", birth, "ZUS"],
    ["ff.z3a", "mother", "Zaświadczenie płatnika składek (Z-3a)", "Wypełnia zleceniodawca, który zgłasza do 20 osób, gdy zasiłek dostaje zleceniobiorca.", birth, "ZUS"],
    ["ff.zas15", "father", "Zaświadczenie płatnika o urlopie (ZAS-15)", "Pracodawca potwierdza udzielony urlop macierzyński, rodzicielski albo ojcowski.", persona.paternityStart, "ZUS"],
    ["ff.zas24", "mother", "Zaświadczenie o okresach zasiłku macierzyńskiego (ZAS-24)", "Wydaje płatnik zasiłku. Drugi rodzic dołącza je do swojego wniosku.", afterMandatoryWeeks, "ZUS"],
    ["ff.zas23", "mother", "Wniosek o skrócenie wypłaty zasiłku macierzyńskiego (ZAS-23)", "Gdy mama po 14 tygodniach wraca do pracy, a resztę zasiłku przejmuje tata.", afterMandatoryWeeks, payerOfBenefit, situational],
    ["ff.zas40", "mother", "Zaświadczenie o pobycie matki w szpitalu (ZAS-40)", "Wystawia szpital, gdy mama jest w szpitalu i opiekę nad dzieckiem przejmuje tata.", birth, payerOfBenefit, situational],
    ["ff.zas33", "father", "Oświadczenie o porzuceniu dziecka przez matkę lub o śmierci matki (ZAS-33)", "Tata składa je, gdy przejmuje zasiłek macierzyński po mamie.", birth, payerOfBenefit, situational],
    ["ff.zas26", "mother", "Oświadczenie o przyjęciu dziecka na wychowanie (ZAS-26)", "Przy adopcji albo przyjęciu dziecka jako rodzina zastępcza.", birth, payerOfBenefit, situational],
    ["ff.zas55", "mother", "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego (ZAS-55)", "Gdy pracodawca ogłosi upadłość albo likwidację w czasie ciąży.", birth, "ZUS", situational],
    ["ff.z10", "mother", "Oświadczenie do zasiłku po ustaniu ubezpieczenia (Z-10)", "Gdy umowa skończyła się, a zwolnienie lekarskie trwa dalej.", birth, "ZUS", situational],
    ["ff.znp7", "mother", "Wniosek o świadczenie rehabilitacyjne (ZNp-7)", "Gdy po wyczerpaniu zasiłku chorobowego potrzebne jest dalsze leczenie.", birth, "ZUS", situational],
    // Leave requests to the employer for special situations (rozporządzenie MRiPS z 11.03.2025).
    ["lr.maternity_pre_birth", "mother", "Wniosek o część urlopu macierzyńskiego przed porodem", "Do 6 tygodni urlopu przed przewidywaną datą porodu.", shiftIso(persona.dueDate, -42), "Pracodawca", situational],
    ["lr.maternity_resign_14w", "mother", "Wniosek o rezygnację z części urlopu macierzyńskiego", "Po wykorzystaniu 14 tygodni mama wraca do pracy, a resztę urlopu bierze tata.", afterMandatoryWeeks, "Pracodawca", situational],
    ["lr.maternity_takeover", "father", "Wniosek ojca o pozostałą część urlopu macierzyńskiego", "Tata przejmuje urlop, z którego zrezygnowała mama.", afterMandatoryWeeks, "Pracodawca", situational],
    ["lr.maternity_resign_incapacity", "mother", "Wniosek o rezygnację z urlopu macierzyńskiego z powodu niezdolności do samodzielnej egzystencji", "Po 8 tygodniach, gdy mama ma orzeczenie o niezdolności do samodzielnej egzystencji.", shiftIso(birth, 56), "Pracodawca", situational],
    ["lr.maternity_mother_hospital", "father", "Wniosek ojca o urlop macierzyński na czas pobytu mamy w szpitalu", "Gdy mama przerywa urlop, bo leży w szpitalu.", birth, "Pracodawca", situational],
    ["lr.maternity_mother_death", "father", "Wniosek ojca o urlop macierzyński po śmierci mamy", "Tata przejmuje pozostałą część urlopu macierzyńskiego.", birth, "Pracodawca", situational],
    ["lr.maternity_abandonment", "father", "Wniosek ojca o urlop macierzyński po porzuceniu dziecka przez matkę", "Tata przejmuje pozostałą część urlopu macierzyńskiego.", birth, "Pracodawca", situational],
    ["lr.maternity_uninsured_mother_incapacity", "father", "Wniosek ojca o urlop macierzyński, gdy mama nie jest ubezpieczona i nie może opiekować się dzieckiem", "Mama bez ubezpieczenia ma orzeczenie o niezdolności do samodzielnej egzystencji.", birth, "Pracodawca", situational],
    ["lr.maternity_uninsured_mother_works", "father", "Wniosek ojca o urlop macierzyński, gdy nieubezpieczona mama podejmuje pracę", "Mama bez tytułu do ubezpieczenia zaczyna pracę na co najmniej pół etatu.", afterMandatoryWeeks, "Pracodawca", situational],
    ["lr.supplementary_maternity", "mother", "Wniosek o uzupełniający urlop macierzyński", "Gdy dziecko urodziło się przedwcześnie albo po porodzie długo było w szpitalu.", birth, "Pracodawca", situational],
    ["lr.maternity_conditions", "mother", "Wniosek o urlop na warunkach urlopu macierzyńskiego", "Przy przyjęciu dziecka do adopcji albo do rodziny zastępczej niezawodowej.", birth, "Pracodawca", situational],
    ["lr.combine_parental_with_work", "mother", "Wniosek o łączenie urlopu rodzicielskiego z pracą", "Do połowy etatu w czasie urlopu rodzicielskiego. Termin: 21 dni przed podjęciem pracy.", afterMandatoryWeeks, "Pracodawca", situational],
  ];
  for (const [form, who, title, description, date, recipient, dateNote] of extras) {
    // A request already on the plan for this family (e.g. combining work in the chosen variant) is not repeated.
    if (entries.some((entry) => entry.form === form)) continue;
    entries.push({ id: `form-${form.slice(3)}`, kind: "application", who, title, description, date, recipient, dateNote, form, extra: true });
  }

  return applyProgress(entries, doneTasks, today, persona.completedSteps);
}

/** Statuses from what is done: blocked until required entries are done, late after the deadline, active while a period runs. */
export function applyProgress(entries: Entry[], doneTasks: string[], today: string, completedSteps: Record<string, string> = {}): FamilyTimelineEntry[] {
  const completed = new Set(entries.filter((entry) =>
    entry.completedOn || (completedSteps[entry.id] && !entry.review) ||
    (entry.kind === "event" && !entry.estimated && entry.date <= today) ||
    (entry.kind === "application" && doneTasks.includes(entry.id))
  ).map((entry) => entry.id));
  // Guide steps may require an entry that this case leaves out; only present entries can block.
  const present = new Set(entries.map((entry) => entry.id));

  return entries.map((entry): FamilyTimelineEntry => {
    const completedOn = entry.completedOn ?? completedSteps[entry.id];
    const status = entry.review ? "review"
      : completed.has(entry.id)
      ? entry.kind === "event" ? "confirmed" : "completed"
      : entry.requires?.some((id) => present.has(id) && !completed.has(id)) ? "blocked"
      : entry.kind === "application" && entry.due && entry.due < today ? "late"
      : entry.kind === "application" ? "ready"
      : entry.kind === "period" && entry.end && entry.date <= today
        ? entry.end < today ? "ended" : "active"
        : "planned";
    return { ...entry, status, completedOn };
  }).sort((a, b) => timelineDate(a).localeCompare(timelineDate(b)));
}
