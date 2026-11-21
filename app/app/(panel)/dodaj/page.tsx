"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, ButtonLink, Field, PageTitle, PillGroup } from "@/components/ui";
import { EVENT_TYPES, type EventType, type EventWho } from "@/lib/events";
import { formatPln, parseAmount } from "@/lib/format";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function AddEvent() {
  const { names } = useFamily();
  const router = useRouter();
  const [type, setType] = useState<(typeof EVENT_TYPES)[number]["type"]>("contract");
  const [who, setWho] = useState<EventWho>("father");
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const def = EVENT_TYPES.find((t) => t.type === type)!;

  function add() {
    if (!date) {
      setError("Wybierzcie datę wydarzenia.");
      return;
    }
    const whoName = who === "both" ? "" : ` – ${names[who]}`;
    const title = type === "salary" && amount ? `Zmiana pensji${whoName}: ${formatPln(parseAmount(amount))} brutto` : `${def.label}${whoName}`;
    updatePlan((s) => ({
      ...s,
      events: [...s.events, { id: `n${Date.now()}`, type: type as EventType, who, date, source: "new", title, description: def.effect, decision: type === "birth" }],
    }));
    router.push("/plan");
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-[22px] px-5 pt-8 pb-12">
      <BackLink href="/plan">Wróć do osi czasu</BackLink>
      <PageTitle>Dodaj wydarzenie</PageTitle>

      <div className="flex flex-col gap-2.5">
        <div className="font-extrabold">Co się wydarzy?</div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-2">
          {EVENT_TYPES.map((t) => (
            <button
              key={t.type}
              type="button"
              aria-pressed={type === t.type}
              onClick={() => setType(t.type)}
              className={`min-h-[52px] cursor-pointer rounded-xl px-3.5 text-left text-[15px] font-bold ${type === t.type ? "border-2 border-brand bg-brand-soft" : "border border-line-strong bg-white hover:bg-sand"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <PillGroup
        label="Kogo dotyczy?"
        value={who}
        onChange={setWho}
        options={[
          ["mother", names.mother],
          ["father", names.father],
          ["both", names.both],
        ]}
      />

      <div className="flex flex-wrap gap-4">
        <Field label="Kiedy?" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="flex-[1_1_220px]" />
        {type === "salary" && (
          <Field label="Nowe wynagrodzenie brutto" inputMode="numeric" placeholder="np. 7000" value={amount} onChange={(e) => setAmount(e.target.value)} className="flex-[1_1_220px]" />
        )}
      </div>
      {error && (
        <div role="alert" className="font-bold text-danger">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-1.5 rounded-2xl bg-warn-soft px-[18px] py-4 text-warn">
        <div className="font-black">Co to zmienia</div>
        <div className="text-[15px] leading-relaxed">{def.effect}</div>
      </div>

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
