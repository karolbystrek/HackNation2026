import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";

const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], {
  encoding: "utf8",
}));
assert.equal(new URL(status.API_URL).hostname, "127.0.0.1", "Expected local Supabase API");
const key = status.PUBLISHABLE_KEY;
assert.equal(typeof key, "string", "Supabase did not return a public API key");
assert.ok(key.length > 0);

// Export only public configuration, never the CLI's secret or service-role keys.
writeFileSync(".env.supabase.local", [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${key}`,
  "",
].join("\n"), { mode: 0o600 });
console.log("Updated local Supabase configuration in .env.supabase.local");
