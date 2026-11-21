"use client";

import { ApplicationAction } from "@/components/application-action";
import { CaseCheck } from "@/components/case-check";
import { Chip, PageBand, SectionTitle } from "@/components/ui";
import { buildTasks, type Task } from "@/lib/calc/tasks";
import { useFamily } from "@/lib/use-family";

export default function Applications() {
  const { params, plan, names, entries } = useFamily();
  const forms = buildTasks(entries).filter((task) => task.form);
  const civil = forms.filter((task) => task.form!.startsWith("civil."));
  const yours = forms.filter((task) => !task.extra && !civil.includes(task));
  const special = forms.filter((task) => task.extra && !civil.includes(task));

  const row = (task: Task) => (
    <li key={task.id} className="flex flex-col gap-1.5 border-t py-4 sm:flex-row sm:items-center sm:gap-4">
      <div className="flex min-w-0 grow flex-col gap-1">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="text-sm font-bold">{task.when}</span>
          <Chip>{names[task.who]}</Chip>
        </div>
        <h3 className="text-lg leading-snug font-bold">{task.title}</h3>
        {task.recipient && <p className="text-muted-foreground">{task.recipient}</p>}
        <details className="text-sm">
          <summary className="cursor-pointer font-bold">Dokumenty i instrukcja</summary>
          <p>{task.description}</p>
          {task.deadlineDetail && <p>{task.deadlineDetail}</p>}
          {task.documents.length > 0 && <ul className="list-disc pl-5">{task.documents.map((doc) => <li key={doc.id}>{doc.title}{doc.instruction && <span className="block text-muted-foreground">{doc.instruction}</span>}</li>)}</ul>}
          {task.guide && <a href={task.guide} className="text-link">Oficjalna instrukcja</a>}
        </details>
      </div>
      <div className="shrink-0 sm:max-w-xs"><ApplicationAction origin="wnioski" task={task} submission={plan.submissions[task.id]} /></div>
    </li>
  );

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title="Wnioski"
        lead="Wypełnij wnioski do ZUS, pracodawcy i urzędu stanu cywilnego albo sprawdź dokumenty, które już masz."
      />
      <div className="page gap-12">

      <section aria-labelledby="twoje-wnioski">
        <SectionTitle id="twoje-wnioski" className="mb-1">Twoje wnioski</SectionTitle>
        <p className="mb-3 text-muted-foreground">Wynikają z Waszego planu i osi czasu.</p>
        {yours.length ? <ul role="list">{yours.map(row)}</ul> : <p className="text-muted-foreground">Na razie nie ma wniosków do wypełnienia.</p>}
      </section>

      {civil.length > 0 && (
        <section aria-labelledby="usc">
          <SectionTitle id="usc" className="mb-3">Urząd stanu cywilnego</SectionTitle>
          <ul role="list">{civil.map(row)}</ul>
        </section>
      )}

      {special.length > 0 && (
        <section aria-labelledby="szczegolne">
          <SectionTitle id="szczegolne" className="mb-1">Wnioski w szczególnych sytuacjach</SectionTitle>
          <p className="mb-3 text-muted-foreground">Potrzebne tylko w określonej sytuacji albo wypełnia je pracodawca lub lekarz. Możesz podejrzeć każdy z nich.</p>
          <ul role="list">{special.map(row)}</ul>
        </section>
      )}
      <details className="border-y py-4">
        <summary className="cursor-pointer text-xl font-bold">Sprawdź decyzję lub dokumenty z ZUS</summary>
        <div className="mt-3"><CaseCheck params={params} /></div>
      </details>
      </div>
    </main>
  );
}
