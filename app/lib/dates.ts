// Dates travel as ISO "YYYY-MM-DD" strings and are computed in UTC, so server and browser agree.

export function parseIso(value: string | null | undefined): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

export function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setUTCDate(result.getUTCDate() + Math.round(days));
  return result;
}

export function diffDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

export function addYears(date: Date, years: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear() + years, date.getUTCMonth(), date.getUTCDate()));
}

export function formatDate(value: Date | string | null | undefined): string {
  const date = typeof value === "string" ? parseIso(value) : value;
  if (!date) return "-";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getUTCDate())}.${pad(date.getUTCMonth() + 1)}.${date.getUTCFullYear()}`;
}

const warsawDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Warsaw", dateStyle: "short" });

export function todayInWarsaw(): string {
  return warsawDate.format(new Date());
}
