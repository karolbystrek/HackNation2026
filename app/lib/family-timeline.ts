import { addDays, formatDate, parseIso, toIso } from "@/lib/dates";
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
};

export type FamilyTimelineEntry = Entry & { status: Status };

export function timelineDate(entry: FamilyTimelineEntry) {
  return entry.completedOn ?? entry.due ?? entry.date;
}

function shift(date: string, days: number) {
  return toIso(addDays(parseIso(date)!, days));
}

export function buildFamilyTimeline(persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params, doneTasks: string[], today: string): FamilyTimelineEntry[] {
  const birth = persona.birthDate ?? persona.dueDate;
  const birthEvent = persona.events.find((event) => event.type === "birth")!;
  const birthId = `event-${birthEvent.id}`;
  const provisional = !persona.birthDate;
  const { birthCardDate, birthRegistrationDate, birthCertificateDate, parents } = persona;
  const cardDate = birthCardDate ?? birth;
  const rateDeadline = persona.wantsAveragedRate && (chosen?.result.flatRateAllowed ?? true)
    ? shift(birth, params.flatRateRequestDays) : undefined;
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
      date: cardDate, due: shift(cardDate, 21), recipient: "Urząd stanu cywilnego",
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
      date: birth, due: shift(persona.paternityStart, -params.paternityRequestDays), estimated: provisional,
      recipient: "Pracodawca", requires: ["birth-certificate"],
      guide: "https://www.gov.pl/web/rodzina/urlop-ojcowski",
      form: parents.father.contract === "uop" ? "lr.paternity" : "ff.zam",
    },
    {
      id: "paternity-period", kind: "period", who: "father", title: "Urlop ojcowski",
      description: "Może przypadać w tym samym czasie co urlop macierzyński.",
      date: persona.paternityStart, end: shift(persona.paternityStart, params.paternityWeeks * 7 - 1),
      requires: ["paternity"], estimated: provisional,
    },
  );

  const maternity = chosen?.result.periods.mother.find((period) => period.kind === "maternity");
  if (maternity) entries.push({
    id: "maternity-period", kind: "period", who: "mother",
    title: parents.mother.contract === "uop" ? "Urlop macierzyński" : "Okres zasiłku macierzyńskiego",
    description: "Rozpoczęcie okresu wynika z daty porodu.",
    date: maternity.from, end: shift(maternity.to, -1), estimated: provisional, requires: [birthId],
  });

  // The example cases use one parental period per parent.
  for (const parent of ["mother", "father"] as const) {
    const period = chosen?.result.periods[parent].find((item) => item.kind === "parental");
    if (!period) continue;
    const id = `parental-${parent}`;
    const employee = parents[parent].contract === "uop";
    const due = shift(period.from, employee ? -params.parentalRequestDays : -1);
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
      {
        id: `${id}-period`, kind: "period", who: parent,
        title: employee ? "Urlop rodzicielski" : "Okres zasiłku za rodzicielski",
        description: "Termin wynika z wybranego podziału opieki.",
        date: period.from, end: shift(period.to, -1), requires: [id], estimated: provisional,
      },
    );
  }

  const completed = new Set(entries.filter((entry) =>
    entry.completedOn || (persona.completedSteps?.[entry.id] && !entry.review) ||
    (entry.kind === "event" && !entry.estimated && entry.date <= today) ||
    (entry.kind === "application" && doneTasks.includes(entry.id))
  ).map((entry) => entry.id));

  return entries.map((entry): FamilyTimelineEntry => {
    const completedOn = entry.completedOn ?? persona.completedSteps?.[entry.id];
    const status = entry.review ? "review"
      : completed.has(entry.id)
      ? entry.kind === "event" ? "confirmed" : "completed"
      : entry.requires?.some((id) => !completed.has(id)) ? "blocked"
      : entry.kind === "application" && entry.due && entry.due < today ? "late"
      : entry.kind === "application" ? "ready"
      : entry.kind === "period" && entry.end && entry.date <= today
        ? entry.end < today ? "ended" : "active"
        : "planned";
    return { ...entry, status, completedOn };
  }).sort((a, b) => timelineDate(a).localeCompare(timelineDate(b)));
}
