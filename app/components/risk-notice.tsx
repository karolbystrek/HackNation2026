import { Info } from "lucide-react";
import knowledge from "@/lib/guide/knowledge.json";
import { cn } from "@/lib/utils";

export type RiskId = keyof typeof knowledge.risks;

/** "Ważne" notice next to the field or action that triggers a risk from knowledge/risks.json. */
export function RiskNotice({ ids, className }: { ids: (RiskId | false | null | undefined)[]; className?: string }) {
  const risks = ids.filter((id): id is RiskId => !!id).map((id) => ({ id, ...knowledge.risks[id] }));
  if (!risks.length) return null;
  return (
    <div role="note" className={cn("flex min-w-0 gap-3 border-l-4 border-action bg-warning-soft p-4", className)}>
      <Info aria-hidden strokeWidth={1.75} className="mt-0.5 size-5 shrink-0 text-action-foreground" />
      <ul className="flex max-w-[70ch] flex-col gap-3">
        {risks.map((r) => (
          <li key={r.id} className="flex flex-col gap-1">
            <p className="font-bold">Ważne: {r.title_pl}</p>
            <p className="text-muted-foreground">{r.consequence_pl}</p>
            <p><span className="font-semibold">Jak uniknąć:</span> {r.prevention_pl}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
