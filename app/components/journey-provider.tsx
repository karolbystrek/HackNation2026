"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Journey } from "@/lib/journey";

const JourneyContext = createContext<Journey | null>(null);

/** Hands the knowledge/ journey, loaded once on the server, to the panel's client pages. */
export function JourneyProvider({ journey, children }: { journey: Journey; children: ReactNode }) {
  return <JourneyContext value={journey}>{children}</JourneyContext>;
}

export function useJourney(): Journey {
  const journey = useContext(JourneyContext);
  if (!journey) throw new Error("useJourney() needs the (panel) layout's JourneyProvider");
  return journey;
}
