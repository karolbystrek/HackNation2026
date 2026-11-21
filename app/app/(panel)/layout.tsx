import { Suspense } from "react";
import { JourneyProvider } from "@/components/journey-provider";
import { ParamsProvider } from "@/lib/use-params";
import { loadParams } from "@/lib/server-params";
import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";
import { loadJourney } from "@/lib/knowledge";

// The family plan lives only in the browser session, so these pages cannot be prerendered.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<p role="status">Wczytuję plan…</p>}><PanelSettings>{children}</PanelSettings></Suspense>;
}

async function PanelSettings({ children }: Pick<LayoutProps<"/">, "children">) {
  const [params, journey] = await Promise.all([loadParams(), loadJourney()]);
  return (
    <ParamsProvider params={params}>
      <JourneyProvider journey={journey}><SessionGuard><PanelNav />{children}</SessionGuard></JourneyProvider>
    </ParamsProvider>
  );
}
