import { diffDays, parseIso, shiftIso } from "@/lib/dates";
import type { FamilyTimelineEntry } from "@/lib/family-timeline";

function isUrgent(entry: FamilyTimelineEntry, today: string) {
  return entry.kind === "application" && !entry.estimated && !!entry.due &&
    ["ready", "blocked", "late"].includes(entry.status) && entry.due <= shiftIso(today, 7);
}

const relativeDate = new Intl.RelativeTimeFormat("pl-PL");

export function deadlineNotice(entry: FamilyTimelineEntry, today: string) {
  if (!entry.due || !isUrgent(entry, today)) return null;
  const days = diffDays(parseIso(today)!, parseIso(entry.due)!);
  const relative = relativeDate.format(days, "day");
  return {
    compactLabel: days < 0 ? "po terminie" : days === 0 ? "dzisiaj" : relative,
    label: days < 0 ? "Po terminie" : days === 0 ? "Termin dzisiaj" : `Termin ${relative}`,
    critical: days <= 0,
  };
}

export function attentionEntries(entries: FamilyTimelineEntry[], today: string) {
  return entries.filter((entry) =>
    entry.status === "review" || isUrgent(entry, today) ||
    (entry.status === "ready" && (!entry.due || entry.due <= shiftIso(today, 30)))
  ).sort((a, b) => Number(isUrgent(b, today)) - Number(isUrgent(a, today)) || Number(a.status === "blocked") - Number(b.status === "blocked"));
}
