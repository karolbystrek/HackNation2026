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

If the app still shows a page or layout deleted from the source tree, run
`make up` to rebuild the image and recreate the app container.

If a `globals.css` edit never reaches the served stylesheet (the CSS chunk
name stays the same), Turbopack's cache is stale; a restart alone does not fix it. Run
`docker compose exec app rm -rf .next/cache .next/dev` and then `docker compose restart app`.

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

`make test` includes fictional PDF uploads with simulated Gemini responses.
The tests cover the second read, original page references, validation, cache
and an independently calculated result.

For a live check in `/wnioski`, upload one authorized local PDF. Compare the
insurance dates, benefit period and amount with the source document before
editing any field. A fresh upload can call Gemini twice when essential data
is missing. Re-uploading an identical PDF with a current extraction uses the
cache. Record missing data separately from a disagreement with the decision.
A second live check can cover a refusal with documented absence of insurance.

For calculator and form acceptance, check these flows in the browser at
desktop and phone widths:

| Flow | Expected result |
| --- | --- |
| Pregnancy with a small payer, then self-employment | The result distinguishes who pays each part. A simulation of rehabilitation stays separate, and qualifying arrears suspend payment. |
| One child, twins and “Za życiem” | The pool changes with the inputs. Compare sequential and concurrent care, the reserved weeks, and part-time work. |
| Adoption and non-professional foster care | The result uses the age limit for the selected type of care. Check both sides of the limit and the court date for paternity leave. |
| Early or supplementary maternity leave | The next period and the related application use the new dates. Check the attachment list and where to file. |
| Individual benefit basis | Enter monthly amounts and a part-time fraction, then verify the floor and the result after entering an already calculated basis. |
| Application and confirmation | Complete ZAM, a leave request for the employer, ZAS-12 for a continuation, and a request for another birth certificate copy. Verify the recipient, document preview and simulated submission. |

The case picker uses a fictional PDF bundled in `app/public/case-samples/`.
Restricted ZUS challenge files stay in ignored `materials/`. To analyze them
through the local app and compare the results with the ZUS decisions, run:

```sh
node app/scripts/analyze-local-cases.mjs "materials/extracted/Sprawy "
```

Never commit the script output, because it names the case files.
