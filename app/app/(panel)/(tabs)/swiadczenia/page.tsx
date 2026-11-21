"use client";

import { ButtonLink, Notice, PageTitle } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { formatPln } from "@/lib/format";
import { estimateAmounts } from "@/lib/guide/estimate";
import { resolveGuide } from "@/lib/guide/tree";
import { useFamily } from "@/lib/use-family";

export default function Benefits() {
  const { plan, persona, entries, fromGuide, params } = useFamily();

  if (!fromGuide) {
    return (
      <main id="main-content" tabIndex={-1} className="page max-w-3xl">
        <PageTitle>Świadczenia</PageTitle>
        <Notice className="flex flex-col items-start gap-2">
          <p>Sprawdź symulowane ubezpieczenie i dostępne formalności dla rodziny {persona.label}.</p>
          <ButtonLink href="/rodzina?z=%2Fswiadczenia" variant="outline">Sprawdź ubezpieczenie rodziców</ButtonLink>
          <ButtonLink href="/kalkulator?tryb=birth" variant="link">Oblicz zasiłek macierzyński</ButtonLink>
        </Notice>
        <section aria-labelledby="demo-benefits">
          <h2 id="demo-benefits" className="text-2xl font-bold">Świadczenia i urlopy w planie</h2>
          <ul className="mt-3 grid gap-2">
            {entries.filter((entry) => !entry.extra && (entry.kind === "period" || entry.form?.startsWith("ff."))).map((entry) =>
              <li key={entry.id}><a href={`/plan#timeline-${entry.id}`} className="text-link">{entry.title}</a></li>)}
          </ul>
        </section>
      </main>
    );
  }

  const { topics, benefits, risks, orgs } = resolveGuide(plan.guideAnswers);
  const estimate = estimateAmounts(plan.guideAnswers, new Set(topics.map((t) => t.id)), params);

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      <PageTitle lead="Na podstawie Twoich odpowiedzi. O prawie do zasiłku decyduje ZUS lub płatnik składek.">Świadczenia</PageTitle>

      <section aria-labelledby="przysluguje" className="flex flex-col gap-3">
        <h2 id="przysluguje" className="text-2xl font-bold">Co Ci przysługuje</h2>
        {benefits.length ? (
          <ul className="grid gap-4">
            {benefits.map((b) => (
              <li key={b.id} className="border-l-4 border-primary pl-4">
                <h3 className="text-lg font-bold">{b.title_pl}</h3>
                <p className="text-muted-foreground">{b.summary_pl}</p>
              </li>
            ))}
          </ul>
        ) : <Notice>Na podstawie odpowiedzi nie przysługuje Ci zasiłek z ubezpieczenia chorobowego.</Notice>}
      </section>

      {estimate && estimate.rows.length > 0 && (
        <section aria-labelledby="kwoty" className="flex flex-col gap-3">
          <h2 id="kwoty" className="text-2xl font-bold">Ile możesz dostać</h2>
          <p className="text-muted-foreground">
            Szacunek brutto z podstawy około {formatPln(estimate.basis)} miesięcznie.
          </p>
          <ButtonLink href={`/kalkulator?tryb=${plan.guideAnswers.placementDate ? "adoption" : plan.guideAnswers.situation === "pregnant" ? "pregnancy" : "birth"}`} variant="outline" className="self-start">Otwórz kalkulator</ButtonLink>
          <dl className="divide-y border-y">
            {estimate.rows.map((row) => (
              <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_10rem] sm:gap-4">
                <dt>{row.label}</dt>
                <dd className="font-bold sm:text-right">{formatPln(row.amount)} / mies.</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {orgs.length > 0 && <section aria-labelledby="wsparcie" className="grid gap-3">
        <h2 id="wsparcie" className="text-2xl font-bold">Gdzie szukać wsparcia</h2>
        <ul className="grid gap-3">{orgs.map((org) => (
          <li key={org.id}>
            <h3 className="font-bold">{org.website ? <a href={org.website} className="text-link">{org.title_pl}</a> : org.title_pl}</h3>
            <p>{org.summary_pl}</p>
          </li>
        ))}</ul>
      </section>}

      {risks.length > 0 && (
        <Disclosure className="border-y" label={<span className="font-bold">Na co uważać ({risks.length})</span>}>
          <ul className="grid gap-4 px-3 pb-4 sm:px-4">
            {risks.map((r) => (
              <li key={r.id}>
                <h3 className="font-bold">{r.title_pl}</h3>
                <p>{r.consequence_pl}</p>
                <p className="mt-1"><strong>Jak tego uniknąć:</strong> {r.prevention_pl}</p>
              </li>
            ))}
          </ul>
        </Disclosure>
      )}
      <section aria-labelledby="informacje" className="grid gap-2">
        <h2 id="informacje" className="text-2xl font-bold">Oficjalne informacje</h2>
        <a className="text-link" href="https://www.zus.pl/wzory-formularzy/zasilki">ZUS – formularze dotyczące zasiłków</a>
        <a className="text-link" href="https://www.gov.pl/web/rodzina/urlop-rodzicielski">Ministerstwo Rodziny – urlop rodzicielski</a>
        <a className="text-link" href="https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo">Państwowa Inspekcja Pracy – rodzicielstwo</a>
      </section>
    </main>
  );
}
