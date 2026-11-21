---
name: zus-domena
description: ZUS benefit rules for parents (zasiłek chorobowy w ciąży, zasiłek macierzyński, urlop macierzyński/rodzicielski/ojcowski/uzupełniający, adopcja, rodzina zastępcza), their rates and durations, ZUS forms, plus the hackathon requirements checklist. Use when implementing or checking benefit calculators, eligibility logic, application forms, document guidance, or deciding feature scope.
---

# Domena: świadczenia ZUS dla rodziców

Własne streszczenie zasad z treści zadania ZUS.
Liczby sprawdzaj w `materials/` (tabela wymiarów, poradnik ZUS 2026) - przy rozbieżności wygrywa materiał.
Pełna lista wymagań konkursu: [wymagania.md](wymagania.md).
Szczegółowe, źródłowane dane (przepisy, parametry, formularze, załączniki, terminy, scenariusze, stan prawny 21.11.2026) są w `knowledge/` – jak z nich korzystać: skill `zus-knowledge`.
Poradnik ZUS ma stan prawny 1.04.2026; zmiany od 24.10.2026 (ZAM zamiast ZUR/ZAO, koniec Z-3b, odpis aktu urodzenia) są w `knowledge/` jako `superseded`.

## Pojęcia

- **Płatnik składek** - zatrudniający. Płatnik zgłaszający >20 ubezpieczonych do ubezpieczenia chorobowego sam wypłaca zasiłki; mniejszy przekazuje sprawę do ZUS.
- **Ubezpieczony** - osoba, za którą płacone są składki.
- **Świadczeniobiorca** - osoba pobierająca świadczenie.
- **Podstawa wymiaru zasiłku** - kwota, od której liczy się % zasiłku.
- Typy ubezpieczonych istotne dla logiki: pracownik (umowa o pracę), zleceniobiorca, prowadzący działalność (JDG), osoba nieubezpieczona.

## Zasiłek chorobowy w ciąży

- Wymaga zaświadczenia e-ZLA z kodem literowym **B** (ciąża) -> zasiłek **100%** podstawy.
- Prawo do zasiłku po okresie wyczekiwania: **30 dni** nieprzerwanego ubezpieczenia (obowiązkowe, np. umowa o pracę), **90 dni** (dobrowolne: zlecenie, JDG).
- Pracownik: pierwsze **33 dni** niezdolności w roku kalendarzowym (14 dni po 50. roku życia) płaci pracodawca jako wynagrodzenie chorobowe, potem zasiłek.
- Nie-pracownik: zasiłek od 1. dnia niezdolności.
- Maksymalnie **270 dni** (okres zasiłkowy).
- Dokumenty: pracownik - e-ZLA trafia do pracodawcy; jeśli płatnik nie wypłaca, wysyła do ZUS Z-3 (lub ZAS-12 na dalszy okres). Zleceniobiorca - Z-3a. JDG - wniosek ZAS-53 do ZUS.
- Jeśli niezdolność trwa do porodu, po porodzie zaczyna się macierzyński.

## Zasiłek w wysokości zasiłku macierzyńskiego

Gdy kobieta w ciąży straciła pracę przez upadłość/likwidację/śmierć pracodawcy (art. 30 ust. 3 u.z.).
Rozwiązanie umowy z naruszeniem prawa (prawomocny wyrok) daje zasiłek macierzyński dopiero po porodzie (art. 30 ust. 1 pkt 2), nie ten zasiłek – treść zadania podaje to błędnie, zob. `conflict.unlawful_dismissal_benefit` w `knowledge/`.
Wypłacany do dnia porodu, **100%** podstawy.

## Zasiłek macierzyński - okresy

Przysługuje pracownikom (za okres urlopu) i pozostałym ubezpieczonym (za okres odpowiadający urlopowi) na tych samych zasadach co do wymiaru i wysokości.

