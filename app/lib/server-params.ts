import { cookies } from "next/headers";
import { applySettings, readSettings, SETTINGS_COOKIE } from "@/lib/benefit-settings";

/** Demo: admin overrides live in a cookie, so each browser sees its own parameters and no database is needed. */
export async function loadParams() {
  const raw = (await cookies()).get(SETTINGS_COOKIE)?.value;
  let stored: unknown = null;
  try { stored = raw && JSON.parse(raw); } catch { /* a broken cookie falls back to defaults */ }
  return applySettings(readSettings(stored));
}
