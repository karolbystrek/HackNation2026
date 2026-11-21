import { ButtonLink } from "@/components/ui";

const SOURCES = [
  ["ZUS", "ubezpieczenia, składki i zaległości, podstawę wymiaru, zwolnienia e-ZLA"],
  ["KAS", "dochody z ostatnich 12 miesięcy"],
  ["PESEL", "wiek, dzieci, stan cywilny"],
];

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-wrap items-center gap-8 px-5 py-10 sm:py-12">
      <div className="flex flex-[1_1_380px] flex-col gap-[18px]">
        <h1 className="text-[32px] leading-[1.1] font-black sm:text-[40px]">Zaplanujcie urlop i zasiłki – razem i na spokojnie</h1>
        <p className="text-lg leading-relaxed text-muted">
          Pobierzemy Wasze dane z systemów państwowych, pokażemy, co Wam przysługuje, i porównamy warianty, zanim podejmiecie decyzję.
        </p>
        <ButtonLink href="/logowanie" className="min-h-14 self-start px-7 text-[17px]">
          Zaloguj się przez mObywatel (symulacja)
        </ButtonLink>
        <p className="text-sm text-muted">Drugi rodzic dołącza przez zaproszenie i loguje się swoim mObywatelem.</p>
      </div>
      <div className="flex flex-[1_1_300px] flex-col gap-3.5 rounded-[20px] bg-white p-6">
        <div className="text-[15px] font-extrabold">Po zalogowaniu pobierzemy:</div>
        {SOURCES.map(([source, text]) => (
          <div key={source} className="flex items-start gap-3">
            <span className="w-14 shrink-0 rounded-md bg-brand-soft py-1 text-center text-xs font-extrabold text-brand">{source}</span>
            <span className="text-[15px] leading-snug">{text}</span>
          </div>
        ))}
      </div>
    </main>
  );
}
