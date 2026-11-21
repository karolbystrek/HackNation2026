import { CASE_BUCKET } from "@/lib/cases/extract";
import { createAdminClient } from "@/lib/supabase/admin";

/** A sample case file in the private bucket; app/scripts/upload-cases.mjs writes them with an index.json of labels. */
export type CaseSample = { id: string; label: string };

const ID = /^case-\d{2,3}$/;

export async function listSamples(): Promise<CaseSample[]> {
  const { data, error } = await createAdminClient().storage.from(CASE_BUCKET).download("index.json");
  if (error && "code" in error && error.code === "NoSuchKey") return [];
  if (error) throw new Error(`Cannot read ${CASE_BUCKET}/index.json: ${error.message}`);
  const items = JSON.parse(await data.text()) as CaseSample[];
  return items.filter((item) => ID.test(item.id));
}

export async function downloadSample(id: string): Promise<Uint8Array | null> {
  if (!ID.test(id)) return null;
  const { data, error } = await createAdminClient().storage.from(CASE_BUCKET).download(`${id}.pdf`);
  if (error) return null;
  return new Uint8Array(await data.arrayBuffer());
}
