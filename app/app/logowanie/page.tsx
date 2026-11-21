"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, PageTitle, RadioOption } from "@/components/ui";
import { personas } from "@/lib/mock/personas";
import { logIn } from "@/lib/plan-store";

export default function MObywatelLogin() {
  const router = useRouter();
  const [personaId, setPersonaId] = useState(personas[0].id);

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      <BackLink href="/">Strona główna</BackLink>
      <PageTitle lead="Wybierz przykładowy profil, aby przejść przez symulację logowania przez mObywatel.">
        Logowanie demonstracyjne
      </PageTitle>
      <form
        className="flex flex-col items-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          logIn(personaId);
          router.push("/rodzina");
        }}
      >
        <fieldset className="w-full min-w-0">
          <legend className="mb-2 font-bold">Konto demo</legend>
          <div className="grid gap-2">
            {personas.map((p) => (
              <RadioOption key={p.id} name="persona" checked={personaId === p.id} onChange={() => setPersonaId(p.id)} className="p-3">
                <strong className="block">{p.label}</strong>
                <span className="text-muted-foreground">{p.description}</span>
              </RadioOption>
            ))}
          </div>
        </fieldset>
        <Button type="submit">Przejdź do danych rodziny</Button>
      </form>
    </main>
  );
}
