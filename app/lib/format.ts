export function parseAmount(value: string | number): number {
  const n = parseFloat(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isNaN(n) ? 0 : n;
}

export function formatPln(value: number, decimals = 0): string {
  const [int, frac] = Math.abs(value).toFixed(decimals).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${value < 0 ? "−" : ""}${frac ? `${grouped},${frac}` : grouped} zł`;
}

export function formatRate(rate: number): string {
  return `${String(Math.round(rate * 10000) / 100).replace(".", ",")}%`;
}

export function formatWeeks(weeks: number): string {
  return `${String(Math.round(weeks * 10) / 10).replace(".", ",")} tyg.`;
}
