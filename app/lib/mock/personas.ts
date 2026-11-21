// Demo profiles returned by the simulated mObywatel login and ZUS/KAS/PESEL download.
import type { ParentKey } from "@/lib/calc/leave";
import type { ContractType } from "@/lib/calc/pregnancy";
import type { TimelineEvent } from "@/lib/events";

export type ParentProfile = {
  name: string;
  /** Genitive form used in Polish copy ("Powrót Anny do pracy"). */
  nameGenitive: string;
  age: number;
  contract: ContractType;
  employment: string;
  payer: string;
  insuredFrom: string;
  insurance: string;
  contributions: string;
  sickLeaveFrom: string | null;
  /** Gross pay for the 12 months before the benefit, oldest first. */
  monthlyGross: number[];
};

export type Persona = {
  id: string;
  label: string;
  description: string;
  /** Day the data was "downloaded"; the demo treats it as today. */
  fetchedAt: string;
  dueDate: string;
  kids: number;
  parents: Record<ParentKey, ParentProfile>;
  events: TimelineEvent[];
};

export const personas: Persona[] = [
  {
    id: "anna-tomasz",
    label: "Anna i Tomasz",
    description: "Oboje na umowie o pracę, pierwsze dziecko w drodze, Anna na zwolnieniu w ciąży.",
    fetchedAt: "2026-11-21",
    dueDate: "2027-03-15",
    kids: 1,
    parents: {
      mother: {
        name: "Anna",
        nameGenitive: "Anny",
        age: 31,
        contract: "uop",
        employment: "Umowa o pracę, czas nieokreślony",
        payer: "Pracodawca (zgłasza ponad 20 osób)",
        insuredFrom: "2024-03-01",
        insurance: "Od 01.03.2024 – obowiązkowe",
        contributions: "Opłacone, brak zaległości",
        sickLeaveFrom: "2026-11-04",
        monthlyGross: Array(12).fill(6000),
      },
      father: {
        name: "Tomasz",
        nameGenitive: "Tomasza",
        age: 33,
        contract: "uop",
        employment: "Umowa o pracę, czas nieokreślony",
        payer: "Pracodawca (zgłasza ponad 20 osób)",
        insuredFrom: "2019-09-01",
        insurance: "Od 01.09.2019 – obowiązkowe",
        contributions: "Opłacone, brak zaległości",
        sickLeaveFrom: null,
        monthlyGross: [...Array(10).fill(9000), 10000, 10000],
      },
    },
    events: [
      {
        id: "e1",
        type: "sickLeave",
        who: "mother",
        date: "2026-11-04",
        source: "zus",
        title: "Zwolnienie w ciąży (e-ZLA, kod B)",
        description: "Zasiłek chorobowy 100% podstawy. Wypłaca pracodawca Anny.",
      },
      {
        id: "e2",
        type: "salary",
        who: "father",
        date: "2027-01-01",
        source: "user",
        title: "Podwyżka Tomasza: 9 000 → 10 000 zł brutto",
        description: "Podniesie podstawę zasiłku Tomasza – liczymy średnią z 12 miesięcy przed urlopem.",
      },
      {
        id: "e3",
        type: "birth",
        who: "both",
        date: "2027-03-15",
        source: "user",
        decision: true,
        title: "Narodziny dziecka (termin porodu)",
        description: "Zaczyna się urlop macierzyński Anny: 20 tygodni, z czego 14 tylko dla mamy.",
      },
    ],
  },
];

export const findPersona = (id: string | null) => personas.find((p) => p.id === id) ?? null;
