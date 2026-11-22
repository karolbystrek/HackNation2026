"use client";

import { FamilyTimeline } from "@/components/family-timeline";
import { ButtonLink, PageBand } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { attentionEntries } from "@/lib/timeline-view";
import { useFamily } from "@/lib/use-family";

export default function Timeline() {
  const { persona, plan, fromGuide, viewer, solo, chosen, names, entries, today } = useFamily();
  const attention = attentionEntries(entries, today);

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title={solo ? "Twój plan" : `Twój plan – ${names[viewer]}`}
        lead={fromGuide ? "Na podstawie Twoich odpowiedzi. Daty przed porodem są szacunkowe." : persona.birthDate
          ? <span className="flex flex-wrap items-baseline gap-x-3">
              <span className="font-bold">{persona.childName ?? "Dziecko"}</span>
              <span>Data urodzenia <time dateTime={persona.birthDate}>{formatDate(persona.birthDate)}</time></span>
            </span>
          : `Przewidywany termin porodu: ${formatDate(persona.dueDate)}`}
        actions={<>
          {fromGuide && <ButtonLink href="/nowa-os" variant="link">Zmień odpowiedzi</ButtonLink>}
          <ButtonLink href="/dodaj" variant="outline">Dodaj wydarzenie</ButtonLink>
        </>}
      />

      <div className="page">
      <FamilyTimeline profileEvents={fromGuide ? [] : persona.events.filter((event) => event.who === "both" || event.who === viewer)} entries={entries} names={names} today={today} actions={<>
        <ButtonLink href="/zadania" variant={attention.length > 0 ? "primary" : "outline"}>Lista zadań</ButtonLink>
        <ButtonLink href="/warianty" variant={attention.length > 0 || chosen ? "link" : "primary"}>
          {chosen ? "Zmień podział urlopu" : "Zaplanuj podział urlopu"}
        </ButtonLink>
        {fromGuide && !plan.customLeave && <ButtonLink
          href={`/kalkulator?tryb=${plan.guideAnswers.placementDate ? "adoption" : "birth"}`} variant="outline">
          Oblicz zasiłek i porównaj podział urlopu
        </ButtonLink>}
      </>} />
      </div>
    </main>
  );
}