- **Macierzyński**: **20 tygodni** przy 1 dziecku (więcej przy wieloraczkach - tabela w materiałach). Do **6 tygodni** może wykorzystać przed porodem (potrzebne zaświadczenie o przewidywanej dacie porodu). Pierwsze **14 tygodni** po porodzie matka wykorzystuje osobiście; resztę może przejąć ojciec (od razu po urlopie matki).
- Ojciec przejmuje wcześniej niż po 14 tyg., gdy matka: ma orzeczenie o niezdolności do samodzielnej egzystencji, jest w szpitalu, zmarła lub porzuciła dziecko.
- **Uzupełniający urlop macierzyński**: wcześniak lub dziecko wymagające hospitalizacji; dla matki albo ojca (tylko jedno), jednorazowo, bezpośrednio po macierzyńskim.
- **Rodzicielski**: wspólna pula **41 tygodni** (1 dziecko) / **43 tygodnie** (wieloraczki); każdemu rodzicowi przysługuje **9 tygodni** nieprzenoszalnych. Do **5 części**, do końca roku kalendarzowego, w którym dziecko kończy **6 lat**. Rodzice mogą korzystać jednocześnie lub naprzemiennie. Zaświadczenie "Za życiem" -> wydłużony rodzicielski.
- **Ojcowski**: **14 dni** kalendarzowych, jednorazowo albo w 2 częściach po min. 7 dni, do ukończenia przez dziecko **12 miesięcy** (adopcja: 12 mies. od uprawomocnienia, max do 14 lat dziecka). Wieloraczki nie wydłużają. Niewykorzystany wygasa.
- **Łączenie rodzicielskiego z pracą**: praca max **1/2 etatu**, urlop na pozostałą część etatu, urlop wydłuża się proporcjonalnie; zasiłek także za wydłużony okres.

## Adopcja i rodzina zastępcza

- Dla ubezpieczonego, który przyjął dziecko jako rodzina zastępcza niezawodowa albo przyjął dziecko i złożył wniosek o przysposobienie.
- **Urlop na warunkach urlopu macierzyńskiego**: dziecko do **7 lat** (przy odroczeniu obowiązku szkolnego do **10 lat**) - rodzina zastępcza; do **14 lat** - przysposobienie.
- Potem rodzicielski jak przy urodzeniu (z uwzględnieniem wieku dziecka).

## Sytuacje szczególne

- **Martwe urodzenie / zgon dziecka przed 8. tygodniem życia**: macierzyński przez **8 tygodni** po porodzie, nie krócej niż **7 dni** od zgonu.
- **Zgon po 8. tygodniu**: macierzyński jeszcze przez **7 dni** od zgonu.
- Wieloraczki: wymiar stosowny do liczby dzieci pozostałych przy życiu.

## Wysokość zasiłku macierzyńskiego

- **100%** podstawy: okres urlopu macierzyńskiego, na warunkach macierzyńskiego, uzupełniającego, ojcowskiego.
- **70%** podstawy: okres urlopu rodzicielskiego.
- **81,5%** podstawy za cały okres (macierzyński + rodzicielski w pełnym wymiarze), jeśli matka złoży wniosek najpóźniej **21 dni po porodzie**.

## Dokumenty i gdzie składać

- Pracownik: wniosek o urlop do pracodawcy (jeden wniosek na macierzyński + rodzicielski); pracodawca wypłaca albo wysyła do ZUS **Z-3**.
- Nie-pracownik (np. JDG): wniosek **ZAM** bezpośrednio do ZUS.
- Zleceniobiorca: **ZAM**, płatnik wysyła do ZUS **Z-3a**.
- Załączniki wpływające na prawo/wymiar: akt urodzenia / zaświadczenie o martwym urodzeniu, "Za życiem", zaświadczenie ze szpitala (uzupełniający).
- Od **24.10.2026** formularze **ZUR** i **ZAO** połączono z **ZAM**, a **Z-3b** zlikwidowano - nie pokazuj ich jako aktualnych.
- Wzory formularzy: zus.pl -> Wzory formularzy -> Zasiłki.

## Ryzyka utraty lub obniżenia świadczeń (pokazuj użytkownikowi)

- Umowa lub działalność założona "dla pozoru" - ZUS może uznać brak ubezpieczenia.
- Podwyższenie podstawy wymiaru składek w ciąży tylko po to, by dostać wyższy zasiłek - ZUS może ustalić niższą podstawę.
- Brak ubezpieczenia chorobowego w dniu porodu (niezgłoszenie do dobrowolnego, rozwiązanie umowy, zamknięcie JDG, koniec zlecenia).

## Ochrona pracownicza (Kodeks pracy)

W ciąży i w czasie urlopów rodzicielskich (od złożenia wniosku) pracodawca nie może wypowiedzieć ani rozwiązać umowy (wyjątki: wina pracownika + zgoda związku).
Umowa na czas określony / próbna >1 mies., która skończyłaby się po 3. miesiącu ciąży, przedłuża się do dnia porodu.
Nie dotyczy osób, które nie są pracownikami (zlecenie, JDG).

## Podstawa prawna

Ustawa zasiłkowa (25.06.1999, Dz.U. 2026 poz. 854), Kodeks pracy (Dz.U. 2026 poz. 1245), rozporządzenie MRPiPS z 27.09.2026 (Dz.U. 2026 poz. 1316), pomocniczo rozporządzenie z 11.03.2025 (Dz.U. 2025 poz. 322).
