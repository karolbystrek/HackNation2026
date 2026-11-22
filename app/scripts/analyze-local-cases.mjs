// Compares local challenge PDFs with the benefit engine via the running local app.
// Run from the repository root: node app/scripts/analyze-local-cases.mjs <folder>
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const [dir] = process.argv.slice(2);
if (!dir) throw new Error("Pass the folder with the case PDFs.");

const files = (await readdir(dir)).filter((file) => file.toLowerCase().endsWith(".pdf")).sort();
for (const file of files) {
  const started = Date.now();
  const bodyData = new FormData();
  bodyData.set("file", new Blob([await readFile(path.join(dir, file))], { type: "application/pdf" }), file);
  const res = await fetch("http://localhost:3000/api/cases/analyze", { method: "POST", body: bodyData });
  const body = await res.json();
  if (!res.ok) { console.log(`${file}\tERROR ${res.status} ${body.error}`); continue; }
  const rows = body.analysis.comparison;
  const diff = rows.filter((r) => !r.match).map((r) => `${r.label}: nasze ${r.ours}, ZUS ${r.zus}`);
  const verdict = rows.length ? (diff.length ? `RÓŻNICE ${diff.join("; ")}` : "ZGODNE") : "brak decyzji w teczce";
  console.log(`${file}\t${{ true: "przysługuje", false: "nie przysługuje" }[body.analysis.eligible] ?? "brak danych"}\t${verdict}\t${body.cached ? "cache" : `${Math.round((Date.now() - started) / 1000)} s`}`);
}
