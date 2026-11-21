import type { Task } from "@/lib/calc/tasks";

// RFC 5545 text values must escape backslashes, commas and semicolons.
const esc = (text: string) => text.replace(/[\\,;]/g, "\\$&");

/** All-day calendar events for every task with a due date, as an .ics file body. */
export function tasksToIcs(tasks: Task[]): string {
  const events = tasks
    .filter((t) => t.due)
    .map((t) => {
      const day = t.due!.replaceAll("-", "");
      return ["BEGIN:VEVENT", `UID:${t.id}@przewodnik-rodzica`, `DTSTAMP:${day}T000000Z`, `DTSTART;VALUE=DATE:${day}`, `SUMMARY:${esc(t.title)}`, `DESCRIPTION:${esc(t.description)}`, "END:VEVENT"].join("\r\n");
    });
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Przewodnik Rodzica//PL", ...events, "END:VCALENDAR"].join("\r\n");
}
