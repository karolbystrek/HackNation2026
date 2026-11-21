import { readFile } from "node:fs/promises";
import path from "node:path";

export type CaseSample = { id: string; label: string };

const maternitySample = {
  id: "demo-maternity",
  label: "Fikcyjna sprawa: zasiłek macierzyński po urodzeniu dziecka",
} satisfies CaseSample;

export const samples: CaseSample[] = [maternitySample];

export async function downloadSample(id: string): Promise<Uint8Array | null> {
  if (id !== maternitySample.id) return null;
  return readFile(path.join(process.cwd(), "public/case-samples/demo-maternity.pdf"));
}
