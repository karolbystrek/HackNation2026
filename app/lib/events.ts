import type { ParentKey } from "@/lib/calc/leave";

export type EventType = "birth" | "adoption" | "contract" | "salary" | "contractEnd" | "business" | "returnToWork" | "sickLeave" | "circumstance";
export type EventWho = ParentKey | "both";

export const CIRCUMSTANCES = {
  childLoss: { label: "Śmierć dziecka", forms: [] },
  zaZyciem: { label: "Otrzymanie zaświadczenia „Za życiem”", forms: [] },
  preBirthLeave: { label: "Rozpoczęcie urlopu macierzyńskiego przed porodem", forms: ["lr.maternity_pre_birth", "ff.zas2"] },
  maternityTakeover: { label: "Powrót matki po 14 tygodniach i przejęcie urlopu przez ojca", forms: ["lr.maternity_resign_14w", "lr.maternity_takeover", "ff.zas23", "ff.zas24"] },
  motherIncapacity: { label: "Przerwanie urlopu przez matkę z orzeczeniem o niezdolności do samodzielnej egzystencji", forms: ["lr.maternity_resign_incapacity"] },
  motherHospital: { label: "Przerwanie urlopu przez matkę z powodu pobytu w szpitalu", forms: ["ff.zas40", "lr.maternity_mother_hospital"] },
  motherDeath: { label: "Śmierć matki dziecka", forms: ["ff.zas33", "lr.maternity_mother_death"] },
  abandonment: { label: "Porzucenie dziecka przez matkę", forms: ["ff.zas33", "lr.maternity_abandonment"] },
  uninsuredMotherIncapacity: { label: "Niezdolność nieubezpieczonej matki do samodzielnej egzystencji", forms: ["lr.maternity_uninsured_mother_incapacity"] },
  uninsuredMotherWorks: { label: "Podjęcie pracy na co najmniej pół etatu przez nieubezpieczoną matkę", forms: ["lr.maternity_uninsured_mother_works"] },
  supplementaryLeave: { label: "Wcześniactwo lub hospitalizacja dziecka po porodzie", forms: ["lr.supplementary_maternity"] },
  employerInsolvency: { label: "Ustanie zatrudnienia w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy, bez innego zatrudnienia", forms: ["ff.zas55"] },
  sicknessAfterInsurance: { label: "Zwolnienie lekarskie po ustaniu ubezpieczenia", forms: ["ff.z10"] },
  rehabilitation: { label: "Dalsze leczenie po wyczerpaniu zasiłku chorobowego", forms: ["ff.znp7"] },
  laterSickLeave: { label: "Płatnik otrzymał kolejne e-ZLA po przekazaniu pierwszego zaświadczenia", forms: ["ff.zas12"] },
  additionalBirthCertificate: { label: "Potrzebny kolejny odpis aktu urodzenia", forms: ["civil.birth_certificate"] },
} as const;

export type Circumstance = keyof typeof CIRCUMSTANCES;

export type TimelineEvent = {
  id: string;
  type: EventType;
  circumstance?: Circumstance;
  who: EventWho;
  date: string;
  /** A period uses date as its start. A null end means the end is unknown. */
  endDate?: string | null;
  grossPay?: number;
  careFrom?: string;
  parentalWorkFraction?: number;
  insuranceEndDate?: string;
  childDetails?: {
    count: number;
    names?: string[];
    birthCardDate?: string;
    stillbirth?: boolean;
    placement?: "adoption" | "foster";
    childBirthDate?: string;
    adoptionOrderDate?: string;
    schoolDeferred?: boolean;
    zaZyciem?: boolean;
  };
  hospitalStay?: {
    gestationWeek: number;
    birthWeight: number;
    hospitalWeeks: number;
  };
  /** zus = downloaded from state systems, user = entered earlier, new = added in this session. */
  source: "zus" | "user" | "new";
  title: string;
  description: string;
  /** The event requires the family to choose a leave variant. */
  decision?: boolean;
  startsCase?: boolean;
};

export const EVENT_TYPES: { type: EventType; label: string; effect: string }[] = [
  { type: "circumstance", label: "Szczególna sytuacja rodzinna lub ubezpieczeniowa", effect: "Plan pokaże formularze związane z wybraną sytuacją. Przed wypełnieniem sprawdź warunki ich złożenia." },
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
    effect: "Nowa umowa to nowe ubezpieczenie. Prawo do zasiłku chorobowego co do zasady po 30 dniach. Wcześniejsze okresy się liczą, jeśli przerwa nie przekroczy 30 dni. Plan doda zadanie: sprawdź ubezpieczenie w dniu porodu.",
  },
  {
    type: "salary",
    label: "Podwyżka lub obniżka",
    effect: "Sprawdźcie, czy zmiana wpłynie na podstawę zasiłku. W kalkulatorze możecie uzupełnić wynagrodzenia za poszczególne miesiące.",
  },
  {
    type: "contractEnd",
    label: "Koniec umowy",
    effect: "Umowa o pracę na czas określony, która skończyłaby się po 3. miesiącu ciąży, przedłuża się do porodu. Bez ubezpieczenia w dniu porodu nie ma zasiłku macierzyńskiego. Plan doda zadanie: sprawdź ubezpieczenie w dniu porodu.",
  },
  {
    type: "business",
    label: "Działalność gospodarcza",
    effect: "Zasiłek macierzyński z działalności wymaga dobrowolnego ubezpieczenia chorobowego, a zasiłek chorobowy – 90 dni tego ubezpieczenia. Plan doda zadanie: sprawdź zgłoszenie i brak zaległości w składkach.",
  },
  {
    type: "returnToWork",
    label: "Powrót do pracy / część etatu",
    effect: "Jeśli łączycie pracę z urlopem rodzicielskim, porównajcie okres urlopu i wysokość zasiłku w kalkulatorze.",
  },
];
