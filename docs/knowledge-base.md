# Knowledge base: contents and use in the app

`knowledge/` holds everything the app needs to know about ZUS parenthood benefits as structured JSON: law, numbers, benefits, forms, documents, deadlines, scenarios and help.
Legal state: 21.11.2026. Content is in Polish, keys in English. ~590 records in 16 files, ~500 KB.

This document explains what each file contains, what the app can do with it and at which point of the user's journey.
For field-level detail see [knowledge/README.md](../knowledge/README.md); for query recipes see the `zus-knowledge` skill.

## The user journey

A parent enters their situation, for example: *"Baby due in 2 months. I work on an employment contract (umowa o pracę) at a large company, 9,000 zł gross. My partner also has an employment contract, 12,000 zł gross."*
The app then walks them through seven steps. The file descriptions below refer to them by number.

| # | Step | What the user gets | Main data | Existing code |
|---|---|---|---|---|
| 1 | **Intake** | Profile per parent: insurance title, employer size, insured since, 12 months of pay, debt (self-employed); family: due/birth date, number of children, "Za życiem", adoption/foster, special events | `enums` (allowed values) | `lib/mock/personas.ts`, `lib/events.ts` |
| 2 | **Eligibility** | Which benefits each parent gets or does not get, and why (with legal basis) | `benefits`, `parameters`, `legal_provisions` | `lib/calc/pregnancy.ts` (partly) |
| 3 | **Amounts** | Benefit base, monthly amounts, durations, totals | `parameters`, `benefits.base_calculation_steps_pl` | `lib/calc/basis.ts`, `leave.ts` |
| 4 | **Variants** | Comparison of options: best money-wise, longest at home, earliest return | `parameters`, `scenarios` (S10, S23, S24), `risks` | `lib/calc/variants.ts` |
| 5 | **Plan** | Dated to-do list and calendar for the chosen variant | `scenarios.steps`, `deadlines` | `lib/calc/tasks.ts`, `lib/ics.ts` |
| 6 | **Paperwork** | Which form or employer request to file, where, with which attachments; pre-filled form simulation | `forms`, `form_fields`, `leave_requests`, `documents` | form wizard `/wnioski/[taskId]` (`app/lib/forms/`) |
| 7 | **Help** | Warnings, plain-language answers, support organisations in hard situations | `risks`, `faq`, `glossary`, `support_orgs`, `conflicts` | warnings in `leave.ts` (hardcoded) |
| – | **Admin** | Edit rates, durations and amounts when the law changes | `parameters` | `lib/params.ts` |

A new event (birth happened, job ended, raise) re-runs steps 2–5. The timeline in `events.ts` already models this.

### Step 4 in detail: "best money-wise"

The data supports these money levers. A variant generator can combine them and rank the results.
Worked example (Anna 9,000 zł gross, basis 7,766.10 zł; Tomasz 12,000 zł gross, basis 10,354.80 zł):

