# Project conventions and challenge scope

Hackathon project (HackNation 2026, ZUS challenge).
A web tool that tells future and new parents which ZUS benefits they get (sickness benefit in pregnancy, maternity benefit, parental/paternity leave), calculates their amount and duration, and walks them through the paperwork.
Domain rules, numbers and the full requirements checklist live in the `zus-domena` skill - load it before touching benefit logic, forms or feature scope.

## Hackathon mode

We have a few hours, not weeks.
- Working demo beats perfect code. Build the happy path only.
- No tests, no edge-case handling, no abstractions "for later", no new config options nobody asked for.
- UX and visible completeness score highest (completeness + UX 25%, relevance to challenge 25%), so spend effort on what the jury sees.
- Prefer an existing dependency or a platform feature over writing code; add a dependency when it saves real time.

## Stack and decisions

- Next.js 16 App Router with `cacheComponents` enabled. Its APIs differ from older Next versions: before using an API you are not sure about, read the bundled docs in `app/node_modules/next/dist/docs/`.
- Tailwind CSS 4, React 19, TypeScript.
- UI component choice: shadcn/ui with a ZUS-inspired light theme. Initialized in `app/components.json` with Base UI (base-nova), Lucide icons and shared CSS variables; add components as screens need them. Follow the `polish-public-ui` skill in `.agents/skills/` for design tokens and interaction guidance.
- Backend = Next.js Route Handlers in `app/app/api/*` exposing REST (the challenge recommends REST). Benefit calculation logic lives in plain functions in `app/lib/`.
- Supabase for data (admin parameters, saved cases): `@supabase/supabase-js` + `@supabase/ssr`, SQL migrations in `supabase/migrations/`, keys in `app/.env.local` (never commit it).
- Everything external is simulated: mObywatel login, ZUS data download, contribution debt, e-ZLA, PUE/eZUS, submitting applications. Use mocks/fixtures, no real integrations.

## Application map

The public-service UI uses the light theme from `app/app/globals.css`. Use its semantic Tailwind tokens for all colors and the shared `shell`, `page` and `text-link` classes for layout and links. Reuse the shadcn button variants in `app/components/ui/button.tsx` and the shared fields, choices, notices and headings in `app/components/ui.tsx`. Each page gives its main landmark `id="main-content"` and `tabIndex={-1}` for the skip link.
- Benefit engine: pure functions in `app/lib/calc/` (`leave.ts` birth/adoption leave, `pregnancy.ts`, `basis.ts`, `variants.ts` A/B/C leave splits, `tasks.ts` to-do list). The calculator UI, the variants page and `POST /api/calculate` all call the same functions; add new benefit logic there, not in components.
- The calculator page keeps each path’s draft in browser memory while open. The basis calculator can open inside a benefit path and return the new amount to the same step.
- Demo families returned by the simulated mObywatel login live in `app/lib/mock/personas.ts`. Add a persona there to get a new demo account.
- The logged-in plan (persona, timeline events, chosen variant, done tasks) is client-only state in `app/lib/plan-store.ts`, kept in `sessionStorage`. Pages under `app/app/(panel)/` read it through `useFamily()` and are guarded by `components/session-guard.tsx`.
- Because panel pages render from browser state, `next.config.ts` sets `instantInsights.validationLevel: "manual-warning"`; declare `instant` on a segment to opt it into validation.
- Dates in code are ISO `YYYY-MM-DD` strings computed in UTC (`app/lib/dates.ts`); format them for display with `formatDate`.

## Conventions

- UI copy in Polish, code (identifiers, comments) in English. Keep labels that help users understand a state or decide what to do next. Put administrative detail in expanded views and avoid repeating a status in the date label.
- Mobile-first responsive layout - every screen must work on a phone (formal requirement).
- All benefit parameters (percentages, durations, limits) are defined in one place: defaults in `app/lib/params.ts`, overridable from the Supabase table edited in the admin panel. Never hardcode a rate or a duration elsewhere.
- Any feature that uses AI must be listed in the "Funkcje AI" section of `README.md` (challenge rule: AI usage must be declared).

## Materials

`materials/` (git-ignored) holds the ZUS challenge PDF, the parents' guide, the duration/amount table and anonymised sample cases.
ZUS forbids copying or redistributing them: never commit them, never paste their text or personal data into the repo.
Use them as the source of truth when checking numbers and as demo inputs.
