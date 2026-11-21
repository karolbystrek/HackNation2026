import { ApplicationForm } from "@/components/application-form";
import { FORM_IDS, loadSpecs } from "@/lib/forms/load";
import { journeyFormIds, loadJourney } from "@/lib/knowledge";

export default async function ApplicationPage() {
  // The fixed list covers extra and civil forms; knowledge/ steps add any form a task points to.
  return <ApplicationForm specs={await loadSpecs([...new Set([...FORM_IDS, ...journeyFormIds(await loadJourney())])])} />;
}
