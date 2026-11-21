"use client";

import Link from "next/link";
import { Button, Chip, PageTitle } from "@/components/ui";
import { buildTasks } from "@/lib/calc/tasks";
import { tasksToIcs } from "@/lib/ics";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Tasks() {
  const { persona, params, chosen, plan, names } = useFamily();

  const tasks = buildTasks(persona, plan.events, chosen, params, plan.doneTasks);
  const done = tasks.filter((task) => task.done).length;

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
            {chosen ? `Wariant ${chosen.key} · ${chosen.name} · ` : null}
            <Link href="/warianty" className="font-bold text-primary underline">
              {chosen ? "Zmień wariant" : "Wybierz wariant urlopu"}
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
        const isDone = t.done;
        return (
          <section key={t.id} className="flex items-start gap-3 border-t py-4">
            <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
              <input
                type="checkbox"
                checked={isDone}
                disabled={t.locked}
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
              {t.guide && <a href={t.guide} className="text-link min-h-11 content-center self-start">Instrukcja · {t.title}</a>}
              {t.waitingFor.length > 0 && !isDone && (
                <p className="text-sm text-muted-foreground">Wymaga: {t.waitingFor.join(", ")}.</p>
              )}
            </div>
          </section>
        );
      })}
    </main>
  );
}
