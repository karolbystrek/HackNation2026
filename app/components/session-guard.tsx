"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { currentPersona } from "@/lib/guide/persona";
import { useIsClient, usePlan } from "@/lib/plan-store";

/** Renders children only for a logged-in family; optionally returns guests to the start page. */
export function SessionGuard({ children, redirectGuest = true }: { children: ReactNode; redirectGuest?: boolean }) {
  const isClient = useIsClient();
  const persona = currentPersona(usePlan());
  const router = useRouter();

  useEffect(() => {
    if (redirectGuest && isClient && !persona) router.replace("/");
  }, [isClient, persona, redirectGuest, router]);

  return isClient && persona ? children : null;
}
