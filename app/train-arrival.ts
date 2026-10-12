import { deriveRealtimePresentation, formatRealtimeTime } from "./realtime-presentation.ts";

/** Time labels for one reported stopping point, not necessarily the final destination.
 * A scheduled time is never presented as a confirmed prediction, and stale
 * realtime estimates are not advertised as current.
 */
export type TrainArrivalInput = {
  scheduled?: string | null;
  actual?: string | null;
  realtime: boolean;
  fresh: boolean;
};
export type TrainArrivalView = {
  planned: string | null;
  expected: string | null;
  plannedLabel: string;
  expectedLabel: string;
  delayMinutes: number | null;
  status: string;
  tone: "neutral" | "success" | "warning" | "danger";
  isFreshPrediction: boolean;
};

export function trainArrivalView(input: TrainArrivalInput): TrainArrivalView {
  const state = deriveRealtimePresentation({
    scheduled:input.scheduled,
    actual:input.actual,
    realtime:input.realtime,
  });
  // The map feed sometimes omits the scheduled value. Only when the segment
  // explicitly lacks realtime may the arrival field serve as timetable data.
  const planned = state.scheduled ?? (!input.realtime ? state.actual : null);
  const expected = input.realtime && input.fresh ? state.actual : null;
  const delayMinutes = planned && expected
    ? Math.round((Date.parse(expected)-Date.parse(planned))/60_000)
    : null;
  const status = expected
    ? delayMinutes===null ? "Prognose ohne Sollvergleich"
      : delayMinutes<0 ? `${Math.abs(delayMinutes)} Min. früher`
      : delayMinutes===0 ? "Pünktlich"
      : `+${delayMinutes} Min. Verspätung`
    : input.realtime && !input.fresh ? "Keine aktuelle Echtzeitprognose"
    : input.realtime ? planned ? "Echtzeitprognose fehlt – nur Fahrplan" : "Keine Ankunftszeit"
    : planned ? "Nur Fahrplan" : "Keine Ankunftszeit";
  const tone = expected && delayMinutes!==null
    ? delayMinutes<=0 ? "success" : delayMinutes<=10 ? "warning" : "danger"
    : "neutral";
  return {
    planned, expected,
    plannedLabel:formatRealtimeTime(planned),
    expectedLabel:expected ? formatRealtimeTime(expected) : "–",
    delayMinutes,status,tone,
    isFreshPrediction:Boolean(expected),
  };
}
