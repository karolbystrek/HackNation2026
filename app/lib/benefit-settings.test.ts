import { expect, test } from "vitest";
import { applySettings, readSettings, settingsFrom } from "@/lib/benefit-settings";
import { planLeave } from "@/lib/calc/leave";
import { defaultParams } from "@/lib/params";

test("defaults round-trip and old stored overrides keep their values", () => {
  expect(applySettings(readSettings(settingsFrom(defaultParams)))).toEqual(defaultParams);
  // Saved before the extra fields existed: only four keys.
  const params = applySettings(readSettings({ parentalRate: 60, flatRate: 80, singleWeeks: 41, multipleWeeks: 43 }));
  expect(params.rates).toEqual({ ...defaultParams.rates, parental: 0.6, flat: 0.8 });
  expect(params.maternityWeeks).toEqual(defaultParams.maternityWeeks);
});

test("an admin change reaches the leave engine", () => {
  const params = applySettings(readSettings({ maternityWeeks1: 22, waitingVoluntary: 60 }));
  expect(params.waitingDays).toEqual({ uop: 30, zlec: 60, jdg: 60 });
  const r = planLeave({ mode: "birth", names: { mother: "M", father: "O" }, bases: { mother: 3000, father: 3000 }, startDate: "2027-01-01",
    kids: 1, zaZyciem: false, adoptionType: "adoption", childBirthDate: "", schoolDeferred: false, main: "mother", otherWeeks: 9, paternity: false, flatRate: false }, params);
  expect(r.periods.mother[0]).toMatchObject({ kind: "maternity", weeks: 22 });
});

test("rejects inconsistent values", () => {
  expect(readSettings({ singleWeeks: 45, multipleWeeks: 43 })).toBeNull();
  expect(readSettings({ parentalOwnWeeks: 30 })).toBeNull();
  expect(readSettings({ fullRate: 150 })).toBeNull();
  expect(readSettings({ fullRate: "100" })).toBeNull();
  expect(readSettings(null)).toBeNull();
});
