import { LoaderCircle } from "lucide-react";

export function PageSpinner({ label }: { label: string }) {
  return (
    <div role="status" className="grid place-items-center py-12">
      <LoaderCircle aria-hidden="true" className="size-7 text-primary motion-safe:animate-spin" />
      <span className="sr-only">{label}</span>
    </div>
  );
}
