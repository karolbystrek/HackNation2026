"use client";

import Link from "next/link";
import { ButtonLink, Chip, PageTitle, WhoChip } from "@/components/ui";
import { diffDays, formatDate, parseIso } from "@/lib/dates";
import { useFamily } from "@/lib/use-family";

const SOURCE_LABEL = { zus: "z systemu ZUS", user: "dodane przez Was", new: "nowe" } as const;

export default function Timeline() {
  const { persona, plan, chosen, names } = useFamily();
  const events = [...plan.events].sort((a, b) => a.date.localeCompare(b.date));
  const pending = events.some((e) => e.decision) && !chosen ? 1 : 0;
  const daysToBirth = diffDays(parseIso(persona.fetchedAt)!, parseIso(persona.dueDate)!);

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-[22px] px-5 pt-6 pb-12">
      <div className="flex flex-wrap items-end gap-3.5">
        <div className="grow">
          <PageTitle>Wasza oś czasu</PageTitle>
        </div>
        <ButtonLink href="/dodaj">+ Dodaj wydarzenie</ButtonLink>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <div className="rounded-[18px] bg-white px-5 py-[18px]">
          <div className="text-[40px] leading-none font-black">{daysToBirth} dni</div>
          <div className="mt-1.5 text-[15px] text-muted">do terminu porodu ({formatDate(persona.dueDate)})</div>
        </div>
        <div className="rounded-[18px] bg-white px-5 py-[18px]">
          <div className="text-[40px] leading-none font-black">{pending}</div>
          <div className="mt-1.5 text-[15px] text-muted">{pending ? "decyzja czeka na Was" : "decyzji do podjęcia"}</div>
        </div>
      </div>

      <ol className="flex flex-col">
        {events.map((e) => (
          <li key={e.id} className="flex gap-3 sm:gap-3.5">
            <div className="w-[76px] shrink-0 pt-[18px] text-right text-sm font-extrabold sm:w-[86px]">{formatDate(e.date)}</div>
            <div className="flex shrink-0 flex-col items-center" aria-hidden="true">
              <span className="h-5 w-0.5 bg-line-strong" />
              <span className={`size-3.5 shrink-0 rounded-full ${e.source === "new" ? "bg-dad" : e.decision ? "bg-brand ring-4 ring-mom-chip" : "bg-stone"}`} />
              <span className="w-0.5 grow bg-line-strong" />
            </div>
            <div className="min-w-0 grow pt-1.5 pb-3.5">
              <div className="flex flex-col gap-2 rounded-2xl bg-white px-[18px] py-4">
                <div className="flex flex-wrap gap-1.5">
                  <WhoChip who={e.who} label={names[e.who]} />
                  <Chip tone={e.source === "new" ? "solid" : "sand"}>{SOURCE_LABEL[e.source]}</Chip>
                </div>
                <div className="text-lg leading-snug font-extrabold">{e.title}</div>
                <div className="text-[15px] leading-relaxed text-muted">{e.description}</div>
                {e.decision && !chosen && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5 rounded-xl bg-warn-soft px-3.5 py-3">
                    <span className="flex-[1_1_200px] text-[15px] font-extrabold text-warn">Przed tym wydarzeniem: zdecydujcie, kto idzie na urlop</span>
                    <Link href="/warianty" className="flex min-h-11 items-center rounded-full border-2 border-warn px-[18px] text-[15px] font-extrabold text-warn hover:bg-white/40">
                      Porównaj opcje →
                    </Link>
                  </div>
                )}
                {e.decision && chosen && (
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl bg-brand-soft px-3.5 py-3">
                    <span className="flex-[1_1_200px] text-[15px] font-extrabold text-brand-deep">
                      Wybrano: Wariant {chosen.key} – {chosen.name}
                    </span>
                    <Link href="/zadania" className="min-h-11 content-center font-extrabold text-brand underline">
                      Lista zadań →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </li>
        ))}
      </ol>
    </main>
  );
}
