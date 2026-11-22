import type { Metadata } from "next";
import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/page-spinner";
import { AdminSettings } from "./settings";
import { loadParams } from "@/lib/server-params";
import { settingsFrom } from "@/lib/benefit-settings";

// Deliberately unlinked from citizen screens; the demo reaches it by URL only.
export const metadata: Metadata = {
  title: "Panel administratora – parametry świadczeń",
  robots: { index: false, follow: false },
};

async function Settings() {
  const params = await loadParams();
  return <AdminSettings initial={settingsFrom(params)} />;
}

export default function AdminPage() {
  return <Suspense fallback={<PageSpinner label="Wczytuję parametry…" />}><Settings /></Suspense>;
}
