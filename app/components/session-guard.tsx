"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { findPersona } from "@/lib/mock/personas";
import { useIsClient, usePlan } from "@/lib/plan-store";

/** Renders children only for a logged-in family; without one, goes back to the start page. */
export function SessionGuard({ children }: { children: ReactNode }) {
  const isClient = useIsClient();
  const persona = findPersona(usePlan().personaId);
  const router = useRouter();

  useEffect(() => {
    if (isClient && !persona) router.replace("/");
  }, [isClient, persona, router]);

  return isClient && persona ? children : null;
}
