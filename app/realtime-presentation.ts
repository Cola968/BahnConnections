/** BahnConnections product thresholds; these are not official operator colours. */
export type RealtimeKind = "schedule" | "on-time" | "minor-delay" | "delay" | "major-delay" | "early" | "cancelled" | "unknown";
export type RealtimeTone = "neutral" | "success" | "warning" | "danger";
export type RealtimeInput = {
  scheduled?: string | null;
  actual?: string | null;
  realtime?: boolean;
  cancelled?: boolean;
};
export type RealtimePresentation = {
  kind: RealtimeKind;
  tone: RealtimeTone;
  scheduled: string | null;
  actual: string | null;
  delayMinutes: number | null;
  changed: boolean;
  realtime: boolean;
  severe: boolean;
};

function validInstant(value?: string | null): string | null {
  return value && Number.isFinite(new Date(value).getTime()) ? value : null;
}

export function deriveRealtimePresentation(input: RealtimeInput): RealtimePresentation {
  const scheduled = validInstant(input.scheduled);
  const actual = validInstant(input.actual);
  const base: RealtimePresentation = {
    kind:"unknown", tone:"neutral", scheduled, actual, delayMinutes:null,
    changed:false, realtime:Boolean(input.realtime), severe:false,
  };
  if (input.cancelled) return { ...base, kind:"cancelled", tone:"danger", actual:null, changed:true, severe:true };
  if (!input.realtime) return { ...base, kind:scheduled || actual ? "schedule" : "unknown" };
  if (!scheduled || !actual) return base;
  const delayMinutes = Math.round((new Date(actual).getTime() - new Date(scheduled).getTime()) / 60_000);
  const kind: RealtimeKind = delayMinutes < 0 ? "early" : delayMinutes === 0 ? "on-time" : delayMinutes <= 5 ? "minor-delay" : delayMinutes < 15 ? "delay" : "major-delay";
  const tone: RealtimeTone = delayMinutes < 0 ? "warning" : delayMinutes <= 5 ? "success" : delayMinutes < 15 ? "warning" : "danger";
  return { ...base, kind, tone, delayMinutes, changed:delayMinutes !== 0, severe:delayMinutes >= 30 };
}

const formatter = new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" });
export function formatRealtimeTime(value?: string | null): string {
  return validInstant(value) ? formatter.format(new Date(value!)) : "–";
}

export function realtimeStatusLabel(state: RealtimePresentation): string {
  if (state.kind === "cancelled") return "Entfällt";
  if (state.kind === "schedule") return "Fahrplan";
  if (state.kind === "unknown") return "Keine Echtzeit";
  if (state.kind === "on-time") return "pünktlich";
  return state.delayMinutes! < 0 ? `${Math.abs(state.delayMinutes!)} Min. früher` : `+${state.delayMinutes} Min.`;
}

export function realtimeAccessibleLabel(state: RealtimePresentation, cancellationLabel = "Halt entfällt"): string {
  const planned = formatRealtimeTime(state.scheduled);
  // A schedule-only response must prefer the scheduled value even if an unconfirmed actual is present.
  const current = formatRealtimeTime(state.kind === "schedule" ? state.scheduled ?? state.actual : state.actual ?? state.scheduled);
  if (state.kind === "cancelled") return `${state.scheduled ? `Planmäßig ${planned} Uhr. ` : ""}${cancellationLabel}.`;
  if (state.kind === "unknown") return `${current === "–" ? "Zeit nicht verfügbar" : `${current} Uhr`}. Echtzeitinformation nicht vollständig verfügbar.`;
  if (state.kind === "schedule") return `${current} Uhr, Fahrplandaten.`;
  if (state.kind === "on-time") return `${current} Uhr, pünktlich mit bestätigter Echtzeit.`;
  const delta = state.delayMinutes!;
  return `Planmäßig ${planned} Uhr, aktuell ${current} Uhr, ${Math.abs(delta)} Minuten ${delta < 0 ? "früher" : "Verspätung"}.`;
}

export function derivePlatformPresentation(scheduled?: string | null, actual?: string | null) {
  const planned = scheduled?.trim() || null;
  const current = actual?.trim() || planned;
  const changed = Boolean(planned && current && planned !== current);
  const label = changed ? `Planmäßig Gleis ${planned}, aktuell Gleis ${current}.` : current ? `Gleis ${current}.` : "Gleis nicht verfügbar.";
  return { scheduled:planned, actual:current, changed, label };
}
