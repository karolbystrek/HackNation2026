# Challenge materials

Source materials for the HackNation 2026 ZUS challenge **"Zasiłkowy Przewodnik Przyszłego Rodzica"**.
Each PDF/DOCX has a Markdown copy next to it, extracted verbatim in Polish. The originals stay the source of truth.

| File | Source | What it is |
| --- | --- | --- |
| [hacknation.md](hacknation.md) | ZUS challenge brief | The task, required features, deliverables and scoring |
| [Załącznik - maksymalny czas trwania zasiłków, wysokość, podstawa wymiaru.md](Za%C5%82%C4%85cznik%20-%20maksymalny%20czas%20trwania%20zasi%C5%82k%C3%B3w%2C%20wysoko%C5%9B%C4%87%2C%20podstawa%20wymiaru.md) | `.docx` | Tables of benefit durations, rates and calculation base (the calculator parameters) |
| [1184_26 Poradnik dla rodziców.md](1184_26%20Poradnik%20dla%20rodzic%C3%B3w.md) | ZUS guide 2026 | Plain-language guide for parents and carers |
| [wyciąg z ustawy o świadczeniach pieniężnych z ubezpieczeń społecznych w razie choroby i macierzyństwa (ustawa zasiłkowa).md](wyci%C4%85g%20z%20ustawy%20o%20%C5%9Bwiadczeniach%20pieni%C4%99%C5%BCnych%20z%20ubezpiecze%C5%84%20spo%C5%82ecznych%20w%20razie%20choroby%20i%20macierzy%C5%84stwa%20%28ustawa%20zasi%C5%82kowa%29.md) | `.pdf`, 23 pages | Extract of the benefits act (ustawa zasiłkowa) |
| [Kodeks pracy (wyciąg z przepisów).md](Kodeks%20pracy%20%28wyci%C4%85g%20z%20przepis%C3%B3w%29.md) | `.pdf`, 10 pages | Extract of the Labour Code on parental leave |
| [rozporządzenie w sprawie zakresu informacji o okolicznościach mających wpływ na prawo do zasiłków oraz dokumentów niezbędnych do przyznania i wypłaty zasiłków.md](rozporz%C4%85dzenie%20w%20sprawie%20zakresu%20informacji%20o%20okoliczno%C5%9Bciach%20maj%C4%85cych%20wp%C5%82yw%20na%20prawo%20do%20zasi%C5%82k%C3%B3w%20oraz%20dokument%C3%B3w%20niezb%C4%99dnych%20do%20przyznania%20i%20wyp%C5%82aty%20zasi%C5%82k%C3%B3w.md) | `.pdf`, 16 pages | Regulation on the data and documents needed to grant benefits |
| [rozporządzenie w sprawie wniosków dot. uprawnień pracowników związanych z rodzicielstwem.md](rozporz%C4%85dzenie%20w%20sprawie%20wniosk%C3%B3w%20dot.%20uprawnie%C5%84%20pracownik%C3%B3w%20zwi%C4%85zanych%20z%20rodzicielstwem.md) | `.pdf`, 11 pages | Regulation on what employee leave requests must contain |

## hacknation.md: the challenge brief

**Goal:** a responsive web tool that gives future and new parents, adoptive parents and foster families personalised information about their ZUS rights. It should guide them through applying, help them plan leave and the split between parents, and cover difficult cases (stillbirth, premature birth, death or serious illness of the mother).

**Process described:**
- **Zasiłek chorobowy in pregnancy:** e-ZLA with code "B" pays 100% for up to 270 days. Employees first get 33 days of employer-paid sick pay (14 days at age 50+). The insurance waiting period is 30 days (compulsory) or 90 days (voluntary).
- **Zasiłek w wysokości zasiłku macierzyńskiego:** paid until birth when a pregnant woman loses her job through bankruptcy, liquidation or the employer's death, or through an unlawful dismissal confirmed by a court.
- **Zasiłek macierzyński:** covers maternity, supplementary maternity, parental and paternity leave, and leave on maternity terms for adoption and foster care. Employees and non-employees are paid on the same rules.
- **Who pays and which forms:** employers with more than 20 people insured for sickness pay benefits themselves. Otherwise the payer sends Z-3 (employee) or Z-3a (contractor) to ZUS. Non-employees apply to ZUS directly (ZAS-53 for sickness, ZAM for maternity). ZUR, ZAO and Z-3b were merged into ZAM or abolished on 2026-10-24.
- **Risks:** a sham contract or business started only to get cover; raising the contribution base during pregnancy; not being insured on the day of birth.
- **Protection:** an employee cannot be dismissed during pregnancy or parental leave. Fixed-term contracts are extended until birth. This protection does not cover non-employees.

**Required features (a–j):** pregnancy benefits info, including when nothing is due. Calculators for maternity benefit covering both parents, combining work with parental leave, sharing between parents, adoption and foster care, and an individual calculation base from the sample cases. Also documents, deadlines and where to file (employer or ZUS), risks of losing benefits, and charities for difficult situations. All calculators should ideally be one combined calculator.

**Simulated integrations:** mObywatel login, ZUS insurance data, contribution debt, e-ZLA records, PUE/eZUS, filling in leave and benefit requests, birth certificate request, links to ZUS, MRPiPS and PIP. An **admin panel** must let staff change parameters (rates, durations).

**Deliverables:** description, up to 10 slides, a video of up to 3 minutes, repository, screenshots, a live demo where sample cases (PDF forms) can be uploaded or selected and checked, full RWD, and a note on which features use AI. Next.js/React with a REST API is preferred.

