# knowledge/ – baza wiedzy ZUS (rodzicielstwo) w formie maszynowej

Źródło prawdy dla wiedzy domenowej aplikacji: zasiłki w ciąży i rodzicielstwie, formularze, wnioski urlopowe, dokumenty, terminy, scenariusze, ryzyka, organizacje wsparcia.
Pliki są przeznaczone do parsowania (LLM, skrypty, ewentualnie Supabase/RAG w przyszłości), nie do czytania przez ludzi – wersja dla ludzi: `docs/wnioski-i-dokumenty.md`.

Stan prawny: **21.11.2026**. Język treści: polski (`*_pl`). Klucze, identyfikatory, wartości enum: angielski.

## Pliki

| Plik | Zawartość | Schemat |
|---|---|---|
| `enums.json` | słowniki kontrolowane (wartości + opisy PL) | `schema/enums.schema.json` |
| `sources.json` | źródła (akty, strony ZUS, formularze, poradnik, gov.pl) | `schema/sources.schema.json` |
| `legal_provisions.json` | pojedyncze jednostki prawne (art./ust./§) – parafrazy | `schema/legal_provisions.schema.json` |
| `parameters.json` | parametry liczbowe (stawki, wymiary, limity, kwoty) | `schema/parameters.schema.json` |
| `benefits.json` | rodzaje świadczeń i ich reguły | `schema/benefits.schema.json` |
| `forms.json` | formularze ZUS (aktualne i wycofane, aliasy) | `schema/forms.schema.json` |
| `form_fields.json` | listy pól formularzy / załączników R1316 | `schema/form_fields.schema.json` |
| `leave_requests.json` | wnioski urlopowe do pracodawcy (R322 + KP) | `schema/leave_requests.schema.json` |
| `documents.json` | dokumenty pomocnicze (e-ZLA, odpis, zaświadczenia, orzeczenia) | `schema/documents.schema.json` |
| `deadlines.json` | reguły terminów (obliczalne) | `schema/deadlines.schema.json` |
| `scenarios.json` | ścieżki postępowania: warunki → kroki | `schema/scenarios.schema.json` |
| `risks.json` | ryzyka utraty / obniżenia świadczeń | `schema/risks.schema.json` |
| `support_orgs.json` | organizacje wsparcia (charytatywne) | `schema/support_orgs.schema.json` |
| `faq.json` | pytania i odpowiedzi | `schema/faq.schema.json` |
| `conflicts.json` | rozbieżności źródeł, nieaktualne twierdzenia, niepewności | `schema/conflicts.schema.json` |
| `glossary.json` | pojęcia i synonimy | `schema/glossary.schema.json` |

Każdy plik danych ma postać `{"$schema": "./schema/<plik>.schema.json", "records": [...]}`.

## Wspólne pola rekordu (`schema/common.schema.json#/$defs/record`)

- `id` – stabilny identyfikator `<prefiks>.<nazwa>` (np. `form.zam`, `deadline.parental_leave_request`). Nigdy nie zmieniaj istniejących id.
- `title_pl`, `summary_pl` (≤ 3 zdania), `body_pl` (pełny opis; samowystarczalny tekst – nadaje się na pojedynczy chunk RAG).
- `tags` – słowa kluczowe bez polskich znaków.
- `applies_to` – komu dotyczy: `insured_type[]`, `payer_size[]`, `parent_role[]`, `events[]` (wartości z `enums.json`). Brak pola = dotyczy wszystkich.
- `valid_from` / `valid_to` – daty obowiązywania (ISO, `null` = bez ograniczenia / nieustalone).
- `status` – `current | superseded | withdrawn | pending | out_of_scope`. `superseded_by` – id następcy.
- `legal_refs` – id z `legal_provisions.json`.
- `source_refs` – `[{source_id, locator}]` (id z `sources.json`; `locator` = strona/§/sekcja).
- `verification` – `{status: verified_primary | verified_secondary | unverified, checked_at, note}`.

## Prefiksy id

`src.` źródła · `uz.` `kp.` `r1316.` `r322.` `usus.` `usr.` `uer.` `zazyciem.` przepisy · `param.` · `benefit.` · `form.` · `ff.` pola formularzy · `lr.` wnioski urlopowe · `doc.` · `deadline.` · `scenario.` · `risk.` · `org.` · `faq.` · `conflict.` · `term.`

## Warunki (`condition`)

Płaski predykat JSON nad wartościami z `enums.json`:
```json
{"all": [{"insured_type": "employee"}, {"payer_size": "le20"}]}
{"any": [{"event": "stillbirth"}, {"event": "child_death_lt8w"}]}
{"not": {"insured_type": "self_employed"}}
{"fact": "payer_of_benefit", "eq": "zus"}
```
Klucze-liście: `insured_type`, `payer_size`, `parent_role`, `event`, `channel`, `fact` (+ `eq`/`gte`/`lte`), `note_pl` (warunek opisowy, gdy nie da się go wyrazić faktem – do interpretacji przez LLM/człowieka). Lista dopuszczalnych `fact` jest w `enums.json` → `facts`; dodatkowo `fact: "field:<key>"` odwołuje się do innego pola tego samego formularza (w `form_fields.json`).

## Terminy (`deadlines.json`)

`anchor_event` (z `enums.json` → `anchor_events`) + `offset {value, unit: days|weeks|months, direction: before|after}` + `kind` (`hard` – utrata/odmowa, `protective` – ochrona przed zwolnieniem, `recommended` – zalecenie, `limit` – górna granica okresu). Aplikacja oblicza konkretną datę z danych użytkownika.

## Zasady

- Repozytorium jest publiczne: **żadnego dosłownego kopiowania** materiałów ZUS udostępnionych na HackNation ani danych z przykładowych spraw. Teksty są parafrazą z odesłaniem do źródła.
- Twierdzenia nieaktualne (np. z poradnika ZUS w stanie prawnym 1.04.2026) zostają w bazie jako `status: superseded` + `superseded_by`, aby można było wyjaśnić, co i kiedy się zmieniło.
- Fakty bez potwierdzenia w źródle pierwotnym mają `verification.status: unverified` i wpis w `conflicts.json`.
