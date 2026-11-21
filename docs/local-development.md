# Local development

Install Node.js 24+, GNU Make and Docker with Compose 2.22+. Start Docker,
then run from the repository root:

```sh
make setup
make dev
```

The Makefile starts local Supabase, writes its public connection details to
ignored `.env.supabase.local`, and runs Next.js in Docker with hot reload.
No Supabase account or manual environment configuration is required.

| Command | Purpose |
| --- | --- |
| `make setup` | Install the pinned CLI after cloning or cleanup |
| `make dev` | Start with hot reload |
| `make up` | Start in the background |
| `make restart` | Restart both stacks, preserving data |
| `make down` | Stop both stacks, preserving data |
| `make clean` | Stop and remove local dependencies and caches; preserve database volumes |
| `make logs` | Follow app logs |
| `make status` | Show service status and local keys |
| `make test` | Run unit tests (Vitest) and the connection test |
| `make lint` | Run ESLint |
| `make check` | Run TypeScript, lint and the tests |
| `make build` | Verify a production build in a disposable container |
| `make help` | List commands |

Run `make up` before checks. Run `make build` before deployment.
After cleanup, run `make setup` again. Restarting uses background mode;
run `make dev` to resume hot reload.

- App: http://localhost:3000
- Supabase API: http://127.0.0.1:54321
- Studio: http://127.0.0.1:54323
- Email inbox: http://127.0.0.1:54324
- Database: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`

See [Supabase guidance](supabase.md) for configuration and migrations.

Run occasional CLI commands directly. For example, from the repository root:

```sh
npm exec --prefix app --no -- shadcn add input --cwd app
```

The shadcn CLI runs on the host and updates `app/package.json` and its lockfile.
After adding components, use `make up` to rebuild the app container with the new dependencies.

## Case check (AI) and sample ZUS cases

Reading scanned case files needs a Gemini API key.
Put it in the git-ignored root `.env.local`, which Compose passes to the app:

```sh
GEMINI_API_KEY=...
# Optional, defaults to gemini-3.8-flash
GEMINI_MODEL=gemini-3.8-flash
```

Without a key, cached cases still work and new files return a clear error.

The ZUS sample cases may not be published, so they stay in `materials/` and in the private `zus-cases` Supabase bucket.
Upload them, warm the cache and print our result next to each ZUS decision with:

```sh
set -a; . ./.env.supabase.local; set +a
node app/scripts/upload-cases.mjs "materials/extracted/Sprawy " --analyze
```

For the hosted demo, run the same script with the hosted `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
Never commit the script output, because it names the case files.
