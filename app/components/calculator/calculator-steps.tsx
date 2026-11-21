"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";

export const amountPattern = " *[0-9][0-9 ]*(?:[.,][0-9]+)? *";
export const amountHint = "Wpisz kwotę w złotych, np. 5200,50.";

export function CalculatorSteps({
  steps,
  result,
  calculate = "Oblicz zasiłek",
  onBack,
  active = true,
  backFromResult = "Wybierz inny kalkulator",
}: {
  steps: { title: string; content: ReactNode }[];
  result: ReactNode;
  calculate?: string;
  onBack: () => void;
  active?: boolean;
  backFromResult?: string;
}) {
  const [step, setStep] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const current = steps[step];

  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active, step]);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header>
        <p className="text-sm font-bold text-muted">
          {current ? `Krok ${step + 1} z ${steps.length}` : "Podsumowanie obliczeń"}
        </p>
        <h2 ref={heading} tabIndex={-1} className="mt-1 text-2xl font-black focus:outline-none">
          {current?.title ?? "Wynik"}
        </h2>
      </header>
      {current ? (
        <form
          key={step}
          className="flex flex-col gap-4"
          onInvalidCapture={(event) => {
            if (event.target instanceof HTMLInputElement) {
              const details = event.target.closest("details");
              if (details) details.open = true;
            }
          }}
          onSubmit={(event) => {
            event.preventDefault();
            setStep(step + 1);
          }}
        >
          <Card className="flex min-w-0 flex-col gap-5">{current.content}</Card>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Button variant="link" onClick={step === 0 ? onBack : () => setStep(step - 1)}>Wstecz</Button>
            <Button type="submit">{step + 1 === steps.length ? calculate : "Dalej"}</Button>
          </div>
        </form>
      ) : (
        <>
          {result}
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setStep(0)}>Zmień dane</Button>
            <Button variant="link" onClick={onBack}>{backFromResult}</Button>
          </div>
        </>
      )}
    </section>
  );
}

export function CalculatorDetails({ label, children, initiallyOpen }: {
  label: string;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const [startOpen] = useState(initiallyOpen);
  return (
    <details className="rounded-xl border border-line-soft bg-white" open={startOpen}>
      <summary className="min-h-11 cursor-pointer px-4 py-3 font-extrabold text-brand">{label}</summary>
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4">{children}</div>
    </details>
  );
}
