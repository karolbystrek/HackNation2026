import { createClient } from "@supabase/supabase-js";
import { getSupabaseConfig } from "./config";

/** Server-only client with the secret key, for data no visitor may read directly (sample case files, extraction cache). */
export function createAdminClient() {
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!secret) throw new Error("Set SUPABASE_SECRET_KEY (make supabase writes it to .env.supabase.local).");
  return createClient(getSupabaseConfig().serverUrl, secret, { auth: { persistSession: false, autoRefreshToken: false } });
}