| Lever | Effect | Source in data |
|---|---|---|
| **81.5% vs 100% → 70%** | When the whole leave is used, the totals are almost equal (Anna, 52 weeks: 76,833 zł vs 76,796 zł). 81.5% only evens out the monthly amounts. If parental leave is cut short, 81.5% loses money (20 + 10 weeks: 48,926 zł vs 44,306 zł). Exception: if no day of parental leave is used in the child's first year, ZUS tops up the maternity part to 100% on request. | `scenario.averaged_variant` (S24), `uz.art31.ust3`–`ust4`, `risk.late_81_5_request`, `deadline.averaged_variant_request` |
| **Paternity leave** | 2 weeks at 100% (Tomasz: 4,832 zł). Does not reduce the shared pool, so always take it. Lost after the child's first year. | `benefit.paternity`, `deadline.paternity_use_by`, `risk.paternity_expiry` |
| **9 reserved weeks per parent** | Lost if that parent does not use them (Tomasz: 15,222 zł at 70%). | `param.parental_reserved_weeks`, `risk.reserved_9_weeks_lost` |
| **Who takes the shareable weeks** | The parent with the lower base loses less (10 weeks: Anna loses 5,436 zł, Tomasz 7,248 zł). | `param.rate_parental` |
| **Part-time during parental leave** | Up to half-time work. The leave gets longer, the benefit drops in proportion to the hours worked, and a salary is added. | `scenario.combine_parental_work` (S23), `param.combine_work_max_fraction`, `param.parental_combined_max_*` |
| **Sick leave in pregnancy vs early maternity leave** | Both pay 100%. Maternity weeks taken before birth come out of the 20 weeks after birth. Sick leave does not, but only applies when a doctor certifies incapacity. | `benefit.sickness_pregnancy`, `param.pre_birth_max_weeks`, `risk.sick_leave_misuse` |
| **Low earners** | The base is never below 4,147.10 zł for full-time work. A monthly benefit below 1,000 zł is topped up. | `param.min_wage_floor_net_2026` (`uz.art45.ust1`), `benefit.top_up` |
| **Extra time** | Twins, "Za życiem", prematurity and hospitalisation extend leave. | `param.maternity_weeks_*`, `param.parental_weeks_zz_*`, `benefit.supplementary_maternity` |
| **Traps** | Raising pay or the contribution base during pregnancy, a contract ending before the birth, self-employed debt above 1% of the minimum wage, voluntary sickness insurance not registered in time. | `risks.json` |

Rank by a stated goal: lowest family income loss for the same time at home, longest paid time at home, or earliest return to work. "Best money-wise" only makes sense with a fixed target for how long the child stays at home. Otherwise "take no leave" always wins.

### Does it need RAG? No, not for the core

- **Deterministic matching.** The core questions ("what am I entitled to, what do I file, by when, how much") come from matching the profile against `conditions` / `applies_to` and computing with `parameters`. That is filtering, not similarity search, and the jury checks the calculations, so they must be deterministic.
- **Size.** The data is small and already split into self-contained records, each with a title, a summary and a body.
- **Tokens.** `faq` + `glossary` + `risks` + `conflicts` together are about 75 KB, which fits into a single LLM prompt. The whole base (about 500 KB) does not, but a profile-filtered slice does.

Where AI adds value, without a vector database:
1. **Free-text questions ("co jeśli…").** Filter records by the user's profile (`applies_to`, `tags`, `related_ids`). Put 10–30 matching records into the prompt and answer with citations (`legal_refs`, `source_refs`).
2. **Uploaded sample cases.** The challenge says the jury will upload sample application PDFs. An LLM can extract the fields, using `form_fields` as the extraction schema and `forms.aliases` / `recognition_hints_pl` to identify the form, including withdrawn ones such as ZUR and ZAO. The deterministic engine then computes the result.
3. **Explaining variants** in plain Polish, using the numbers the engine computed.

Vector search (pgvector) only becomes worth it if the base grows to thousands of chunks or takes in unstructured text. Records are already chunk-shaped, so adding it later is cheap.
Every AI feature must be listed under "Funkcje AI" in `README.md`.

### Gaps in the current engine that the data can close

