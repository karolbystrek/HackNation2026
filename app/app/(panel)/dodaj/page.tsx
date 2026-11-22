"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, ButtonLink, Field, Notice, PageBand, RadioGroup } from "@/components/ui";
import { CIRCUMSTANCES, EVENT_TYPES, type Circumstance, type EventType, type EventWho } from "@/lib/events";
import { formatPln, parseAmount } from "@/lib/format";
import { updatePlan, usePlanDraft } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";
import { DateField } from "@/components/ui/date-field";

export default function AddEvent() {
  const { names } = useFamily();
  const router = useRouter();
  const initialDraft = { type: "contract" as EventType, selectedWho: "father" as EventWho, date: "", amount: "", circumstance: "" as Circumstance | "" };
  const [draft, setDraft] = usePlanDraft("dodaj", initialDraft);
  const { type, selectedWho, date, amount, circumstance } = draft;
  const [error, setError] = useState("");
  const who = type === "sickLeave" ? "mother" : type === "circumstance" ? "both" : selectedWho;
  const def = EVENT_TYPES.find((t) => t.type === type)!;

  function add() {
    if (type === "circumstance" && !circumstance) return;
    if (!date) {
      setError("Wybierzcie datę wydarzenia.");
      return;
    }
    const whoName = who === "both" ? "" : ` – ${names[who]}`;
    const title = type === "salary" && amount ? `Zmiana pensji${whoName}: ${formatPln(parseAmount(amount))} brutto` : type === "circumstance" && circumstance ? CIRCUMSTANCES[circumstance].label : `${def.label}${whoName}`;
    const id = crypto.randomUUID();
    updatePlan((s) => ({
      ...s,
      drafts: { ...s.drafts, dodaj: initialDraft },
      events: [...s.events, { id, type, who, date, circumstance: type === "circumstance" && circumstance ? circumstance : undefined, source: "new", title, description: def.effect, decision: type === "birth" }],
    }));
    router.replace(`/plan#timeline-event-${id}`);
  }

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand title="Dodaj wydarzenie" />
      <div className="page">
      <div className="flex w-full max-w-3xl flex-col gap-6">
      <BackLink href="/plan">Wróć do osi czasu</BackLink>

      <RadioGroup
        label="Co się wydarzy?"
        value={type}
        onChange={(type) => setDraft({ ...draft, type })}
        options={EVENT_TYPES.map((event) => [event.type, event.label])}
      />

      {type === "circumstance" && (
        <label className="flex flex-col gap-2">
          <span className="font-bold">Która sytuacja Was dotyczy?</span>
          <select className="min-h-11 rounded-sm border border-input bg-background px-3" value={circumstance ?? ""}
            onChange={(event) => setDraft({ ...draft, circumstance: event.target.value as Circumstance | "" })}>
            <option value="">Wybierz sytuację</option>
            {Object.entries(CIRCUMSTANCES).map(([key, { label }]) => <option key={key} value={key}>{label}</option>)}
          </select>
        </label>
      )}

      {type !== "sickLeave" && type !== "circumstance" && (
        <RadioGroup
          label="Kogo dotyczy?"
          value={who}
          onChange={(selectedWho) => setDraft({ ...draft, selectedWho })}
          options={[
            ["mother", names.mother],
            ["father", names.father],
            ["both", names.both],
          ]}
        />
      )}

      <div className="flex flex-wrap gap-4">
        <DateField label={type === "sickLeave" ? "Początek zwolnienia" : "Kiedy?"} aria-invalid={!!error} aria-describedby={error ? "date-error" : undefined} value={date} onChange={(value) => { setDraft({ ...draft, date: value }); setError(""); }} className="flex-[1_1_220px]" />
        {type === "salary" && (
          <Field label="Nowe wynagrodzenie brutto" inputMode="numeric" placeholder="np. 7000" value={amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} className="flex-[1_1_220px]" />
        )}
      </div>
      {error && (
        <div id="date-error" role="alert" className="font-bold text-destructive">
          {error}
        </div>
      )}

      <Notice>
        <div className="font-bold">Co to zmienia</div>
        <div className="text-[15px] leading-relaxed">{def.effect}</div>
      </Notice>

      <div className="flex flex-wrap gap-3">
        <Button disabled={type === "circumstance" && !circumstance} onClick={add} className="min-h-[52px]">
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
