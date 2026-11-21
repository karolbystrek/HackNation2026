import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { test } from "node:test";

test("local Supabase supports signup, login, token refresh and logout", async (t) => {
  const status = JSON.parse(execFileSync("supabase", ["status", "-o", "json"], {
    encoding: "utf8",
  }));
  assert.equal(new URL(status.API_URL).hostname, "127.0.0.1");
  const key = status.PUBLISHABLE_KEY;
  const email = `smoke-${randomUUID()}@example.com`;
  const password = randomUUID();

  async function auth(path, body, token) {
    return fetch(`${status.API_URL}/auth/v1/${path}`, {
      method: "POST",
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10000),
    });
  }

  const signup = await auth("signup", { email, password });
  assert.equal(signup.status, 200);
  const created = await signup.json();
  assert.equal(typeof created.user?.id, "string");
  t.after(async () => {
    const response = await fetch(`${status.API_URL}/auth/v1/admin/users/${created.user.id}`, {
      method: "DELETE",
      headers: { apikey: status.SECRET_KEY },
      signal: AbortSignal.timeout(10000),
    });
    assert.equal(response.status, 200, "Remove the temporary local test user");
  });

  const login = await auth("token?grant_type=password", { email, password });
  assert.equal(login.status, 200);
  const session = await login.json();
  assert.equal(session.user.id, created.user.id);
  assert.equal(typeof session.access_token, "string");

  const refresh = await auth("token?grant_type=refresh_token", {
    refresh_token: session.refresh_token,
  });
  assert.equal(refresh.status, 200);
  const refreshed = await refresh.json();
  assert.equal(refreshed.user.id, created.user.id);

  const user = await fetch(`${status.API_URL}/auth/v1/user`, {
    headers: { apikey: key, Authorization: `Bearer ${refreshed.access_token}` },
    signal: AbortSignal.timeout(10000),
  });
  assert.equal(user.status, 200);
  assert.equal((await user.json()).id, created.user.id);

  const cookie = Buffer.from(JSON.stringify({ ...refreshed, expires_at: 1 })).toString("base64url");
  const page = await fetch("http://localhost:3000/", {
    headers: { Cookie: `hacknation-auth=base64-${cookie}` },
    signal: AbortSignal.timeout(15000),
  });
  assert.equal(page.status, 200);
  assert.ok(page.headers.getSetCookie().some((value) => /^hacknation-auth(?:\.\d+)?=/.test(value)),
    "The Next.js proxy must refresh the expired cookie session");
  assert.match(page.headers.get("cache-control"), /no-store/);

  const logout = await auth("logout", {}, refreshed.access_token);
  assert.equal(logout.status, 204);
  const revoked = await auth("token?grant_type=refresh_token", {
    refresh_token: refreshed.refresh_token,
  });
  assert.equal(revoked.status, 400);
});
