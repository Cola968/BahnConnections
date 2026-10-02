import { derivePlatformPresentation, deriveRealtimePresentation, formatRealtimeTime, realtimeAccessibleLabel, realtimeStatusLabel, type RealtimeInput } from "./realtime-presentation";

/** Leaflet accepts DOM nodes. Use textContent, never interpolate provider text as HTML. */
export function realtimeTooltip(label: string, input: RealtimeInput, platform?: { scheduled?: string | null; actual?: string | null }, cancellationLabel?: string) {
  const state = deriveRealtimePresentation(input);
  const node = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = label;
  node.appendChild(title);
  const row = document.createElement("span");
  row.className = `realtime-time realtime-time--${state.kind}`;
  row.dataset.tone = state.tone;
  row.setAttribute("role", "img");
  row.setAttribute("aria-label", realtimeAccessibleLabel(state, cancellationLabel));
  const pair = document.createElement("span");
  pair.className = "realtime-time__pair";
  pair.setAttribute("aria-hidden", "true");
  if (state.changed && state.scheduled) {
    const planned = document.createElement("del");
    planned.className = "realtime-time__planned";
    planned.textContent = formatRealtimeTime(state.scheduled);
    pair.appendChild(planned);
  }
  const current = document.createElement(state.kind === "cancelled" ? "strong" : "time");
  current.className = state.kind === "cancelled" ? "realtime-time__status" : "realtime-time__actual";
  current.textContent = state.kind === "cancelled" ? "Entfällt" : formatRealtimeTime(state.kind === "schedule" ? state.scheduled ?? state.actual : state.actual ?? state.scheduled);
  pair.appendChild(current);
  row.appendChild(pair);
  if (state.kind !== "cancelled") {
    const delta = document.createElement("small");
    delta.className = "realtime-time__delta";
    delta.setAttribute("aria-hidden", "true");
    delta.textContent = realtimeStatusLabel(state);
    row.appendChild(delta);
  }
  node.appendChild(document.createElement("br"));
  node.appendChild(row);
  if (platform) {
    const track = derivePlatformPresentation(platform.scheduled, platform.actual);
    if (track.actual) {
      const text = document.createElement("div");
      text.textContent = track.label;
      node.appendChild(text);
    }
  }
  return node;
}
