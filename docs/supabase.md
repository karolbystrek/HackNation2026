# Supabase

The CLI manages PostgreSQL, Auth, the Data API, Studio and the email inbox.
Unused services are disabled in `supabase/config.toml`; restart after changing it.
Email confirmation is disabled locally. OAuth providers require configuration.

Browser clients use `NEXT_PUBLIC_SUPABASE_URL`. Docker server code uses
`SUPABASE_INTERNAL_URL` to reach the same API through `host.docker.internal`.
Both clients share a cookie name. There is no local auth bypass.

The Makefile exports the local API URL, the publishable key and the server-only
`SUPABASE_SECRET_KEY`, used by `app/lib/supabase/admin.ts` for the private
`zus-cases` storage bucket and the `case_extractions` cache. Host
`app/.env*` files are excluded from Docker builds and sync; Vercel configuration
is separate. Never commit credentials or expose secret/service-role keys in
`NEXT_PUBLIC_*` variables.

Create SQL migrations with `npx supabase migration new <name>` under
`supabase/migrations/`. Enable RLS and appropriate policies on exposed tables.
Generate database types when adding the application schema.
`make down`, `make restart` and `make clean` preserve database data;
`supabase stop --no-backup` and database resets delete it.

See [local commands](local-development.md) and
[client entry points](../app/README.md#supabase-clients).
