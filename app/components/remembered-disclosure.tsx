"use client";

import type { ComponentProps } from "react";
import { Disclosure } from "@/components/ui/disclosure";
import { usePlanDraft } from "@/lib/plan-store";

export function RememberedDisclosure({ section, ...props }: ComponentProps<typeof Disclosure> & { section: string }) {
  const [open, setOpen] = usePlanDraft(`sekcja/${section}`, false);
  return <Disclosure {...props} open={open} onToggle={(event) => {
    if (open !== event.currentTarget.open) setOpen(event.currentTarget.open);
  }} />;
}
