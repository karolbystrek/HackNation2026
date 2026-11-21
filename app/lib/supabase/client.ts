import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, key, cookieOptions } = getSupabaseConfig();
  return createBrowserClient(url, key, { cookieOptions });
}
