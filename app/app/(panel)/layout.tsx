import { JourneyProvider } from "@/components/journey-provider";
import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";
import { loadJourney } from "@/lib/knowledge";

// The family plan lives only in the browser session, so these pages cannot be prerendered.
export const instant = false;

export default async function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <JourneyProvider journey={await loadJourney()}>
      <SessionGuard><PanelNav />{children}</SessionGuard>
    </JourneyProvider>
  );
}
