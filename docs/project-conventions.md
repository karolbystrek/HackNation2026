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
- UI component choice: shadcn/ui with a ZUS-inspired light theme. Initialized in `app/components.json` with Base UI (base-nova), Lucide icons and shared CSS variables; add components as screens need them. Follow the `zus-gov-ui` skill in `.agents/skills/` for the visual style and design tokens, and `polish-public-ui` for components and interaction guidance.
- Backend = Next.js Route Handlers in `app/app/api/*` exposing REST (the challenge recommends REST). Benefit calculation logic lives in plain functions in `app/lib/`.
- Supabase for data (admin parameters, saved cases): `@supabase/supabase-js` + `@supabase/ssr`, SQL migrations in `supabase/migrations/`, keys in `app/.env.local` (never commit it).
- Everything external is simulated: mObywatel login, ZUS data download, contribution debt, e-ZLA, PUE/eZUS, submitting applications. Use mocks/fixtures, no real integrations.

## Application map

The public-service UI uses the light theme from `app/app/globals.css`. Use its semantic Tailwind tokens for all colors and the shared `shell`, `page` and `text-link` classes for layout and links. Reuse the shadcn button variants in `app/components/ui/button.tsx` and the shared fields, choices, notices and headings in `app/components/ui.tsx`. Each page gives its main landmark `id="main-content"` and `tabIndex={-1}` for the skip link.
- Benefit engine: pure functions in `app/lib/calc/` (`leave.ts` birth/adoption leave, `pregnancy.ts`, `basis.ts`, `variants.ts` leave splits, `tasks.ts` to-do list). The calculator UI, the variants page and `POST /api/calculate` all call the same functions; add new benefit logic there, not in components.
- Home service tiles select an existing panel view through `/logowanie?widok=…`. The login page resolves the key against its allowed destinations and reuses the active family profile when available. The main planning button opens the public questionnaire at `/nowa-os`.
- The parental leave planner at `/warianty` lets parents adjust the split in whole weeks. It suggests the split with the highest estimated total gross benefits at the current inputs and saves the chosen split as a custom plan for tasks and forms. The leave calculator can also start both parental periods on the same date. A shared start still consumes each parent’s weeks from the family pool.
- Timeline events can open a calculator with the event date or parent prefilled. The profile birth opens the plan variants. Employment changes are prompts to review calculation inputs, because an event alone does not establish current insurance or monthly earnings.
- Keep inputs that affect calculator results visible in the relevant step. Put short hints beside their fields and show how to interpret amounts with the result. Use disclosures for calculation breakdowns.
- Calculator URLs keep the selected mode, step and nested basis calculator in browser history. The session keeps form drafts per calculator and source event, the add-event draft and opened Plan/Tasks sections. The basis calculator returns the new amount to the step that opened it.
- Application forms: timeline entries with `form` (a `form_fields` or `leave_requests` id) open the wizard at `/wnioski/[taskId]`. `app/lib/forms/load.ts` reads the specs from `knowledge/` on the server (Docker copies it to `/knowledge`), `prefill.ts` fills them from the persona and chosen variant, and `rules.ts` holds field checks and benefit rules shared by the wizard and the simulated submission endpoint `POST /api/applications`. Submissions are kept in the plan store.
- Official ZUS PDFs: for forms listed in `ZUS_TEMPLATES` (`app/lib/forms/spec.ts`) the review screen shows the interactive template from zus.pl, filled by `POST /api/applications/pdf` (`app/lib/forms/zus-pdf.ts`, pdf-lib). Templates live in `app/assets/zus-forms/` (public ZUS forms, not challenge materials) and the embedded font in `app/assets/fonts/` (Liberation Sans, SIL OFL). Field names come from the PDF (`topmostSubform[0].PageN[0].Name[0]`) and their tooltips describe each field. Other applications, such as employer leave requests, use the app's own printable letter.
- Wnioski tab (`/wnioski`): case check on top, then the family's applications, the civil registry request (`civil.birth_certificate`, hand-written spec in `app/lib/forms/civil.ts`) and applicable third-party documents (timeline entries with `extra`). The timeline derives forms from the family record, selected leave plan and explicitly recorded events. The special-circumstance picker in `/dodaj` supplies the event and date for situational requests.
- Case check: the UI accepts PDF uploads or manual entry. `POST /api/cases/analyze` reads PDFs with Gemini (`app/lib/cases/extract.ts`, schema in `schema.ts`, no personal data in the extraction) and caches the result by SHA-256 in `case_extractions`. `analyzeCase` (`app/lib/cases/analyze.ts`) checks insurance, basis, periods and amounts and compares them with the ZUS decision. The review shows editable fields beside the live calculation. The user can supply an already-calculated benefit basis or use the monthly amounts. The scan preview uses a local object URL while the page is open. The session draft keeps field corrections across reloads, but does not keep the PDF. The sample picker uses a fictional PDF bundled in `app/public/case-samples/`. The developer script submits restricted challenge files to the local app.
- Demo families returned by the simulated mObywatel login live in `app/lib/mock/personas.ts`. Each demo family offers individual profiles. Selecting a profile limits the timeline, tasks, applications and personal data page to that person and shared entries. Switching profiles within the same demo case keeps the plan in the current tab. The questionnaire opens an individual plan. Scope of the view does not alter the benefit calculation.
- The logged-in plan is client-only state in `app/lib/plan-store.ts`, kept in `sessionStorage`. A recorded birth or placement can update the active case or open a separate case. The Plan selector switches cases, each with its own events, variant, drafts, task progress and submissions. Pages under `app/app/(panel)/` use the active case through `useFamily()` and are guarded by `components/session-guard.tsx`. The leave engine uses a shared count and one age anchor per birth or placement; individual children can have separate names in application prefill.
- Because panel pages render from browser state, `next.config.ts` sets `instantInsights.validationLevel: "manual-warning"`; declare `instant` on a segment to opt it into validation.
- Dates in code are ISO `YYYY-MM-DD` strings computed in UTC (`app/lib/dates.ts`); format them for display with `formatDate`.

## Conventions

- UI copy in Polish, code (identifiers, comments) in English. Keep labels that help users understand a state or decide what to do next. Put administrative detail in expanded views and avoid repeating a status in the date label.
- Show separate values in labelled rows or a responsive grid. Use spacing and typography to group information instead of middle-dot separators.
- Mobile-first responsive layout - every screen must work on a phone (formal requirement).
- All benefit parameters (percentages, durations, limits) are defined in one place: defaults in `app/lib/params.ts`, overridable from the Supabase table edited in the admin panel. Never hardcode a rate or a duration elsewhere.
- Any feature that uses AI must be listed in the "Funkcje AI" section of `README.md` (challenge rule: AI usage must be declared).

## Materials

`materials/` (git-ignored) holds the ZUS challenge PDF, the parents' guide, the duration/amount table and anonymised sample cases.
ZUS forbids copying or redistributing them: never commit them, never paste their text or personal data into the repo.
Use them as the source of truth when checking numbers and as demo inputs.
