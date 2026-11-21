"use client";

import Link from "next/link";
import { Button, ButtonLink, WhoChip } from "@/components/ui";
import { buildTasks } from "@/lib/calc/tasks";
import { tasksToIcs } from "@/lib/ics";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Tasks() {
  const { persona, params, chosen, plan, names } = useFamily();

  if (!chosen)
    return (
      <main className="mx-auto w-full max-w-[980px] px-5 pt-6 pb-12">
        <div className="flex flex-col items-start gap-3.5 rounded-[18px] bg-white p-7">
          <h1 className="text-[28px] font-black">Najpierw wybierzcie wariant urlopu</h1>
          <p className="text-muted">Lista zadań i wniosków powstanie na podstawie Waszej decyzji.</p>
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
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-5 pt-6 pb-12">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-2.5">
        <div className="grow">
          <h1 className="mb-1.5 text-[28px] font-black sm:text-[34px]">Wasza lista zadań</h1>
          <div className="text-[15px] text-muted">
            Wariant {chosen.key} – {chosen.name} ·{" "}
            <Link href="/warianty" className="font-extrabold text-brand underline">
              zmień wariant
            </Link>
          </div>
        </div>
        <Button variant="outline" onClick={downloadCalendar}>
          Dodaj terminy do kalendarza
        </Button>
      </div>

      <div className="flex items-center gap-3.5">
        <div className="h-2.5 grow overflow-hidden rounded-full bg-line">
          <div className="h-full bg-done transition-[width]" style={{ width: `${Math.round((done / tasks.length) * 100)}%` }} />
        </div>
        <span className="text-[15px] font-extrabold">
          {done} z {tasks.length} zrobione
        </span>
      </div>

      {tasks.map((t) => {
        const isDone = plan.doneTasks.includes(t.id);
        return (
          <section key={t.id} className={`flex items-start gap-3.5 rounded-[18px] bg-white p-[18px] ${isDone ? "opacity-80" : ""}`}>
            <button
              type="button"
              aria-pressed={isDone}
              aria-label={`Oznacz jako zrobione: ${t.title}`}
              onClick={() => updatePlan((s) => ({ ...s, doneTasks: isDone ? s.doneTasks.filter((id) => id !== t.id) : [...s.doneTasks, t.id] }))}
              className={`flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl border-2 ${isDone ? "border-done bg-done" : "border-stone bg-white"}`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" aria-hidden="true">
                <path d="M5 12l5 5 9-10" />
              </svg>
            </button>
            <div className="flex min-w-0 grow flex-col gap-1.5">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                <span className="text-[15px] font-black text-danger">{t.when}</span>
                <WhoChip who={t.who} label={names[t.who]} />
              </div>
              <div className={`text-lg leading-snug font-extrabold ${isDone ? "text-muted line-through" : ""}`}>{t.title}</div>
              <div className="text-[15px] leading-relaxed text-muted">{t.description}</div>
              {t.doc && (
                <a
                  href={t.doc.url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 flex min-h-11 items-center gap-2 self-start rounded-full bg-brand px-4 text-sm font-extrabold text-white hover:bg-brand-deep"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
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
