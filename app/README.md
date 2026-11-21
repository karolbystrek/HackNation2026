# Application

Next.js App Router with Supabase browser and server clients.

## Local development

From the repository root:

```sh
make setup
make dev
```

This starts CLI-managed local Supabase and Next.js in Docker with hot reload.
See [local development instructions](../docs/local-development.md) for endpoints, checks and shutdown.
No manual environment file is needed for this workflow.

## Supabase clients

- Client Components: import `createClient` from `@/lib/supabase/client`.
- Server Components, Server Actions and Route Handlers: import `createClient` from `@/lib/supabase/server` and await it.
- `proxy.ts` refreshes cookie sessions and propagates cookies and cache headers. It does not restrict routes. Verify claims with `auth.getClaims()` for protected features and enforce data authorization with RLS.

Local Docker server code uses `SUPABASE_INTERNAL_URL` to reach the host's Supabase API. Browser code uses `NEXT_PUBLIC_SUPABASE_URL`. Both clients use the same cookie name. Without the internal override, server code uses the public URL too.

`GET /api/health` checks Supabase Auth using the public API key. It returns 200 when connected and 503 on missing configuration, rejected credentials, timeout or upstream failure. Responses are never cached and contain no upstream details.

Only public configuration belongs in `NEXT_PUBLIC_*` variables. Never put secret API keys, service-role keys or database passwords there. Commit schema changes as migrations under the root `supabase/migrations/`, enable RLS on exposed tables, and generate database types after introducing the application schema.

Setup follows the [Supabase local development guide](https://supabase.com/docs/guides/local-development) and [Next.js SSR guide](https://supabase.com/docs/guides/auth/server-side/nextjs).
