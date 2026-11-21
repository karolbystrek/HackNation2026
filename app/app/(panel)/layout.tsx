import { PanelNav } from "@/components/panel-nav";
import { SessionGuard } from "@/components/session-guard";

// The family plan lives only in the browser session, so these pages cannot be prerendered.
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/">) {
  return <SessionGuard><PanelNav />{children}</SessionGuard>;
}
