"use client";

import { Info } from "lucide-react";
import { ButtonLink, LinkList, Notice, PageBand, SectionTitle } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { formatPln } from "@/lib/format";
import { estimateAmounts } from "@/lib/guide/estimate";
import { resolveGuide } from "@/lib/guide/tree";
import { useFamily } from "@/lib/use-family";

export default function Benefits() {
  const { plan, persona, entries, fromGuide, params } = useFamily();

  if (!fromGuide) {
    return (
      <main id="main-content" tabIndex={-1} className="flex flex-col">
        <PageBand title="Świadczenia" />
        <div className="page">
        <Notice className="flex flex-col items-start gap-2">
          <p>Sprawdź symulowane ubezpieczenie i dostępne formalności dla rodziny {persona.label}.</p>
          <ButtonLink href="/rodzina?z=%2Fswiadczenia" variant="outline">Sprawdź ubezpieczenie rodziców</ButtonLink>
          <ButtonLink href="/kalkulator?tryb=birth" variant="link">Oblicz zasiłek macierzyński</ButtonLink>
        </Notice>
        <section aria-labelledby="demo-benefits">
          <SectionTitle id="demo-benefits">Świadczenia i urlopy w planie</SectionTitle>
          <ul className="mt-3 grid gap-2">
            {entries.filter((entry) => !entry.extra && (entry.kind === "period" || entry.form?.startsWith("ff."))).map((entry) =>
              <li key={entry.id}><a href={`/plan#timeline-${entry.id}`} className="text-link">{entry.title}</a></li>)}
          </ul>
        </section>
        </div>
      </main>
    );
  }

  const { topics, benefits, risks, orgs } = resolveGuide(plan.guideAnswers);
  const estimate = estimateAmounts(plan.guideAnswers, new Set(topics.map((t) => t.id)), params);

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand title="Świadczenia" lead="Na podstawie Twoich odpowiedzi. O prawie do zasiłku decyduje ZUS lub płatnik składek." />
      <div className="page gap-12">

      <section aria-labelledby="przysluguje" className="flex flex-col gap-3">
        <SectionTitle id="przysluguje">Co Ci przysługuje</SectionTitle>
        {benefits.length ? (
          <ul className="grid gap-4 md:grid-cols-2">
            {benefits.map((b) => (
              <li key={b.id} className="border border-t-4 border-border border-t-brand p-5">
                <h3 className="text-lg font-bold">{b.title_pl}</h3>
                <p className="text-muted-foreground">{b.summary_pl}</p>
              </li>
            ))}
          </ul>
        ) : <Notice>Na podstawie odpowiedzi nie przysługuje Ci zasiłek z ubezpieczenia chorobowego.</Notice>}
      </section>

      {estimate && estimate.rows.length > 0 && (
        <section aria-labelledby="kwoty" className="flex flex-col gap-3">
          <SectionTitle id="kwoty">Ile możesz dostać</SectionTitle>
          <p className="text-muted-foreground">
            Szacunek brutto z podstawy około {formatPln(estimate.basis)} miesięcznie.
          </p>
          <ButtonLink href={`/kalkulator?tryb=${plan.guideAnswers.placementDate ? "adoption" : plan.guideAnswers.situation === "pregnant" ? "pregnancy" : "birth"}`} variant="outline" className="self-start">Otwórz kalkulator</ButtonLink>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {estimate.rows.map((row) => (
              <div key={row.label} className="flex flex-col border-l-4 border-primary bg-secondary p-5">
                <dt className="text-muted-foreground">{row.label}</dt>
                <dd className="order-first text-3xl leading-tight font-bold text-primary">{formatPln(row.amount)}<span className="text-base font-normal text-muted-foreground"> / mies.</span></dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {orgs.length > 0 && <section aria-labelledby="wsparcie" className="grid gap-3">
        <SectionTitle id="wsparcie">Gdzie szukać wsparcia</SectionTitle>
        <ul className="grid gap-3">{orgs.map((org) => (
          <li key={org.id}>
            <h3 className="font-bold">{org.website ? <a href={org.website} className="text-link">{org.title_pl}</a> : org.title_pl}</h3>
            <p>{org.summary_pl}</p>
          </li>
        ))}</ul>
      </section>}

      {risks.length > 0 && (
        <Disclosure className="border-l-4 border-action bg-warning-soft" label={<span className="flex items-center gap-3 font-bold"><Info aria-hidden className="size-5 shrink-0 text-action-foreground" />Ważne: na co uważać ({risks.length})</span>}>
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
        <SectionTitle id="informacje">Oficjalne informacje</SectionTitle>
        <LinkList links={[
          { label: "ZUS – formularze dotyczące zasiłków", href: "https://www.zus.pl/wzory-formularzy/zasilki", meta: "zus.pl, serwis zewnętrzny" },
          { label: "Ministerstwo Rodziny – urlop rodzicielski", href: "https://www.gov.pl/web/rodzina/urlop-rodzicielski", meta: "gov.pl, serwis zewnętrzny" },
          { label: "Państwowa Inspekcja Pracy – rodzicielstwo", href: "https://www.pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo", meta: "pip.gov.pl, serwis zewnętrzny" },
        ]} />
      </section>
      </div>
    </main>
  );
}
