# Model sprawy rodzinnej

Jedna sprawa rodzinna łączy oś zdarzeń, ocenę uprawnień i graf zależnych kroków. Matka i ojciec mogą prowadzić swoje sprawy równolegle, a część decyzji, dokumentów i limitów dotyczy obojga.

## Encje i relacje

| Encja | Rola |
| --- | --- |
| Sprawa rodzinna | Łączy opiekunów i dzieci w związku z ciążą, porodem, przysposobieniem lub pieczą zastępczą. Każde dziecko ma własne dane i zdarzenia. |
| Rodzic lub opiekun | Ma rolę w sprawie, historię zatrudnienia i ubezpieczenia oraz indywidualną podstawę wymiaru świadczenia. Z zatrudnieniem wiąże się płatnik składek. |
| Zdarzenie | Ma typ, datę lub okres oraz wskazuje osobę, dziecko lub sprawę, której dotyczy. Źródło informacji i status faktu lub założenia symulacji to osobne cechy. |
| Uprawnienie | Określa, kto i pod jakimi warunkami może skorzystać z urlopu lub świadczenia. Ocena uwzględnia stan na datę właściwą dla danego uprawnienia. |
| Pula i okres wykorzystania | Pula określa limit rodzinny lub indywidualny. Okres wskazuje osobę, daty, rodzaj uprawnienia, wykorzystanie puli i kwotę świadczenia. Dwa równoległe tygodnie rodzicielskiego zajmują tydzień w kalendarzu i dwa tygodnie z łącznej puli. |
| Wariant planu | Łączy założenia i wybory, np. daty rozpoczęcia, podział urlopu i wymiar pracy podczas rodzicielskiego. Kilka wariantów można porównać na podstawie tych samych faktów. |
| Krok i dokument | Krok ma wykonawcę, ewentualnych uczestników, adresata, warunki rozpoczęcia i ukończenia, najwcześniejszą datę i termin końcowy. Może zawierać podkroki. Dokument uzyskany w jednym kroku może być wymagany w kilku kolejnych. |

## Przebieg sprawy

1. Rodzic wprowadza dane lub korzysta z danych pochodzących z symulowanego pobrania z ZUS. Stan sprawy na dany dzień wynika z faktów i wybranego wariantu.
2. Ocena wskazuje, czy uprawnienie przysługuje, nie przysługuje lub wymaga uzupełnienia danych. Pokazuje przyczynę, okresy, kwoty i ryzyka.
3. Rodzice porównują warianty i wybierają plan. Przewidywana data porodu daje terminy orientacyjne. Podanie faktycznej daty aktualizuje kroki zależne od porodu.
4. Zależności wyznaczają dostępność kroków, a daty porządkują je na osi czasu. Maszyna stanowa opisuje pojedynczy krok, np. oczekiwanie na dokument, gotowość do złożenia i złożenie wniosku. Upływ terminu może wymagać ponownej oceny dalszej ścieżki.
5. Widoki matki, ojca i wspólny korzystają z tej samej sprawy. Wspólny widok pokazuje podział opieki i kroki wymagające współpracy. Zmiana planu aktualizuje przyszłe kroki, a dotychczasowe działania, np. data złożenia wniosku, pozostają faktami.

## Typowa oś wniosków

Przykład zakłada urodzenie jednego dziecka i oboje rodziców zatrudnionych na umowie o pracę.

