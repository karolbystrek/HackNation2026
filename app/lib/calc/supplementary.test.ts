import { expect, test } from "vitest";
import { supplementaryLeave } from "@/lib/calc/supplementary";
import { defaultParams as params } from "@/lib/params";

// Cases from the ZUS attachment "maksymalny czas trwania zasiłków" (uzupełniający urlop macierzyński).
test.each([
  ["born before week 28", { gestationWeek: 26, birthWeightG: 1200, hospitalDays: 120 }, 15],
  ["weight at most 1000 g", { gestationWeek: 30, birthWeightG: 1000, hospitalDays: 50 }, 8],
  ["week 28 and 1000 g together, capped at 15", { gestationWeek: 27, birthWeightG: 900, hospitalDays: 200 }, 15],
  ["weeks 28-36 above 1000 g, capped at 8", { gestationWeek: 32, birthWeightG: 1800, hospitalDays: 90 }, 8],
  ["started week rounds up", { gestationWeek: 32, birthWeightG: 1800, hospitalDays: 15 }, 3],
  ["at term, 2 days from the 5th day of life", { gestationWeek: 39, birthWeightG: 3400, hospitalDays: 2 }, 1],
  ["at term, a single day does not qualify", { gestationWeek: 39, birthWeightG: 3400, hospitalDays: 1 }, 0],
  ["no hospital stay", { gestationWeek: 30, birthWeightG: 1500, hospitalDays: 0 }, 0],
])("%s", (_, input, weeks) => {
  expect(supplementaryLeave(input, params).weeks).toBe(weeks);
});

test("the cap follows the earliest week or lowest weight", () => {
  expect(supplementaryLeave({ gestationWeek: null, birthWeightG: 950, hospitalDays: 0 }, params).cap).toBe(15);
  expect(supplementaryLeave({ gestationWeek: 35, birthWeightG: null, hospitalDays: 0 }, params).cap).toBe(8);
});
