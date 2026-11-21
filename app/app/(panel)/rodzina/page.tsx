"use client";

import { ButtonLink, PageTitle } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { PARENTS } from "@/lib/calc/leave";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

export default function FamilyData() {
  const { persona, params } = useFamily();

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-[22px] px-5 pt-9 pb-12">
      <PageTitle lead={`Pobrane z ZUS, KAS i rejestru PESEL ${formatDate(persona.fetchedAt)} (symulacja). ${persona.parents.father.name} dołączył przez mObywatel.`}>Wasze dane</PageTitle>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
        {PARENTS.map((key) => {
          const parent = persona.parents[key];
          const last = parent.monthlyGross[parent.monthlyGross.length - 1];
          const rows: [string, string, string][] = [
            ["Zatrudnienie", parent.employment, "ZUS"],
            ["Kto wypłaca zasiłek", parent.payer, "ZUS"],
            ["Wynagrodzenie brutto", `${formatPln(last)} / mies.`, "KAS"],
            ["Podstawa wymiaru zasiłku", formatPln(computeBasis(parent.monthlyGross, params).basis, 2), "ZUS"],
            ["Ubezpieczenie chorobowe", parent.insurance, "ZUS"],
            ["Składki", parent.contributions, "ZUS"],
            ["Zwolnienia e-ZLA", parent.sickLeaveFrom ? `Aktywne od ${formatDate(parent.sickLeaveFrom)}, kod B` : "Brak", "ZUS"],
          ];
          return (
            <section key={key} className={`flex flex-col gap-1 rounded-[20px] border-t-[6px] bg-white px-[22px] py-5 ${key === "mother" ? "border-brand" : "border-dad"}`}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-2xl font-black">{parent.name}</h2>
                <span className="text-[15px] text-muted">{parent.age} lat</span>
              </div>
              {rows.map(([label, value, source]) => (
                <div key={label} className="flex items-start gap-2.5 border-t border-line-soft py-2.5">
                  <div className="min-w-0 grow">
                    <div className="text-[13px] text-muted">{label}</div>
                    <div className="font-bold">{value}</div>
                  </div>
                  <span className="shrink-0 rounded-md bg-sand px-[7px] py-[3px] text-[11px] font-extrabold text-muted">{source}</span>
                </div>
              ))}
            </section>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href="/plan" className="min-h-[52px]">
          Dalej: Wasza oś czasu →
        </ButtonLink>
        <a href="https://www.zus.pl/ezus/logowanie" target="_blank" rel="noreferrer" className="font-bold text-brand hover:underline">
          Coś się nie zgadza? Zapytaj przez PUE/eZUS
        </a>
      </div>
    </main>
  );
}
