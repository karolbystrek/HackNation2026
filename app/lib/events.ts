import type { ParentKey } from "@/lib/calc/leave";

export type EventType = "birth" | "adoption" | "contract" | "salary" | "contractEnd" | "business" | "returnToWork" | "sickLeave" | "circumstance";
export type EventWho = ParentKey | "both";

export const CIRCUMSTANCES = {
  childLoss: { label: "Śmierć dziecka", forms: [], dateLabel: "Data śmierci dziecka", effect: "Plan uwzględni zdarzenie przy ustalaniu okresów świadczeń." },
  zaZyciem: { label: "Otrzymanie zaświadczenia „Za życiem”", forms: [], dateLabel: "Data otrzymania zaświadczenia", effect: "Plan uwzględni zaświadczenie przy planowaniu urlopu rodzicielskiego." },
  preBirthLeave: { label: "Rozpoczęcie urlopu macierzyńskiego przed porodem", forms: ["lr.maternity_pre_birth", "ff.zas2"], dateLabel: "Planowany pierwszy dzień urlopu", effect: "Jeśli jesteś pracownicą, przygotuj wniosek do pracodawcy oraz zaświadczenie o przewidywanej dacie porodu." },
  maternityTakeover: { label: "Powrót matki po 14 tygodniach i przejęcie urlopu przez ojca", forms: ["lr.maternity_resign_14w", "lr.maternity_takeover", "ff.zas23", "ff.zas24"], dateLabel: "Data powrotu matki do pracy", effect: "Wpisz uzgodnioną datę przekazania opieki. Formalności zależą od zatrudnienia obojga rodziców i płatnika zasiłku." },
  motherIncapacity: { label: "Przerwanie urlopu przez matkę z orzeczeniem o niezdolności do samodzielnej egzystencji", forms: ["lr.maternity_resign_incapacity"], dateLabel: "Data powrotu matki do pracy", effect: "Przygotuj orzeczenie, które będzie potrzebne przy rezygnacji z urlopu." },
  motherHospital: { label: "Przerwanie urlopu przez matkę z powodu pobytu w szpitalu", forms: ["ff.zas40", "lr.maternity_mother_hospital"], dateLabel: "Data przyjęcia matki do szpitala", effect: "Poproś szpital o zaświadczenie. Podaj osobno datę rozpoczęcia opieki przez drugą osobę, jeśli ją znasz." },
  motherDeath: { label: "Śmierć matki dziecka", forms: ["ff.zas33", "lr.maternity_mother_death"], dateLabel: "Data śmierci matki", effect: "Uzupełnij datę przejęcia opieki, aby użyć jej we wniosku lub oświadczeniu dotyczącym pozostałego okresu." },
  abandonment: { label: "Porzucenie dziecka przez matkę", forms: ["ff.zas33", "lr.maternity_abandonment"], dateLabel: "Data porzucenia dziecka", effect: "Jeśli opieka zaczęła się w innym dniu, podaj tę datę osobno." },
  uninsuredMotherIncapacity: { label: "Niezdolność nieubezpieczonej matki do samodzielnej egzystencji", forms: ["lr.maternity_uninsured_mother_incapacity"], dateLabel: "Data rozpoczęcia opieki przez ojca", effect: "Przygotuj orzeczenie matki do wniosku ojca o urlop." },
  uninsuredMotherWorks: { label: "Podjęcie pracy na co najmniej pół etatu przez nieubezpieczoną matkę", forms: ["lr.maternity_uninsured_mother_works"], dateLabel: "Data podjęcia pracy przez matkę", effect: "Wpisz datę rozpoczęcia zatrudnienia wskazaną w umowie matki." },
  supplementaryLeave: { label: "Wcześniactwo lub hospitalizacja dziecka po porodzie", forms: ["lr.supplementary_maternity"], dateLabel: "Data rozpoczęcia hospitalizacji dziecka", effect: "Użyj danych z zaświadczenia szpitala i wskaż rodzica, który chce skorzystać z urlopu uzupełniającego." },
  employerInsolvency: { label: "Ustanie zatrudnienia w ciąży z powodu upadłości, likwidacji lub śmierci pracodawcy, bez innego zatrudnienia", forms: ["ff.zas55"], dateLabel: "Data ustania zatrudnienia", effect: "Skorzystaj z daty wskazanej w dokumencie potwierdzającym rozwiązanie lub wygaśnięcie umowy." },
  sicknessAfterInsurance: { label: "Zwolnienie lekarskie po ustaniu ubezpieczenia", forms: ["ff.z10"], dateLabel: "Początek zwolnienia", effect: "Przepisz daty zwolnienia oraz datę ustania ubezpieczenia chorobowego." },
  rehabilitation: { label: "Dalsze leczenie po wyczerpaniu zasiłku chorobowego", forms: ["ff.znp7"], dateLabel: "Planowana data rozpoczęcia świadczenia", effect: "Przygotuj wniosek ZNp-7 i poproś lekarza prowadzącego o zaświadczenie o stanie zdrowia." },
  laterSickLeave: { label: "Płatnik otrzymał kolejne e-ZLA po przekazaniu pierwszego zaświadczenia", forms: ["ff.zas12"], dateLabel: "Data otrzymania kolejnego e-ZLA", effect: "Podaj dzień, w którym płatnik otrzymał zwolnienie. Plan użyje tej daty do ustalenia terminu dla płatnika." },
  additionalBirthCertificate: { label: "Potrzebny kolejny odpis aktu urodzenia", forms: ["civil.birth_certificate"], dateLabel: "Data dodania potrzeby odpisu", effect: "Wypełnij wniosek do USC, gdy potrzebujesz kolejnego odpisu aktu urodzenia." },
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
  { type: "circumstance", label: "Szczególna sytuacja rodzinna lub ubezpieczeniowa", effect: "Plan pokaże wnioski i dokumenty związane z wybraną sytuacją. Przed wypełnieniem sprawdź warunki ich złożenia." },
  { type: "sickLeave", label: "Zwolnienie w ciąży", effect: "W Planie możecie sprawdzić szacowany zasiłek od daty rozpoczęcia zwolnienia." },
  { type: "birth", label: "Narodziny dziecka", effect: "Pojawi się decyzja: kto i jak długo idzie na urlop. Porównamy dla Was warianty." },
  {
    type: "adoption",
    label: "Adopcja / rodzina zastępcza",
    effect: "Plan uwzględni rodzaj przyjęcia, wiek dziecka i daty z dokumentów, aby pokazać odpowiednie okresy opieki i formalności.",
  },
  {
    type: "contract",
    label: "Zmiana pracy lub umowy",
    effect: "W planie pojawi się krok do sprawdzenia ubezpieczenia w dniu porodu. Przygotuj daty poprzedniej i nowej umowy oraz informację o ubezpieczeniu chorobowym.",
  },
  {
    type: "salary",
    label: "Podwyżka lub obniżka",
    effect: "Sprawdźcie, czy zmiana wpłynie na podstawę zasiłku. W kalkulatorze możecie uzupełnić wynagrodzenia za poszczególne miesiące.",
  },
  {
    type: "contractEnd",
    label: "Koniec umowy",
    effect: "Plan podpowie sprawdzenie prawa do świadczeń. Przygotuj datę i przyczynę zakończenia umowy. Jeśli w ciąży doszło do upadłości, likwidacji lub śmierci pracodawcy, sprawdź też szczególne sytuacje.",
  },
  {
    type: "business",
    label: "Działalność gospodarcza",
    effect: "Plan doda krok do sprawdzenia zgłoszenia do ubezpieczenia chorobowego i zaległości w składkach. Do obliczeń przygotuj podstawy składek.",
  },
  {
    type: "returnToWork",
    label: "Powrót do pracy / część etatu",
    effect: "Jeśli łączycie pracę z urlopem rodzicielskim, porównajcie okres urlopu i wysokość zasiłku w kalkulatorze.",
  },
];
