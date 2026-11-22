import { Suspense } from "react";
import { PageSpinner } from "@/components/ui/page-spinner";
import { AdminSettings } from "./settings";
import { loadParams } from "@/lib/server-params";
import { settingsFrom } from "@/lib/benefit-settings";

async function Settings() {
  const params = await loadParams();
  return <AdminSettings initial={settingsFrom(params)} />;
}

export default function AdminPage() {
  return <Suspense fallback={<PageSpinner label="Wczytuję parametry…" />}><Settings /></Suspense>;
}
