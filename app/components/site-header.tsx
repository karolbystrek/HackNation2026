"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { logOut, usePlan } from "@/lib/plan-store";

function FamilyLink({ name }: { name: string }) {
  const pathname = usePathname();
  const query = useSearchParams();
  const from = query.size ? `${pathname}?${query}` : pathname;
  return <Link href={`/rodzina?z=${encodeURIComponent(from)}`} className="text-link min-h-11 content-center">{name}</Link>;
}

export function SiteHeader() {
  const plan = usePlan();
  const persona = currentPersona(plan);
  const router = useRouter();

  return (
    <header className="border-t-4 border-t-primary border-b">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
        <Link href={persona ? "/plan" : "/"} className="min-h-11 content-center leading-tight font-bold text-primary hover:underline">
          Zasiłkowy Przewodnik<br />Przyszłego Rodzica
        </Link>
        {persona && (
          <nav aria-label="Konto demonstracyjne" className="flex flex-wrap items-center gap-x-5">
            {plan.personaId === GUIDE_ID
              ? <Link href="/nowa-os" className="text-link min-h-11 content-center">Zmień odpowiedzi</Link>
              : <Suspense><FamilyLink name={persona.label} /></Suspense>}
            <Button
              variant="link"
              onClick={() => {
                logOut();
                router.replace("/");
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
