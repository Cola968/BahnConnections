import { deriveRealtimePresentation, formatRealtimeTime, realtimeAccessibleLabel, realtimeStatusLabel, type RealtimeInput } from "./realtime-presentation";

type RealtimeTimeProps = RealtimeInput & {
  className?: string;
  showStatus?: boolean;
  compact?: boolean;
  cancellationLabel?: string;
};

export function RealtimeTime({ className = "", showStatus = false, compact = false, cancellationLabel, ...input }: RealtimeTimeProps) {
  const state = deriveRealtimePresentation(input);
  const current = state.kind === "schedule" ? state.scheduled ?? state.actual : state.actual ?? state.scheduled;
  return <span
    className={["realtime-time", `realtime-time--${state.kind}`, compact ? "realtime-time--compact" : "", className].filter(Boolean).join(" ")}
    data-tone={state.tone} data-severe={state.severe || undefined}
    role="img" aria-label={realtimeAccessibleLabel(state, cancellationLabel)}
  >
    <span className="realtime-time__pair" aria-hidden="true">
      {state.changed && state.scheduled && <del className="realtime-time__planned">{formatRealtimeTime(state.scheduled)}</del>}
      {state.kind === "cancelled"
        ? <strong className="realtime-time__status">Entfällt</strong>
        : <time className="realtime-time__actual" dateTime={current ?? undefined}>{formatRealtimeTime(current)}</time>}
    </span>
    {state.kind !== "cancelled" && (state.changed || state.kind === "unknown" || showStatus) && <small className="realtime-time__delta" aria-hidden="true">{realtimeStatusLabel(state)}</small>}
  </span>;
}
