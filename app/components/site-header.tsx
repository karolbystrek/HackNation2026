"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { findPersona } from "@/lib/mock/personas";
import { logOut, usePlan } from "@/lib/plan-store";

export function SiteHeader() {
  const persona = findPersona(usePlan().personaId);
  const router = useRouter();

  return (
    <header className="border-t-4 border-t-primary border-b">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
        <Link href={persona ? "/plan" : "/"} className="min-h-11 content-center leading-tight font-bold text-primary hover:underline">
          Zasiłkowy Przewodnik<br />Przyszłego Rodzica
        </Link>
        {persona && (
          <nav aria-label="Konto demonstracyjne" className="flex flex-wrap items-center gap-x-5">
            <Link href="/rodzina" className="text-link min-h-11 content-center">{persona.label}</Link>
            <Button
              variant="link"
              onClick={() => {
                logOut();
                router.push("/");
              }}
            >
              Wyloguj
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
