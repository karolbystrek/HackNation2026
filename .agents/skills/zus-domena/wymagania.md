# Wymagania konkursu ZUS - checklista

Streszczenie sekcji 3-8 treści zadania (`materials/ZUS - Pełna treść zadania konkursowego.pdf`).

## Funkcje (sekcja 3)

Narzędzie ustala uprawnienia indywidualnie, z danych "z ZUS" (symulowanych) albo wpisanych przez użytkownika (data porodu, data ustania zatrudnienia itp.).

- [ ] a) Informacja o świadczeniach w ciąży (także o ich braku): zasiłek chorobowy, świadczenie rehabilitacyjne, zasiłek w wysokości macierzyńskiego.
- [ ] b) Kalkulator macierzyńskiego dla obojga rodziców (okres + kwota), z liczbą dzieci, ich wiekiem, "Za życiem".
- [ ] c) Kalkulator przy łączeniu pracy z urlopem rodzicielskim.
- [ ] d) Symulacja, gdy z urlopów korzystają oboje rodzice.
- [ ] e) / j) Kalkulator dla rodziców adopcyjnych i rodziny zastępczej niezawodowej.
- [ ] f) Kalkulator kwoty z indywidualną podstawą wymiaru - symulacja dla konkretnej przykładowej sprawy.
- [ ] g) Dokumenty, terminy, sposób złożenia; kto wypłaca (płatnik czy ZUS) i gdzie składać.
- [ ] h) Ryzyka utraty prawa lub obniżenia zasiłku.
- [ ] i) Organizacje charytatywne pomagające w trudnych sytuacjach (śmierć dziecka, wcześniak, poronienie, ciężka choroba).

Rekomendacja ZUS: wszystkie kalkulatory jako **jeden zintegrowany kalkulator** z wyborem opcji.

## Symulacje (wszystko mock)

- [ ] Logowanie przez mObywatel.
- [ ] Pobranie danych z ZUS (ubezpieczenie lub jego brak) albo ręczne wpisanie danych.
- [ ] Zadłużenie składkowe na dzień powstania prawa (ważne dla JDG) - zaświadczenie o zadłużeniu i jego wysokość.
- [ ] Podgląd zaświadczeń e-ZLA.
- [ ] Połączenie z PUE/eZUS (zadanie pytania, sprawdzenie danych z konta).
- [ ] Wypełnienie wniosków o urlopy i świadczenia + wysłanie do pracodawcy/ZUS (wnioski o urlopy do zaprojektowania przez nas).
- [ ] Wniosek o odpis aktu urodzenia (gov.pl rejestr stanu cywilnego).
- [ ] Lista organizacji wsparcia (fundacje, stowarzyszenia).
- [ ] Linki do zus.pl, gov.pl/web/rodzina/urlop-rodzicielski, pip.gov.pl/dla-pracodawcow/porady-prawne/rodzicielstwo.

## Panel administracyjny

- [ ] Zmiana parametrów (stawki %, maksymalne wymiary) bez zmiany kodu, na wypadek zmian w prawie.

## Testowanie przez jury (sekcja 6)

- [ ] Upload albo wybór przykładowego wniosku (PDF z zestawów ZUS) -> sprawdzenie ubezpieczenia i wyliczenie zasiłku. Jury sprawdzi poprawność wyliczeń na tych przykładach.

## Wymagania formalne (sekcja 4)

- [ ] Tytuł i szczegółowy opis projektu.
- [ ] Prezentacja, max 10 slajdów.
- [ ] Film max 3 min w otwartym repozytorium (link).
- [ ] Repozytorium kodu, zrzuty ekranu.
- [ ] Demo online z możliwością testu przykładowych wniosków i kalkulatora.
- [ ] Pełne RWD (desktop + mobile).
- [ ] Wskazanie, które funkcje używają AI.

## Technicznie (sekcja 5)

Preferowane React/Next.js, backend JS/Python/C#, integracja przez REST API. Ma działać testowo, ale z potencjałem wdrożeniowym.

## Kryteria oceny (sekcja 8)

Związek z wyzwaniem 25%, pomysł 20%, oryginalność 15%, kompletność i UX 25%, potencjał wdrożeniowy 15%.
