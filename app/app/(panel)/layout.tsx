import { Suspense } from "react";
import { ParamsProvider } from "@/lib/use-params";
import { loadParams } from "@/lib/server-params";
import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";

// The family plan lives only in the browser session, so these pages cannot be prerendered.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return <Suspense fallback={<p role="status">Wczytuję plan…</p>}><PanelSettings>{children}</PanelSettings></Suspense>;
}

async function PanelSettings({ children }: Pick<LayoutProps<"/">, "children">) {
  return <ParamsProvider params={await loadParams()}><SessionGuard><PanelNav />{children}</SessionGuard></ParamsProvider>;
}
