import { ButtonLink, Card, PageTitle } from "@/components/ui";

const SOURCES = [
  ["ZUS", "Ubezpieczenie, składki, podstawa wymiaru i zwolnienia e-ZLA"],
  ["KAS", "Dochody z ostatnich 12 miesięcy"],
  ["PESEL", "Dane rodziców i dzieci"],
];

export default function Home() {
  return (
    <main id="main-content" tabIndex={-1} className="page">
      <PageTitle lead="Sprawdź wysokość zasiłków, porównaj podział urlopu między rodzicami i dowiedz się, kiedy złożyć dokumenty.">
        Zaplanuj urlopy i zasiłki dla rodziców
      </PageTitle>
      <div className="flex flex-col items-start gap-3">
        <ButtonLink href="/logowanie">Przejdź do logowania demo</ButtonLink>
        <p className="max-w-[70ch] text-muted-foreground">Wersja demonstracyjna korzysta z przykładowych profili rodzin.</p>
      </div>
      <Card className="max-w-[70ch]">
        <h2 className="text-xl font-bold">Dane używane w symulacji</h2>
        <dl className="mt-2 divide-y">
          {SOURCES.map(([source, description]) => (
            <div key={source} className="grid gap-1 py-3 sm:grid-cols-[5rem_1fr]">
              <dt className="font-bold">{source}</dt>
              <dd>{description}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </main>
  );
}
