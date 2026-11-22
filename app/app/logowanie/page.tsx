"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { BackLink, Button, Checkbox, PageTitle, RadioGroup, RadioOption } from "@/components/ui";
import { PARENTS, type ParentKey } from "@/lib/calc/leave";
import { currentPersona, GUIDE_ID } from "@/lib/guide/persona";
import { nextQuestion } from "@/lib/guide/tree";
import { personas } from "@/lib/mock/personas";
import { logIn, useIsClient, usePlan } from "@/lib/plan-store";

const DESTINATIONS = new Map([
  ["chorobowy", "/kalkulator?tryb=pregnancy"],
  ["macierzynski", "/kalkulator?tryb=birth"],
  ["rodzicielski", "/warianty"],
  ["podstawa", "/kalkulator?tryb=basis"],
  ["adopcja", "/kalkulator?tryb=adoption"],
  ["wnioski", "/wnioski#twoje-wnioski"],
]);

export default function MObywatelLogin() {
  return <Suspense><LoginForm /></Suspense>;
}

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const destination = DESTINATIONS.get(search.get("widok") ?? "");
  const plan = usePlan();
  const isClient = useIsClient();
  const { guideAnswers: answers } = plan;
  const formReady = isClient && Object.keys(answers).length > 0 && !nextQuestion(answers);
  const [picked, setPersonaId] = useState<string | null>(null);
  const personaId = picked ?? plan.personaId ?? (formReady ? GUIDE_ID : personas[0].id);
  const [viewer, setViewer] = useState<ParentKey>(plan.viewer ?? "mother");
  const [solo, setSolo] = useState(plan.solo ?? false);
  const demo = personas.find((persona) => persona.id === personaId);
  const accounts = [...(formReady ? [{ id: GUIDE_ID, label: "Twoje dane z formularza" }] : []), ...personas];

  const continueWithProfile = isClient && destination && currentPersona(plan);
  useEffect(() => {
    if (continueWithProfile && destination) router.replace(destination);
  }, [continueWithProfile, destination, router]);
  if (continueWithProfile) return null;

  return (
    <main id="main-content" tabIndex={-1} className="page max-w-3xl">
      {formReady && !destination ? <BackLink href="/nowa-os">Zmień odpowiedzi</BackLink> : <BackLink href="/">Strona główna</BackLink>}
      <PageTitle lead={destination ? "Wybierz profil, aby otworzyć wybraną sprawę z danymi rodziny." : formReady ? "Zaloguj się przez mObywatel (symulacja), aby zobaczyć swoją oś czasu i listę zadań." : "Wybierz przykładowy profil, aby przejść przez symulację logowania przez mObywatel."}>
        Logowanie demonstracyjne
      </PageTitle>
      <form
        className="flex flex-col items-start gap-5"
        onSubmit={(event) => {
          event.preventDefault();
          logIn(personaId, viewer, solo);
          router.replace(destination ?? "/plan");
        }}
      >
        <fieldset className="w-full min-w-0">
          <legend className="mb-2 font-bold">Przykładowa sprawa</legend>
          <div className="grid gap-2">
            {accounts.map((p) => (
              <RadioOption key={p.id} name="persona" checked={personaId === p.id} onChange={() => setPersonaId(p.id)} className="p-3">
                <strong className="block">{p.label}</strong>
              </RadioOption>
            ))}
          </div>
        </fieldset>
        {demo && <>
          <RadioGroup label="Jako kto się logujesz?" value={viewer} onChange={setViewer}
            options={PARENTS.map((parent) => [parent, demo.parents[parent].name])} />
          <Checkbox title="Prowadzę sprawę samodzielnie" checked={solo} onChange={() => setSolo(!solo)} />
        </>}
        <Button type="submit" disabled={!isClient}>Zaloguj się</Button>
      </form>
    </main>
  );
}
