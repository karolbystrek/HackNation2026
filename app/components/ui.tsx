import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import type { EventWho } from "@/lib/events";

const buttonBase = "inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-full px-6 font-extrabold transition-colors disabled:cursor-not-allowed disabled:opacity-50";
const buttonVariants = {
  primary: "bg-brand text-white hover:bg-brand-deep",
  outline: "border-2 border-brand bg-white text-brand hover:bg-brand-soft",
  link: "min-h-11 px-0 text-brand underline-offset-4 hover:underline",
};
type ButtonVariant = keyof typeof buttonVariants;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: ButtonVariant }) {
  return <button type="button" className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: ButtonVariant }) {
  return <Link className={`${buttonBase} ${buttonVariants[variant]} ${className}`} {...props} />;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="self-start py-2 font-extrabold text-brand hover:underline">
      ← {children}
    </Link>
  );
}

/** Option pill used for single-choice groups. */
export function Pill({ active, className = "", ...props }: ComponentProps<"button"> & { active: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={`min-h-11 cursor-pointer rounded-full px-4 font-extrabold ${active ? "border-2 border-ink bg-ink text-white" : "border border-stone bg-white text-ink hover:bg-sand"} ${className}`}
      {...props}
    />
  );
}

export function PillGroup<T extends string | number>({ label, options, value, onChange }: { label?: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-2">
      {label && <span className="font-extrabold">{label}</span>}
      <div className="flex flex-wrap gap-1.5">
        {options.map(([v, text]) => (
          <Pill key={String(v)} active={v === value} onClick={() => onChange(v)}>
            {text}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export function Field({ label, hint, className = "", ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1.5 font-extrabold ${className}`}>
      <span>
        {label} {hint && <span className="font-normal text-muted">{hint}</span>}
      </span>
      <input className="min-h-12 w-full rounded-xl border-2 border-stone bg-white px-3.5 text-[17px] text-ink focus:border-brand focus:outline-none" {...props} />
    </label>
  );
}

export function Checkbox({ checked, onChange, title, children, accent = "brand" }: { checked: boolean; onChange: () => void; title: ReactNode; children?: ReactNode; accent?: "brand" | "dad" }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 leading-snug">
      <input type="checkbox" checked={checked} onChange={onChange} className={`mt-0.5 size-5.5 shrink-0 ${accent === "dad" ? "accent-dad" : "accent-brand"}`} />
      <span>
        <b>{title}</b>
        {children && (
          <>
            <br />
            <span className="text-muted">{children}</span>
          </>
        )}
      </span>
    </label>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-[20px] bg-white p-5 sm:p-[22px] ${className}`} {...props} />;
}

export function WarningBox({ title = "Uważajcie na to", items }: { title?: string; items: ReactNode[] }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-warn-soft px-[18px] py-4 text-warn">
      <div className="text-base font-black">{title}</div>
      {items.map((item, i) => (
        <div key={i} className="text-[15px] leading-relaxed">
          {item}
        </div>
      ))}
    </div>
  );
}

const whoChip: Record<EventWho, string> = {
  mother: "bg-mom-chip text-brand-deep",
  father: "bg-dad-chip text-dad-deep",
  both: "bg-both-chip text-ink",
};

export function WhoChip({ who, label }: { who: EventWho; label: string }) {
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${whoChip[who]}`}>{label}</span>;
}

export function Chip({ children, tone = "sand" }: { children: ReactNode; tone?: "sand" | "brand" | "solid" }) {
  const tones = { sand: "bg-sand text-muted", brand: "bg-brand-soft text-brand-deep", solid: "bg-brand text-white" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-extrabold ${tones[tone]}`}>{children}</span>;
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <div>
      <h1 className="text-[28px] leading-tight font-black sm:text-[34px]">{children}</h1>
      {lead && <p className="mt-2 leading-relaxed text-muted">{lead}</p>}
    </div>
  );
}
