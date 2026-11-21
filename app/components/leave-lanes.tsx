import { PARENTS, type LeaveResult } from "@/lib/calc/leave";
import { diffDays, formatDate, parseIso } from "@/lib/dates";

const COLORS = {
  mother: { maternity: "bg-brand", parental: "bg-brand-mid", label: "text-brand" },
  father: { maternity: "bg-dad", parental: "bg-dad-mid", label: "text-dad" },
};

/** Two horizontal bars (one per parent) showing leave periods on a shared time axis. */
export function LeaveLanes({ result, names, endLabel }: { result: LeaveResult; names: Record<"mother" | "father", string>; endLabel?: string }) {
  const start = parseIso(result.start);
  const end = parseIso(result.end);
  const span = start && end ? Math.max(1, diffDays(start, end)) : 1;

  return (
    <div className="flex flex-col gap-1.5">
      {PARENTS.map((parent) => (
        <div key={parent} className="flex items-center gap-2.5">
          <span className={`w-16 shrink-0 text-[13px] font-extrabold ${COLORS[parent].label}`}>{names[parent]}</span>
          <div className="relative h-6 grow overflow-hidden rounded-md bg-sand">
            {start &&
              result.periods[parent].map((p) => (
                <div
                  key={p.from + p.label}
                  title={`${p.label}: ${formatDate(p.from)} – ${formatDate(p.to)}`}
                  className={`absolute inset-y-0 ${COLORS[parent][p.kind]}`}
                  style={{
                    left: `${(diffDays(start, parseIso(p.from)!) / span) * 100}%`,
                    width: `${(diffDays(parseIso(p.from)!, parseIso(p.to)!) / span) * 100}%`,
                    backgroundImage: p.workFraction > 0 ? "repeating-linear-gradient(45deg,transparent 0,transparent 6px,rgba(255,255,255,.55) 6px,rgba(255,255,255,.55) 9px)" : undefined,
                  }}
                />
              ))}
          </div>
        </div>
      ))}
      <div className="flex justify-between gap-2 pl-[74px] text-[13px] text-muted">
        <span>{formatDate(result.start)}</span>
        <span>{endLabel ?? formatDate(result.end)}</span>
      </div>
    </div>
  );
}
