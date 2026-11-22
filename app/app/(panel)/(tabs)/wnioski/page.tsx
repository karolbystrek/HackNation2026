"use client";

import { SituationForms } from "@/components/situation-forms";
import { DocumentList } from "@/components/document-list";

import { ApplicationAction } from "@/components/application-action";
import { CaseCheck } from "@/components/case-check";
import { Button, ButtonLink, Chip, Notice, PageBand, SectionTitle } from "@/components/ui";
import { buildTasks, type Task } from "@/lib/calc/tasks";
import { formatDate, shiftIso } from "@/lib/dates";
import { CIRCUMSTANCES, type Circumstance } from "@/lib/events";
import { Disclosure } from "@/components/ui/disclosure";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Applications() {
  const { params, plan, names, entries, persona, today, chosen, solo, journey } = useFamily();
  const forms = buildTasks(entries).filter((task) => task.form);
  const civil = forms.filter((task) => task.form!.startsWith("civil."));
  const situationalForms = new Set<string>(plan.events.flatMap((event) =>
    event.type === "circumstance" && event.circumstance ? [...(CIRCUMSTANCES[event.circumstance]?.forms ?? [])] : [],
  ));
  const special = forms.filter((task) => !civil.includes(task) && (task.extra || situationalForms.has(task.form!)));
  const regular = forms.filter((task) => !civil.includes(task) && !special.includes(task));
  const showPreBirth = !persona.birthDate && persona.parents.mother.contract === "uop" && !forms.some((task) => task.id === "pre-birth-leave");
  const situations = (Object.entries(CIRCUMSTANCES) as [Circumstance, (typeof CIRCUMSTANCES)[Circumstance]][])
    .filter(([key, value]) => value.forms.length > 0 && key !== "additionalBirthCertificate" && !(key === "preBirthLeave" && (showPreBirth || !!persona.birthDate)) &&
      !plan.events.some((event) => event.circumstance === key));
  const recordedBirth = !!persona.birthDate && !(persona.childEvents ?? []).some((event) => event === "adoption" || event === "foster_placement");

  function requestCopy() {
    const id = crypto.randomUUID();
    updatePlan((previous) => previous.events.some((event) => event.circumstance === "additionalBirthCertificate") ? previous : ({
      ...previous,
      events: [...previous.events, {
        id, type: "circumstance", who: "both", date: today, source: "new", circumstance: "additionalBirthCertificate",
        title: "Potrzebny kolejny odpis aktu urodzenia", description: "Dodano wniosek o odpis do planu.",
      }],
    }));
  }

  const row = (task: Task) => {
    const guidance = journey.formGuidance?.[task.form!];
    return (
      <li key={task.id} id={`wniosek-${task.id}`} className="flex flex-col gap-1.5 border-t py-4 sm:flex-row sm:items-center sm:gap-4">
        <div className="flex min-w-0 grow flex-col gap-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <span className="text-sm font-bold">{task.when}</span>
            {!solo && <Chip>{names[task.who]}</Chip>}
          </div>
          <h3 className="text-lg leading-snug font-bold">{task.title}</h3>
          {task.description && <p>{task.description}</p>}
          {task.recipient && <p className="text-muted-foreground">Adresat: {task.recipient}</p>}
          {guidance?.preparedBy && <p className="text-muted-foreground">Wypełnia {guidance.preparedBy.toLowerCase()}.</p>}
          {task.waitingFor.length > 0 && (
            <a href={`/plan#timeline-${task.waitingFor[0].id}`} className="text-link self-start">
              Najpierw w planie: {task.waitingFor[0].title}
            </a>
          )}
          {task.documents.length > 0 && (
            <div className="my-2 space-y-1">
              <p className="font-bold">Dokumenty do przygotowania</p>
              <DocumentList documents={task.documents} />
            </div>
          )}
          {task.deadlineDetail && <p className="text-sm">{task.deadlineDetail}</p>}
          {(task.guide || guidance?.guide) && <a href={task.guide ?? guidance?.guide} className="text-link self-start">Oficjalna instrukcja lub wzór</a>}
        </div>
        <div className="shrink-0 sm:max-w-xs"><ApplicationAction origin="wnioski" task={task} submission={plan.submissions[task.id]} preview={!!guidance?.preparedBy} /></div>
      </li>
    );
  };

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand
        title="Wnioski"
        lead="Znajdź formularz dla swojej sprawy, sprawdź termin i przygotuj potrzebne dokumenty."
      />
      <div className="page gap-12">

      <section aria-labelledby="wnioski-z-planu">
        <SectionTitle id="wnioski-z-planu" className="mb-3">Wnioski z Twojego planu</SectionTitle>
        {regular.length > 0 ? <ul role="list">{regular.map(row)}</ul> :
          <p className="mb-3">Wnioski pojawią się tutaj po dodaniu danych potrzebnych do zaplanowania formalności.</p>}
        {!chosen && (
          <Notice className="my-3 flex flex-col items-start gap-2">
            <p>Zapisz podział urlopu, aby przygotować wnioski o rodzicielski lub ojcowski z wybranymi datami.</p>
            <ButtonLink href="/warianty" variant="outline">Zaplanuj podział urlopu</ButtonLink>
          </Notice>
        )}
        <ButtonLink href="/plan" variant="outline">Zobacz wszystkie kroki w planie</ButtonLink>
      </section>

      {(civil.length > 0 || recordedBirth) && (
        <section aria-labelledby="usc">
          <SectionTitle id="usc" className="mb-3">Urząd stanu cywilnego</SectionTitle>
          {civil.length > 0 ? <ul role="list">{civil.map(row)}</ul> :
            <Button variant="outline" onClick={requestCopy}>Dodaj wniosek o kolejny odpis</Button>}
        </section>
      )}

      {(special.length > 0 || showPreBirth || situations.length > 0) && (
        <section aria-labelledby="szczegolne">
          <SectionTitle id="szczegolne" className="mb-1">Wnioski w szczególnych sytuacjach</SectionTitle>
          <p className="mb-3 text-muted-foreground">Potrzebne tylko w określonej sytuacji albo wypełnia je pracodawca lub lekarz.</p>
          <ul role="list">{special.map(row)}</ul>
          {showPreBirth && <div className="flex flex-col items-start gap-2 border-t py-4">
            <h3 className="text-lg font-bold">Macierzyński przed porodem</h3>
            <p>Najwcześniejszy możliwy start to {formatDate(shiftIso(persona.dueDate, -params.preBirthMaxWeeks * 7))}.</p>
            <ButtonLink href="/kalkulator?tryb=birth" variant="outline">Wybierz datę w kalkulatorze</ButtonLink>
          </div>}
          {situations.length > 0 && (
            <Disclosure className="border-t" label={<strong>Inne sytuacje i ich wnioski ({situations.length})</strong>}>
              <p className="px-3 pb-2 text-sm text-muted-foreground sm:px-4">Dodaj sytuację do planu, a pojawią się potrzebne wnioski z terminami.</p>
              <ul role="list" className="px-3 pb-3 sm:px-4">
                {situations.map(([key, value]) => (
                  <li key={key} className="flex flex-col gap-2 border-t py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <h3 className="font-bold">{value.label}</h3>
                      <p className="text-sm text-muted-foreground">{value.effect}</p>
                      <SituationForms ids={value.forms} guidance={journey.formGuidance} />
                    </div>
                    <ButtonLink href={`/dodaj?sytuacja=${key}&z=wnioski`} variant="outline" className="shrink-0 self-start">Dodaj sytuację</ButtonLink>
                  </li>
                ))}
              </ul>
            </Disclosure>
          )}
        </section>
      )}
      <section aria-labelledby="sprawdz-dokumenty">
        <SectionTitle id="sprawdz-dokumenty" className="mb-3">Sprawdź decyzję lub dokumenty z ZUS</SectionTitle>
        <CaseCheck params={params} />
      </section>
      </div>
    </main>
  );
}
