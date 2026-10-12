import type { RealtimePresentation } from "./realtime-presentation.ts";

/** A train is delayed for any positive confirmed delay, including +1 to +4 minutes. */
export type BoardDelayFilter = "all" | "ontime" | "delayed" | "canceled";
export function matchesBoardDelayFilter(filter: BoardDelayFilter, state: RealtimePresentation): boolean {
  if (filter === "all") return true;
  if (filter === "canceled") return state.kind === "cancelled";
  if (state.kind === "cancelled" || state.delayMinutes === null) return false;
  return filter === "ontime" ? state.delayMinutes === 0 : state.delayMinutes > 0;
}
