"use client";

import Link from "next/link";
import { Button, ButtonLink, Chip, PageTitle } from "@/components/ui";
import { buildTasks } from "@/lib/calc/tasks";
import { tasksToIcs } from "@/lib/ics";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Tasks() {
  const { persona, params, chosen, plan, names } = useFamily();

  if (!chosen)
    return (
      <main id="main-content" tabIndex={-1} className="page">
        <div className="flex flex-col items-start gap-3.5 ">
          <PageTitle>Wybierzcie wariant urlopu</PageTitle>
          <p className="text-muted-foreground">Lista zadań i wniosków powstanie na podstawie Waszej decyzji.</p>
          <ButtonLink href="/warianty">Porównaj opcje →</ButtonLink>
        </div>
      </main>
    );

  const tasks = buildTasks(persona, chosen, params);
  const done = tasks.filter((t) => plan.doneTasks.includes(t.id)).length;

  function downloadCalendar() {
    const url = URL.createObjectURL(new Blob([tasksToIcs(tasks)], { type: "text/calendar" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "przewodnik-rodzica.ics" });
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
        <div className="grow">
          <PageTitle>Wasza lista zadań</PageTitle>
          <div className="text-[15px] text-muted-foreground">
            Wariant {chosen.key} – {chosen.name} ·{" "}
            <Link href="/warianty" className="font-bold text-primary underline">
              zmień wariant
            </Link>
          </div>
        </div>
        <Button variant="outline" onClick={downloadCalendar}>
          Dodaj terminy do kalendarza
        </Button>
      </div>

      <label className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>Ukończono {done} z {tasks.length} zadań</span>
        <progress value={done} max={tasks.length} className="h-2 w-full max-w-xs accent-primary" />
      </label>

      {tasks.map((t) => {
        const isDone = plan.doneTasks.includes(t.id);
        return (
          <section key={t.id} className="flex items-start gap-3 border-t py-4">
            <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
              <input
                type="checkbox"
                checked={isDone}
                aria-label={t.title}
                onChange={() => updatePlan((s) => ({ ...s, doneTasks: isDone ? s.doneTasks.filter((id) => id !== t.id) : [...s.doneTasks, t.id] }))}
                className="size-5"
              />
            </label>
            <div className="flex min-w-0 grow flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[15px] font-bold">{t.when}</span>
                <Chip>{names[t.who]}</Chip>
              </div>
              <h2 className={`text-lg leading-snug font-bold ${isDone ? "text-muted-foreground line-through" : ""}`}>{t.title}</h2>
              <div className="text-[15px] leading-relaxed text-muted-foreground">{t.description}</div>
              {t.doc && (
                <a
                  href={t.doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link mt-1 flex min-h-11 items-center gap-2 self-start font-bold"
                >
                  <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
                  </svg>
                  Zobacz: {t.doc.label}
                </a>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
