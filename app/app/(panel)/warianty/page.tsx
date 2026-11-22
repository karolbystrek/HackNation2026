"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LeaveLanes } from "@/components/leave-lanes";
import { BackLink, Button, Card, PageBand, WarningBox } from "@/components/ui";
import { otherParent, planLeave } from "@/lib/calc/leave";
import { bestLeaveSplit, readCustomLeave } from "@/lib/calc/variants";
import { formatPln, formatWeeks } from "@/lib/format";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function VariantsPage() {
  return <Suspense><Variants /></Suspense>;
}

function Variants() {
  const { params, variants, chosen, plan, names } = useFamily();
  const router = useRouter();
  const query = useSearchParams();
  const event = plan.events.find((item) => item.id === query.get("wydarzenie"));
  const returnHref = event ? `/plan#timeline-event-${encodeURIComponent(event.id)}` : "/plan";

  const base = (chosen ?? variants.find((variant) => variant.key === "custom") ?? variants[0]).input;
  const main = base.main;
  const other = otherParent(main);
  const limit = planLeave(base, params).maxOtherWeeks;
  const canShare = limit > 0;
  const [selectedWeeks, setSelectedWeeks] = useState<number>();
  const best = useMemo(() => {
    if ([main, other].some((parent) => !base.uninsuredParents?.includes(parent) && !base.bases[parent])) return null;
    const result = bestLeaveSplit(base, params, limit);
    return result.familyTotal > 0 ? result : null;
  }, [base, main, other, limit, params]);
  const result = planLeave({
    ...base,
    otherWeeks: canShare ? selectedWeeks ?? (chosen || plan.customLeave ? base.otherWeeks : best?.otherWeeks ?? 0) : 0,
  }, params);
  const isBest = best?.otherWeeks === result.otherWeeks;
  const missingBasis = Object.values(result.periods).flat().some((period) => !base.bases[period.parent]);
  const customLeave = readCustomLeave({
    ...base,
    paternityStartDate: base.paternityStartDate || undefined,
    otherWeeks: result.otherWeeks,
  });

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col">
      <PageBand

        title="Podzielcie urlop rodzicielski"
        lead="Sprawdźcie, jak podział urlopu wpływa na szacunkowe kwoty zasiłków brutto."
      />
      <div className="page">
        <BackLink href={returnHref}>{event ? "Wróć do wydarzenia" : "Wróć do planu"}</BackLink>

        <Card className="flex flex-col gap-4">
          {limit > 0 ? (
            <div>
              <label htmlFor="leave-split" className="font-bold">Tygodnie urlopu rodzicielskiego ({names[other]})</label>
              <div className="mt-1 flex items-center gap-3">
                <Button variant="outline" aria-label="Odejmij tydzień" disabled={result.otherWeeks <= 0} onClick={() => setSelectedWeeks(Math.max(0, result.otherWeeks - 1))}>−</Button>
                <input
                  id="leave-split"
                  type="range"
                  min={0}
                  max={limit}
                  step={1}
                  value={result.otherWeeks}
                  aria-valuetext={`${names[main]}: ${formatWeeks(result.mainWeeks)}, ${names[other]}: ${formatWeeks(result.otherWeeks)}`}
                  onChange={(event) => setSelectedWeeks(event.currentTarget.valueAsNumber)}
                  className="min-h-11 min-w-0 flex-1 cursor-pointer accent-primary"
                />
                <Button variant="outline" aria-label="Dodaj tydzień" disabled={result.otherWeeks >= limit} onClick={() => setSelectedWeeks(Math.min(limit, result.otherWeeks + 1))}>+</Button>
              </div>
            </div>
          ) : (
            <p>Podział urlopu jest niedostępny dla tego profilu.</p>
          )}
          <dl className="grid gap-3 sm:grid-cols-3">
            <div><dt>{names[main]}</dt><dd className="font-bold">{formatWeeks(result.mainWeeks)}</dd></div>
            <div><dt>{names[other]}</dt><dd className="font-bold">{formatWeeks(result.otherWeeks)}</dd></div>
            <div><dt>Zasiłki brutto łącznie</dt><dd className="font-bold">{missingBasis ? <a href="/kalkulator" className="text-link">Uzupełnij podstawy</a> : formatPln(result.familyTotal)}</dd></div>
          </dl>

          {best && limit > 0 && (isBest ? (
            <p className="text-sm font-bold text-primary">Ten podział daje najwyższą łączną kwotę zasiłków.</p>
          ) : (
            <section className="flex flex-wrap items-center justify-between gap-3 border-l-4 border-primary bg-primary-soft p-4">
              <div>
                <h2 className="font-bold">Najwyższa łączna kwota zasiłków brutto</h2>
                <p>{formatPln(best.familyTotal)} · {names[main]}: {formatWeeks(best.mainWeeks)}, {names[other]}: {formatWeeks(best.otherWeeks)}</p>
              </div>
              <Button variant="outline" onClick={() => setSelectedWeeks(best.otherWeeks)}>
                Ustaw ten podział
              </Button>
            </section>
          ))}
          {!best && limit > 0 && (!base.bases.mother || !base.bases.father) && (
            <p className="text-sm text-muted-foreground">Do wyliczenia najlepszego podziału potrzebne są podstawy zasiłku obojga rodziców.</p>
          )}

          <section className="border-y py-3">
            <h2 className="font-bold">Harmonogram urlopów</h2>
            <p className="my-2 text-sm">Harmonogram zakłada, że rodzice korzystają z urlopu rodzicielskiego po kolei.</p>
            <p className="mb-2 text-sm text-muted-foreground">Wybierz odcinek na wykresie, aby sprawdzić daty i kwotę zasiłku.</p>
            <LeaveLanes result={result} names={names} />
            <a href="https://www.gov.pl/web/rodzina/urlop-rodzicielski" className="text-link">Zasady urlopu na gov.pl</a>
          </section>
          <WarningBox items={result.warnings} />

          <Button
            className="min-h-[50px] self-start"
            disabled={!customLeave}
            onClick={() => {
              updatePlan((state) => ({ ...state, customLeave, chosenVariant: "custom" }));
              router.push("/plan");
            }}
          >
            Zapisz podział i przejdź do zadań
          </Button>
        </Card>
      </div>
    </main>
  );
}
