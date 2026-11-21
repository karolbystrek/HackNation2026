"use client";

import { ButtonLink, Chip, Notice, PageTitle } from "@/components/ui";
import { diffDays, formatDate, parseIso } from "@/lib/dates";
import { useFamily } from "@/lib/use-family";

const SOURCE_LABEL = { zus: "z systemu ZUS", user: "dodane przez Was", new: "nowe" } as const;

export default function Timeline() {
  const { persona, plan, chosen, names } = useFamily();
  const events = [...plan.events].sort((a, b) => a.date.localeCompare(b.date));
  const pending = events.some((e) => e.decision) && !chosen ? 1 : 0;
  const daysToBirth = diffDays(parseIso(persona.fetchedAt)!, parseIso(persona.dueDate)!);

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <PageTitle>Wasza oś czasu</PageTitle>
        </div>
        <ButtonLink href="/dodaj">+ Dodaj wydarzenie</ButtonLink>
      </div>

      <div className="grid gap-px border bg-border sm:grid-cols-2">
        <div className="bg-secondary p-4">
          <div className="text-3xl leading-tight font-bold">{daysToBirth} dni</div>
          <div className="mt-1.5 text-[15px] text-muted-foreground">do terminu porodu ({formatDate(persona.dueDate)})</div>
        </div>
        <div className="bg-secondary p-4">
          <div className="text-3xl leading-tight font-bold">{pending}</div>
          <div className="mt-1.5 text-[15px] text-muted-foreground">{pending ? "decyzja czeka na Was" : "decyzji do podjęcia"}</div>
        </div>
      </div>

      <ol className="flex flex-col">
        {events.map((e) => (
          <li key={e.id} className="grid gap-2 border-t py-4 sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
            <time dateTime={e.date} className="font-bold">{formatDate(e.date)}</time>
            <div className="flex min-w-0 flex-col gap-2">
              <div className="flex flex-wrap gap-2">
                <Chip>{names[e.who]}</Chip>
                <Chip>{SOURCE_LABEL[e.source]}</Chip>
              </div>
              <h2 className="text-lg leading-snug font-bold">{e.title}</h2>
              <p className="max-w-[70ch] text-muted-foreground">{e.description}</p>
              {e.decision && !chosen && (
                <Notice className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="flex-[1_1_200px] text-[15px] font-bold text-foreground">Przed tym wydarzeniem: zdecydujcie, kto idzie na urlop</span>
                  <ButtonLink href="/warianty" variant="outline">
                    Porównaj opcje →
                  </ButtonLink>
                </Notice>
              )}
              {e.decision && chosen && (
                <Notice className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <span className="flex-[1_1_200px] text-[15px] font-bold text-primary">
                    Wybrano: Wariant {chosen.key} – {chosen.name}
                  </span>
                  <ButtonLink href="/zadania" variant="link">
                    Lista zadań →
                  </ButtonLink>
                </Notice>
              )}
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
