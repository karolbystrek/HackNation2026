"use client";

import { useRouter } from "next/navigation";
import { LeaveLanes } from "@/components/leave-lanes";
import { BackLink, Button, Card, Chip, PageTitle, WarningBox } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Variants() {
  const { persona, params, variants, plan, names } = useFamily();
  const router = useRouter();
  const raise = plan.events.find((e) => e.type === "salary");

  return (
    <main id="main-content" tabIndex={-1} className="page">
      <BackLink href="/plan">Wróć do osi czasu</BackLink>
      <PageTitle
        lead={`Policzyliśmy 3 warianty z Waszych zarobków${raise ? ` (z uwzględnieniem: ${raise.title})` : ""}. „Tracicie” to różnica między podstawą zasiłku a zasiłkiem, przed podatkiem.`}
      >
        Narodziny dziecka: kto idzie na urlop?
      </PageTitle>

      {variants.map((v) => {
        const active = plan.chosenVariant === v.key;
        return (
          <Card key={v.key} className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h2 className="grow text-[22px] font-bold">Wariant {v.key} · {v.name}</h2>
              <Chip>{v.tag}</Chip>
            </div>

            <LeaveLanes
              result={v.result}
              names={names}
              endLabel={`${names[v.lastReturn.who]} wraca ${formatDate(v.lastReturn.date)}`}
            />

            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-2.5">
              {[
                ["Tracicie względem pensji", `ok. ${formatPln(Math.round(v.incomeLoss / 10) * 10)}`],
                ["Zasiłki łącznie", `ok. ${formatPln(Math.round(v.result.familyTotal / 10) * 10)}`],
                ["Dziecko pod opieką rodzica", `${v.childcareWeeks} tyg.`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-sm bg-secondary px-3.5 py-3">
                  <div className="text-[13px] text-muted-foreground">{label}</div>
                  <div className="text-xl font-bold sm:text-2xl">{value}</div>
                </div>
              ))}
            </div>

            <ul className="flex flex-col gap-1.5">
              {v.points.map((pt) => (
                <li key={pt.text} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <span className="w-5 shrink-0 text-center font-bold text-primary">{pt.sign}</span>
                  <span>{pt.text}</span>
                </li>
              ))}
            </ul>

            <Button
              variant={active ? "primary" : "outline"}
              className="min-h-[50px] self-start"
              onClick={() => {
                updatePlan((s) => ({ ...s, chosenVariant: v.key }));
                router.push("/zadania");
              }}
            >
              {active ? "Wybrany wariant ✓" : `Wybieram wariant ${v.key}`}
            </Button>
          </Card>
        );
      })}

      <WarningBox
        items={[
          `Każde z Was ma ${params.parentalOwnWeeks} tygodni urlopu rodzicielskiego tylko dla siebie. Jeśli ich nie wykorzystacie, przepadają – nie można ich przekazać drugiemu rodzicowi.`,
          `Termin porodu ${formatDate(persona.dueDate)} – daty urlopów przesuną się razem z faktyczną datą urodzenia.`,
        ]}
      />
    </main>
  );
}
