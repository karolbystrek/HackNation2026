---
name: zus-knowledge
description: How to query and extend knowledge/ – the sourced, machine-readable ZUS parenthood knowledge base (legal provisions, parameters, benefits, forms and their fields, leave requests, documents, deadlines, scenarios, risks, support organisations, FAQ, conflicts, glossary). Use when you need an exact rule, number, form, attachment, deadline or legal basis; when building calculators, task plans, document checklists, form simulations, upload recognition or AI answers; or when adding/correcting domain facts.
---

# ZUS knowledge base (`knowledge/`)

`knowledge/` is the project's sourced domain data: 16 JSON files, ~590 records, legal state 21.11.2026.
`zus-domena` is the short overview; this base is the detailed, cited truth behind it.
If they disagree, the base wins (every record cites a primary source), unless the record is `unverified`.

Field-by-field reference: [knowledge/README.md](../../../knowledge/README.md). JSON Schemas: `knowledge/schema/`.
Per-file guide with the user journey, money levers and engine gaps: [docs/knowledge-base.md](../../../docs/knowledge-base.md).
Human-readable summary of the same domain: [docs/wnioski-i-dokumenty.md](../../../docs/wnioski-i-dokumenty.md).

## Architecture

Four layers. Every record in layers 2–4 points down to layer 1 through `legal_refs` and `source_refs`, so any answer can be traced to an article or a ZUS page.

```
4 GUIDANCE    risks · faq · glossary · support_orgs           (what can go wrong, plain answers, synonyms, help)
3 PROCEDURE   scenarios ─▶ forms ─▶ form_fields               (who does what, on which form, in what order)
                  │          └▶ documents (attachment_rules)
                  └▶ leave_requests (employer side, R322)
2 RULES       benefits ─▶ parameters                           (eligibility, rates, durations, amounts)
              deadlines ─▶ parameters                          (computable date rules)
1 EVIDENCE    legal_provisions ─▶ sources                      (paraphrased art./§ + URLs, Dz.U.)
META          enums (vocabularies) · conflicts (disagreements, superseded claims, open questions)
```

Design choices you must respect:
- **One file = one collection = one future table.** Each file is `{"$schema", "records": [...]}`. Scalars could become columns and nested arrays `jsonb`. Supabase/RAG are not built and not confirmed; do not build them unless asked.
- **One record = one self-contained chunk.** `title_pl` + `summary_pl` + `body_pl` make sense without the rest of the file, so a record can be quoted or embedded on its own.
- **Ids are stable dotted slugs** (`form.zam`, `deadline.parental_leave_request`). Refs are plain id strings. Never rename an id.
- **Time-aware.** Every record has `valid_from`/`valid_to` and a `status`. Outdated facts are kept as `superseded` with `superseded_by` so the app can explain what changed (e.g. ZUR+ZAO → ZAM, Z-3b withdrawn on 24.10.2026).
- **Honest about certainty.** `verification.status` is `verified_primary` (act/ZUS form), `verified_secondary` or `unverified`. Each open question also sits in `conflicts.json`.
- **Content in Polish (`*_pl`), keys and enum values in English.**

## Connection map (field → target collection)

| From | Field | To |
|---|---|---|
| any record | `legal_refs[]` | legal_provisions |
| any record | `source_refs[].source_id` | sources |
| any record | `superseded_by` | same collection |
| benefits | `rate_param_ids`, `duration_param_ids` | parameters |
| benefits | `form_ids`, `document_ids`, `deadline_ids`, `scenario_ids`, `risk_ids` | forms, documents, deadlines, scenarios, risks |
| forms | `field_set_id` | form_fields |
| forms | `attachment_rules[].document_id` (+ `condition`) | documents |
| forms | `benefit_ids`, `deadline_ids`, `replaced_by` | benefits, deadlines, forms |
| form_fields | `applies_to_form_ids` | forms |
| leave_requests | `attachments[].document_id`, `deadline_ids`, `related_form_ids` | documents, deadlines, forms |
| documents | `form_ids` | forms |
| deadlines | `param_id`, `anchor_param` | parameters |
| scenarios | `steps[].form_ids / leave_request_ids / document_ids / deadline_id` | forms, leave_requests, documents, deadlines |
| scenarios | `outcome_benefit_ids`, `risk_ids`, `support_org_ids` | benefits, risks, support_orgs |
| risks | `affected_benefit_ids` | benefits |
| faq, glossary, conflicts | `related_ids` | anything |

Typical traversal for "what must this person do?":
`scenarios` (match `conditions`) → `steps` in `order` → for each step: `forms` → `attachment_rules` → `documents`, plus `deadlines`; then `outcome_benefit_ids` → `benefits` → `parameters` for the amount, and `risk_ids` for warnings.

## Using it

**Querying.** Read with `jq` (installed). Do not load whole files into context; most are 20–100 KB.
```bash
jq '.records[] | select(.id=="form.zam") | {symbol, when_to_use_pl, attachment_rules}' knowledge/forms.json
jq -r '.records[] | select(.status=="current") | "\(.id)\t\(.value) \(.unit)"' knowledge/parameters.json
jq '.records[] | select(.applies_to.insured_type? // [] | index("self_employed"))| .id' knowledge/scenarios.json
grep -l '"form.z3"' knowledge/*.json          # who references a record
jq '.records[] | select(.verification.status=="unverified") | .id' knowledge/*.json
```

