"use client";

import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui";
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
  const admin = usePathname().startsWith("/admin");

  return (
    <header className="border-b">
      <div className="shell flex flex-wrap items-center justify-between gap-x-6 gap-y-1 py-3">
        <Link href={persona ? "/plan" : "/"} className="min-h-11 cursor-pointer content-center rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
          <Image src="/logo-zppr.svg" alt="Zasiłkowy Przewodnik Przyszłego Rodzica – strona główna" width={360} height={60} priority className="h-12 w-auto" />
        </Link>
        {admin && <Chip className="bg-navy font-bold text-navy-foreground">Panel administratora</Chip>}
        {persona && !admin && (
          <nav aria-label="Konto demonstracyjne" className="flex flex-wrap items-center gap-x-5">
            {plan.personaId === GUIDE_ID
              ? <Link href="/nowa-os" className="text-link min-h-11 content-center">Zmień odpowiedzi</Link>
              : <>
                  <Suspense><FamilyLink name={persona.parents[plan.viewer ?? "mother"].name} /></Suspense>
                  <Link href="/logowanie" className="text-link min-h-11 content-center">Zmień profil demo</Link>
                </>}
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
