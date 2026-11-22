"use client";

import { FamilyTimeline } from "@/components/family-timeline";
import { ButtonLink, PageBand } from "@/components/ui";
import { switchChildCase } from "@/lib/plan-store";
import { formatDate } from "@/lib/dates";
import { attentionEntries } from "@/lib/timeline-view";
import { useFamily } from "@/lib/use-family";

export default function Timeline() {
  const { caseLabel, persona, plan, fromGuide, viewer, solo, chosen, names, entries, today } = useFamily();
  const attention = attentionEntries(entries, today);
  const childEvent = persona.events.find((event) => event.type === "birth" || event.type === "adoption");

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title={solo ? "Twój plan" : `Twój plan – ${names[viewer]}`}
        lead={fromGuide ? "Na podstawie Twoich odpowiedzi. Daty przed porodem są szacunkowe." : childEvent?.type === "adoption" ? caseLabel : persona.birthDate
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
      {!!plan.savedCases?.length && (
        <label className="mb-6 flex max-w-md flex-col gap-2 font-bold">
          Sprawa dziecka
          <select className="min-h-11 rounded-sm border border-input bg-background px-3 font-normal"
            value={plan.activeCaseId ?? "initial"} onChange={(event) => switchChildCase(event.target.value, caseLabel)}>
            <option value={plan.activeCaseId ?? "initial"}>{caseLabel}</option>
            {plan.savedCases.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
      )}
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
