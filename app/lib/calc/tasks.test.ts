import { expect, test } from "vitest";
import { nextTask, progress, type Task } from "./tasks";

const task = (id: string, over: Partial<Task> = {}): Task => ({
  id, due: null, when: "", who: "both", title: id, description: "", extra: false,
  documents: [], done: false, locked: false, waitingFor: [], ...over,
});

test("next task is the earliest actionable one and skips done, locked and extra tasks", () => {
  const tasks = [
    task("undated"), task("late", { due: "2026-12-20" }), task("done", { due: "2026-01-01", done: true }),
    task("blocked", { due: "2026-01-02", locked: true }), task("extra", { due: "2026-01-03", extra: true }),
    task("soon", { due: "2026-12-01" }),
  ];
  expect(nextTask(tasks)?.id).toBe("soon");
  expect(nextTask([task("undated")])?.id).toBe("undated");
  expect(nextTask([task("done", { done: true })])).toBeUndefined();
  expect(progress(tasks)).toEqual({ done: 1, total: 5 });
});
