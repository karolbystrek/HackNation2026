"use client";

import { useEffect, useRef, useState } from "react";
import { BasisCalculator } from "@/components/calculator/basis-calculator";
import { LeaveCalculator } from "@/components/calculator/leave-calculator";
import { PregnancyCalculator } from "@/components/calculator/pregnancy-calculator";
import { Button, PageTitle } from "@/components/ui";
import { computeBasis } from "@/lib/calc/basis";
import type { ParentKey } from "@/lib/calc/leave";
import { useFamily } from "@/lib/use-family";

const MODES = [
  ["birth", "Narodziny dziecka"],
  ["adoption", "Adopcja lub rodzina zastępcza"],
  ["pregnancy", "Zwolnienie w ciąży"],
  ["basis", "Oblicz podstawę zasiłku"],
] as const;
type Mode = (typeof MODES)[number][0];

export default function Calculators() {
  const { persona, params } = useFamily();
  const [mode, setMode] = useState<Mode | null>(null);
  const [basisRequest, setBasisRequest] = useState<{ parent: ParentKey; startMonth: string } | null>(null);
  const [bases, setBases] = useState(() => ({
    mother: computeBasis(persona.parents.mother.monthlyGross, params).basis.toFixed(2).replace(".", ","),
    father: computeBasis(persona.parents.father.monthlyGross, params).basis.toFixed(2).replace(".", ","),
  }));
  const picker = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (mode === null) picker.current?.focus();
  }, [mode]);

  const chooseMode = () => setMode(null);
  const openBasis = (parent: ParentKey, startMonth: string) => setBasisRequest({ parent, startMonth });
  const useBasis = (parent: ParentKey, value: string) => {
    setBases((previous) => ({ ...previous, [parent]: value }));
    if (basisRequest) setBasisRequest(null);
    else setMode("birth");
  };

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      <PageTitle>Kalkulatory zasiłków</PageTitle>
      {mode === null && (
        <section className="flex flex-col items-start gap-3">
          <h2 ref={picker} tabIndex={-1} className="text-2xl font-bold">Co chcesz obliczyć?</h2>
          <p className="text-muted-foreground">Uzupełniliśmy dane z profilu. Możesz je zmienić w każdym kroku.</p>
          <div className="flex w-full flex-col gap-2">
            {MODES.map(([key, label]) => (
              <Button key={key} variant="outline" className="justify-start py-3 text-left" onClick={() => setMode(key)}>
                {label}
              </Button>
            ))}
          </div>
        </section>
      )}

      <div hidden={mode !== "birth" || !!basisRequest}>
        <LeaveCalculator mode="birth" bases={bases} setBases={setBases} onBasis={openBasis} onBack={chooseMode} active={mode === "birth" && !basisRequest} />
      </div>
      <div hidden={mode !== "adoption" || !!basisRequest}>
        <LeaveCalculator mode="adoption" bases={bases} setBases={setBases} onBasis={openBasis} onBack={chooseMode} active={mode === "adoption" && !basisRequest} />
      </div>
      <div hidden={mode !== "pregnancy" || !!basisRequest}>
        <PregnancyCalculator basis={bases.mother} setBasis={(v) => setBases((b) => ({ ...b, mother: v }))} onBasis={openBasis} onBack={chooseMode} active={mode === "pregnancy" && !basisRequest} />
      </div>
      <div hidden={mode !== "basis"}>
        <BasisCalculator onUse={useBasis} onBack={chooseMode} active={mode === "basis"} />
      </div>
      {basisRequest && (
        <BasisCalculator request={basisRequest} onUse={useBasis} onBack={() => setBasisRequest(null)} />
      )}
      {mode !== null && (
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          Kwoty brutto, przed zaliczką na podatek. Wynik ma charakter informacyjny. O prawie do zasiłku decyduje ZUS lub płatnik składek.
        </p>
      )}
    </main>
  );
}
