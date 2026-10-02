import { derivePlatformPresentation } from "./realtime-presentation";

export function RealtimePlatform({ scheduled, actual, compact = false }: { scheduled?: string | null; actual?: string | null; compact?: boolean }) {
  const state = derivePlatformPresentation(scheduled, actual);
  return <span className="realtime-platform" data-changed={state.changed || undefined} role="img" aria-label={state.label}>
    <span aria-hidden="true">{!compact && "Gleis "}{state.changed && <del>{state.scheduled}</del>}<span className="realtime-platform__actual">{state.actual ?? "–"}</span></span>
  </span>;
}
