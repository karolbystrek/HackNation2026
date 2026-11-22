"use client";

import { useState, type FormEvent } from "react";
import { Info } from "lucide-react";
import { Button, Chip, Field, Notice, PageBand, SectionTitle } from "@/components/ui";
import { settingsFields, type Settings } from "@/lib/benefit-settings";

const groups = [...new Set(settingsFields.map((field) => field.group))];
const asText = (settings: Settings) => Object.fromEntries(settingsFields.map(({ key }) => [key, String(settings[key])]));
const defaults = asText(Object.fromEntries(settingsFields.map(({ key, value }) => [key, value])));

export function AdminSettings({ initial }: { initial: Settings }) {
  const [values, setValues] = useState(() => asText(initial));
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setStatus("");
    setError("");
    try {
      const response = await fetch("/api/admin/benefit-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(settingsFields.map(({ key }) => [key, Number(values[key])]))),
      });
      const result = await response.json();
      if (response.ok) setStatus("Zapisano parametry. Kalkulatory i plan używają ich od teraz w tej przeglądarce.");
      else setError(result.error);
    } catch {
      setError("Nie udało się połączyć. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main id="main-content" tabIndex={-1} className="pb-14">
      <PageBand
        title="Parametry świadczeń"
        lead="Wartości używane przez kalkulatory, plan urlopów, analizę spraw i kreator wniosków."
      >
        <div className="flex max-w-[70ch] gap-4 border-l-4 border-action bg-warning-soft p-5">
          <Info aria-hidden strokeWidth={1.75} className="size-6 shrink-0 text-action-foreground" />
          <p><strong>Ważne:</strong> w wersji demonstracyjnej zmiany zapisują się tylko w tej przeglądarce. W systemie produkcyjnym objęłyby wszystkich użytkowników po zalogowaniu pracownika.</p>
        </div>
      </PageBand>
      <form onSubmit={save} className="shell mt-10 flex flex-col gap-12">
        {groups.map((group) => (
          <section key={group} className="flex flex-col gap-6">
            <SectionTitle>{group}</SectionTitle>
            <div className="grid gap-x-8 gap-y-6 sm:grid-cols-2">
              {settingsFields.filter((field) => field.group === group).map(({ key, label, min, max, step }) => (
                <Field
                  key={key}
                  className="justify-end"
                  label={<>{label}{values[key] !== defaults[key] && <Chip className="ml-2 bg-primary-soft text-primary">Zmieniono</Chip>}</>}
                  hint={`Domyślnie: ${defaults[key].replace(".", ",")}`}
                  name={key}
                  type="number"
                  min={min}
                  max={max}
                  step={step}
                  required
                  value={values[key]}
                  onChange={(event) => setValues({ ...values, [key]: event.target.value })}
                />
              ))}
            </div>
          </section>
        ))}
        <div className="flex flex-col gap-4 border-t pt-6">
          {error && <p role="alert" className="font-bold text-destructive">{error}</p>}
          {status && <Notice role="status">{status}</Notice>}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={busy}>{busy ? "Zapisuję…" : "Zapisz parametry"}</Button>
            <Button type="button" variant="outline" onClick={() => { setValues(defaults); setStatus(""); }}>Przywróć domyślne</Button>
          </div>
          <p className="text-sm text-muted-foreground">„Przywróć domyślne” wypełnia pola wartościami z przepisów. Zapisz, aby je zastosować.</p>
        </div>
      </form>
    </main>
  );
}
