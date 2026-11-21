import { PARENTS, type LeaveResult } from "@/lib/calc/leave";
import { addDays, diffDays, formatDate, parseIso } from "@/lib/dates";

const periodColors = { maternity: "bg-primary", parental: "bg-chart-secondary" } as const;

export function LeaveLanes({ result, names, endLabel }: { result: LeaveResult; names: Record<"mother" | "father", string>; endLabel?: string }) {
  const start = parseIso(result.start);
  const end = parseIso(result.end);
  const span = start && end ? Math.max(1, diffDays(start, end)) : 1;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {PARENTS.map((parent) => (
        <div key={parent} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-center gap-3">
          <span className="text-sm font-bold">{names[parent]}</span>
          <div className="relative h-5 overflow-hidden rounded-sm bg-secondary" aria-hidden="true">
            {start && result.periods[parent].map((period) => (
              <div
                key={period.from + period.label}
                className={`absolute inset-y-0 ${periodColors[period.kind]}`}
                style={{
                  left: `${(diffDays(start, parseIso(period.from)!) / span) * 100}%`,
                  width: `${(diffDays(parseIso(period.from)!, parseIso(period.to)!) / span) * 100}%`,
                }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
        <span>{formatDate(result.start)}</span>
        <span>{endLabel ?? formatDate(result.end)}</span>
      </div>
      <details>
        <summary className="text-link min-h-11 cursor-pointer content-center">Daty urlopów</summary>
        <dl className="space-y-2 pb-2 text-sm">
          {PARENTS.map((parent) => (
            <div key={parent}>
              <dt className="font-bold">{names[parent]}</dt>
              {result.periods[parent].length === 0 && <dd>Bez urlopu w tym planie.</dd>}
              {result.periods[parent].map((period) => (
                <dd key={period.from + period.label}>
                  <span className="block">{period.label}{period.workFraction > 0 && " z pracą na część etatu"}</span>
                  <span className="block text-muted-foreground">{formatDate(period.from)} – {formatDate(addDays(parseIso(period.to)!, -1))}</span>
                </dd>
              ))}
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
