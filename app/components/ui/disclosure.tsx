import { ChevronDown } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";

export function Disclosure({ label, children, ...props }: ComponentProps<"details"> & { label: ReactNode }) {
  return (
    <details {...props}>
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 rounded-sm px-3 py-3 hover:bg-secondary sm:px-4 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">{label}</span>
        <ChevronDown aria-hidden="true" className="size-5 shrink-0 text-primary [details[open]>summary>&]:rotate-180 motion-safe:transition-transform" />
      </summary>
      {children}
    </details>
  );
}
