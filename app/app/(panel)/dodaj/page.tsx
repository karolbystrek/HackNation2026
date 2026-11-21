"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, ButtonLink, Field, Notice, PageTitle, RadioGroup } from "@/components/ui";
import { EVENT_TYPES, type EventType, type EventWho } from "@/lib/events";
import { formatPln, parseAmount } from "@/lib/format";
import { updatePlan, usePlanDraft } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function AddEvent() {
  const { names } = useFamily();
  const router = useRouter();
  const initialDraft = { type: "contract" as EventType, selectedWho: "father" as EventWho, date: "", amount: "" };
  const [draft, setDraft] = usePlanDraft("dodaj", initialDraft);
  const { type, selectedWho, date, amount } = draft;
  const [error, setError] = useState("");
  const who = type === "sickLeave" ? "mother" : selectedWho;
  const def = EVENT_TYPES.find((t) => t.type === type)!;

  function add() {
    if (!date) {
      setError("Wybierzcie datę wydarzenia.");
      return;
    }
    const whoName = who === "both" ? "" : ` – ${names[who]}`;
    const title = type === "salary" && amount ? `Zmiana pensji${whoName}: ${formatPln(parseAmount(amount))} brutto` : `${def.label}${whoName}`;
    const id = crypto.randomUUID();
    updatePlan((s) => ({
      ...s,
      drafts: { ...s.drafts, dodaj: initialDraft },
      events: [...s.events, { id, type, who, date, source: "new", title, description: def.effect, decision: type === "birth" }],
    }));
    router.replace(`/plan#timeline-event-${id}`);
  }

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      <BackLink href="/plan">Wróć do osi czasu</BackLink>
      <PageTitle>Dodaj wydarzenie</PageTitle>

      <RadioGroup
        label="Co się wydarzy?"
        value={type}
        onChange={(type) => setDraft({ ...draft, type })}
        options={EVENT_TYPES.map((event) => [event.type, event.label])}
      />

      {type !== "sickLeave" && (
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
        <Field label={type === "sickLeave" ? "Początek zwolnienia" : "Kiedy?"} type="date" aria-invalid={!!error} aria-describedby={error ? "date-error" : undefined} value={date} onChange={(e) => { setDraft({ ...draft, date: e.target.value }); setError(""); }} className="flex-[1_1_220px]" />
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
        <Button onClick={add} className="min-h-[52px]">
          Dodaj do osi czasu
        </Button>
        <ButtonLink href="/plan" variant="outline" className="min-h-[52px]">
          Anuluj
        </ButtonLink>
      </div>
    </main>
  );
}
