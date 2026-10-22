/** Reveal an explicit user action inside the panel, without scrolling the page. */
export function revealPanelContent(section: HTMLElement | null, priority?: HTMLElement | null) {
  const pane = section?.closest<HTMLElement>(".panel-body");
  if (!section || !pane) return;
  const bounds = pane.getBoundingClientRect();
  const start = section.getBoundingClientRect();
  const target = priority?.getBoundingClientRect();
  // A short landscape viewport cannot show the whole section. Prefer its controls.
  const anchor = target && target.bottom - start.top > pane.clientHeight - 16 ? target : start;
  pane.scrollTo({ top: Math.max(0, pane.scrollTop + anchor.top - bounds.top - 8), behavior: "instant" });
}
