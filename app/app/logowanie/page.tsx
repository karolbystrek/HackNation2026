"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink, Button, PageTitle, RadioOption } from "@/components/ui";
import { GUIDE_ID } from "@/lib/guide/persona";
import { nextQuestion } from "@/lib/guide/tree";
import { personas } from "@/lib/mock/personas";
import { logIn, useIsClient, usePlan } from "@/lib/plan-store";

export default function MObywatelLogin() {
  const router = useRouter();
  const answers = usePlan().guideAnswers;
  const formReady = useIsClient() && Object.keys(answers).length > 0 && !nextQuestion(answers);
  const [picked, setPersonaId] = useState<string | null>(null);
  const personaId = picked ?? (formReady ? GUIDE_ID : personas[0].id);
  const accounts = [...(formReady ? [{ id: GUIDE_ID, label: "Twoje dane z formularza" }] : []), ...personas];

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      {formReady ? <BackLink href="/nowa-os">Zmień odpowiedzi</BackLink> : <BackLink href="/">Strona główna</BackLink>}
      <PageTitle lead={formReady ? "Zaloguj się przez mObywatel (symulacja), aby zobaczyć swoją oś czasu i listę zadań." : "Wybierz przykładowy profil, aby przejść przez symulację logowania przez mObywatel."}>
        Logowanie demonstracyjne
      </PageTitle>
      <form
        className="flex flex-col items-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          logIn(personaId);
          router.replace("/plan");
        }}
      >
        <fieldset className="w-full min-w-0">
          <legend className="mb-2 font-bold">Konto demo</legend>
          <div className="grid gap-2">
            {accounts.map((p) => (
              <RadioOption key={p.id} name="persona" checked={personaId === p.id} onChange={() => setPersonaId(p.id)} className="p-3">
                <strong className="block">{p.label}</strong>
              </RadioOption>
            ))}
          </div>
        </fieldset>
        <Button type="submit">Zaloguj się</Button>
      </form>
    </main>
  );
}
