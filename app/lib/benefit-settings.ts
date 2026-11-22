import { defaultParams, type Params } from "@/lib/params";

type Path = readonly (string | number)[];
type FieldSpec = {
  key: string;
  label: string;
  group: string;
  /** Params locations that take the value; one field can set several (e.g. 90 days for contractors and businesses). */
  paths: readonly Path[];
  /** Stored value = params value × scale (percentages are entered as 81.5, kept as 0.815). */
  scale?: number;
  min: number;
  max: number;
  step: number;
};

const read = (params: Params, path: Path) => path.reduce<unknown>((node, key) => (node as Record<string | number, unknown>)[key], params) as number;
const round = (value: number, step: number) => Math.round(value / step) * step;

const rate = (key: string, label: string, path: Path): FieldSpec =>
  ({ key, label, group: "Stawki zasiłku", paths: [path], scale: 100, min: 1, max: 100, step: 0.1 });
const weeks = (key: string, label: string, path: Path, min = 1): FieldSpec =>
  ({ key, label, group: "Wymiar urlopów (tygodnie)", paths: [path], min, max: 104, step: 1 });
const days = (key: string, label: string, paths: readonly Path[], group = "Zasiłek chorobowy (dni)"): FieldSpec =>
  ({ key, label, group, paths, min: 1, max: 365, step: 1 });
const money = (key: string, label: string, path: Path): FieldSpec =>
  ({ key, label, group: "Podstawa wymiaru (zł)", paths: [path], min: 1, max: 1_000_000, step: 0.01 });

/** Benefit parameters the admin panel can change without a code change, e.g. after a change in the law. */
export const settingsFields = [
  rate("fullRate", "Stawka za urlop macierzyński, ojcowski i uzupełniający (%)", ["rates", "full"]),
  rate("parentalRate", "Stawka za urlop rodzicielski (%)", ["rates", "parental"]),
  rate("flatRate", "Uśredniona stawka zasiłku (%)", ["rates", "flat"]),
  ...defaultParams.maternityWeeks.map((_, i) =>
    weeks(`maternityWeeks${i + 1}`, `Urlop macierzyński: ${i === 4 ? "5 i więcej dzieci" : `${i + 1} ${i ? "dzieci" : "dziecko"}`}`, ["maternityWeeks", i])),
  weeks("singleWeeks", "Pula rodzicielska przy jednym dziecku", ["parentalPoolWeeks", "single"]),
  weeks("multipleWeeks", "Pula rodzicielska przy wieloraczkach", ["parentalPoolWeeks", "multiple"]),
  weeks("zaZyciemSingleWeeks", "Pula rodzicielska „Za życiem”, jedno dziecko", ["parentalPoolWeeks", "zaZyciemSingle"]),
  weeks("zaZyciemMultipleWeeks", "Pula rodzicielska „Za życiem”, wieloraczki", ["parentalPoolWeeks", "zaZyciemMultiple"]),
  weeks("parentalOwnWeeks", "Nieprzenoszalna część rodzicielskiego dla każdego rodzica", ["parentalOwnWeeks"]),
  weeks("motherOnlyWeeks", "Macierzyński wykorzystywany tylko przez matkę", ["motherOnlyWeeks"]),
  weeks("paternityWeeks", "Urlop ojcowski", ["paternityWeeks"]),
  weeks("stillbirthWeeks", "Macierzyński po martwym urodzeniu", ["stillbirthWeeks"]),
  weeks("preBirthMaxWeeks", "Macierzyński przed porodem, najwyżej", ["preBirthMaxWeeks"], 0),
  { key: "contributionRate", label: "Składki pracownika odliczane od podstawy (%)", group: "Podstawa wymiaru (zł)", paths: [["employeeContributionRate"]], scale: 100, min: 0, max: 50, step: 0.01 },
  money("minWage", "Płaca minimalna", ["minWage"]),
  money("maxVoluntaryBasis", "Limit podstawy dobrowolnej składki chorobowej", ["maxVoluntaryBasis"]),
  money("parentalAllowance", "Świadczenie rodzicielskie (podwyższenie zasiłku)", ["parentalAllowanceMonthly"]),
  days("waitingMandatory", "Okres wyczekiwania – ubezpieczenie obowiązkowe", [["waitingDays", "uop"]]),
  days("waitingVoluntary", "Okres wyczekiwania – ubezpieczenie dobrowolne", [["waitingDays", "zlec"], ["waitingDays", "jdg"]]),
  days("employerPaidDays", "Wynagrodzenie chorobowe od pracodawcy", [["employerPaidDays"]]),
  days("employerPaidDaysOver50", "Wynagrodzenie chorobowe po 50. roku życia", [["employerPaidDaysOver50"]]),
  { ...days("benefitPeriodDays", "Okres zasiłkowy", [["benefitPeriodDays"]]), max: 730 },
  days("flatRateRequestDays", "Wniosek o stawkę uśrednioną po porodzie", [["flatRateRequestDays"]], "Terminy (dni)"),
  days("parentalRequestDays", "Wniosek o urlop rodzicielski przed jego startem", [["parentalRequestDays"]], "Terminy (dni)"),
].map((field) => ({ ...field, value: round(read(defaultParams, field.paths[0]) * (field.scale ?? 1), field.step) }));

export type Settings = Record<string, number>;

/** Current values for the form, read back from the effective parameters. */
export function settingsFrom(params: Params): Settings {
  return Object.fromEntries(settingsFields.map((field) => [field.key, round(read(params, field.paths[0]) * (field.scale ?? 1), field.step)]));
}

/**
 * Validates stored or submitted overrides. A key that is missing (e.g. saved before the field existed) keeps its default,
 * so adding a parameter needs no migration; a wrong value rejects the whole set.
 */
export function readSettings(value: unknown): Settings | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const settings: Settings = {};
  for (const field of settingsFields) {
    const number = Object.hasOwn(value, field.key) ? (value as Record<string, unknown>)[field.key] : field.value;
    if (typeof number !== "number" || !Number.isFinite(number) || number < field.min || number > field.max ||
      Math.abs(number / field.step - Math.round(number / field.step)) > 1e-6) return null;
    settings[field.key] = number;
  }
  const own = settings.parentalOwnWeeks * 2;
  if (settings.multipleWeeks < settings.singleWeeks || settings.zaZyciemMultipleWeeks < settings.zaZyciemSingleWeeks ||
    [settings.singleWeeks, settings.zaZyciemSingleWeeks].some((pool) => pool < own) ||
    settings.motherOnlyWeeks > settings.maternityWeeks1) return null;
  return settings;
}

export function applySettings(settings: Settings | null): Params {
  const params = structuredClone(defaultParams) as Params;
  if (!settings) return params;
  for (const field of settingsFields) {
    for (const path of field.paths) {
      const parent = path.slice(0, -1).reduce<unknown>((node, key) => (node as Record<string | number, unknown>)[key], params) as Record<string | number, number>;
      parent[path.at(-1)!] = settings[field.key] / (field.scale ?? 1);
    }
  }
  return params;
}
