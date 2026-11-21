"use client";

import { FamilyTimeline } from "@/components/family-timeline";
import { ButtonLink, PageTitle } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { attentionEntries } from "@/lib/timeline-view";
import { useFamily } from "@/lib/use-family";

export default function Timeline() {
  const { persona, fromGuide, chosen, names, entries, today } = useFamily();
  const attention = attentionEntries(entries, today);

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageTitle lead={fromGuide ? "Na podstawie Twoich odpowiedzi. Daty przed porodem są szacunkowe." : persona.birthDate
          ? <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-bold">{persona.childName ?? "Dziecko"}</span>
              <span>Data urodzenia <time dateTime={persona.birthDate}>{formatDate(persona.birthDate)}</time></span>
            </span>
          : `Przewidywany termin porodu: ${formatDate(persona.dueDate)}`}
        >
          {fromGuide ? "Twój plan" : "Plan rodziny"}
        </PageTitle>
        {fromGuide
          ? <ButtonLink href="/nowa-os" variant="link">Zmień odpowiedzi</ButtonLink>
          : <ButtonLink href="/dodaj" variant="link">Dodaj wydarzenie</ButtonLink>}
      </div>

      <FamilyTimeline entries={entries} names={names} today={today} actions={<>
        <ButtonLink href="/zadania" variant={attention.length > 0 ? "primary" : "outline"}>Lista zadań</ButtonLink>
        {!fromGuide && <ButtonLink href="/warianty" variant={attention.length > 0 || chosen ? "link" : "primary"}>
          {chosen ? "Porównaj warianty urlopu" : "Zaplanuj podział urlopu"}
        </ButtonLink>}
      </>} />
    </main>
  );
}