| Where | Gap | Data |
|---|---|---|
| [pregnancy.ts:27](../app/lib/calc/pregnancy.ts#L27) | Assumes every employer pays the benefit itself (>20 insured). Employers with ≤20 send the case to ZUS, which changes the documents and who pays. | `enums.payer_size`, scenarios S1–S4 |
| [family-timeline.ts:97](../app/lib/family-timeline.ts#L97), [:123](../app/lib/family-timeline.ts#L123) | 7 and 21 days are hardcoded, which breaks the "parameters in one place" rule. Links are hardcoded too. | `deadlines.json`, `sources.json` |
| [variants.ts](../app/lib/calc/variants.ts) | Varies only the leave split. | Add the 81.5% option, part-time work and paternity timing (table above). |
| Whole engine | No eligibility check (waiting period, insured on the birth day, self-employed debt), no task list for non-standard situations, no document checklist. | `benefits.eligibility`, `scenarios`, `forms.attachment_rules` |

## Files

Every record has `id`, `title_pl`, `summary_pl`, `body_pl`, `status`, `valid_from`/`valid_to`, `legal_refs`, `source_refs` and `verification`.
In the app, use only `status: current` records valid on the relevant date. Show `unverified` facts with a caveat.

### `enums.json`: vocabularies (8 lists)
- **Contents:** allowed values for `insured_type` (employee, contractor, self_employed, uninsured, student…), `payer_size` (gt20 / le20), `parent_role`, `event` (birth, stillbirth, prematurity, adoption, job_loss_liquidation…), `actor`, `channel`, `anchor_events` (dates deadlines count from) and `facts` (computed values such as `children_count`, `debt_over_1pct_min_wage`).
- **In the app:** the options of the intake form and the TypeScript union types for the profile. Every condition in other files uses only these values.
- **When:** step 1. Also needed whenever conditions are evaluated.

### `parameters.json`: numbers (83)
- **Contents:** every rate (80/100/70/81.5%, rehabilitation 90/75%), duration (maternity 20–37 weeks, parental 41/43, Za życiem 65/67, paternity 14 days, supplementary 8/15 weeks), limit (6 weeks before birth, 5 parts, ages 6/7/10/14, 182/270-day periods, 33/14 employer-paid days, 30/90 waiting days) and 2026 amount (minimum wage 4,806 zł, minimum base 4,147.10 zł, parental allowance 1,000 zł, funeral grant 7,000 zł, voluntary sickness cap). Each has a `key`, `unit`, `valid_from` and legal basis, and is marked `admin_editable`.
- **In the app:** the source for `lib/params.ts` and the admin panel's editable table. The legal basis can be shown next to a number ("70% – art. 31 ust. 2").
- **When:** steps 2–4 and admin.

### `benefits.json`: benefit types (13)
- **Contents:** employer sick pay, sickness benefit in pregnancy, rehabilitation benefit, the benefit equal to maternity benefit (paid until birth after employer bankruptcy or liquidation), maternity benefit for maternity / "on maternity terms" / supplementary / parental / paternity leave, the top-up to 1,000 zł, funeral grant, parental allowance ("kosiniakowe") for parents without maternity benefit, and care allowance (out of scope). Each has `eligibility`, links to rate and duration parameters, `payer_rule_pl`, base calculation steps, forms, documents, deadlines and risks.
- **In the app:** the "what you get" result screen, eligibility rules and the "why" text. Also the hub for linking to everything else about a benefit.
- **When:** steps 2–3. Also challenge requirement (a), information about benefits in pregnancy, including when there is no entitlement.

### `scenarios.json`: decision paths (28, S1–S28)
- **Contents:** `conditions` (who it applies to) and ordered `steps` (actor, action, forms, employer requests, documents, recipient, deadline, channel). Then `outcome_benefit_ids`, `risk_ids`, `support_org_ids` and a `test_case_hint_pl` for matching the jury's sample cases. Coverage:
  - employees at large and small employers, contractors, the self-employed;
  - the father taking over maternity leave, an uninsured mother, shared parental leave, paternity leave;
  - adoption and foster care;
  - prematurity, Za życiem, stillbirth, child death;
  - job loss (liquidation or unlawful dismissal), a fixed-term contract extended to the birth;
  - sickness after insurance ends, rehabilitation;
  - combining leave with work, the 81.5% choice, multiple births, several insurance titles;
  - parental allowance, funeral grant.
- **In the app:** the main source for the plan. Match the profile to scenarios, then turn the steps into tasks. Hard situations (S8, S14–S19) also show the matching support organisations.
- **When:** steps 4–5, and again after each new event.

### `deadlines.json`: date rules (36)
- **Contents:** each rule has an `anchor_event`, an offset (value, unit, before/after), a `kind` (19 `hard` = loss or refusal, 9 `limit`, 3 `protective` = job protection, 3 `recommended`, 2 payment terms) and a consequence. Examples:
  - 81.5% request within 21 days of the birth;
  - parental leave request 21 days ahead;
  - paternity request 7 days ahead, and paternity leave used within 12 months;
  - father's takeover request 14 days ahead;
  - funeral grant claim within 12 months;
  - debt repayment for the self-employed;
  - ZNp-7 at least 6 weeks before the benefit period ends;
  - the 6-month claim limitation.
- **In the app:** compute concrete dates from the user's dates for the task list, the calendar (.ics) and reminders. Use `kind` to style urgency.
- **When:** step 5. Challenge requirement (g): deadlines.

### `forms.json`: ZUS forms (32)
- **Contents:**
  - 24 current, including ZAM, Z-3, Z-3a, ZAS-12, ZAS-53, Z-10, ZNp-7, ZAS-55, ZAS-15, ZAS-24, ZAS-2, Z-12 and Z-15;
  - 6 withdrawn or superseded: ZUR, ZAO, Z-3b, Z-15A/B, ZUM and the old ZAM;
  - 2 out of scope.

  Each has who fills it in, where it goes, the channels, the zus.pl page and PDF links, `when_to_use_pl` / `not_needed_when_pl`, `attachment_rules` (document plus condition), deadlines, `aliases` and `recognition_hints_pl`.
- **In the app:** the "which form" answer, PDF download links and the document checklist (from `attachment_rules`). Uploaded sample cases are recognised by aliases and hints, so old ZUR/ZAO forms still map to the right benefit.
- **When:** step 6, and upload or demo testing.

### `form_fields.json`: form fields (14 field sets)
- **Contents:** ordered field lists from the current 2026 PDFs, for ZAM (37 fields), Z-3, Z-3a, ZAS-53, Z-10, ZNp-7, ZAS-55, ZAS-15, ZAS-24, ZAS-23, ZAS-26, ZAS-33, ZAS-40 and ZAS-2. Each field has a key, Polish label, type, section and `required_if` condition.
- **In the app:** the challenge's form-filling simulation, pre-filled from the profile. The same lists serve as the schema for extracting data from uploaded PDFs.
- **When:** step 6, and upload.

### `leave_requests.json`: requests to the employer (14, W1–W14)
- **Contents:** employee leave requests under the Labour Code and the 2025 regulation:
  - maternity leave before birth;
  - the mother resigning after 14 weeks, or because of incapacity;
  - the father's takeover;
  - takeover when the mother is in hospital, dies or abandons the child;
  - an uninsured mother who is incapacitated or works;
  - supplementary leave, parental leave, combining parental leave with work, paternity leave, leave "on maternity terms".

  Each has its fields, attachments (copy allowed or not), deadlines, whether the employer must accept, split rules and withdrawal rules.
- **In the app:** the "design leave requests" requirement. Generate a pre-filled request for the employer, with deadline and attachments. Only for employees; others go straight to ZAM.
- **When:** step 6.

### `documents.json`: supporting documents (45)
- **Contents:**
  - e-ZLA;
  - the doctor's certificate of the expected birth date;
  - birth certificate copies and stillbirth certificates;
  - the hospital certificate for supplementary leave;
  - the Za życiem certificate;
  - court and foster-care decisions;
  - employer and payer certificates;
  - the no-arrears certificate;
  - 16 parent statements.

  Each has its issuer, when it is needed and not needed (as conditions), how to obtain it, fees, online links and the date it becomes electronic.
- **In the app:** the per-user attachment checklist with "how to get it" instructions. The birth certificate copy request covers the challenge's "simulate requesting a birth certificate" feature. e-ZLA data covers the "e-ZLA preview" mock.
- **When:** step 6, and step 5 for documents that take time.

### `risks.json`: ways to lose or reduce money (20)
- **Contents:** sham contracts, raising the base during pregnancy, no insurance on the birth day, waiting period, self-employed debt, voluntary insurance deregistration, "ulga na start" with no sickness cover, misuse of sick leave, a late 81.5% request, the father's 9 weeks lost, paternity leave expiring, a late supplementary-leave request, claim limitation, parental leave not used by the time the child turns 6, and old forms. Each has its trigger, consequence, prevention, severity (`loss_of_right`, `reduction`, `delay`…) and a `detection_condition`.
- **In the app:** warnings evaluated against the profile and chosen variant, shown at the moment they matter (e.g. "contract ends before due date"). They replace the hardcoded strings in `leave.ts`.
- **When:** steps 2, 4 and 7. Challenge requirement (h).

### `support_orgs.json`: charities (13)
- **Contents:** perinatal hospices (Wrocław, Warsaw, Katowice, Łódź, the Dlaczego foundation), support after loss (Donum Vitae and others), prematurity foundations and Rodzić po Ludzku. Each has the situations it covers (stillbirth, miscarriage, child death, prematurity, severe illness, lethal diagnosis), help types, region, website, phone, KRS number and verification. 6 are verified against a primary source, 1 against a secondary source, and 6 are unverified, so check those before the demo.
- **In the app:** a "where to find support" panel, filtered by situation and shown inside the hard scenarios.
- **When:** step 7. Challenge requirement (i).

### `faq.json`: questions and answers (24)
- **Contents:** questions people actually ask, with alternative phrasings and a short answer. Examples:
  - who pays;
  - whether to attach the birth certificate;
  - ZAM vs ZUR/ZAO;
  - which rate to choose;
  - dismissal in pregnancy;
  - a small contribution debt;
  - a benefit below 1,000 zł;
  - eZUS and e-mail filing;
  - Za życiem.
- **In the app:** a static FAQ page, inline "?" help and, if added, the first source for an AI assistant (best retrieval targets).
- **When:** step 7, any time.

### `glossary.json`: terms (28)
- **Contents:** each term has synonyms, a definition and "not to be confused with". Examples:
  - płatnik składek (contribution payer), "large payer";
  - podstawa wymiaru (benefit base), okres zasiłkowy (benefit period);
  - e-ZLA / L4;
  - JDG (sole trader);
  - urlop na warunkach macierzyńskiego (leave on maternity terms);
  - Za życiem.
- **In the app:** tooltips on jargon in the UI. Synonyms widen search and AI queries ("L4" → e-ZLA).
- **When:** any step.

### `conflicts.json`: disagreements and open questions (25)
- **Contents:** points where sources disagree or are outdated, with the claims, the resolution and `app_behaviour_pl` (what the app should do). 17 are resolved and 8 open. Examples:
  - the challenge brief is wrong on unlawful dismissal;
  - the ZUS guide predates the 24.10.2026 changes;
  - the guide's 14-day pre-birth request vs no deadline in the Labour Code;
  - the 9-week adoption case.
- **In the app:** not shown directly. It tells developers and AI how to behave where the law is unclear, and lists what to ask the ZUS mentors.
- **When:** while building, and in AI answers.

### `legal_provisions.json`: the law (161)
- **Contents:** paraphrased units:
  - 61 from the benefits act (u.z.);
  - 37 from the Labour Code;
  - 35 from the 2026 regulation (R1316);
  - 14 from the 2025 leave-request regulation (R322);
  - 6 from the social insurance act (u.s.u.s.);
  - 3 from the family benefits act (u.ś.r.);
  - 4 from the pensions act (u.e.r.), for the funeral grant;
  - 1 from the Za życiem act.

  Every rule elsewhere points here.
- **In the app:** "legal basis" links under results ("art. 30a ust. 1 ustawy zasiłkowej"), which builds trust and makes answers checkable.
- **When:** steps 2–7, as citations.

### `sources.json`: sources (62)
- **Contents:** acts and consolidated texts (Dz.U.), regulations, 22 zus.pl form pages, ZUS news and pages, gov.pl, PIP, organisations' websites, the challenge brief and the ZUS guide. Each has its URL, dates and a `redistribution` note.
- **In the app:** outbound links that cover the challenge's "redirect to zus.pl / gov.pl / PIP" requirement, and the provenance shown for citations.
- **When:** any step.
