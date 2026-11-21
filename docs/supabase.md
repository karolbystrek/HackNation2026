# Supabase configuration and database changes

Read this when changing authentication, environment configuration, migrations
or database access. See [local development](local-development.md) for commands
and service endpoints.

## Configuration and clients

The browser uses the local API URL. Inside Docker, server code uses
`SUPABASE_INTERNAL_URL=http://host.docker.internal:54321`. The Supabase clients
share an explicit cookie name so both hosts use the same session. Keep local
and hosted code paths aligned; there is no local auth bypass or separate
direct-PostgreSQL code path.

Host `app/.env*`, `node_modules` and `.next` are excluded from image builds and
file sync. Compose injects the CLI-generated `.env.supabase.local`, which
contains only the local API URL and publishable key. Hosted Supabase settings
in `app/.env.local` or Vercel are not overwritten.
Never expose secret API keys, service-role keys or database passwords through
`NEXT_PUBLIC_*`. Do not commit local environment files or CLI state.

Client entry points and session behavior are described in
[the application README](../app/README.md#supabase-clients).

## Schema changes and data

Create migrations with `npx supabase migration new <name>` and commit SQL under
`supabase/migrations/`. Enable RLS with appropriate policies on exposed tables;
authentication alone does not authorize data access. Generate database types
when introducing or changing the application schema.

Use `npx supabase <command> --help` before unfamiliar CLI operations. Local
development does not require `supabase link` or a cloud database reset.
Avoid `supabase stop --no-backup` and database resets unless deletion is intended.
`make down`, `make restart` and `make clean` preserve database data.
