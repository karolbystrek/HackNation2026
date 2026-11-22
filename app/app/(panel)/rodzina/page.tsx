"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackLink, Button, Card, Chip, PageBand } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { Disclosure } from "@/components/ui/disclosure";
import { useFamily } from "@/lib/use-family";
import { debtOn } from "@/lib/mock/personas";

const returnPages = new Map([
  ["/plan", "Wróć do planu"],
  ["/kalkulator", "Wróć do kalkulatora"],
  ["/wnioski", "Wróć do wniosków"],
  ["/swiadczenia", "Wróć do świadczeń"],
  ["/warianty", "Wróć do wariantów"],
  ["/dodaj", "Wróć do dodawania wydarzenia"],
]);

export default function FamilyPage() {
  return <Suspense><FamilyData /></Suspense>;
}

function FamilyData() {
  const { persona, fromGuide, params, entries, viewer } = useFamily();
  const from = useSearchParams().get("z") ?? "";
  const returnLabel = returnPages.get(from.split("?")[0]);
  const [question, setQuestion] = useState("insurance");
  const [debtBenefit, setDebtBenefit] = useState<"maternity" | "sickness">("maternity");
  const parent = persona.parents[viewer];
  const debtDate = debtBenefit === "sickness" ? parent.sickLeaveFrom : persona.birthDate ?? persona.dueDate;
  const debt = fromGuide ? null : debtOn(parent, debtDate);
  const [reply, setReply] = useState<string | null>(null);

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand title="Twoje dane i dane dziecka" lead={fromGuide ? "Wprowadzone w formularzu." : `Pobrane z ZUS, KAS i rejestru PESEL ${formatDate(persona.fetchedAt)} (symulacja).`} />
      <div className="page">
      <BackLink href={returnLabel ? from : "/plan"}>{returnLabel ?? "Wróć do osi czasu"}</BackLink>
      <Card>
        <h2 className="text-xl font-bold">Dane sprawy użyte na osi czasu</h2>
        <dl className="mt-2 grid gap-3 sm:grid-cols-2">
          {[
            ["Przewidywany termin porodu", formatDate(persona.dueDate)],
            ["Rzeczywista data urodzenia", persona.birthDate ? formatDate(persona.birthDate) : "Oczekuje na poród"],
            ["Imię dziecka", persona.childName ?? "Brak danych"],
            ["Miejsce urodzenia", persona.birthPlace ?? "Brak danych"],
            ["Data wystawienia karty urodzenia", persona.birthCardDate ? formatDate(persona.birthCardDate) : "Brak karty"],
            ["Zgłoszenie do USC", persona.birthRegistrationDate ? formatDate(persona.birthRegistrationDate) : "Oczekuje na zgłoszenie"],
            ["Akt urodzenia", persona.birthCertificateDate ? formatDate(persona.birthCertificateDate) : "Oczekuje na sporządzenie"],
            ...(viewer === "father" ? [["Planowany początek ojcowskiego", formatDate(persona.paternityStart)]] : []),
            ...(persona.wantsAveragedRate ? [["Preferowana stawka zasiłku", "81,5% (jeśli pozwala na to podział urlopu)"]] : []),
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-sm text-muted-foreground">{label}</dt><dd>{value}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <div className="grid gap-6 md:grid-cols-2">
        {[viewer].map((key) => {
          const parent = persona.parents[key];
          const last = parent.monthlyGross[parent.monthlyGross.length - 1];
          const rows: [string, string, string][] = [
            ["Zatrudnienie", parent.employment, "ZUS"],
            ["Kto wypłaca zasiłek", parent.payer, "ZUS"],
            ["Wynagrodzenie brutto", `${formatPln(last)} / mies.`, "KAS"],
            ["Podstawa wymiaru zasiłku", formatPln(computeBasis(parent.monthlyGross, params, parent.contract).basis, 2), "ZUS"],
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
      <Disclosure className="border-y" label={<strong>Sprawdź stan składek w symulacji eZUS</strong>}>
        <div className="grid gap-3 px-3 pb-4">
          <label className="grid gap-1 font-bold">
            Dzień sprawdzenia zadłużenia
            <select className="min-h-11 rounded-sm border border-input bg-background px-3 font-normal" value={debtBenefit}
              onChange={(event) => setDebtBenefit(event.target.value === "sickness" ? "sickness" : "maternity")}>
              <option value="maternity">Zasiłek macierzyński – dzień porodu</option>
              <option value="sickness" disabled={!parent.sickLeaveFrom}>Zasiłek chorobowy – dzień rozpoczęcia zwolnienia</option>
            </select>
          </label>
          {debtDate && <p>Przykładowe zaświadczenie o zadłużeniu na dzień {formatDate(debtDate)}.</p>}
          <dl><div className="flex gap-2">
            <dt>Zadłużenie z tytułu składek ({parent.name})</dt>
            <dd className="font-bold">{debtDate && debt !== null ? formatPln(debt, 2) : "Brak danych w symulacji"}</dd>
          </div></dl>
          {!!debt && debt > params.minWage * params.contributionDebtLimitRate && parent.contract === "jdg" && (
            <p className="text-sm">Zaległość przekracza {formatPln(params.minWage * params.contributionDebtLimitRate, 2)}, więc ZUS wypłaci zasiłek dopiero po jej spłacie.</p>
          )}
          <Disclosure label={<strong>Zaświadczenia e-ZLA</strong>}>
            <ul className="space-y-2 px-3 pb-3">
              {entries.filter((entry) => entry.kind === "event" && entry.title.includes("e-ZLA")).map((entry) =>
                <li key={entry.id}>{entry.title}. Od {formatDate(entry.date)}{entry.end ? ` do ${formatDate(entry.end)}` : ""}.</li>)}
              {!entries.some((entry) => entry.kind === "event" && entry.title.includes("e-ZLA")) && <li>Brak zaświadczeń w symulacji.</li>}
            </ul>
          </Disclosure>
          <form className="flex flex-col items-start gap-2" onSubmit={(event) => {
            event.preventDefault();
            const sickNotes = entries.filter((entry) => entry.kind === "event" && entry.title.includes("e-ZLA"))
              .map((entry) => `od ${formatDate(entry.date)}${entry.end ? ` do ${formatDate(entry.end)}` : ""}`);
            setReply(question === "insurance"
              ? `Ubezpieczenie chorobowe: ${parent.insurance}. Składki: ${parent.contributions}.`
              : sickNotes.length ? `Zaświadczenia e-ZLA na koncie: ${sickNotes.join("; ")}.` : "Na koncie nie ma zaświadczeń e-ZLA.");
          }}>
            <label className="grid gap-1 font-bold">O co chcesz zapytać w symulacji?
              <select className="min-h-11 rounded-sm border border-input bg-background px-3 font-normal" value={question}
                onChange={(event) => { setQuestion(event.target.value); setReply(null); }}>
                <option value="insurance">Stan ubezpieczenia chorobowego</option>
                <option value="e-zla">Zwolnienia lekarskie e-ZLA</option>
              </select>
            </label>
            <Button type="submit" variant="outline">Sprawdź w symulacji</Button>
            {reply && <p role="status">{reply}</p>}
          </form>
          <a href="https://www.zus.pl/ezus/logowanie" className="text-link">Otwórz oficjalny serwis eZUS</a>
        </div>
      </Disclosure>
    </div>
    </main>
  );
}
