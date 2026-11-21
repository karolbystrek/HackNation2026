import { Suspense } from "react";
import { ApplicationForm } from "@/components/application-form";
import { FORM_IDS, loadSpecs } from "@/lib/forms/load";

export default async function ApplicationPage() {
  return <Suspense><ApplicationForm specs={await loadSpecs(FORM_IDS)} /></Suspense>;
}
