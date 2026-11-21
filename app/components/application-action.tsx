import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import type { Task } from "@/lib/calc/tasks";
import { formatDate } from "@/lib/dates";
import type { Submission } from "@/lib/plan-store";

/** "Fill in" button for a task with a form, or the confirmation once it was sent. */
export function ApplicationAction({ task, submission }: { task: Task; submission?: Submission }) {
  if (submission) {
    return (
      <p className="text-sm">
        Wysłano {formatDate(submission.sentAt.slice(0, 10))}, nr <span className="font-mono">{submission.number}</span>.{" "}
        <Link href={`/wnioski/${task.id}`} className="text-link">Zobacz wysłany wniosek</Link>
      </p>
    );
  }
  return task.form && !task.done ? <ButtonLink href={`/wnioski/${task.id}`} className="self-start">Wypełnij wniosek</ButtonLink> : null;
}
