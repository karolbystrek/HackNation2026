import { connection } from "next/server";
import { applySettings, readSettings } from "@/lib/benefit-settings";
import { createAdminClient } from "@/lib/supabase/admin";

export async function loadParams() {
  await connection();
  const { data, error } = await createAdminClient().from("benefit_settings").select("overrides").eq("id", true).maybeSingle();
  if (error && error.code !== "PGRST205") throw error;
  return applySettings(readSettings(data?.overrides));
}
