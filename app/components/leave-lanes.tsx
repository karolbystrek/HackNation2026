import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { formatPln } from "@/lib/format";
import { PARENTS, type LeaveResult } from "@/lib/calc/leave";
import { addDays, diffDays, formatDate, parseIso } from "@/lib/dates";

const periodColors = { maternity: "bg-primary", parental: "bg-chart-secondary", supplementary: "bg-primary", paternity: "bg-primary" } as const;

export function LeaveLanes({ result, names, endLabel }: { result: LeaveResult; names: Record<"mother" | "father", string>; endLabel?: string }) {
  const start = parseIso(result.start);
  const end = parseIso(result.end);
  const span = start && end ? Math.max(1, diffDays(start, end)) : 1;

  return (
    <div className="flex min-w-0 flex-col gap-2">
      {PARENTS.map((parent) => (
        <div key={parent} className="grid grid-cols-[minmax(0,6rem)_minmax(0,1fr)] items-center gap-3">
          <span className="text-sm font-bold">{names[parent]}</span>
          <div className="relative h-11 rounded-sm bg-secondary">
            {start && result.periods[parent].map((period) => {
              const from = parseIso(period.from)!;
              const to = parseIso(period.to)!;
              const label = period.label + (period.workFraction > 0 ? " z pracą na część etatu" : "");
              const dates = `${formatDate(from)} – ${formatDate(addDays(to, -1))}`;
              return (
                <Popover key={period.from + period.label}>
                  <PopoverTrigger
                    openOnHover
                    aria-label={`${names[parent]}, ${label}, ${dates}`}
                    className={`absolute inset-y-0 cursor-pointer rounded-sm border-r border-background hover:brightness-90 focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${periodColors[period.kind]}`}
                    style={{
                      left: `${(diffDays(start, from) / span) * 100}%`,
                      width: `${(diffDays(from, to) / span) * 100}%`,
                    }}
                  />
                  <PopoverContent side="top">
                    <PopoverTitle>{names[parent]} · {label}</PopoverTitle>
                    <PopoverDescription>{dates}</PopoverDescription>
                    {period.total > 0 && <p>Szacowany zasiłek brutto: {formatPln(period.total)}</p>}
                  </PopoverContent>
                </Popover>
              );
            })}
          </div>
        </div>
      ))}
      <div className="ml-[6.75rem] flex flex-wrap justify-between gap-x-3 text-sm text-muted-foreground">
        <span>{formatDate(result.start)}</span>
        <span>{endLabel ?? formatDate(end && start && end > start ? addDays(end, -1) : end)}</span>
      </div>
      <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm" aria-label="Legenda">
        <li className="flex items-center gap-2"><span aria-hidden className={`size-3 rounded-xs ${periodColors.maternity}`} />Macierzyński, uzupełniający, ojcowski</li>
        <li className="flex items-center gap-2"><span aria-hidden className={`size-3 rounded-xs ${periodColors.parental}`} />Rodzicielski</li>
      </ul>
    </div>
  );
}
