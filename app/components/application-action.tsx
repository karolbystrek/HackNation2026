import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import type { Task } from "@/lib/calc/tasks";
import type { Submission } from "@/lib/plan-store";

const receiptDate = new Intl.DateTimeFormat("pl-PL", { dateStyle: "short", timeZone: "Europe/Warsaw" });

export function ApplicationReceipt({ id, submission, origin, title }: {
  id: string; submission: Submission; origin: "plan" | "wnioski"; title?: string;
}) {
  return (
    <div className="space-y-2">
      {title && <h4 className="font-bold">{title}</h4>}
      <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
        <div><dt className="text-muted-foreground">Zapisano w symulacji</dt><dd><time dateTime={submission.sentAt}>{receiptDate.format(new Date(submission.sentAt))}</time></dd></div>
        <div><dt className="text-muted-foreground">Adresat</dt><dd>{submission.recipient}</dd></div>
        <div><dt className="text-muted-foreground">Numer potwierdzenia</dt><dd className="break-all font-mono">{submission.number}</dd></div>
      </dl>
      <Link href={`/wnioski/${id}?z=${origin}`} className="text-link inline-flex min-h-11 items-center"
        aria-label={title ? `Zobacz wypełniony formularz – ${title}` : undefined}>Zobacz wypełniony formularz</Link>
    </div>
  );
}

/** Opens the form or its saved confirmation. */
export function ApplicationAction({ task, submission, origin, preview }: { task: Task; submission?: Submission; origin: "plan" | "wnioski"; preview?: boolean }) {
  if (submission) return <ApplicationReceipt id={task.id} submission={submission} origin={origin} />;
  return task.form && !task.done ? <ButtonLink href={`/wnioski/${task.id}?z=${origin}`} className="self-start">{preview ? "Zobacz formularz" : "Wypełnij wniosek"}</ButtonLink> : null;
}
