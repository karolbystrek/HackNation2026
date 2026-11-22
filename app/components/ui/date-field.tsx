"use client";

import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { cn } from "cn";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { formatDate } from "@/lib/dates";

type Props = {
  label: ReactNode;
  hint?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

// Calendar days are local midnight; the app stores "YYYY-MM-DD", so convert without time zones.
const pad = (n: number) => String(n).padStart(2, "0");
const toLocalIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
function fromIso(value?: string) {
  const m = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/.exec(value ?? "");
  return m ? new Date(+m[1], +m[2] - 1, m[3] ? +m[3] : 1) : undefined;
}

const triggerClass = "flex min-h-11 w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-sm border border-input bg-background px-3 py-2 text-left aria-invalid:border-destructive";

function FieldFrame({ label, hint, labelId, hintId, className, children }: { label: ReactNode; hint?: ReactNode; labelId: string; hintId?: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <span id={labelId} className="font-bold">{label}</span>
      {hint && <p id={hintId} className="text-sm text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

/** shadcn date picker (Popover + Calendar, Polish locale) that reads and writes ISO "YYYY-MM-DD". */
export function DateField({ label, hint, value, onChange, required, className, id, min, max, ...aria }: Props & { min?: string; max?: string }) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const hintId = hint ? `${labelId}-hint` : undefined;
  const selected = fromIso(value);
  const [from, to] = [fromIso(min), fromIso(max)];
  const year = new Date().getFullYear();

  return (
    <FieldFrame label={label} hint={hint} labelId={labelId} hintId={hintId} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          className={triggerClass}
          aria-labelledby={`${labelId} ${labelId}-value`}
          aria-describedby={[hintId, aria["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          aria-invalid={aria["aria-invalid"]}
          aria-required={required}
        >
          <span id={`${labelId}-value`} className={selected ? "" : "text-muted-foreground"}>{selected ? formatDate(value) : "Wybierz datę"}</span>
          <CalendarDays aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-primary" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-2">
          <Calendar
            mode="single"
            captionLayout="dropdown"
            selected={selected}
            defaultMonth={selected ?? from ?? to}
            startMonth={from ?? new Date(year - 90, 0)}
            endMonth={to ?? new Date(year + 5, 11)}
            disabled={[...(from ? [{ before: from }] : []), ...(to ? [{ after: to }] : [])]}
            onSelect={(day) => {
              if (day) onChange(toLocalIso(day));
              setOpen(false);
            }}
          />
          {selected && !required && (
            <button type="button" className="text-link min-h-11 self-start px-2" onClick={() => { onChange(""); setOpen(false); }}>Wyczyść datę</button>
          )}
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}

const monthName = new Intl.DateTimeFormat("pl-PL", { month: "long" });
const monthShort = new Intl.DateTimeFormat("pl-PL", { month: "short" });

/** Month picker in the same style, for "YYYY-MM" values. */
export function MonthField({ label, hint, value, onChange, required, className, id, ...aria }: Props) {
  const [open, setOpen] = useState(false);
  const labelId = useId();
  const hintId = hint ? `${labelId}-hint` : undefined;
  const selected = fromIso(value);
  const [year, setYear] = useState(selected?.getFullYear() ?? new Date().getFullYear());

  return (
    <FieldFrame label={label} hint={hint} labelId={labelId} hintId={hintId} className={className}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          className={triggerClass}
          aria-labelledby={`${labelId} ${labelId}-value`}
          aria-describedby={[hintId, aria["aria-describedby"]].filter(Boolean).join(" ") || undefined}
          aria-invalid={aria["aria-invalid"]}
          aria-required={required}
        >
          <span id={`${labelId}-value`} className={selected ? "" : "text-muted-foreground"}>
            {selected ? `${monthName.format(selected)} ${selected.getFullYear()}` : "Wybierz miesiąc"}
          </span>
          <CalendarDays aria-hidden strokeWidth={1.75} className="size-5 shrink-0 text-primary" />
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-3">
          <div className="flex items-center justify-between">
            <button type="button" aria-label="Poprzedni rok" className="grid size-11 cursor-pointer place-items-center rounded-sm hover:bg-secondary" onClick={() => setYear(year - 1)}><ChevronLeft aria-hidden className="size-5" /></button>
            <span className="font-bold" aria-live="polite">{year}</span>
            <button type="button" aria-label="Następny rok" className="grid size-11 cursor-pointer place-items-center rounded-sm hover:bg-secondary" onClick={() => setYear(year + 1)}><ChevronRight aria-hidden className="size-5" /></button>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 12 }, (_, m) => {
              const current = selected?.getFullYear() === year && selected.getMonth() === m;
              return (
                <button
                  key={m}
                  type="button"
                  aria-pressed={current}
                  aria-label={`${monthName.format(new Date(year, m))} ${year}`}
                  className={cn("min-h-11 cursor-pointer rounded-sm capitalize hover:bg-secondary", current && "bg-primary text-primary-foreground hover:bg-primary-hover")}
                  onClick={() => { onChange(`${year}-${pad(m + 1)}`); setOpen(false); }}
                >
                  {monthShort.format(new Date(year, m))}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </FieldFrame>
  );
}
