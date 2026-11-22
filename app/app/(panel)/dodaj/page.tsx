"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BackLink, Button, ButtonLink, Checkbox, Field, Notice, PageBand, RadioGroup } from "@/components/ui";
import { CIRCUMSTANCES, EVENT_TYPES, type Circumstance, type EventType, type EventWho, type TimelineEvent } from "@/lib/events";
import { formatPln, parseAmount } from "@/lib/format";
import { startChildCase, updatePlan, usePlanDraft } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";
import { DateField } from "@/components/ui/date-field";

export default function AddEventPage() {
  return <Suspense><AddEvent /></Suspense>;
}

function AddEvent() {
  const { names, viewer, persona, caseLabel } = useFamily();
  const router = useRouter();
  // "?sytuacja=" opens the form on a special situation, e.g. from the applications page; it keeps its own draft.
  const search = useSearchParams();
  const requested = search.get("sytuacja");
  const preset = requested && Object.hasOwn(CIRCUMSTANCES, requested) ? requested as Circumstance : null;
  const initialDraft = { type: (preset ? "circumstance" : "contract") as EventType, selectedWho: viewer as EventWho, date: "", amount: "", circumstance: (preset ?? "") as Circumstance | "" };
  const [draft, setDraft] = usePlanDraft(preset ? `dodaj/${preset}` : "dodaj", initialDraft);
  const { type, selectedWho, date, amount, circumstance } = draft;
  const [details, setDetails] = usePlanDraft("dodaj/szczegoly", {
    count: "", caseMode: "" as "" | "current" | "new", childNames: [] as string[], placement: "adoption" as "adoption" | "foster", childBirthDate: "", adoptionOrderDate: "",
    birthCardDate: "", stillbirth: false, careFrom: "", schoolDeferred: false, zaZyciem: false, endDate: "", insuranceEndDate: "",
    parentalWork: "return", gestationWeek: "", birthWeight: "", hospitalWeeks: "", supplementaryParent: viewer,
  });
  const childEvent = type === "birth" || type === "adoption";
  const hospital = type === "circumstance" && circumstance === "supplementaryLeave";
  const afterInsurance = type === "circumstance" && circumstance === "sicknessAfterInsurance";
  const motherHospital = type === "circumstance" && circumstance === "motherHospital";
  const transferCare = type === "circumstance" && (motherHospital || circumstance === "motherDeath" || circumstance === "abandonment");
  const [error, setError] = useState("");
  const allowedTypes = EVENT_TYPES.filter((event) => event.type !== "sickLeave" || viewer === "mother");
  const unavailable = !allowedTypes.some((event) => event.type === type);
  const who = hospital ? details.supplementaryParent : type === "circumstance" || type === "birth" || selectedWho === "both" ? "both" : viewer;
  const def = EVENT_TYPES.find((t) => t.type === type)!;

  function add() {
    if (unavailable || (type === "circumstance" && !circumstance)) return;
    if (!date) {
      setError("Wybierz datę wydarzenia.");
      return;
    }
    if (childEvent && persona.birthDate && !details.caseMode) {
      setError("Wybierz, czy aktualizujesz tę sprawę, czy dodajesz nową.");
      return;
    }
    const count = Number(details.count);
    const grossPay = parseAmount(amount);
    const { endDate, insuranceEndDate, childBirthDate, adoptionOrderDate, birthCardDate, placement } = details;
    const stay = {
      gestationWeek: Number(details.gestationWeek),
      birthWeight: Number(details.birthWeight),
      hospitalWeeks: Number(details.hospitalWeeks),
    };
    if (childEvent && (!Number.isInteger(count) || count < 1 || count > 10)) {
      setError("Podaj liczbę dzieci od 1 do 10.");
      return;
    }
    if (type === "birth" && birthCardDate && birthCardDate < date) {
      setError("Data karty urodzenia nie może poprzedzać porodu.");
      return;
    }
    if (type === "adoption" && (!childBirthDate || childBirthDate > date || (placement === "adoption" && adoptionOrderDate && adoptionOrderDate < date))) {
      setError("Sprawdź daty urodzenia, przyjęcia na wychowanie i uprawomocnienia orzeczenia.");
      return;
    }
    if (type === "salary" && (!/^\d+(?:[.,]\d{1,2})?$/.test(amount.replace(/\s/g, "")) || grossPay <= 0)) {
      setError("Podaj prawidłowe wynagrodzenie brutto.");
      return;
    }
    if ((type === "sickLeave" || afterInsurance) && endDate && endDate < date) {
      setError("Koniec zwolnienia nie może poprzedzać jego początku.");
      return;
    }
    if (afterInsurance && (!insuranceEndDate || insuranceEndDate >= date)) {
      setError("Podaj datę ustania ubezpieczenia wcześniejszą niż początek zwolnienia.");
      return;
    }
    if (hospital && (!Number.isInteger(stay.gestationWeek) || stay.gestationWeek < 1 || stay.gestationWeek > 45 ||
      !Number.isInteger(stay.birthWeight) || stay.birthWeight < 1 || !Number.isFinite(stay.hospitalWeeks) || stay.hospitalWeeks <= 0)) {
      setError("Podaj tydzień ciąży, masę urodzeniową i czas pobytu w szpitalu.");
      return;
    }
    if (type === "circumstance" && circumstance === "childLoss" &&
      (!persona.birthDate || date < persona.birthDate || persona.kids > 1)) {
      setError("W tym formularzu można odnotować śmierć dziecka w sprawie z jednym zapisanym porodem pojedynczym.");
      return;
    }
    if (motherHospital && endDate && endDate < date) {
      setError("Data wypisu nie może poprzedzać przyjęcia do szpitala.");
      return;
    }
    if (transferCare && details.careFrom && details.careFrom < date) {
      setError("Data przejęcia opieki nie może poprzedzać wydarzenia.");
      return;
    }
    const whoName = who === "both" ? "" : ` – ${names[who]}`;
    const title = type === "salary" && amount ? `Zmiana pensji${whoName}: ${formatPln(parseAmount(amount))} brutto` : type === "circumstance" && circumstance ? CIRCUMSTANCES[circumstance].label : `${def.label}${whoName}`;
    const id = crypto.randomUUID();
    const event: TimelineEvent = {
      id, type, who, date, title, source: "new", description: def.effect, decision: childEvent,
      circumstance: type === "circumstance" && circumstance ? circumstance : undefined,
      ...(childEvent && {
        childDetails: {
          count,
          names: Array.from({ length: count }, (_, index) => details.childNames?.[index]?.trim() ?? ""),
          zaZyciem: details.zaZyciem,
          ...(type === "birth"
            ? { birthCardDate: birthCardDate || undefined, stillbirth: count === 1 && details.stillbirth }
            : {
              placement, childBirthDate,
              adoptionOrderDate: placement === "adoption" ? adoptionOrderDate || undefined : undefined,
              schoolDeferred: placement === "foster" && details.schoolDeferred,
            }),
        },
      }),
      ...((type === "sickLeave" || afterInsurance || motherHospital) && { endDate: endDate || null }),
      ...(afterInsurance && { insuranceEndDate }),
      ...(transferCare && { careFrom: details.careFrom || undefined }),
      ...(type === "salary" && { grossPay }),
      ...(type === "returnToWork" && { parentalWorkFraction: Number(details.parentalWork) || 0 }),
      ...(hospital && { hospitalStay: stay }),
    };
    if (childEvent && details.caseMode === "new") {
      startChildCase(event, caseLabel);
    } else {
      updatePlan((s) => ({
        ...s,
        drafts: { ...s.drafts, dodaj: initialDraft, "dodaj/szczegoly": undefined },
        events: [...s.events, event],
      }));
    }
    router.replace(search.get("z") === "wnioski" ? "/wnioski#szczegolne" : `/plan#timeline-event-${id}`);
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand title="Dodaj wydarzenie" />
      <div className="page">
      <div className="flex w-full max-w-3xl flex-col gap-6">
      {search.get("z") === "wnioski" ? <BackLink href="/wnioski">Wróć do wniosków</BackLink> : <BackLink href="/plan">Wróć do osi czasu</BackLink>}

      <RadioGroup
        label="Co się wydarzy?"
        value={type}
        onChange={(type) => setDraft({ ...draft, type })}
        options={allowedTypes.map((event) => [event.type, event.label])}
      />

      {type === "circumstance" && (
        <label className="flex flex-col gap-2">
          <span className="font-bold">Która sytuacja Cię dotyczy?</span>
          <select className="min-h-11 rounded-sm border border-input bg-background px-3" value={circumstance ?? ""}
            onChange={(event) => setDraft({ ...draft, circumstance: event.target.value as Circumstance | "" })}>
            <option value="">Wybierz sytuację</option>
            {Object.entries(CIRCUMSTANCES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      )}

      {!unavailable && type !== "sickLeave" && type !== "circumstance" && type !== "birth" && (
        <RadioGroup
          label="Kogo dotyczy?"
          value={who}
          onChange={(selectedWho) => setDraft({ ...draft, selectedWho })}
          options={[
            [viewer, names[viewer]],
            ["both", names.both],
          ]}
        />
      )}

      <div className="flex flex-wrap gap-4">
        <DateField label={type === "sickLeave" || afterInsurance ? "Początek zwolnienia" :
          type === "birth" ? "Data porodu" : type === "adoption" ? "Data przyjęcia na wychowanie" :
          circumstance === "laterSickLeave" && type === "circumstance" ? "Data otrzymania kolejnego e-ZLA" : motherHospital ? "Data przyjęcia matki do szpitala" : "Kiedy?"} value={date} onChange={(value) => { setDraft({ ...draft, date: value }); setError(""); }} className="flex-[1_1_220px]" />
        {type === "salary" && (
          <Field label="Nowe wynagrodzenie brutto" inputMode="numeric" placeholder="np. 7000" value={amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className="flex-[1_1_220px]" />
        )}
      </div>
      {type === "returnToWork" && (
        <RadioGroup label="Czy będziesz pracować w trakcie urlopu rodzicielskiego?" value={details.parentalWork}
          onChange={(parentalWork) => setDetails({ ...details, parentalWork })}
          options={[["return", "Wracam do pracy po urlopie"], ["0.25", "Tak, na ¼ etatu"], ["0.5", "Tak, na ½ etatu"]]} />
      )}
      {childEvent && (
        <div className="flex flex-col gap-4">
          <Field label={type === "birth" ? "Liczba dzieci urodzonych przy tym porodzie" : "Liczba dzieci przyjętych jednocześnie"}
            type="number" min={1} max={10} value={details.count} hint="Podaj liczbę dzieci z tego porodu lub przyjęcia."
            onChange={(e) => setDetails({ ...details, count: e.target.value })} />
          {Array.from({ length: Math.min(10, Math.max(0, Number(details.count) || 0)) }, (_, index) => (
            <Field key={index} label={Number(details.count) === 1 ? "Imię i nazwisko dziecka (opcjonalnie)" : `Imię i nazwisko dziecka ${index + 1} (opcjonalnie)`}
              value={details.childNames?.[index] ?? ""} onChange={(e) => {
                const childNames = [...(details.childNames ?? [])];
                childNames[index] = e.target.value;
                setDetails({ ...details, childNames });
              }} />
          ))}
          {type === "birth" ? (
            <DateField label="Data sporządzenia karty urodzenia (opcjonalnie)" value={details.birthCardDate}
              onChange={(value) => setDetails({ ...details, birthCardDate: value })} />
          ) : (
            <>
              <RadioGroup label="Rodzaj przyjęcia" value={details.placement}
                onChange={(placement) => setDetails({ ...details, placement })}
                options={[["adoption", "Przysposobienie"], ["foster", "Niezawodowa rodzina zastępcza"]]} />
              <DateField label={Number(details.count) > 1 ? "Data urodzenia najstarszego dziecka uwzględnianego w planie" : "Data urodzenia dziecka"}
                value={details.childBirthDate} onChange={(value) => setDetails({ ...details, childBirthDate: value })} />
              {details.placement === "adoption" ? (
                <DateField label="Data uprawomocnienia orzeczenia (jeśli jest już znana)" value={details.adoptionOrderDate}
                  onChange={(value) => setDetails({ ...details, adoptionOrderDate: value })} />
              ) : (
                <Checkbox title="Odroczony obowiązek szkolny" checked={details.schoolDeferred}
                  onChange={() => setDetails({ ...details, schoolDeferred: !details.schoolDeferred })} />
              )}
            </>
          )}
          {type === "birth" && Number(details.count) === 1 && (
            <Checkbox title="Martwe urodzenie" checked={details.stillbirth}
              onChange={() => setDetails({ ...details, stillbirth: !details.stillbirth })} />
          )}
          <Checkbox title="Co najmniej jedno dziecko ma zaświadczenie „Za życiem”" checked={details.zaZyciem}
            onChange={() => setDetails({ ...details, zaZyciem: !details.zaZyciem })} />
          {persona.birthDate && (
            <RadioGroup label="Do której sprawy należy wydarzenie?" value={details.caseMode ?? ""}
              onChange={(caseMode) => setDetails({ ...details, caseMode })}
              options={[["current", "Aktualizuję tę sprawę"], ["new", "Otwieram osobną sprawę"]]} />
          )}
        </div>
      )}
      {afterInsurance && <DateField label="Data ustania ubezpieczenia chorobowego" value={details.insuranceEndDate}
        onChange={(value) => setDetails({ ...details, insuranceEndDate: value })} />}
      {(type === "sickLeave" || afterInsurance) && <DateField label="Koniec zwolnienia (jeśli jest znany)" value={details.endDate}
        onChange={(value) => setDetails({ ...details, endDate: value })} />}
      {motherHospital && <DateField label="Data wypisu matki (jeśli jest znana)" value={details.endDate}
        onChange={(value) => setDetails({ ...details, endDate: value })} />}
      {transferCare && <DateField label="Data przejęcia opieki (jeśli jest znana)" value={details.careFrom}
        onChange={(value) => setDetails({ ...details, careFrom: value })} />}
      {hospital && (
        <div className="flex flex-col gap-4">
          <Field label="Tydzień ciąży w dniu porodu" type="number" min={1} max={45} value={details.gestationWeek}
            onChange={(e) => setDetails({ ...details, gestationWeek: e.target.value })} />
          <Field label="Masa urodzeniowa (g)" type="number" min={1} value={details.birthWeight}
            onChange={(e) => setDetails({ ...details, birthWeight: e.target.value })} />
          <Field label="Czas pobytu w szpitalu (w tygodniach)" type="number" min={0} step="any"
            value={details.hospitalWeeks} onChange={(e) => setDetails({ ...details, hospitalWeeks: e.target.value })} />
          <RadioGroup label="Kto skorzysta z urlopu uzupełniającego?" value={details.supplementaryParent}
            onChange={(supplementaryParent) => setDetails({ ...details, supplementaryParent })}
            options={[["mother", names.mother], ["father", names.father]]} />
        </div>
      )}
      {error && (
        <div role="alert" className="font-bold text-destructive">
          {error}
        </div>
      )}

      <Notice>
        <div className="font-bold">Co to zmienia</div>
        <div className="text-[15px] leading-relaxed">{def.effect}</div>
      </Notice>

      <div className="flex flex-wrap gap-3">
        <Button disabled={unavailable || (type === "circumstance" && !circumstance)} onClick={add} className="min-h-[52px]">
          Dodaj do osi czasu
        </Button>
        <ButtonLink href="/plan" variant="outline" className="min-h-[52px]">
          Anuluj
        </ButtonLink>
      </div>
    </div>
      </div>
    </main>
  );
}
