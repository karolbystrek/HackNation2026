import type { ParentKey } from "@/lib/calc/leave";

export type EventType = "birth" | "adoption" | "contract" | "salary" | "contractEnd" | "business" | "returnToWork" | "sickLeave";
export type EventWho = ParentKey | "both";

export type TimelineEvent = {
  id: string;
  type: EventType;
  who: EventWho;
  date: string;
  /** A period uses date as its start. A null end means the end is unknown. */
  endDate?: string | null;
  /** zus = downloaded from state systems, user = entered earlier, new = added in this session. */
  source: "zus" | "user" | "new";
  title: string;
  description: string;
  /** The event requires the family to choose a leave variant. */
  decision?: boolean;
};

export const EVENT_TYPES: { type: EventType; label: string; effect: string }[] = [
  { type: "sickLeave", label: "Zwolnienie w ciąży", effect: "W Planie możecie sprawdzić szacowany zasiłek od daty rozpoczęcia zwolnienia." },
  { type: "birth", label: "Narodziny dziecka", effect: "Pojawi się decyzja: kto i jak długo idzie na urlop. Porównamy dla Was warianty." },
  {
    type: "adoption",
    label: "Adopcja / rodzina zastępcza",
    effect: "Urlop na warunkach urlopu macierzyńskiego – do 7. roku życia dziecka (rodzina zastępcza, 10. przy odroczeniu obowiązku szkolnego) lub 14. (przysposobienie).",
  },
  {
    type: "contract",
    label: "Zmiana pracy lub umowy",
    effect: "Nowa umowa to nowe ubezpieczenie. Prawo do zasiłku chorobowego co do zasady po 30 dniach. Wcześniejsze okresy się liczą, jeśli przerwa nie przekroczy 30 dni.",
  },
  {
    type: "salary",
    label: "Podwyżka lub obniżka",
    effect: "Sprawdźcie, czy zmiana wpłynie na podstawę zasiłku. W kalkulatorze możecie uzupełnić wynagrodzenia za poszczególne miesiące.",
  },
  {
    type: "contractEnd",
    label: "Koniec umowy",
    effect: "Umowa o pracę na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do porodu. Bez ubezpieczenia w dniu porodu nie ma zasiłku macierzyńskiego.",
  },
  {
    type: "business",
    label: "Działalność gospodarcza",
    effect: "Dobrowolne ubezpieczenie chorobowe daje prawo do zasiłku po 90 dniach. Sprawdzimy też, czy nie macie zaległości w składkach.",
  },
  {
    type: "returnToWork",
    label: "Powrót do pracy / część etatu",
    effect: "Jeśli łączycie pracę z urlopem rodzicielskim, porównajcie okres urlopu i wysokość zasiłku w kalkulatorze.",
  },
];
