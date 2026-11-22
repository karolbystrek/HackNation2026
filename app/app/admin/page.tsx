import { Suspense } from "react";
import { AdminSettings } from "./settings";
import { loadParams } from "@/lib/server-params";
import { settingsFrom } from "@/lib/benefit-settings";

async function Settings() {
  const params = await loadParams();
  return <AdminSettings initial={settingsFrom(params)} />;
}

export default function AdminPage() {
  return <Suspense fallback={<p role="status">Wczytuję parametry…</p>}><Settings /></Suspense>;
}