**Scoring:** fit with the challenge 25%, completeness and UX 25%, idea 20%, originality 15%, deployment potential 15%.

> The anonymised sample cases mentioned in the brief are not in this folder and may not be copied or redistributed.

## Załącznik: durations, rates and calculation base

The tables the calculator is built from:
- **Sick pay in pregnancy:** employer 33 days (14 days at 50+), then ZUS up to 270 days, including after insurance ends. In pregnancy, earlier sickness periods are not counted towards the 270 days.
- **Maternity leave and leave on maternity terms:** 20 / 31 / 33 / 35 / 37 weeks for 1 / 2 / 3 / 4 / 5+ children. Leave on maternity terms lasts at least 9 weeks.
- **Supplementary maternity leave:** 1 week per week of hospital stay, up to 15 weeks (birth before week 28 or weight ≤1000 g) or up to 8 weeks (weeks 28–37, or full term with at least 2 days in hospital between days 5 and 28).
- **Parental leave:** 41 weeks (1 child) or 43 weeks (2+). With a "Za życiem" certificate it is 65 or 67 weeks. 9 weeks belong to each parent and cannot be transferred.
- **Paternity leave:** 2 weeks, taken once or in 2 parts of at least 1 week, by the child's 12th month. After adoption, within 12 months of the ruling and before the child turns 14.
- **Rates:** 100% for maternity, supplementary and paternity leave and leave on maternity terms. 70% for parental leave. 81.5% for the whole period if requested within 21 days of birth, except the other parent's 9 weeks, which are paid at 70%.
- **Calculation base:** the average monthly pay from the last 12 months minus 13.71%. There are rules for shorter employment, the 1st and 2nd month of work, quarterly and annual bonuses (1/12) and topping up incomplete months. For non-employees in 2026 the voluntary contribution base is capped at 23,550.00 zł, which gives a maximum benefit base of 20,321.30 zł.
- **Gap in the source:** the "minimalna podstawa wymiaru 2026" section stops after its intro (minimum wage 4,806 zł). It has no values.

## Poradnik dla rodziców i opiekunów dzieci (ZUS 2026)

ZUS's plain-language guide in two parts:
1. **Insurance rules for each work type:** employees, contractors (including combining with a job, students), self-employed (ulga na start, preferential base, mały ZUS+), people on maternity benefit or childcare leave, and people caring for a child themselves. Also contribution rates.
2. **Benefits:** sick pay in pregnancy (e-ZLA, sickness period, amount, how to claim, checks, time limit for claims), maternity benefit before birth, and after birth for each leave type and its split between parents. Also stillbirth or death of the child, amounts, how employees and non-employees claim, funeral grant for a stillborn child, and zasiłek opiekuńczy (carer's allowance).

## Ustawa zasiłkowa (extract)

Chapters 1–3, 6 and 8–11, with Art. 1–67:
- **Chapter 1:** who is insured, types of benefits, definitions.
- **Chapter 2 (zasiłek chorobowy):** waiting periods (Art. 4), benefit after insurance ends (Art. 7), sickness period (Art. 8–9), rates incl. 100% in pregnancy (Art. 11), exclusions and loss of the right (Art. 12–17).
- **Chapter 3:** rehabilitation benefit.
- **Chapter 6 (zasiłek macierzyński):** eligibility and duration (Art. 29–29a), benefit after insurance ends (Art. 30), the 21-day request (Art. 30a), rates (Art. 31).
- **Chapters 8–9:** how the base is set for employees (Art. 36–47) and for non-employees (Art. 48–52b).
- **Chapter 10:** e-ZLA medical certificates and letter codes (Art. 53–58a).
- **Chapter 11:** who decides and pays (Art. 61, the threshold of more than 20 insured), proceedings, payment dates, suspension, time limits (Art. 61–67).

## Kodeks pracy (extract)

Art. 1–3 (definitions) and Art. 92 (employer sick pay: 33 or 14 days, 80% or 100%). Dział VIII covers parental rights:
- protection in pregnancy (Art. 177)
- maternity leave and its length (Art. 180)
- stillbirth (Art. 180¹) and supplementary maternity leave (Art. 180²)
- parental leave: length, how it is granted, request, combining with work, extension (Art. 182¹a–182¹g)
- paternity leave (Art. 182³), adoption and foster care (Art. 183), returning to work (Art. 186⁴)

## Rozporządzenie: data and documents for benefits (Dz.U. 2026 poz. 1316)

43 paragraphs and 7 annexes. They set out what information and documents ZUS or the payer needs for each benefit: e-ZLA, the employer and contractor certificates (Z-3 / Z-3a), the statement for benefits after insurance ends, rehabilitation benefit, zasiłek macierzyński (incl. documents for stillbirth, "Za życiem" and hospitalisation) and zasiłek opiekuńczy. This is the source for the "which documents do I need" guidance.

## Rozporządzenie: requests related to parenthood (Dz.U. 2025 poz. 322)

24 paragraphs. They set what each employee request must contain and which documents go with it: part of maternity leave before the due date, leave on maternity terms, supplementary maternity leave, parental leave, paternity leave, giving up part of maternity leave, combining parental leave with work, and childcare leave (urlop wychowawczy) and reduced hours. This is the basis for designing the leave request forms the brief asks for.

## Extraction notes

- Text is verbatim Polish, including typos in the source. Superscript article numbers (e.g. 182¹a) were restored by hand from the page images, so check one against the PDF if exact citations matter.
- Removed: page footers ("Legalis"), page numbers and hyphenation. Gaps marked "(…)" are already in the source extracts.
- The note "Treść odnośnika publikujemy na końcu ustawy" in both act extracts refers to text that is not included.
