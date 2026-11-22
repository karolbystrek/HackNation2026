import type { ReactNode } from "react";
import { JourneyProvider } from "@/components/journey-provider";
import { loadJourney } from "@/lib/knowledge";
import { loadParams } from "@/lib/server-params";
import { ParamsProvider } from "@/lib/use-params";

export async function FamilySettings({ children }: { children: ReactNode }) {
  const [params, journey] = await Promise.all([loadParams(), loadJourney()]);
  return (
    <ParamsProvider params={params}>
      <JourneyProvider journey={journey}>{children}</JourneyProvider>
    </ParamsProvider>
  );
}
