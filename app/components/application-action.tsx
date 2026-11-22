import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import type { Task } from "@/lib/calc/tasks";
import { formatDate } from "@/lib/dates";
import type { Submission } from "@/lib/plan-store";

/** "Fill in" button for a task with a form, or the confirmation once it was sent. */
export function ApplicationAction({ task, submission, origin, preview }: { task: Task; submission?: Submission; origin: "plan" | "wnioski"; preview?: boolean }) {
  if (submission) {
    return (
      <p className="text-sm">
        Zapisano w symulacji {formatDate(submission.sentAt.slice(0, 10))}, nr <span className="font-mono">{submission.number}</span>.{" "}
        <Link href={`/wnioski/${task.id}?z=${origin}`} className="text-link">Zobacz wynik symulacji</Link>
      </p>
    );
  }
  return task.form && !task.done ? <ButtonLink href={`/wnioski/${task.id}?z=${origin}`} className="self-start">{preview ? "Zobacz formularz" : "Wypełnij wniosek"}</ButtonLink> : null;
}
