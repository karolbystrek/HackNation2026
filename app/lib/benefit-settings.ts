import { defaultParams, type Params } from "@/lib/params";

export const settingsFields = [
  { key: "parentalRate", label: "Stawka za urlop rodzicielski (%)", value: defaultParams.rates.parental * 100, min: 1, max: 100, step: 0.1 },
  { key: "flatRate", label: "Uśredniona stawka zasiłku (%)", value: defaultParams.rates.flat * 100, min: 1, max: 100, step: 0.1 },
  { key: "singleWeeks", label: "Pula rodzicielska przy jednym dziecku (tyg.)", value: defaultParams.parentalPoolWeeks.single, min: defaultParams.parentalOwnWeeks * 2, max: 104, step: 1 },
  { key: "multipleWeeks", label: "Pula rodzicielska przy wieloraczkach (tyg.)", value: defaultParams.parentalPoolWeeks.multiple, min: defaultParams.parentalOwnWeeks * 2, max: 104, step: 1 },
] as const;

export type Settings = Record<(typeof settingsFields)[number]["key"], number>;

export function readSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object") return null;
  const settings = {} as Settings;
  for (const field of settingsFields) {
    if (!Object.hasOwn(value, field.key)) return null;
    const number = (value as Record<string, unknown>)[field.key];
    if (typeof number !== "number" || !Number.isFinite(number) || number < field.min || number > field.max ||
      Math.abs(number / field.step - Math.round(number / field.step)) > 1e-8) return null;
    settings[field.key] = number;
  }
  if (settings.multipleWeeks < settings.singleWeeks) return null;
  return settings;
}

export function applySettings(settings: Settings | null): Params {
  if (!settings) return defaultParams;
  return {
    ...defaultParams,
    rates: { ...defaultParams.rates, parental: settings.parentalRate / 100, flat: settings.flatRate / 100 },
    parentalPoolWeeks: { ...defaultParams.parentalPoolWeeks, single: settings.singleWeeks, multiple: settings.multipleWeeks },
  };
}
