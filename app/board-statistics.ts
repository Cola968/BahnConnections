import { deriveRealtimePresentation, type RealtimeInput } from "./realtime-presentation.ts";

/** Only uncancelled rows with an actual realtime prediction and a valid plan. */
export function boardDelayStatistics(rows: RealtimeInput[]) {
  const delays = rows.flatMap(row => {
    const state = deriveRealtimePresentation(row);
    return state.kind !== "cancelled" && state.delayMinutes !== null ? [state.delayMinutes] : [];
  });
  return {
    delaySamples:delays.length,
    delayed6:delays.filter(delay => delay >= 6).length,
    delayed15:delays.filter(delay => delay >= 15).length,
    delayed30:delays.filter(delay => delay >= 30).length,
    averageDelay:delays.length ? delays.reduce((sum, delay) => sum + delay, 0) / delays.length : null,
  };
}
