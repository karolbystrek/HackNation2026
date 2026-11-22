"use client";

import { Select } from "@base-ui/react/select";
import { Check, ChevronDown } from "lucide-react";
import { FamilyTimeline } from "@/components/family-timeline";
import { ButtonLink, PageBand } from "@/components/ui";
import { switchChildCase } from "@/lib/plan-store";
import { formatDate } from "@/lib/dates";
import { attentionEntries } from "@/lib/timeline-view";
import { useFamily } from "@/lib/use-family";

export default function Timeline() {
  const { caseLabel, persona, plan, fromGuide, viewer, solo, chosen, names, entries, today } = useFamily();
  const attention = attentionEntries(entries, today);
  const activeCaseId = plan.activeCaseId ?? "initial";
  const cases = [{ value: activeCaseId, label: caseLabel }, ...(plan.savedCases ?? []).map(({ id, label }) => ({ value: id, label }))];
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
        <Select.Root
          items={cases}
          value={activeCaseId}
          onValueChange={(id) => { if (id) switchChildCase(id, caseLabel); }}
        >
          <div className="mb-6 flex max-w-md flex-col gap-2">
            <span id="child-case-label" className="font-bold">Sprawa dziecka</span>
            <Select.Trigger aria-labelledby="child-case-label" className="flex min-h-11 w-full items-center justify-between gap-3 rounded-sm border border-input bg-background px-3 text-left hover:border-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              <Select.Value />
              <Select.Icon><ChevronDown aria-hidden="true" className="size-4 text-primary" /></Select.Icon>
            </Select.Trigger>
          </div>
          <Select.Portal>
            <Select.Positioner align="start" sideOffset={4} alignItemWithTrigger={false} className="isolate z-50">
              <Select.Popup className="max-h-[var(--available-height)] w-[var(--anchor-width)] overflow-auto rounded-sm border border-border bg-background p-1 text-foreground shadow-sm">
                <Select.List>
                  {cases.map(({ value, label }) => (
                    <Select.Item key={value} value={value} className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-sm px-2 data-highlighted:bg-primary-soft data-highlighted:text-primary data-selected:font-semibold">
                      <Select.ItemText>{label}</Select.ItemText>
                      <Select.ItemIndicator><Check aria-hidden="true" className="size-4 text-primary" /></Select.ItemIndicator>
                    </Select.Item>
                  ))}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>
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