**Filter rules for answers:**
1. Use only `status == "current"` with `valid_from <= today` and (`valid_to` null or `> today`). Use `superseded`/`withdrawn` only to explain history or to recognise old forms in uploaded cases (`forms.recognise_in_uploads`, `aliases`, `recognition_hints_pl`).
2. If a fact is `unverified`, say so, and check `conflicts.json` (`app_behaviour_pl` says what the app should do).
3. Cite the `legal_refs` unit (e.g. "art. 30a ust. 1 u.z.") when giving a rule to a user.

**Conditions** (in `scenarios.conditions`, `attachment_rules`, `documents.needed_when`, `risks.detection_condition`): flat predicates `all` / `any` / `not` over enum keys (`insured_type`, `payer_size`, `parent_role`, `event`, `channel`) and `fact` + `eq|gte|lte`. `fact: "field:<key>"` means another field of the same form. A leaf with only `note_pl` cannot be evaluated by code: show it to the user or decide it with the LLM. Allowed values are in `enums.json`.

**Deadlines**: date = `anchor_event` date ± `offset {value, unit, direction}`. `kind`: `hard` means loss or refusal of the benefit; `protective` means job protection; `recommended` and `limit` are softer. When `param_id` or `anchor_param` is set, take the number from parameters, not from the offset text.

## Where app features get their data

| Feature | Read from |
|---|---|
| Calculators (`app/lib/calc/*`) | `parameters` (values), `benefits.base_calculation_steps_pl` (base method), `benefits.eligibility` |
| Plan / tasks / timeline (`app/lib/calc/tasks.ts`, `events.ts`) | `scenarios.steps`, `deadlines` |
| Document checklist | `forms.attachment_rules` + `documents.needed_when` / `not_needed_when` |
| Form-filling simulation | `form_fields.fields` (`required_if` uses conditions) |
| Employer requests | `leave_requests` (W1–W14: fields, attachments, deadlines) |
| Recognising uploaded sample cases | `forms.aliases`, `recognition_hints_pl`, superseded forms |
| Warnings | `risks` (`detection_condition`, `prevention_pl`) |
| Help for difficult situations | `support_orgs` (`situations`) |
| Guide panel (`/plan`, `/zadania`, `/swiadczenia` after the `/nowa-os` form and login) | `app/lib/guide/knowledge.json`, a trimmed snapshot of the records `guide.json` references. Regenerate with `node scripts/guide-knowledge.mjs` after editing either; `tests/tree.test.mjs` fails when it is stale. Mark a glossary term in a question label, hint or option as `[phrase](term.id)`: `TermText` renders it as a popup with `definition_pl`. |
| AI answers / search | `faq`, `glossary.synonyms_pl` (query expansion), any record's `title/summary/body_pl` |

`app/lib/params.ts` stays the runtime source of numbers (project rule). `knowledge/parameters.json` holds the same values with legal basis and validity. When you add or change a number in `params.ts`, take it from `parameters.json` and keep both in sync. Do not import JSON from `knowledge/` into the app: the app build only sees `app/`, so use a generated snapshot like the guide's.

## Editing rules

- Paraphrase only. The repo is public: no verbatim text from ZUS-provided materials (`materials/`, the ZUS guide) and no data from sample cases. Cite instead (`source_refs.locator` = page / § / section).
- A new fact needs a `sources` entry and, for law, a `legal_provisions` record. Set `verification` honestly.
- Law changed? Do not delete or overwrite the old record. Set it to `superseded` with `valid_to` and `superseded_by`, then add the new record.
- New enum value: add it to `enums.json` first.
- After editing, run both checks from the repo root. Each must end with `valid` / `OK refs`.
```bash
# 1. schema (per file you changed)
cd knowledge && npx -y ajv-cli@5 validate --spec=draft2020 --strict=false \
  -s schema/forms.schema.json -r schema/common.schema.json -d forms.json; cd ..
# 2. every referenced id exists
node -e 'const fs=require("fs"),d="knowledge/",K=/^(legal_refs|superseded_by|replaced_by|anchor_param|.*_ids?)$/;const files=fs.readdirSync(d).filter(f=>f.endsWith(".json")&&f!="enums.json").map(f=>[f,JSON.parse(fs.readFileSync(d+f)).records]);const ids=new Set(files.flatMap(([,r])=>r.map(x=>x.id)));let bad=0;const walk=(n,at)=>{if(Array.isArray(n))return n.forEach(x=>walk(x,at));if(n&&typeof n=="object")for(const[k,v]of Object.entries(n)){if(K.test(k))[].concat(v).forEach(x=>{if(typeof x=="string"&&!ids.has(x)){bad++;console.log("MISSING",x,"in",at)}});walk(v,at)}};files.forEach(([f,r])=>r.forEach(x=>walk(x,f+":"+x.id)));console.log(bad?"FAIL":"OK refs")'
```
