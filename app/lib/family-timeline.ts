import { PARENTS, planLeave, type LeavePeriod, type ParentKey } from "@/lib/calc/leave";
import { formatDate, shiftIso } from "@/lib/dates";
import { CIRCUMSTANCES, type EventWho, type TimelineEvent } from "@/lib/events";
import { leaveInputFor, type Variant } from "@/lib/calc/variants";
import { dueDate, factsFor, neededDocuments, stepsByTask, type Facts, type Journey } from "@/lib/journey";
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
  deadlineDetail?: string;
  /** Knowledge-base spec of the application the user can fill in (form_fields or leave_requests id). */
  form?: string;
  /** Situational or third-party form, listed for completeness; it never counts as an open task. */
  extra?: boolean;
  /** Documents knowledge/ requires for this step. */
  documents?: { id: string; title: string; instruction?: string }[];
  /** Event that caused this form to appear. */
  trigger?: TimelineEvent;
};

export type FamilyTimelineEntry = Entry & { status: Status };

export function timelineDate(entry: FamilyTimelineEntry) {
  return entry.completedOn ?? entry.due ?? entry.date;
}

/** Where the parent hands the application in; when ZUS pays, the payer forwards it (knowledge/forms.json, form.zam). */
function recipientLabel(recipient: string, facts: Facts) {
  const payer = facts.insured_type === "contractor" ? "Zleceniodawca" : "Pracodawca";
  if (recipient === "zus") return "ZUS";
  if (recipient === "municipality") return "Gmina (ośrodek pomocy społecznej)";
  if (recipient === "payer_of_benefit") return facts.insured_type === "self_employed" ? "ZUS" : payer;
  return recipient === "employer" ? "Pracodawca" : payer;
}

type TaskPlan = {
  id: string;
  title: string;
  date: string;
  /** Dates knowledge/ deadlines may count from (knowledge/enums.json anchor_events). */
  anchors: Record<string, string | undefined>;
  /** First day of the leave the application is for. */
  start?: string;
  requires?: string[];
  estimated?: boolean;
  dateNote?: string;
  review?: boolean;
  /** A choice, not an obligation: listed with the other forms and never counted as an open task. */
  optional?: boolean;
  period?: Omit<Entry, "kind" | "who" | "requires" | "estimated">;
};

/** What to check after a job event before the birth; maternity benefit needs sickness insurance on the day of birth. */
const INSURANCE_CHECKS: Partial<Record<TimelineEvent["type"], string>> = {
  contract: "Nowa umowa to nowy tytuł do ubezpieczenia. Sprawdź, czy obejmuje ubezpieczenie chorobowe, i zaktualizuj dane w kalkulatorze.",
  contractEnd: "Bez ubezpieczenia chorobowego w dniu porodu nie ma zasiłku macierzyńskiego. Umowa o pracę na czas określony, która skończyłaby się po 3. miesiącu ciąży, trwa do dnia porodu (art. 177 § 3 Kodeksu pracy). Sprawdź swój tytuł do ubezpieczenia i zaktualizuj dane w kalkulatorze.",
  business: "Zasiłek macierzyński z działalności przysługuje tylko z dobrowolnym ubezpieczeniem chorobowym. Sprawdź zgłoszenie do ubezpieczenia i brak zaległości w składkach, a potem zaktualizuj dane w kalkulatorze.",
};

