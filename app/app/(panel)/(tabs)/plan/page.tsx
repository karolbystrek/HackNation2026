"use client";

import { ButtonLink, Chip, Notice, PageTitle } from "@/components/ui";
import { buildFamilyTimeline } from "@/lib/family-timeline";
import { formatDate } from "@/lib/dates";
import { useFamily } from "@/lib/use-family";

const kinds = { event: "Zdarzenie", document: "Dokument", application: "Formalność", period: "Okres opieki" };
const statuses = {
  confirmed: "Potwierdzone", planned: "Planowane", blocked: "Czeka na wcześniejszy krok",
  ready: "Do wykonania", completed: "Zakończone", late: "Termin minął",
  active: "W trakcie", ended: "Okres upłynął", review: "Sprawdź po zmianie wariantu",
};

export default function Timeline() {
  const { persona, plan, chosen, names, params } = useFamily();
  const entries = buildFamilyTimeline(persona, plan.events, chosen, params, plan.doneTasks);
  const byId = new Map(entries.map((entry) => [entry.id, entry]));

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <PageTitle lead={persona.description}>Wasza oś czasu</PageTitle>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <p className="text-muted-foreground">Stan symulacji na {formatDate(persona.fetchedAt)}</p>
        <a href="/rodzina" className="text-link min-h-11 content-center">Zobacz dane sprawy</a>
        <ButtonLink href="/dodaj" variant="outline">Dodaj wydarzenie</ButtonLink>
      </div>

      <ol className="flex flex-col">
        {entries.map((entry) => {
          const date = entry.completedOn ?? entry.due ?? entry.date;
          const after = entries.filter((item) => item.requires?.includes(entry.id));

          return (
            <li key={entry.id} id={`timeline-${entry.id}`} tabIndex={-1} className="grid scroll-mt-4 gap-2 border-t py-5 target:border-primary target:bg-secondary sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  {entry.completedOn ? "Odnotowano" : entry.due ? "Termin złożenia" : entry.estimated ? "Przewidywana data" : entry.end ? "Początek okresu" : "Data"}
                </div>
                {entry.dateNote ? <span className="font-bold">{entry.dateNote}</span> : <time dateTime={date} className="font-bold">{formatDate(date)}</time>}
                {entry.end && <> – <time dateTime={entry.end}>{formatDate(entry.end)}</time></>}
                {entry.estimated && entry.due && <p className="text-sm text-muted-foreground">Szacunkowo</p>}
              </div>
              <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Chip>{kinds[entry.kind]}</Chip>
                  <Chip>{names[entry.who]}</Chip>
                  <strong className={entry.status === "late" ? "text-sm text-destructive" : "text-sm"}>{statuses[entry.status]}</strong>
                </div>
                <h2 className="text-lg leading-snug font-bold">{entry.title}</h2>
                <p className="max-w-[70ch] text-muted-foreground">{entry.description}</p>
                {entry.review && <p className="text-sm text-muted-foreground">Poprzedni wniosek dotyczył innego podziału. Uzgodnij z pracodawcą nowy okres.</p>}
                {entry.recipient && <p className="text-sm"><strong>Adresat</strong> · {entry.recipient}</p>}
                {((entry.requires?.length ?? 0) > 0 || after.length > 0) && (
                  <ul className="space-y-1 text-sm">
                    {entry.requires?.map((id) => (
                      <li key={id}>
                        <strong>Wymaga</strong> · <a href={`#timeline-${id}`} className="text-link">{byId.get(id)?.title}</a>
                      </li>
                    ))}
                    {after.map((item) => (
                      <li key={item.id}>
                        <strong>Potrzebne do</strong> · <a href={`#timeline-${item.id}`} className="text-link">{item.title} ({names[item.who]})</a>
                      </li>
                    ))}
                  </ul>
                )}
                {entry.guide && <a href={entry.guide} className="text-link min-h-11 content-center self-start">Instrukcja · {entry.title}</a>}
                {entry.decision && (
                  <Notice className="flex flex-wrap items-center justify-between gap-3">
                    <span className="font-bold">{chosen ? `Wybrany podział opieki · ${chosen.name}` : "Wybierzcie podział opieki, aby zobaczyć terminy rodzicielskiego."}</span>
                    <ButtonLink href="/warianty" variant="outline">{chosen ? "Porównaj warianty" : "Wybierz wariant"}</ButtonLink>
                  </Notice>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </main>
  );
}
