"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button, Card } from "@/components/ui";
import { Disclosure } from "@/components/ui/disclosure";
import { Progress } from "@/components/ui/progress";

export const amountPattern = " *[0-9][0-9 ]*(?:[.,][0-9]+)? *";
export const amountHint = "Wpisz kwotę w złotych, np. 5200,50.";

export function CalculatorSteps({
  steps,
  result,
  calculate = "Oblicz zasiłek",
  onBack,
  active = true,
  backFromResult = "Wybierz inny kalkulator",
  resultTitle = "Wynik",
  step: controlledStep,
  onStepChange,
  onStepSubmit,
}: {
  steps: { title: string; content: ReactNode }[];
  result: ReactNode;
  calculate?: string;
  onBack: () => void;
  active?: boolean;
  backFromResult?: string;
  resultTitle?: string;
  /** Optional controlled step, e.g. to jump back to a step from a summary. */
  step?: number;
  onStepChange?: (step: number) => void;
  /** Return false to stay on the step (custom validation). */
  onStepSubmit?: (step: number) => boolean;
}) {
  const [innerStep, setInnerStep] = useState(0);
  const step = controlledStep ?? innerStep;
  const setStep = onStepChange ?? setInnerStep;
  const heading = useRef<HTMLHeadingElement>(null);
  const current = steps[step];

  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active, step]);

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <header>
        <Progress
          label={current ? `Krok ${step + 1} z ${steps.length}` : `Ukończono ${steps.length} z ${steps.length} kroków`}
          value={step}
          total={steps.length}
        />
        <h2 ref={heading} tabIndex={-1} className="mt-3 text-2xl font-bold">
          {current?.title ?? resultTitle}
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
            if (onStepSubmit?.(step) === false) return;
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
    <Disclosure className="rounded-sm border border-border bg-background" open={startOpen} label={<span className="font-bold text-primary">{label}</span>}>
      <div className="flex min-w-0 flex-col gap-4 px-4 pb-4">{children}</div>
    </Disclosure>
  );
}
