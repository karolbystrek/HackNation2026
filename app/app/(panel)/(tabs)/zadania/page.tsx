"use client";

import Link from "next/link";
import { ApplicationAction } from "@/components/application-action";
import { Button, Chip, PageBand, SectionTitle } from "@/components/ui";
import { RememberedDisclosure } from "@/components/remembered-disclosure";
import { Progress } from "@/components/ui/progress";
import { buildTasks } from "@/lib/calc/tasks";
import { tasksToIcs } from "@/lib/ics";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Tasks() {
  const { plan, chosen, names, entries } = useFamily();

  const tasks = buildTasks(entries);
  const main = tasks.filter((task) => !task.extra);
  const remaining = main.filter((task) => !task.done);
  const completed = main.filter((task) => task.done);

  function downloadCalendar() {
    const url = URL.createObjectURL(new Blob([tasksToIcs(main)], { type: "text/calendar" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "przewodnik-rodzica.ics" });
    link.click();
    URL.revokeObjectURL(url);
  }

  function renderTask(task: (typeof tasks)[number]) {
    const inputId = `task-${task.id}`;
    const submission = plan.submissions[task.id];
    return (
      <li key={task.id} className="flex items-start gap-3 border-t py-5">
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            id={inputId}
            type="checkbox"
            checked={task.done}
            disabled={task.locked || !!submission}
            aria-label={task.title}
            aria-describedby={task.locked && !task.done && task.waitingFor.length > 0 ? `${inputId}-waiting` : undefined}
            onChange={() => {
              updatePlan((state) => ({
                ...state,
                doneTasks: task.done ? state.doneTasks.filter((id) => id !== task.id) : [...state.doneTasks, task.id],
              }));
              requestAnimationFrame(() => document.getElementById(task.done ? inputId : "pozostale-zadania")?.focus());
            }}
            className="size-5"
          />
        </label>
        <div className="flex min-w-0 grow flex-col gap-1.5">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-sm font-bold">{task.when}</span>
            <Chip>{names[task.who]}</Chip>
          </div>
          <h3 className="text-lg leading-snug font-bold">{task.title}</h3>
          <p className="text-muted-foreground">{task.description}</p>
          {task.documents.length > 0 && <p className="text-sm">Dokumenty: {task.documents.join(", ")}.</p>}
          <ApplicationAction origin="zadania" task={task} submission={submission} />
          {task.guide && <a href={task.guide} className="text-link min-h-11 content-center self-start">Instrukcja składania wniosku</a>}
          {task.waitingFor.length > 0 && !task.done && (
            <div id={`${inputId}-waiting`} className="text-sm text-muted-foreground">
              <p className="font-bold">Oczekuje na potwierdzenie w Planie</p>
              <ul role="list">
                {task.waitingFor.map(({ id, title }) => (
                  <li key={id}><Link href={`/plan#timeline-${id}`} className="text-link inline-flex min-h-11 items-center">{title}</Link></li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </li>
    );
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title="Do zrobienia"
        lead="Wnioski i formalności z Waszego planu, w kolejności terminów."
      />

      <div className="page">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <Progress label={`Ukończono ${completed.length} z ${main.length} zadań`} value={completed.length} total={main.length} />
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link href="/warianty?z=zadania" className="text-link font-bold">
            {chosen ? `Zmień wariant (${chosen.name})` : "Wybierz wariant urlopu"}
          </Link>
          <Button variant="outline" onClick={downloadCalendar}>Dodaj terminy do kalendarza</Button>
        </div>
      </div>

      <section aria-labelledby="pozostale-zadania">
        <SectionTitle id="pozostale-zadania" tabIndex={-1} className="mb-3">Pozostałe zadania ({remaining.length})</SectionTitle>
        {remaining.length > 0 ? <ul role="list">{remaining.map(renderTask)}</ul> : <p className="text-muted-foreground">Wszystkie zadania są wykonane.</p>}
        <p className="mt-4 text-muted-foreground">
          Wnioski na szczególne sytuacje i sprawdzanie teczki ZUS znajdziesz w zakładce <Link href="/wnioski" className="text-link">Wnioski</Link>.
        </p>
      </section>

      {completed.length > 0 && (
        <RememberedDisclosure section="zadania/ukonczone" className="border-y" label={<span className="font-bold">Ukończone zadania ({completed.length})</span>}>
          <ul role="list">{completed.map(renderTask)}</ul>
        </RememberedDisclosure>
      )}
      </div>
    </main>
  );
}
