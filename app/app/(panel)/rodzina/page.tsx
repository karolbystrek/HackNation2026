"use client";

import { ButtonLink, Card, Chip, PageTitle } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { PARENTS } from "@/lib/calc/leave";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { useFamily } from "@/lib/use-family";

export default function FamilyData() {
  const { persona, params } = useFamily();

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <PageTitle lead={`Pobrane z ZUS, KAS i rejestru PESEL ${formatDate(persona.fetchedAt)} (symulacja). ${persona.parents.father.name} dołączył przez mObywatel.`}>Wasze dane</PageTitle>
      <div className="grid gap-6 md:grid-cols-2">
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
            <Card key={key}>
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-2xl font-bold">{parent.name}</h2>
                <span className="text-[15px] text-muted-foreground">{parent.age} lat</span>
              </div>
              <dl className="mt-2">
                {rows.map(([label, value, source]) => (
                  <div key={label} className="grid grid-cols-[1fr_auto] items-start gap-x-3 border-t py-2">
                    <dt className="col-span-2 text-sm text-muted-foreground">{label}</dt>
                    <dd className="font-bold">{value}</dd>
                    <dd><Chip>{source}</Chip></dd>
                  </div>
                ))}
              </dl>
            </Card>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ButtonLink href="/plan" className="min-h-[52px]">
          Dalej: Wasza oś czasu →
        </ButtonLink>
        <a href="https://www.zus.pl/ezus/logowanie" target="_blank" rel="noreferrer" className="text-link font-bold">
          Coś się nie zgadza? Zapytaj przez PUE/eZUS
        </a>
      </div>
    </main>
  );
}
