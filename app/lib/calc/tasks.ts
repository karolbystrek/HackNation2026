import type { Variant } from "@/lib/calc/variants";
import { addDays, formatDate, parseIso, toIso } from "@/lib/dates";
import type { EventWho } from "@/lib/events";
import type { Persona } from "@/lib/mock/personas";
import type { Params } from "@/lib/params";

export type Task = {
  id: string;
  /** Date the task must be done by, used for sorting and the calendar export. */
  due: string | null;
  when: string;
  who: EventWho;
  title: string;
  description: string;
  doc?: { label: string; url: string };
};

const LINKS = {
  parentalLeave: "https://www.gov.pl/web/rodzina/urlop-rodzicielski",
  employerGuide: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo",
  birthCertificate: "https://www.gov.pl/web/cyfryzacja/rejestr-stanu-cywilnego",
  zam: "https://www.zus.pl/wzory-formularzy/zasilki/zasilek-macierzynski",
};

export function buildTasks(persona: Persona, variant: Variant, p: Params): Task[] {
  const { mother, father } = persona.parents;
  const birth = parseIso(persona.dueDate)!;
  const r = variant.result;
  const tasks: Task[] = [];

  if (mother.sickLeaveFrom)
    tasks.push({
      id: "sick-leave",
      due: null,
      when: "Teraz",
      who: "mother",
      title: "Zwolnienie e-ZLA w ciąży",
      description: "Trafia automatycznie do ZUS i pracodawcy. Nic nie musisz robić.",
    });

  const paternityDue = toIso(addDays(birth, -7));
  tasks.push({
    id: "paternity",
    due: paternityDue,
    when: `do ${formatDate(paternityDue)}`,
    who: "father",
    title: `Wniosek o urlop ojcowski (${p.paternityWeeks * 7} dni)`,
    description: "Złóż u pracodawcy co najmniej 7 dni przed startem. Możesz podzielić urlop na 2 części po min. 7 dni.",
    doc: { label: "zasady urlopu ojcowskiego", url: LINKS.employerGuide },
  });

  tasks.push({
    id: "birth-certificate",
    due: persona.dueDate,
    when: "Po porodzie",
    who: "both",
    title: "Odpis aktu urodzenia",
    description: "Zamów online w urzędzie stanu cywilnego. Dołączysz go do wniosków.",
    doc: { label: "wniosek o odpis aktu", url: LINKS.birthCertificate },
  });

  const maternityDue = toIso(addDays(birth, p.flatRateRequestDays));
  const motherWeeks = r.periods.mother.reduce((sum, x) => sum + x.weeks, 0);
  const employee = mother.contract === "uop";
  tasks.push({
    id: "maternity",
    due: maternityDue,
    when: `do ${formatDate(maternityDue)}`,
    who: "mother",
    title: `Wniosek o urlop macierzyński i rodzicielski (${Math.round(motherWeeks)} tyg.)`,
    description:
      `${employee ? "Jeden wniosek u pracodawcy" : "Wniosek ZAM do ZUS"}, najpóźniej ${p.flatRateRequestDays} dni po porodzie.` +
      (r.flatRateAllowed ? " Możesz wybrać 81,5% - dostaniesz równe kwoty przez cały okres." : ""),
    doc: employee ? { label: "zasady urlopu rodzicielskiego", url: LINKS.parentalLeave } : { label: "wniosek ZAM", url: LINKS.zam },
  });

  const fatherParental = r.periods.father.find((x) => x.kind === "parental");
  if (fatherParental) {
    const due = toIso(addDays(parseIso(fatherParental.from)!, -21));
    tasks.push({
      id: "father-parental",
      due,
      when: `do ${formatDate(due)}`,
      who: "father",
      title: `Wniosek o urlop rodzicielski (${Math.round(fatherParental.weeks)} tyg.)`,
      description: `Złóż u pracodawcy co najmniej 21 dni przed startem urlopu ${formatDate(fatherParental.from)}.`,
      doc: { label: "zasady urlopu rodzicielskiego", url: LINKS.parentalLeave },
    });
  }

  const motherReturn = r.periods.mother[r.periods.mother.length - 1].to;
  tasks.push({
    id: "mother-return",
    due: motherReturn,
    when: formatDate(motherReturn),
    who: "mother",
    title: `Powrót ${mother.nameGenitive} do pracy`,
    description: "Ochrona przed zwolnieniem trwa do końca urlopu. Uzgodnij z pracodawcą termin i ewentualną pracę na część etatu.",
  });
  if (fatherParental)
    tasks.push({
      id: "father-return",
      due: fatherParental.to,
      when: formatDate(fatherParental.to),
      who: "father",
      title: `Powrót ${father.nameGenitive} do pracy`,
      description: "Ochrona przed zwolnieniem obowiązuje także ojca do końca urlopu rodzicielskiego.",
    });

  return tasks.sort((a, b) => (a.due ?? "").localeCompare(b.due ?? ""));
}
