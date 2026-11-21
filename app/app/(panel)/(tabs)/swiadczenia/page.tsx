"use client";

import { ButtonLink, Notice, PageTitle } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { formatPln } from "@/lib/format";
import { estimateAmounts } from "@/lib/guide/estimate";
import { resolveGuide } from "@/lib/guide/tree";
import { useFamily } from "@/lib/use-family";

export default function Benefits() {
  const { plan, fromGuide, params } = useFamily();

  if (!fromGuide) {
    return (
      <main id="main-content" tabIndex={-1} className="page max-w-3xl">
        <PageTitle>Świadczenia</PageTitle>
        <Notice className="flex flex-col items-start gap-2">
          <p>Lista świadczeń powstaje z odpowiedzi w formularzu. Profil demonstracyjny jej nie zawiera.</p>
          <ButtonLink href="/nowa-os" variant="outline">Wypełnij formularz</ButtonLink>
        </Notice>
      </main>
    );
  }

  const { topics, benefits, risks } = resolveGuide(plan.guideAnswers);
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
            Szacunek brutto z podstawy około {formatPln(estimate.basis)} miesięcznie. Dokładnie policzysz w zakładce Kalkulatory.
          </p>
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
    </main>
  );
}
