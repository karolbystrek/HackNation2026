import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/page-spinner";
import { FamilySettings } from "@/components/family-settings";
import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";

// The family plan lives only in the browser session, so these pages cannot be prerendered.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<PageSpinner label="Wczytuję plan…" />}>
      <FamilySettings>
        <SessionGuard><PanelNav />{children}</SessionGuard>
      </FamilySettings>
    </Suspense>
  );
}
