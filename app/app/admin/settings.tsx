"use client";

import { useState, type FormEvent } from "react";
import { Button, Field, PageTitle } from "@/components/ui";
import { settingsFields, type Settings } from "@/lib/benefit-settings";
import { createClient } from "@/lib/supabase/client";

export function AdminSettings({ initial }: { initial: Settings }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setMessage("");
    try {
      const auth = createClient();
      const { data, error } = await auth.auth.signInWithPassword({
        email: String(form.get("email")), password: String(form.get("password")),
      });
      if (error || !data.session) {
        setMessage("Nie udało się zalogować.");
        return;
      }
      const response = await fetch("/api/admin/benefit-settings", {
        method: "PUT",
        headers: { Authorization: `Bearer ${data.session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify(Object.fromEntries(settingsFields.map(({ key }) => [key, Number(form.get(key))]))),
      });
      const result = await response.json();
      setMessage(response.ok ? "Zapisano parametry. Odśwież plan, aby zobaczyć zmiany." : result.error);
    } catch {
      setMessage("Nie udało się połączyć. Spróbuj ponownie.");
    } finally {
      setBusy(false);
    }
  }

  return <main id="main-content" tabIndex={-1} className="page max-w-xl">
    <PageTitle lead="Zmiany obowiązują w kalkulatorach i planach po ponownym wczytaniu.">Parametry świadczeń</PageTitle>
    <form onSubmit={save} className="flex flex-col gap-4">
      {settingsFields.map(({ key, label, min, max, step }) =>
        <Field key={key} label={label} name={key} type="number" min={min} max={max} step={step} required defaultValue={initial[key]} />)}
      <Field label="E-mail administratora" name="email" type="email" autoComplete="username" required />
      <Field label="Hasło administratora" name="password" type="password" autoComplete="current-password" required />
      <Button className="self-start" type="submit" disabled={busy}>{busy ? "Zapisuję…" : "Zapisz parametry"}</Button>
      <p role="status">{message}</p>
    </form>
  </main>;
}