| Kiedy | Kto i co robi |
| --- | --- |
| W ciąży | Przy niezdolności do pracy lekarz wystawia matce e-ZLA, które trafia elektronicznie do ZUS i pracodawcy. Matka może też wystąpić o rozpoczęcie macierzyńskiego do 6 tygodni przed przewidywanym porodem. |
| Poród | Macierzyński matki rozpoczyna się z dniem porodu, jeśli nie zaczęła go wcześniej. Matka przekazuje dokumenty potrzebne do wypłaty zasiłku. |
| Do 21 dni od wystawienia karty urodzenia | Jeden z rodziców zgłasza urodzenie do USC. Akt urodzenia może być potrzebny w kolejnych sprawach. |
| Do 21 dni od porodu | Matka może złożyć wniosek o uśrednioną stawkę zasiłku 81,5%. Stawka nie obejmuje 9 tygodni rodzicielskiego przysługujących wyłącznie drugiemu rodzicowi. |
| W pierwszym roku życia dziecka | Ojciec może wykorzystać 2 tygodnie ojcowskiego, razem lub w dwóch tygodniowych częściach. Składa wniosek do pracodawcy co najmniej 7 dni przed startem danej części. Urlop może pokrywać się z macierzyńskim matki. |
| Opcjonalne przekazanie macierzyńskiego | Matka może oddać pozostałą część po wykorzystaniu co najmniej 14 tygodni po porodzie. Przy 20 tygodniach rozpoczętych w dniu porodu zostaje do 6 tygodni. Wniosek matki o rezygnację poprzedza jej powrót o co najmniej 7 dni, a wniosek ojca o przejęcie poprzedza rozpoczęcie jego części o co najmniej 14 dni. |
| Przed każdą częścią urlopu rodzicielskiego | Każdy korzystający rodzic składa wniosek swojemu pracodawcy co najmniej 21 dni przed rozpoczęciem danej części. Łączny wymiar to 41 tygodni, z czego po 9 tygodni jest zarezerwowane dla każdego z rodziców. Korzystają równolegle lub naprzemiennie, maksymalnie w 5 częściach, do końca roku, w którym dziecko kończy 6 lat. Przy łączeniu rodzicielskiego z pracą u pracodawcy udzielającego urlopu obowiązuje osobny wniosek składany z co najmniej 21-dniowym wyprzedzeniem. |

Osoby ubezpieczone z innego tytułu, np. na zleceniu lub JDG, składają wniosek o zasiłek za odpowiedni okres, np. ZAM w przypadku zasiłku macierzyńskiego. Obieg dokumentów zależy od płatnika świadczenia. Przedsiębiorczyni ubiegająca się o chorobowe może złożyć ZAS-53.

Punktem odniesienia dla terminu jest konkretne zdarzenie lub planowana data. Zgłoszenie urodzenia zależy od karty urodzenia, wybór stawki od porodu, a wniosek o rodzicielski od daty rozpoczęcia danej części. Wniosek o późniejszy urlop może więc pojawić się podczas wcześniejszego urlopu.

## Najważniejsze przypadki użycia

- **Ciąża i koniec umowy.** Porównać aktualne uprawnienia z symulacją ustania zatrudnienia przed porodem.
- **Poród i formalności.** Po zastąpieniu prognozy faktyczną datą zobaczyć aktualne terminy i listę dokumentów.
- **Podział opieki.** Porównać równoległe i naprzemienne wykorzystanie rodzicielskiego, kwoty i skutki łączenia urlopu z pracą.
- **Hospitalizacja dziecka.** Ocenić uzupełniający macierzyński, zebrać zaświadczenie ze szpitala i oświadczenie drugiego rodzica. Jeden rodzic składa wniosek, drugi dostarcza oświadczenie. Termin zależy od końca macierzyńskiego.
- **Przysposobienie lub piecza zastępcza.** Wyznaczyć uprawnienia i formalności na podstawie wieku dziecka i zdarzeń związanych z objęciem opieki.

## Źródła

- [Poradnik ZUS dla rodziców i opiekunów dzieci](https://www.zus.pl/documents/10182/167567/1184_26%2BPoradnik%2Bdla%2BRodzic%C3%B3w.pdf/9378de60-151e-9b9f-ba65-abdf41d9f5b4?download=true&version=1.0)
- [Gov.pl – zgłoszenie urodzenia](https://www.gov.pl/web/gov/zglos-urodzenie-dziecka)
- [MRPiPS – urlop macierzyński](https://www.gov.pl/web/rodzina/urlop-macierzynski), [urlop ojcowski](https://www.gov.pl/web/rodzina/urlop-ojcowski), [urlop rodzicielski](https://www.gov.pl/web/rodzina/urlop-rodzicielski)
- [ZUS – wysokość zasiłku macierzyńskiego](https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc)
