import type { FormSpec } from "@/lib/forms/spec";

// Not a ZUS form, so knowledge/ has no field set; fields follow the gov.pl "Uzyskaj odpis aktu urodzenia" service.
export const BIRTH_CERTIFICATE_REQUEST: FormSpec = {
  id: "civil.birth_certificate",
  title: "Wniosek o wydanie odpisu aktu urodzenia",
  fields: [
    { key: "copy_kind", label: "Rodzaj odpisu", type: "choice", section: "Odpis", required: "always",
      options: [{ value: "skrocony", label: "Odpis skrócony (np. do wniosków urlopowych)" }, { value: "zupelny", label: "Odpis zupełny" }, { value: "wielojezyczny", label: "Odpis wielojęzyczny (do użytku za granicą)" }] },
    { key: "copies", label: "Liczba egzemplarzy", type: "number", section: "Odpis", required: "always" },
    { key: "child_first_name", label: "Imię dziecka", type: "text", section: "Dane dziecka", required: "always" },
    { key: "child_last_name", label: "Nazwisko dziecka", type: "text", section: "Dane dziecka", required: "always" },
    { key: "child_birth_date", label: "Data urodzenia", type: "date", section: "Dane dziecka", required: "always" },
    { key: "child_birth_place", label: "Miejsce urodzenia", type: "text", section: "Dane dziecka", required: "always" },
    { key: "applicant", label: "Wnioskodawca", type: "person", section: "Wnioskodawca", required: "always" },
    { key: "applicant_address", label: "Adres do korespondencji", type: "address", section: "Wnioskodawca", required: "always" },
    { key: "legal_interest", label: "Kim jesteś dla osoby z aktu", type: "choice", section: "Wnioskodawca", required: "always",
      options: [{ value: "rodzic", label: "Rodzic" }, { value: "przedstawiciel", label: "Przedstawiciel ustawowy lub opiekun" }] },
    { key: "delivery", label: "Sposób odbioru", type: "choice", section: "Odbiór i opłata", required: "always",
      options: [{ value: "usc", label: "Odbiór w urzędzie stanu cywilnego" }, { value: "poczta", label: "Wysyłka pocztą na adres do korespondencji" }],
      help: "Pierwszy odpis skrócony po rejestracji urodzenia jest bezpłatny. Kolejne kosztują 22 zł (skrócony) albo 33 zł (zupełny)." },
    { key: "signature", label: "Podpis", type: "signature", section: "Podpis", required: "always" },
  ],
  attachments: [],
};
