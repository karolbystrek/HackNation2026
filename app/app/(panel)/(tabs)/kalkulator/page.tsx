"use client";

import { useState } from "react";
import { BasisCalculator } from "@/components/calculator/basis-calculator";
import { LeaveCalculator } from "@/components/calculator/leave-calculator";
import { PregnancyCalculator } from "@/components/calculator/pregnancy-calculator";
import { computeBasis } from "@/lib/calc/basis";
import { useFamily } from "@/lib/use-family";

const MODES = [
  ["pregnancy", "W ciąży"],
  ["birth", "Narodziny"],
  ["adoption", "Adopcja i rodzina zastępcza"],
  ["basis", "Podstawa wymiaru"],
] as const;
type Mode = (typeof MODES)[number][0];

export default function Calculators() {
  const { persona, params } = useFamily();
  const [mode, setMode] = useState<Mode>("birth");
  // Bases are shared between tabs so "Use for Anna" in the basis tab feeds the leave calculator.
  const [bases, setBases] = useState(() => ({
    mother: computeBasis(persona.parents.mother.monthlyGross, params).basis.toFixed(2).replace(".", ","),
    father: computeBasis(persona.parents.father.monthlyGross, params).basis.toFixed(2).replace(".", ","),
  }));

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-5 pt-7 pb-12">
      <div>
        <h1 className="mb-1.5 text-[28px] font-black sm:text-[34px]">Kalkulatory zasiłków</h1>
        <p className="leading-relaxed text-muted">Jeden kalkulator, cztery tryby. Dane startowe pochodzą z mObywatela – każdą wartość możecie zmienić.</p>
      </div>
      <div role="tablist" className="flex flex-wrap gap-2">
        {MODES.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={mode === key}
            onClick={() => setMode(key)}
            className={`min-h-12 cursor-pointer rounded-full border-2 border-brand px-5 font-extrabold ${mode === key ? "bg-brand text-white" : "bg-white text-brand hover:bg-brand-soft"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {(mode === "birth" || mode === "adoption") && (
        <LeaveCalculator key={mode} mode={mode} bases={bases} setBases={setBases} onBasisTab={() => setMode("basis")} />
      )}
      {mode === "pregnancy" && <PregnancyCalculator basis={bases.mother} setBasis={(v) => setBases((b) => ({ ...b, mother: v }))} />}
      {mode === "basis" && (
        <BasisCalculator
          onUse={(parent, value) => {
            setBases((b) => ({ ...b, [parent]: value }));
            setMode("birth");
          }}
        />
      )}

      <p className="text-[13px] leading-relaxed text-muted">
        Kwoty brutto (przed zaliczką na podatek). Stawki i wymiary urlopów pochodzą z panelu administratora. Wynik ma charakter informacyjny – o prawie do zasiłku decyduje ZUS lub płatnik składek.
      </p>
    </main>
  );
}
