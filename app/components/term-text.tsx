"use client";

// Renders question text with [phrase](term.id) markup as phrases that open a glossary popup.
import { CircleHelp } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { TERM } from "@/lib/guide/tree";
import knowledge from "@/lib/guide/knowledge.json";

const termSources: Record<string, string> = {
  "term.wariant_81_5": "https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-macierzynski/wysokosc",
  "term.okres_wyczekiwania": "https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/prawo-do-zasilku-i-okres-przyslugiwania",
  "term.nieprzerwane_ubezpieczenie": "https://www.zus.pl/pl/swiadczenia/zasilki/zasilek-chorobowy/z-ubezpieczenia-chorobowego/prawo-do-zasilku-i-okres-przyslugiwania",
};

const glossary: Record<string, { term_pl: string; definition_pl: string }> = knowledge.glossary;

export function TermText({ text }: { text: string }) {
  const parts = text.split(TERM);
  // split with two capture groups yields [text, phrase, id, text, phrase, id, ..., text]
  return parts.map((part, i) => {
    if (i % 3 === 0) return part;
    if (i % 3 === 2) return null;
    const source = termSources[parts[i + 1]];
    const term = glossary[parts[i + 1]];
    if (!term) return part;
    return (
      <HelpPopover key={i} trigger={part} title={term.term_pl}>
        {term.definition_pl}
        {source && <a className="text-link" href={source}>Oficjalne wyjaśnienie ZUS</a>}
      </HelpPopover>
    );
  });
}

/** Glossary-style popup. Without a trigger text it renders just the help icon (used for answer hints). */
export function HelpPopover({ trigger, title, children }: { trigger?: ReactNode; title: ReactNode; children: ReactNode }) {
  return (
    // A click inside a <label> would otherwise focus the input or toggle the option.
    <span onClick={(e) => { if ((e.target as HTMLElement).closest("button")) e.preventDefault(); }}>
      <Popover>
        <PopoverTrigger openOnHover delay={200} className={cn("inline cursor-help rounded-sm text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring", trigger && "underline decoration-primary decoration-dotted decoration-2 underline-offset-4")}>
          {trigger}
          <CircleHelp aria-hidden="true" className="ml-1 inline size-[0.9em] align-[-0.1em] text-primary" />
          <span className="sr-only">{trigger ? " – wyjaśnienie" : "Wyjaśnienie"}</span>
        </PopoverTrigger>
        <PopoverContent align="start" className="text-left text-base font-normal leading-normal">
          <PopoverTitle className="text-lg first-letter:uppercase">{title}</PopoverTitle>
          <PopoverDescription>{children}</PopoverDescription>
          <PopoverClose className="self-start font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            Zamknij
          </PopoverClose>
        </PopoverContent>
      </Popover>
    </span>
  );
}
