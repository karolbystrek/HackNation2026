# Agent instructions

## Project essentials

Zasiłkowy Przewodnik Przyszłego Rodzica is the HackNation 2026 ZUS challenge
project. Load the `zus-domena` skill before changing benefit logic, forms or scope.

- Run project commands from the repository root through the [Makefile](Makefile).
  `make help` lists the interface; use `make setup` and `make dev` to get started.
  Keep simple local orchestration there instead of adding wrapper scripts.
- Next.js source and its npm lockfile live in `app/`. Root npm files pin the
  Supabase CLI. Docker Compose manages Next.js; the CLI manages local Supabase.
- Read the relevant guidance below before working in that area. Read
  [app/AGENTS.md](app/AGENTS.md) before editing Next.js application files.

## Focused guidance

| Document | Contents and when to read |
| --- | --- |
| [Project conventions](docs/project-conventions.md) | Hackathon priorities, architecture, Polish UI, benefit parameters, AI disclosure and protected challenge materials. Read before implementing or reviewing features. |
| [Local development and commands](docs/local-development.md) | Setup, Make targets, service endpoints, checks, restart, teardown and cleanup. Read when running, testing or troubleshooting the project. |
| [Supabase](docs/supabase.md) | Client/server configuration, session cookies, credentials, migrations and data preservation. Read when changing Auth, database access or environment configuration. |
| [Application README](app/README.md) | Supabase client entry points, session refresh, health endpoint and hosted development. Read when integrating application features with Supabase. |

## Maintain these instructions

Update this file or the relevant linked document when a task reveals durable
project facts, conventions or instructions useful to future agent sessions.
Correct outdated guidance as part of the change that invalidates it.

Keep this file short: project essentials and an index, not a growing handbook.
Put detailed guidance in small, precise Markdown documents organized by topic.
For every new document, add a link here with a brief description and when to
read it. Prefer updating an existing document over creating overlapping ones.
Do not add task logs, temporary status, copied code, secrets or speculative rules.
