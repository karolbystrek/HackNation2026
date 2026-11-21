import { ApplicationForm } from "@/components/application-form";
import { FORM_IDS, loadSpecs } from "@/lib/forms/load";

export default async function ApplicationPage() {
  return <ApplicationForm specs={await loadSpecs(FORM_IDS)} />;
}
