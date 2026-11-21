# HackNation2026-ZUS

Zasiłkowy Przewodnik Przyszłego Rodzica - rozwiązanie, które ułatwi przyszłym rodzicom i rodzicom małych dzieci dostęp do informacji o przysługujących im uprawnieniach i świadczeniach z ZUS.

## Run locally

Install Node.js 24+, Make and start Docker Desktop, then run from this directory:

```sh
make setup
make dev
```

Open http://localhost:3000. The Supabase CLI runs local PostgreSQL, Auth, the Data API, Studio and an email testing inbox. Next.js runs in Docker with hot reload. Local credentials are generated automatically; no Supabase account is required.

Use `make up` for a background run, `make restart` to restart, and `make down` to stop while preserving data. Run `make check` for TypeScript, lint and the connection test, or `make build` for a production build. `make help` lists all commands.

See [local development instructions](docs/local-development.md) for the full command reference and workflow, [AGENTS.md](AGENTS.md) for agent guidance, or [app/README.md](app/README.md) for application clients.