export function buildFamilyTimeline(
  persona: Persona, events: TimelineEvent[], chosen: Variant | null, params: Params, journey: Journey, doneTasks: string[], today: string,
): FamilyTimelineEntry[] {
  const birth = persona.birthDate ?? persona.dueDate;
  const birthEvent = persona.events.find((event) => event.type === "birth" || event.type === "adoption");
  const birthId = `event-${birthEvent?.id ?? "birth"}`;
  const provisional = !persona.birthDate;
  const { birthCardDate, birthRegistrationDate, birthCertificateDate, parents } = persona;
  const cardDate = birthCardDate ?? birth;
  const childEvents = persona.childEvents ?? ["birth"];
  const placed = childEvents.some((event) => event === "adoption" || event === "foster_placement");
  const lost = childEvents.some((event) => event === "stillbirth" || event.startsWith("child_death_"));
  // After a stillbirth only the 8-week maternity benefit is left, so the leave variant does not apply.
  const variant = lost ? null : chosen;
  const periods = variant?.result ?? planLeave(leaveInputFor(persona, params, 0), params);
  const periodOf = (parent: ParentKey, kind: LeavePeriod["kind"]) => {
    const periods = variant?.result.periods[parent].filter((period) => period.kind === kind);
    const first = periods?.[0];
    return first && { ...first, to: periods?.at(-1)?.to ?? first.to };
  };
  const extraCopy = [...events].reverse().find((event) => event.circumstance === "additionalBirthCertificate");
  const supplementaryEvent = events.findLast((event) => event.circumstance === "supplementaryLeave");
  const stillbirth = childEvents.includes("stillbirth");
  const lossEnd = stillbirth ? shiftIso(birth, params.stillbirthWeeks * 7 - 1) : persona.childDeathDate
    ? [shiftIso(persona.childDeathDate, 6), shiftIso(birth, params.stillbirthWeeks * 7 - 1)].sort().at(-1)
    : undefined;
  const maternityWeeks = params.maternityWeeks[Math.min(Math.max(persona.kids, 1), params.maternityWeeks.length) - 1];
  const entries: Entry[] = events.map((event) => ({
    ...event,
    id: `event-${event.id}`,
    kind: "event",
    end: event.endDate === undefined && event.type === "sickLeave" ? null : event.endDate,
    estimated: event.id === birthEvent?.id && provisional,
  }));

  const sickLeaveOf = (parent: ParentKey) => events.find((event) => event.who === parent && event.type === "sickLeave")
    ?? (parent === "mother" ? events.find((event) => event.circumstance === "sicknessAfterInsurance") : undefined);
  if (parents.mother.insuredType === "after_insurance" && !sickLeaveOf("mother")) entries.push({
    id: "sickness-check", kind: "application", who: "mother", date: today, recipient: "ZUS",
    title: "Sprawdź warunki zasiłku po ustaniu ubezpieczenia",
    description: "Sprawdź, czy zwolnienie zaczęło się przed ustaniem ubezpieczenia lub czy spełnia warunki po jego ustaniu.",
    guide: "https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/prawo-do-zasilku-i-okres-przyslugiwania",
  });

  // Civil registry steps: outside knowledge/, which covers ZUS and labour law only. A placed child already has a birth certificate.
  if (!placed) entries.push(
    {
      id: "birth-card", kind: "document", who: "both", title: stillbirth ? "Karta martwego urodzenia" : "Karta urodzenia",
      description: stillbirth ? "Jeśli szpital sporządzi kartę martwego urodzenia, przekazuje ją do USC." : "Placówka medyczna przekazuje kartę urodzenia do USC.",
      date: cardDate, completedOn: birthCardDate, requires: [birthId], dateNote: birthCardDate ? undefined : "Po porodzie",
    },
    {
      id: "birth-registration", kind: "application", who: "both", title: stillbirth ? "Zgłoszenie martwego urodzenia" : "Zgłoszenie urodzenia",
      description: stillbirth ? "Jeśli wystawiono kartę martwego urodzenia, zgłoś urodzenie do USC. Bez aktu do zasiłku może wystarczyć zaświadczenie medyczne." : "Po zgłoszeniu otrzymasz pierwszy bezpłatny odpis skrócony aktu urodzenia.",
      date: cardDate, due: stillbirth && !birthCardDate ? undefined : shiftIso(cardDate, stillbirth ? 3 : 21),
      dateNote: stillbirth && !birthCardDate ? "Do 3 dni od sporządzenia karty martwego urodzenia" : undefined, recipient: "Urząd stanu cywilnego",
      guide: "https://www.gov.pl/web/gov/zglos-urodzenie-dziecka",
      completedOn: birthRegistrationDate, requires: ["birth-card"], estimated: !birthCardDate,
    },
    {
      id: "birth-certificate", kind: "document", who: "both", title: "Akt urodzenia dziecka",
      description: stillbirth ? "Jeśli USC zarejestrował martwe urodzenie, otrzymasz akt urodzenia z odpowiednią adnotacją." : "Pierwszy skrócony odpis dostaniesz przy rejestracji. ZUS może pobrać akt z rejestru.",
      guide: "https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu",
      date: birthRegistrationDate ?? cardDate, completedOn: birthCertificateDate,
      requires: ["birth-registration"], dateNote: birthCertificateDate ? undefined : "Po zgłoszeniu do USC",
    },
    ...(!stillbirth && (extraCopy || doneTasks.includes("birth-certificate-copy")) ? [{
      id: "birth-certificate-copy", kind: "application", who: "both", title: "Wniosek o odpis aktu urodzenia",
      description: "Odpis skrócony dołączasz do wniosków urlopowych u pracodawcy. Wniosek złożysz przez gov.pl.",
      date: extraCopy?.date ?? birthCertificateDate ?? birthRegistrationDate ?? cardDate, recipient: "Urząd stanu cywilnego",
      guide: "https://www.gov.pl/web/gov/uzyskaj-odpis-aktu-stanu-cywilnego-urodzenia-malzenstwa-zgonu", requires: ["birth-certificate"],
      estimated: !birthCertificateDate, form: "civil.birth_certificate",
    } satisfies Entry] : []),
  );

  const maternity = periodOf("mother", "maternity");
  // shortcut: the leave engine plans a placement like a birth; its leave on maternity terms comes from conditions_leave instead.
  // No sickness insurance on the day of birth, so no maternity leave or benefit (parental allowance or sickness benefit instead).
  if (maternity && !placed && !["uninsured", "after_insurance"].includes(factsFor(persona, "mother", events, variant).insured_type)) entries.push({
    id: "maternity-period", kind: "period", who: "mother",
    title: persona.parents.mother.contract === "uop" ? "Urlop macierzyński" : "Okres zasiłku macierzyńskiego",
    description: maternity.from < birth ? "Macierzyński zaplanowano przed porodem." : "Rozpoczęcie okresu wynika z daty porodu.",
    date: maternity.from, end: shiftIso(maternity.to, -1), estimated: provisional, requires: maternity.from < birth ? ["pre-birth-leave"] : [birthId],
  });

  // Applications and checks: which ones, their forms, recipients, deadlines and documents come from knowledge/scenarios.json.
  for (const parent of PARENTS) {
    const facts = factsFor(persona, parent, events, variant);
    const employee = facts.insured_type === "employee";
    for (const [task, steps] of stepsByTask(journey, facts)) {
      const form = steps.find((step) => step.form)?.form;
      const plan = taskPlan(task, parent, employee, !!form);
      if (!plan) continue;
      const documents = neededDocuments(journey, steps, facts);
      if (task === "supplementary_leave" && !documents.some((doc) => doc.id === "doc.hospital_cert_child_stay")) documents.push({ id: "doc.hospital_cert_child_stay", title: "Zaświadczenie szpitala o pobycie dziecka", instruction: journey.documentInstructions?.["doc.hospital_cert_child_stay"] });
      const action = plan.id === "supplementary-check" ? "Sprawdź okresy wskazane w zaświadczeniu szpitala i ustal termin złożenia według oficjalnej instrukcji."
        : task === "supplementary_leave" && !employee
        ? "Złóż ZAM przed rozpoczęciem okresu zasiłku uzupełniającego. Przygotuj zaświadczenie ze szpitala."
        : task === "maternity_claim" && facts.payer_size === "unknown" && employee
          ? "Zapytaj pracodawcę, kto wypłaca zasiłek i jakie dokumenty masz przekazać."
          : [...new Set(steps.map((step) => step.action))].join(" ");
      const entry: Entry = {
        id: plan.id, kind: "application", who: parent,
        title: form?.symbol ? `${plan.title} (${form.symbol})` : plan.title,
        description: plan.start ? `Planowany start: ${formatDate(plan.start)}. ${action}` : action,
        date: plan.date, dateNote: plan.dateNote,
        // Steps without a fixed deadline say "before the period starts".
        due: (task === "maternity_claim" && facts.flags.chooses_averaged_rate ? shiftIso(birth, params.flatRateRequestDays) : undefined)
          ?? (task === "supplementary_leave" && !employee ? undefined : dueDate(journey, steps, facts, plan.anchors))
          ?? (plan.start && shiftIso(plan.start, -1)),
        recipient: recipientLabel(steps[0].recipient, facts),
        guide: task === "parental_allowance" ? "https://www.gov.pl/web/gov/uzyskaj-swiadczenie-rodzicielskie"
          : task === "conditions_leave" ? "https://www.gov.pl/web/rodzina/okres-wyplaty-zasilku-macierzynskiego"
          : task === "supplementary_leave" ? "https://www.zus.pl/swiadczenia/zasilki/zasilek-macierzynski/niezbedne-dokumenty"
          : form?.guide ?? (task === "paternity_leave" ? "https://www.gov.pl/web/rodzina/urlop-ojcowski"
            : task === "parental_leave" ? "https://www.gov.pl/web/rodzina/urlop-rodzicielski" : undefined),
        deadlineDetail: steps.flatMap((step) => step.deadlines)
          .map((id) => journey.deadlines[id])
          .find((deadline) => deadline?.kind === "hard" && plan.anchors[deadline.anchor] && (task !== "supplementary_leave" || employee))?.consequence,
        form: form?.id, documents,
        requires: plan.requires ?? [!stillbirth && documents.some((doc) => doc.id === "doc.birth_certificate_short") ? "birth-certificate" : birthId],
        estimated: plan.estimated ?? provisional, review: plan.review, extra: plan.optional,
      };
      entries.push(entry);
      if (plan.period) entries.push({ ...plan.period, kind: "period", who: parent, requires: [plan.id], estimated: provisional });
      // Paternity leave in two 7-day parts: each part has its own request (KP art. 182^3); the family picks the second date later.
      if (plan.id === "paternity" && persona.paternityParts === 2) entries.push({
        ...entry, id: "paternity-2", title: `${entry.title} – druga część`, due: undefined, dateNote: "Termin drugiej części wybierzesz później",
        description: employee
          ? "Drugi tydzień urlopu ojcowskiego wykorzystasz do ukończenia przez dziecko 12 miesięcy. Wniosek złóż co najmniej 7 dni przed jego rozpoczęciem."
          : "Drugi tydzień zasiłku za urlop ojcowski wykorzystasz do ukończenia przez dziecko 12 miesięcy. ZAM złóż przed jego rozpoczęciem.",
        requires: ["paternity"],
      });
    }
  }

  function taskPlan(task: string, parent: ParentKey, employee: boolean, hasForm: boolean): TaskPlan | null {
    switch (task) {
      // Tasks of the mother's own benefit; scenarios without a parent_role would otherwise give them to both parents.
      case "maternity_claim":
        if (placed && periods.noRight || parent !== (placed ? persona.placementParent ?? "mother" : "mother")) return null;
        return {
          id: "maternity-claim", date: birth,
          title: hasForm ? "Wniosek o zasiłek macierzyński" : "Dokumenty do wypłaty zasiłku macierzyńskiego",
          anchors: {
            birth_date: birth, adoption_intake_date: placed ? birth : undefined,
            benefit_period_end: maternity && shiftIso(maternity.to, -1),
          },
          period: lossEnd ? {
            id: "maternity-period", title: "Urlop macierzyński po stracie dziecka",
            description: "Okres uwzględnia datę porodu i, gdy dotyczy, datę śmierci dziecka.",
            date: birth, end: lossEnd,
          } : undefined,
        };
      case "pre_birth_leave": {
        const start = [...events].reverse().find((event) => event.circumstance === "preBirthLeave")?.date ?? variant?.input.preBirthStartDate;
        if (parent !== "mother" || !start || start >= birth || start < shiftIso(birth, -params.preBirthMaxWeeks * 7)) return null;
        return {
          id: "pre-birth-leave", title: "Wniosek o urlop macierzyński przed porodem", date: start, start, requires: [],
          anchors: { leave_start: start, expected_birth_date: persona.dueDate },
        };
      }
      case "supplementary_leave": {
        const weeks = variant?.input.supplementaryWeeks ?? persona.supplementaryWeeks;
        if (parent !== (supplementaryEvent?.who === "father" ? "father" : persona.supplementaryParent ?? "mother") || factsFor(persona, parent, events, variant).insured_type === "uninsured") return null;
        if (!weeks) return {
          id: "supplementary-check", title: "Sprawdź prawo do urlopu lub zasiłku uzupełniającego",
          date: supplementaryEvent?.date ?? birth, dateNote: "Zacznij od zaświadczenia ze szpitala", anchors: {}, optional: true, requires: [],
        };
        const supplementary = periodOf(parent, "supplementary");
        const start = supplementary?.from ?? periodOf(variant?.input.main ?? "mother", "maternity")?.to ?? maternity?.to ?? shiftIso(birth, maternityWeeks * 7);
        return {
          id: "supplementary-leave", title: "Wniosek o uzupełniający urlop macierzyński", date: birth, start,
          anchors: { maternity_leave_end: shiftIso(start, -1) },
          period: {
            id: "supplementary-period", title: "Uzupełniający urlop macierzyński",
            description: "Tydzień urlopu za każdy tydzień pobytu dziecka w szpitalu.",
            date: start, end: supplementary ? shiftIso(supplementary.to, -1) : shiftIso(start, weeks * 7 - 1),
          },
        };
      }
      case "conditions_leave":
        if (periods.noRight || parent !== (variant?.input.main ?? persona.placementParent ?? "mother")) return null;
        return {
          id: "conditions-leave", title: "Wniosek o urlop na warunkach urlopu macierzyńskiego", date: birth,
          anchors: { adoption_intake_date: birth },
          dateNote: `Wskaż początek najpóźniej ${formatDate(shiftIso(birth, params.parentalRequestDays))}`,
        };
      case "funeral_claim":
        if (parent !== "mother") return null;
        return { id: "funeral-claim", title: "Wniosek o zasiłek pogrzebowy", date: birth, anchors: { death_date: persona.childDeathDate ?? (stillbirth ? birth : undefined) }, requires: [] };
      case "job_loss_benefit":
        return { id: "job-loss-benefit", title: "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego", date: today, estimated: false, anchors: {}, requires: [] };
      case "parental_allowance":
        if (parent !== "mother") return null;
        return { id: "parental-allowance", title: "Wniosek o świadczenie rodzicielskie", date: birth, anchors: { birth_date: birth } };
      case "takeover_leave":
        return {
          id: `takeover-${parent}`, date: birth, dateNote: "Gdy mama trafi do szpitala", anchors: {},
          title: employee ? "Wniosek o urlop macierzyński na czas pobytu mamy w szpitalu" : "Wniosek o zasiłek macierzyński za mamę",
        };
      case "combine_request": {
        const parental = periodOf(parent, "parental");
        if (!parental) return null;
        return {
          id: `combine-${parent}`, title: "Wniosek o łączenie urlopu rodzicielskiego z pracą", date: birth,
          anchors: { work_start: parental.from }, requires: [`parental-${parent}`],
        };
      }
      case "sickness_claim": {
        const sick = sickLeaveOf(parent);
        return sick ? {
          id: "sickness-claim", title: "Wniosek o zasiłek chorobowy", date: sick.date, estimated: false,
          anchors: { benefit_period_end: sick.endDate ?? undefined }, requires: [`event-${sick.id}`],
        } : null;
      }
      case "arrears_check":
        return { id: `arrears-check-${parent}`, title: "Sprawdź, czy nie masz zaległości w składkach", date: birth, anchors: {}, requires: [] };
      case "paternity_leave": {
        // A saved custom leave split can leave paternity leave out.
        if (variant?.input.paternity === false) return null;
        if (parent !== "father" || factsFor(persona, parent, events, variant).insured_type === "uninsured") return null;
        const period = periods.periods.father.find((item) => item.kind === "paternity");
        if (!period) return null;
        const start = period.from;
        const end = shiftIso(period.to, -1);
        const twoParts = persona.paternityParts === 2;
        return {
          id: "paternity", date: birth, start, anchors: { leave_start: start },
          title: employee ? "Wniosek o urlop ojcowski" : "Wniosek o zasiłek za urlop ojcowski",
          period: {
            id: "paternity-period", title: `${employee ? "Urlop ojcowski" : "Okres zasiłku za urlop ojcowski"}${twoParts ? " – pierwsza część" : ""}`,
            description: "Może przypadać w tym samym czasie co urlop macierzyński.",
            date: start, end: twoParts ? [shiftIso(start, params.paternityMinPartDays - 1), end].sort()[0] : end,
          },
        };
      }
      case "parental_leave": {
        // The example cases use one parental period per parent.
        const period = periodOf(parent, "parental");
        if (!period) return null;
        const id = `parental-${parent}`;
        return {
          id, date: birth, start: period.from, anchors: { leave_start: period.from },
          title: employee ? "Wniosek o urlop rodzicielski" : "Wniosek o zasiłek za okres rodzicielskiego",
          review: !!persona.completedSteps?.[id] && variant?.key !== persona.initialVariant,
          period: {
            id: `${id}-period`, title: employee ? "Urlop rodzicielski" : "Okres zasiłku za rodzicielski",
            description: "Termin wynika z wybranego podziału opieki.",
            date: period.from, end: shiftIso(variant?.result.periods[parent].filter((item) => item.kind === "parental").at(-1)?.to ?? period.to, -1),
          },
        };
      }
      case "resume_voluntary_sickness": {
        const lastEnd = variant?.result.periods[parent].map((period) => period.to).sort().at(-1);
        return {
          id: `resume-sickness-${parent}`, title: "Ponownie zgłoś się do dobrowolnego ubezpieczenia chorobowego",
          date: lastEnd ?? birth, dateNote: lastEnd ? undefined : "Po zakończeniu zasiłku", requires: [],
          // Insurance from the business or contract starts again the day after the last benefit period.
          anchors: { insurance_title_start: lastEnd },
        };
      }
    }
    throw new Error(`knowledge/scenarios.json uses task "${task}", which the timeline does not know`);
  }

  // Job events are prompts, not facts: the event alone does not establish the insurance (docs/project-conventions.md).
  for (const event of events) {
    const check = INSURANCE_CHECKS[event.type];
    if (!check || event.date > birth) continue;
    entries.push({
      id: `insurance-check-${event.id}`, kind: "application", who: event.who, date: event.date,
      title: "Sprawdź ubezpieczenie w dniu porodu", description: check, requires: [`event-${event.id}`],
    });
  }

  // Other ZUS forms: filled by the employer, a doctor, or only in special situations.
  const payerOfBenefit = parents.mother.payerSize === "gt20" ? "Płatnik składek" : "ZUS";
  const afterMandatoryWeeks = shiftIso(birth, params.motherOnlyWeeks * 7);
  const extras: [form: string, who: EventWho, title: string, description: string, date: string, recipient: string][] = [
    ["ff.zas2", "mother", "Zaświadczenie lekarskie w związku z ciążą (ZAS-2)", "Wystawia lekarz prowadzący ciążę. Potwierdza przewidywaną datę porodu i niezdolność do pracy w ciąży.", shiftIso(persona.dueDate, -42), "ZUS"],
    ["ff.z3", "mother", "Zaświadczenie płatnika składek (Z-3)", "Wypełnia pracodawca, który zgłasza do 20 osób. ZUS wylicza z niego zasiłek pracownika.", birth, "ZUS"],
    ["ff.z3a", "mother", "Zaświadczenie płatnika składek (Z-3a)", "Wypełnia zleceniodawca, który zgłasza do 20 osób, gdy zasiłek dostaje zleceniobiorca.", birth, "ZUS"],
    ["ff.zas15", "father", "Zaświadczenie płatnika o urlopie (ZAS-15)", "Pracodawca potwierdza udzielony urlop macierzyński, rodzicielski albo ojcowski.", persona.paternityStart, "ZUS"],
    ["ff.zas24", "mother", "Zaświadczenie o okresach zasiłku macierzyńskiego (ZAS-24)", "Wydaje płatnik zasiłku. Drugi rodzic dołącza je do swojego wniosku.", afterMandatoryWeeks, "ZUS"],
    ["ff.zas23", "mother", "Wniosek o skrócenie wypłaty zasiłku macierzyńskiego (ZAS-23)", "Gdy mama po 14 tygodniach wraca do pracy, a resztę zasiłku przejmuje tata.", afterMandatoryWeeks, payerOfBenefit],
    ["ff.zas40", "mother", "Zaświadczenie o pobycie matki w szpitalu (ZAS-40)", "Wystawia szpital, gdy mama jest w szpitalu i opiekę nad dzieckiem przejmuje tata.", birth, payerOfBenefit],
    ["ff.zas33", "father", "Oświadczenie o porzuceniu dziecka przez matkę lub o śmierci matki (ZAS-33)", "Tata składa je, gdy przejmuje zasiłek macierzyński po mamie.", birth, payerOfBenefit],
    ["ff.zas26", "mother", "Oświadczenie o przyjęciu dziecka na wychowanie (ZAS-26)", "Przy adopcji albo przyjęciu dziecka jako rodzina zastępcza.", birth, payerOfBenefit],
    ["ff.zas55", "mother", "Wniosek o zasiłek w wysokości zasiłku macierzyńskiego (ZAS-55)", "Gdy pracodawca ogłosi upadłość albo likwidację w czasie ciąży.", birth, "ZUS"],
    ["ff.z10", "mother", "Oświadczenie do zasiłku po ustaniu ubezpieczenia (Z-10)", "Gdy umowa skończyła się, a zwolnienie lekarskie trwa dalej.", birth, "ZUS"],
    ["ff.znp7", "mother", "Wniosek o świadczenie rehabilitacyjne (ZNp-7)", "Gdy po wyczerpaniu zasiłku chorobowego potrzebne jest dalsze leczenie.", birth, "ZUS"],
    // Leave requests to the employer for special situations (rozporządzenie MRiPS z 11.03.2025).
    ["ff.zas12", "mother", "Zaświadczenie płatnika za dalszy okres (ZAS-12)", "Płatnik przekazuje zaświadczenie do ZUS, jeżeli poprzedni okres został już zgłoszony.", birth, "ZUS"],
    ["lr.maternity_resign_14w", "mother", "Wniosek o rezygnację z części urlopu macierzyńskiego", "Po wykorzystaniu 14 tygodni mama wraca do pracy, a resztę urlopu bierze tata.", afterMandatoryWeeks, "Pracodawca"],
    ["lr.maternity_takeover", "father", "Wniosek ojca o pozostałą część urlopu macierzyńskiego", "Tata przejmuje urlop, z którego zrezygnowała mama.", afterMandatoryWeeks, "Pracodawca"],
    ["lr.maternity_resign_incapacity", "mother", "Wniosek o rezygnację z urlopu macierzyńskiego z powodu niezdolności do samodzielnej egzystencji", "Po 8 tygodniach, gdy mama ma orzeczenie o niezdolności do samodzielnej egzystencji.", shiftIso(birth, 56), "Pracodawca"],
    ["lr.maternity_mother_hospital", "father", "Wniosek ojca o urlop macierzyński na czas pobytu mamy w szpitalu", "Gdy mama przerywa urlop, bo leży w szpitalu.", birth, "Pracodawca"],
    ["lr.maternity_mother_death", "father", "Wniosek ojca o urlop macierzyński po śmierci mamy", "Tata przejmuje pozostałą część urlopu macierzyńskiego.", birth, "Pracodawca"],
    ["lr.maternity_abandonment", "father", "Wniosek ojca o urlop macierzyński po porzuceniu dziecka przez matkę", "Tata przejmuje pozostałą część urlopu macierzyńskiego.", birth, "Pracodawca"],
    ["lr.maternity_uninsured_mother_incapacity", "father", "Wniosek ojca o urlop macierzyński, gdy mama nie jest ubezpieczona i nie może opiekować się dzieckiem", "Mama bez ubezpieczenia ma orzeczenie o niezdolności do samodzielnej egzystencji.", birth, "Pracodawca"],
    ["lr.maternity_uninsured_mother_works", "father", "Wniosek ojca o urlop macierzyński, gdy nieubezpieczona mama podejmuje pracę", "Mama bez tytułu do ubezpieczenia zaczyna pracę na co najmniej pół etatu.", afterMandatoryWeeks, "Pracodawca"],
    ["lr.maternity_conditions", "mother", "Wniosek o urlop na warunkach urlopu macierzyńskiego", "Przy przyjęciu dziecka do adopcji albo do rodziny zastępczej niezawodowej.", birth, "Pracodawca"],
  ];
  const recentEvents = [...events].reverse();

  for (const [form, who, title, description, date, recipient] of extras) {
    if (entries.some((entry) => entry.form === form)) continue;
    const trigger = recentEvents.find((event) => {
      if (event.type === "adoption" && ["ff.zas26", "lr.maternity_conditions"].includes(form)) return !periods.noRight;
      const forms: readonly string[] | undefined = event.circumstance && Object.hasOwn(CIRCUMSTANCES, event.circumstance)
        ? CIRCUMSTANCES[event.circumstance].forms : undefined;
      return event.type === "circumstance" && forms?.includes(form);
    });
    // Employer forms depend on the parent's recorded contract and who pays the benefit.
    if (form.startsWith("lr.") && who !== "both" && parents[who].contract !== "uop") continue;
    const payerDocument = (form === "ff.z3" && parents.mother.contract === "uop" ||
      form === "ff.z3a" && parents.mother.contract === "zlec") && payerOfBenefit === "ZUS" && parents.mother.payer === "ZUS";
    const paternityCertificate = form === "ff.zas15" && chosen?.input.paternity && parents.father.contract === "uop" && parents.father.payer === "ZUS";
    if (form === "ff.zas12" && (parents.mother.contract === "jdg" || parents.mother.payerSize !== "le20")) continue;
    if (!trigger && !payerDocument && !paternityCertificate) continue;
    const extra = ["ff.z3", "ff.z3a", "ff.zas12", "ff.zas15", "ff.zas24", "ff.zas40", "ff.zas2"].includes(form);
    entries.push({
      id: `form-${form.slice(3)}${trigger ? `-${trigger.id}` : ""}`, kind: "application", who, title, description,
      date: trigger?.date ?? date,
      recipient, form, extra, trigger,
      ...(form === "ff.zas12" && trigger ? {
        guide: "https://www.zus.pl/-/zaswiadczenie-zas-4",
        due: shiftIso(trigger.date, journey.deadlines["deadline.payer_forward_docs"].offset.value),
      } : {}),
    });
  }

  return applyProgress(entries, doneTasks, today, persona.completedSteps);
}

