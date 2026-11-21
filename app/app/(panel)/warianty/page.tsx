"use client";

import { useRouter } from "next/navigation";
import { LeaveLanes } from "@/components/leave-lanes";
import { BackLink, Button, PageTitle, WarningBox } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { formatPln } from "@/lib/format";
import { updatePlan } from "@/lib/plan-store";
import { useFamily } from "@/lib/use-family";

export default function Variants() {
  const { persona, params, variants, plan, names } = useFamily();
  const router = useRouter();
  const raise = plan.events.find((e) => e.type === "salary");

  return (
    <main className="mx-auto flex w-full max-w-[980px] flex-col gap-5 px-5 pt-8 pb-12">
      <BackLink href="/plan">Wróć do osi czasu</BackLink>
      <PageTitle
        lead={`Policzyliśmy 3 warianty z Waszych zarobków${raise ? ` (z uwzględnieniem: ${raise.title})` : ""}. „Tracicie” to różnica między podstawą zasiłku a zasiłkiem, przed podatkiem.`}
      >
        Narodziny dziecka: kto idzie na urlop?
      </PageTitle>

      {variants.map((v) => {
        const active = plan.chosenVariant === v.key;
        return (
          <section key={v.key} className={`flex flex-col gap-4 rounded-[20px] bg-white p-5 sm:p-[22px] ${active ? "outline-3 outline-brand" : ""}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-ink text-lg font-black text-white">{v.key}</span>
              <h2 className="grow text-[22px] font-black">{v.name}</h2>
              <span className="rounded-full bg-brand-soft px-3 py-1 text-[13px] font-extrabold text-brand-deep">{v.tag}</span>
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
                <div key={label} className="rounded-xl bg-paper px-3.5 py-3">
                  <div className="text-[13px] text-muted">{label}</div>
                  <div className="text-xl font-black sm:text-2xl">{value}</div>
                </div>
              ))}
            </div>

            <ul className="flex flex-col gap-1.5">
              {v.points.map((pt) => (
                <li key={pt.text} className="flex gap-2.5 text-[15px] leading-relaxed">
                  <span className={`flex size-[22px] shrink-0 items-center justify-center rounded-full text-[15px] font-black ${pt.sign === "+" ? "bg-brand-soft text-brand-deep" : "bg-warn-soft text-warn"}`}>{pt.sign}</span>
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
          </section>
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
