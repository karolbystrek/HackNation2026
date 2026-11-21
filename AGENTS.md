# Agent instructions

## Project essentials

Zasiłkowy Przewodnik Przyszłego Rodzica is the HackNation 2026 ZUS challenge
project. Load the `zus-domena` skill before changing benefit logic, forms or scope.

- Run lifecycle commands, tests and routine checks from the repository root
  through the [Makefile](Makefile). Run occasional CLI commands directly;
  do not add Make targets just to wrap them.
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
| [Family case model](docs/model-sprawy-rodzinnej.md) | Domain entities, parent workflows and application timeline. Read before planning family cases, simulations or task flows. |
| [ZUS knowledge base skill](.agents/skills/zus-knowledge/SKILL.md) | Architecture, connections and query recipes for `knowledge/` (sourced JSON: law, parameters, forms, documents, deadlines, scenarios). Read before using or editing domain facts, numbers, forms or deadlines. |
| [Knowledge base guide](docs/knowledge-base.md) | What each `knowledge/` file contains, which app step uses it, the money levers for comparing variants, why no RAG is needed, and engine gaps the data closes. Read before planning features on top of the domain data. |
| [Forms and documents catalog](docs/wnioski-i-dokumenty.md) | Human-readable Polish catalog of ZUS forms, attachments and deadlines by scenario. Read for a quick overview; `knowledge/` is more current and detailed. |
| [ZUS × gov.pl style skill](.agents/skills/zus-gov-ui/SKILL.md) | Visual style: ZUS colour tokens with gov.pl page structure (bands, tiles, breadcrumbs, footer); showcase at `/prezentacja`. Overrides the visual parts of the public-service UI skill. Read before designing or styling any screen. |
| [Public-service UI skill](.agents/skills/polish-public-ui/SKILL.md) | shadcn/ui component choice, forms, interaction states and accessibility. Read before implementing or reviewing frontend UI. |
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
