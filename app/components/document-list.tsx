import type { RequiredDocument } from "@/lib/journey";

export function DocumentList({ documents }: { documents: RequiredDocument[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {documents.map(({ id, title, href, instruction }) => (
        <li key={id}>
          {href ? <a className="text-link" href={href}>{title}</a> : title}
          {instruction && <span className="block text-sm text-muted-foreground">{instruction}</span>}
        </li>
      ))}
    </ul>
  );
}
