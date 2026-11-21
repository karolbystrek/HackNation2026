import Link from "next/link";
import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";

export { Button } from "@/components/ui/button";

type LinkVariant = Parameters<typeof buttonVariants>[0];

export function ButtonLink({ variant, className, ...props }: ComponentProps<typeof Link> & Pick<NonNullable<LinkVariant>, "variant">) {
  return <Link className={cn(buttonVariants({ variant }), className)} {...props} />;
}

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="text-link min-h-11 content-center self-start font-bold">
      <span aria-hidden="true">← </span>{children}
    </Link>
  );
}

export function RadioOption({ children, className, ...props }: ComponentProps<"input">) {
  return (
    <label className={cn("flex min-h-11 cursor-pointer items-start gap-3 rounded-sm border border-input px-3 py-2 hover:bg-secondary has-checked:border-primary has-checked:bg-secondary", className)}>
      <input type="radio" className="mt-1 size-4 shrink-0" {...props} />
      <span>{children}</span>
    </label>
  );
}

export function RadioGroup<T extends string | number>({ label, options, value, onChange }: { label: string; options: [T, string][]; value: T; onChange: (v: T) => void }) {
  const name = useId();
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 font-bold">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(([v, text]) => (
          <RadioOption key={v} name={name} checked={v === value} onChange={() => onChange(v)}>
            {text}
          </RadioOption>
        ))}
      </div>
    </fieldset>
  );
}

export function Field({ label, hint, className, id, "aria-describedby": describedBy, ...props }: ComponentProps<"input"> & { label: ReactNode; hint?: ReactNode }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label htmlFor={inputId} className="font-bold">{label}</label>
      {hint && <p id={hintId} className="text-sm text-muted-foreground">{hint}</p>}
      <input id={inputId} aria-describedby={[hintId, describedBy].filter(Boolean).join(" ") || undefined} className="min-h-11 w-full min-w-0 rounded-sm border border-input bg-background px-3 py-2 aria-invalid:border-destructive" {...props} />
    </div>
  );
}

export function Checkbox({ checked, onChange, title, children }: { checked: boolean; onChange: () => void; title: ReactNode; children?: ReactNode }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3">
      <input type="checkbox" checked={checked} onChange={onChange} className="mt-1 size-5 shrink-0" />
      <span>
        <strong className="block">{title}</strong>
        {children && <span className="text-muted-foreground">{children}</span>}
      </span>
    </label>
  );
}

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cn("min-w-0 border-t border-border py-4", className)} {...props} />;
}

export function Notice({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("min-w-0 border-l-4 border-primary bg-secondary p-4", className)} {...props} />;
}

export function WarningBox({ title = "Na co zwrócić uwagę", items }: { title?: string; items: ReactNode[] }) {
  if (!items.length) return null;
  return (
    <Notice>
      <p className="font-bold">{title}</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </Notice>
  );
}

export function Chip({ children }: { children: ReactNode }) {
  return <span className="inline-block rounded-sm bg-secondary px-2 py-0.5 text-sm text-muted-foreground">{children}</span>;
}

export function PageTitle({ children, lead }: { children: ReactNode; lead?: ReactNode }) {
  return (
    <div className="max-w-[70ch]">
      <h1 className="text-3xl leading-tight font-bold sm:text-4xl">{children}</h1>
      {lead && <p className="mt-3 text-lg text-muted-foreground">{lead}</p>}
    </div>
  );
}

export function ResultSummary({ label, value, children }: { label: string; value: ReactNode; children?: ReactNode }) {
  return (
    <Notice>
      <p className="font-bold">{label}</p>
      <p className="my-1 text-3xl leading-tight font-bold text-primary sm:text-4xl">{value}</p>
      {children && <div className="text-muted-foreground">{children}</div>}
    </Notice>
  );
}
