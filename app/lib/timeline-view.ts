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
  return entries.filter((entry) => !entry.extra && (
    entry.status === "review" || isUrgent(entry, today) ||
    (entry.status === "ready" && (!entry.due || entry.due <= shiftIso(today, 30))))
  ).sort((a, b) => Number(isUrgent(b, today)) - Number(isUrgent(a, today)) || Number(a.status === "blocked") - Number(b.status === "blocked"));
}

/** Prefer the event that prompted the form, otherwise follow its prerequisites to the first event. */
export function applicationEventIds(entry: FamilyTimelineEntry, byId: ReadonlyMap<string, FamilyTimelineEntry>): string[] {
  const source = entry.relatedEventId ?? entry.trigger?.id;
  if (source) return [`event-${source}`];

  const visited = new Set([entry.id]);
  function events(ids: string[]): string[] {
    return ids.flatMap((id) => {
      if (visited.has(id)) return [];
      visited.add(id);
      const parent = byId.get(id);
      if (parent?.kind === "event") return [id];
      return events(parent?.requires ?? []);
    });
  }
  return events(entry.requires ?? []);
}
