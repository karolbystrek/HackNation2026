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
        {task.extra && <p className="text-muted-foreground">{task.description}</p>}
      </div>
      <div className="shrink-0 sm:max-w-xs"><ApplicationAction origin="wnioski" task={task} submission={plan.submissions[task.id]} /></div>
    </li>
  );

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        crumbs={[["Strona główna", "/"], ["Oś czasu", "/plan"], ["Wnioski"]]}
        title="Wnioski"
        lead="Wypełnij wnioski do ZUS, pracodawcy i urzędu stanu cywilnego albo sprawdź dokumenty, które już masz."
      />
      <div className="page gap-12">

      <section aria-labelledby="teczka" className="flex flex-col gap-4 border border-t-4 border-border border-t-brand p-5 sm:p-6">
        <div>
          <h2 id="teczka" className="text-2xl font-bold">Sprawdź swoje dokumenty z ZUS</h2>
          <p className="max-w-[70ch] text-muted-foreground">
            Wgraj skan, a sprawdzimy, czy zasiłek Ci przysługuje, ile wynosi i czy zgadza się z decyzją ZUS. Dokumenty odczytuje sztuczna inteligencja, więc pod wynikiem możesz poprawić odczytane dane.
          </p>
        </div>
        <CaseCheck params={params} />
      </section>

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
      </div>
    </main>
  );
}