export function canConfirmDocument(id: string) {
  return ["birth-card", "birth-certificate", "sick-ezla"].includes(id);
}

/** Statuses from what is done: blocked until required entries are done, late after the deadline, active while a period runs. */
export function applyProgress(entries: Entry[], doneTasks: string[], today: string, completedSteps: Record<string, string> = {}): FamilyTimelineEntry[] {
  const completed = new Set(entries.filter((entry) =>
    entry.completedOn || (completedSteps[entry.id] && !entry.review) ||
    (entry.kind === "event" && !entry.estimated && entry.date <= today) ||
    ((entry.kind === "application" || canConfirmDocument(entry.id)) && doneTasks.includes(entry.id))
  ).map((entry) => entry.id));
  // Guide steps may require an entry that this case leaves out; only present entries can block.
  const present = new Set(entries.map((entry) => entry.id));

  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const order = new Map<string, string>();
  // An entry never sorts before an entry it requires (e.g. the birth certificate after registering the birth).
  const orderOf = (entry: Entry, seen = new Set<string>()): string => {
    const known = order.get(entry.id);
    if (known) return known;
    seen.add(entry.id);
    const own = entry.completedOn ?? completedSteps[entry.id] ?? entry.due ?? entry.date;
    const key = (entry.requires ?? []).flatMap((id) => (byId.has(id) && !seen.has(id) ? [orderOf(byId.get(id)!, seen)] : []))
      .reduce((latest, date) => (date > latest ? date : latest), own);
    order.set(entry.id, key);
    return key;
  };

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
  }).sort((a, b) => orderOf(a).localeCompare(orderOf(b)));
}
