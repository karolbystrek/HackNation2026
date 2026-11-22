import type { Journey } from "@/lib/journey";

export function SituationForms({ ids, guidance, expanded = false }: {
  ids: readonly string[];
  guidance: Journey["formGuidance"];
  expanded?: boolean;
}) {
  const forms = ids.flatMap((id) => guidance?.[id] ? [guidance[id]] : []);
  if (!forms.length) return null;

  return (
    <ul className="list-disc space-y-2 pl-5 text-sm">
      {forms.map(({ title, summary, preparedBy }) => (
        <li key={title}>
          {title}
          {preparedBy && <span className="block text-muted-foreground">Wypełnia {preparedBy.toLowerCase()}.</span>}
          {expanded && <p className="mt-1 text-muted-foreground">{summary}</p>}
        </li>
      ))}
    </ul>
  );
}
