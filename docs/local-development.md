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
| `make test` | Run the connection test |
| `make lint` | Run ESLint |
| `make check` | Run TypeScript, lint and the connection test |
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
