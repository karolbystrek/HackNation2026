"use client";

// Renders question text with [phrase](term.id) markup as phrases that open a glossary popup.
import { CircleHelp } from "lucide-react";
import { Popover, PopoverClose, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from "@/components/ui/popover";
import { TERM } from "@/lib/guide/tree";
import knowledge from "@/lib/guide/knowledge.json";

const glossary: Record<string, { term_pl: string; definition_pl: string }> = knowledge.glossary;

export function TermText({ text }: { text: string }) {
  const parts = text.split(TERM);
  // split with two capture groups yields [text, phrase, id, text, phrase, id, ..., text]
  return parts.map((part, i) => {
    if (i % 3 === 0) return part;
    if (i % 3 === 2) return null;
    const term = glossary[parts[i + 1]];
    if (!term) return part;
    return (
      // A click inside a <label> would otherwise focus the input or toggle the option.
      <span key={i} onClick={(e) => e.preventDefault()}>
        <Popover>
          <PopoverTrigger openOnHover delay={200} className="inline cursor-help rounded-sm text-left underline decoration-primary decoration-dotted decoration-2 underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
            {part}
            <CircleHelp aria-hidden="true" className="ml-1 inline size-[0.9em] align-[-0.1em] text-primary" />
            <span className="sr-only"> – wyjaśnienie</span>
          </PopoverTrigger>
          <PopoverContent align="start" className="text-left text-base font-normal leading-normal">
            <PopoverTitle className="text-lg first-letter:uppercase">{term.term_pl}</PopoverTitle>
            <PopoverDescription>{term.definition_pl}</PopoverDescription>
            <PopoverClose className="self-start font-bold text-primary underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
              Zamknij
            </PopoverClose>
          </PopoverContent>
        </Popover>
      </span>
    );
  });
}
