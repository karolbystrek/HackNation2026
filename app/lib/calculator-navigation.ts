// Native history keeps calculator steps in the same Next.js route.
export function calculatorNavigate(change: (params: URLSearchParams) => void, back = false) {
  const url = new URL(window.location.href);
  const current = url.pathname + url.search;
  const saved = window.history.state?.calculator;
  const trail: string[] = saved?.current === current ? saved.trail : [];
  change(url.searchParams);
  const target = url.pathname + url.search;
  if (current === target) return;

  const previous = back ? trail.lastIndexOf(target) : -1;
  if (previous >= 0) {
    window.history.go(previous - trail.length);
    return;
  }
  const state = { calculator: { current: target, trail: back ? trail : [...trail, current] } };
  if (back) window.history.replaceState(state, "", url);
  else window.history.pushState(state, "", url);
}
