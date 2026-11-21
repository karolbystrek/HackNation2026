import assert from "node:assert/strict";
import { test } from "node:test";

test("health reports backend connectivity without caching or leaking credentials", async () => {
  const response = await fetch(
    new URL("/api/health", process.env.APP_URL || "http://localhost:3000"),
  );
  const unavailable = process.env.EXPECT_UNAVAILABLE === "1";
  assert.equal(response.status, unavailable ? 503 : 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.deepEqual(
    await response.json(),
    unavailable
      ? { status: "error", supabase: "unavailable" }
      : { status: "ok", supabase: "connected" },
  );
});
