// Uploads the ZUS sample case files (never committed: materials/ is private) to the private Supabase bucket,
// then reads each one through the app so the extraction cache is warm and prints our result next to the ZUS decision.
//
// Usage (from the repo root, with the app running):
//   set -a; . ./.env.supabase.local; set +a
//   node app/scripts/upload-cases.mjs "materials/extracted/Sprawy " [--analyze] [--app http://localhost:3000]
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const [dir, ...flags] = process.argv.slice(2);
if (!dir) throw new Error("Pass the folder with the case PDFs.");
const analyze = flags.includes("--analyze");
const appUrl = flags.includes("--app") ? flags[flags.indexOf("--app") + 1] : "http://localhost:3000";
const { NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SECRET_KEY: key } = process.env;
if (!url || !key) throw new Error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY.");

const bucket = createClient(url, key, { auth: { persistSession: false } }).storage.from("zus-cases");

// File names start with an anonymised person; the label keeps only the case description.
const describe = (name) => {
  const text = name.replace(/\.pdf$/i, "").replace(/\s*\(\d+\)$/, "");
  const start = text.search(/(zas|zac?\.|odmowa|wniosek)/i);
  return (start >= 0 ? text.slice(start) : text).replace(/_+/g, " ").replace(/\s+/g, " ").trim();
};

const files = (await readdir(dir)).filter((f) => f.toLowerCase().endsWith(".pdf"));
files.sort((a, b) => describe(a).localeCompare(describe(b), "pl") || a.localeCompare(b, "pl"));
const index = [];
for (const [i, file] of files.entries()) {
  const id = `case-${String(i + 1).padStart(2, "0")}`;
  const { error } = await bucket.upload(`${id}.pdf`, await readFile(path.join(dir, file)), { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`${file}: ${error.message}`);
  index.push({ id, label: `Sprawa ${i + 1}: ${describe(file)}`, file });
}
const { error } = await bucket.upload("index.json", JSON.stringify(index.map(({ id, label }) => ({ id, label })), null, 1), { contentType: "application/json", upsert: true });
if (error) throw new Error(`index.json: ${error.message}`);
console.log(`Uploaded ${index.length} case files.`);

if (analyze) {
  for (const { id, file } of index) {
    const started = Date.now();
    const res = await fetch(`${appUrl}/api/cases/analyze`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sampleId: id }) });
    const body = await res.json();
    if (!res.ok) { console.log(`${id}\t${file}\tERROR ${res.status} ${body.error}`); continue; }
    const rows = body.analysis.comparison;
    const diff = rows.filter((r) => !r.match).map((r) => `${r.label}: nasze ${r.ours}, ZUS ${r.zus}`);
    const verdict = rows.length ? (diff.length ? `RÓŻNICE ${diff.join("; ")}` : "ZGODNE") : "brak decyzji w teczce";
    console.log(`${id}\t${file}\t${{ true: "przysługuje", false: "nie przysługuje" }[body.analysis.eligible] ?? "brak danych"}\t${verdict}\t${body.cached ? "cache" : `${Math.round((Date.now() - started) / 1000)} s`}`);
  }
}
