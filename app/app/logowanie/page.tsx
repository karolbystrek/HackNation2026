"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button } from "@/components/ui";
import { personas } from "@/lib/mock/personas";
import { logIn } from "@/lib/plan-store";

// Decorative QR-like pattern, deterministic so server and client render the same.
const QR = Array.from({ length: 21 * 21 }, (_, i) => {
  const x = i % 21;
  const y = Math.floor(i / 21);
  const finder = (cx: number, cy: number) => x >= cx && x < cx + 7 && y >= cy && y < cy + 7 && (x === cx || x === cx + 6 || y === cy || y === cy + 6 || (x >= cx + 2 && x <= cx + 4 && y >= cy + 2 && y <= cy + 4));
  if (finder(0, 0) || finder(14, 0) || finder(0, 14)) return true;
  if ((x < 8 && y < 8) || (x > 12 && y < 8) || (x < 8 && y > 12)) return false;
  return ((Math.imul(x + 1, 73856093) ^ Math.imul(y + 1, 19349663)) >>> 0) % 7 < 3;
});

export default function MObywatelLogin() {
  const router = useRouter();
  const [personaId, setPersonaId] = useState(personas[0].id);
  const [connecting, setConnecting] = useState(false);

  function confirm() {
    setConnecting(true);
    setTimeout(() => {
      logIn(personaId);
      router.push("/rodzina");
    }, 900);
  }

  return (
    <main className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-5 py-8">
      <BackLink href="/">Wróć</BackLink>
      <section className="overflow-hidden rounded-[20px] bg-white">
        <div className="flex items-center gap-3 bg-ink px-6 py-4 text-white">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white text-sm font-black text-ink">m</span>
          <div>
            <div className="font-extrabold">Logowanie przez mObywatel</div>
            <div className="text-[13px] text-line">Symulacja na potrzeby prototypu – żadne dane nie są wysyłane</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-8 p-6">
          <div className="flex flex-[1_1_220px] flex-col items-center gap-3">
            <div className="grid size-[189px] grid-cols-21 gap-0 rounded-lg border border-line p-2" aria-hidden="true">
              {QR.map((on, i) => (
                <span key={i} className={on ? "bg-ink" : ""} />
              ))}
            </div>
            <p className="text-center text-sm text-muted">Zeskanuj kod w aplikacji mObywatel i potwierdź logowanie.</p>
          </div>
          <div className="flex flex-[1_1_280px] flex-col gap-4">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 font-extrabold">Konto demo</legend>
              {personas.map((p) => (
                <label key={p.id} className={`flex cursor-pointer gap-3 rounded-2xl border-2 p-4 ${personaId === p.id ? "border-brand bg-brand-soft" : "border-line"}`}>
                  <input type="radio" name="persona" checked={personaId === p.id} onChange={() => setPersonaId(p.id)} className="mt-1 size-5 shrink-0 accent-brand" />
                  <span>
                    <b className="block">{p.label}</b>
                    <span className="text-sm text-muted">{p.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
            <p className="text-sm text-muted">Przekażemy: imię, nazwisko, PESEL. Zgadzasz się na pobranie danych z ZUS, KAS i rejestru PESEL.</p>
            <Button onClick={confirm} disabled={connecting} className="self-start">
              {connecting ? "Łączenie z mObywatel…" : "Potwierdzam w aplikacji"}
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
}
