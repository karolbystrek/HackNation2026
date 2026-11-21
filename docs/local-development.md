# Local development and commands

Run commands from the repository root. Install Node.js 24+ and Docker Desktop
(or a Docker-compatible engine with Compose 2.22+), then start Docker.
No Supabase account, cloud credentials or manual environment setup is required.

```sh
make setup
make dev
```

`make dev` starts the pinned Supabase CLI stack, generates the ignored
`.env.supabase.local` with only the local API URL and public key, then starts
Next.js in Docker with Compose Watch. Source edits hot reload; changes to app
package manifests rebuild the image. Dependencies are cached during builds.
The first run downloads Docker images; subsequent starts reuse them.

For a background run without file watching:

```sh
make up
```

Local services:

- Next.js: http://localhost:3000
- Supabase API and Auth: http://127.0.0.1:54321
- Supabase Studio: http://127.0.0.1:54323
- Email testing inbox: http://127.0.0.1:54324
- PostgreSQL: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

Supabase CLI manages the backend containers. Compose manages only Next.js.
PostgreSQL, Auth, Data API, Studio and email testing are enabled. Realtime,
Storage, Edge Functions and Analytics are disabled in `supabase/config.toml`
until needed. Email/password signup works without confirmation locally.
OAuth providers need their own configuration; they are not mocked.

## Command interface

Use the root [Makefile](../Makefile) as the shared interface; `make help` lists all targets.

| Command | Purpose |
| --- | --- |
| `make setup` | Install the pinned CLI dependency; run after cloning or `make clean` |
| `make dev` | Start Supabase and Next.js with hot reload |
| `make up` | Start services in the background and wait until healthy |
| `make restart` | Stop and start both stacks, preserving database data |
| `make down` | Tear down containers while preserving database data |
| `make clean` | Stop services and remove host dependencies, Next.js caches and generated local env; preserve database data |
| `make logs` | Follow Next.js logs |
| `make status` | Show service status and local Supabase endpoints/keys |
| `make test` | Run connection and Auth/session integration tests |
| `make lint` | Run ESLint |
| `make typecheck` | Generate Next.js types and check TypeScript |
| `make build` | Run a production build in a disposable container |
| `make check` | Run lint, type checks, tests and production build in sequence |

Run `make up` before tests, lint, type checks or the full check. For hot reload
after `make restart`, run `make dev` again. `make clean` leaves Docker images,
Docker build cache and all database volumes intact; it does not run a global
Docker prune or touch hosted Supabase settings. After cleanup, run
`make setup` followed by `make dev` or `make up`.
GNU Make is required in addition to Node.js and Docker (available through
Xcode Command Line Tools on macOS).

## Verification

Run `make up` followed by `make check`. Tests cover service connectivity and
real signup, password login, token refresh, Next.js cookie-session refresh and
logout. The auth test deletes its temporary local user after the run.
The health endpoint checks Auth connectivity, not individual database tables.
Do not run `next build` in the development container; both commands write `.next`.
`make build` uses a disposable container instead.

## Stop and preserve data

`make down` stops Next.js and the CLI stack while preserving local Supabase data.
After changing `supabase/config.toml`, use `make restart` to reload configuration.
`make status` shows local endpoints and keys; do not paste secret keys into logs,
issues or committed files.

The old standalone PostgreSQL volume `hacknation2026_postgres_data` is preserved
but no longer used. No data is automatically migrated from it to Supabase.
See [Supabase guidance](supabase.md) for configuration and database changes.
