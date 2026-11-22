import type { MouseEvent } from "react";

/** Opens the timeline entry a `#timeline-<id>` hash points to. */
export function revealEntry(hash: string) {
  const entry = document.getElementById(hash.slice(1));
  if (!(entry instanceof HTMLDetailsElement)) return;
  entry.open = true;
  return entry;
}

// Instant jump for users who asked the OS for less motion.
export const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";

/** Link handler that opens and scrolls to the entry even when its hash is already in the URL. */
export function openRelated(event: MouseEvent<HTMLAnchorElement>) {
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const { hash } = event.currentTarget;
  const entry = revealEntry(hash);
  if (!entry) return;
  event.preventDefault();
  if (window.location.hash !== hash) window.history.pushState(null, "", hash);
  // Focus first: Safari stops a smooth scroll when focus moves during it.
  entry.querySelector("summary")?.focus({ preventScroll: true });
  entry.scrollIntoView({ block: "start", behavior: scrollBehavior() });
}
