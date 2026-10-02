import type { LiveJourney } from "./live-journey";
import { RealtimeTime } from "./realtime-time";

/** Endpoint status comes from the corresponding leg, never from journey-wide `some(realtime)`. */
export function JourneyTimeRange({ journey }: { journey: LiveJourney }) {
  const first = journey.legs[0];
  const last = journey.legs[journey.legs.length - 1];
  return <span className="journey-time-range">
    <span><span className="sr-only">Abfahrt: </span><RealtimeTime scheduled={journey.scheduledStartTime} actual={journey.startTime} realtime={first?.realtime} cancelled={first?.cancelled || first?.from.cancelled} cancellationLabel={first?.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /></span>
    <span className="journey-time-range__arrow" aria-hidden="true">→</span>
    <span><span className="sr-only">Ankunft: </span><RealtimeTime scheduled={journey.scheduledEndTime} actual={journey.endTime} realtime={last?.realtime} cancelled={last?.cancelled || last?.to.cancelled} cancellationLabel={last?.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /></span>
  </span>;
}
