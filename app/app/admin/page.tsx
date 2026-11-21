import { Suspense } from "react";
import { AdminSettings } from "./settings";
import { loadParams } from "@/lib/server-params";

async function Settings() {
  const params = await loadParams();
  return <AdminSettings initial={{
    parentalRate: Math.round(params.rates.parental * 1000) / 10, flatRate: Math.round(params.rates.flat * 1000) / 10,
    singleWeeks: params.parentalPoolWeeks.single, multipleWeeks: params.parentalPoolWeeks.multiple,
  }} />;
}

export default function AdminPage() {
  return <Suspense fallback={<p role="status">Wczytuję parametry…</p>}><Settings /></Suspense>;
}
