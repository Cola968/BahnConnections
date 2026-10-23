import type { LiveTrip } from "./live-trains";
import { formatRealtimeTime } from "./realtime-presentation.ts";

type FollowTimes = Pick<LiveTrip, "departure" | "arrival" | "scheduledDeparture" | "scheduledArrival" | "realTime" | "delay">;
export type FollowView = {
  departureTime:string;
  arrivalTime:string;
  timeType:"Prognose"|"Fahrplan";
  progress:number|null;
  etaLabel:string;
  delayLabel:string;
  delayTone:"success"|"warning"|"danger"|"neutral";
  evidenceLabel:string;
};

/** Only fresh reported journey times may drive a model-based progress bar.
 * Timetabled events may still be displayed but are never promoted to live ETA/GPS. */
export function trainFollowView(trip:FollowTimes, now:number, current:boolean):FollowView {
  const realtime = current && trip.realTime;
  const departure = realtime ? trip.departure : trip.scheduledDeparture ?? trip.departure;
  const arrival = realtime ? trip.arrival : trip.scheduledArrival ?? trip.arrival;
  const start = Date.parse(trip.departure);
  const end = Date.parse(trip.arrival);
  const within = realtime && Number.isFinite(now) && Number.isFinite(start) &&
    Number.isFinite(end) && end > start && now >= start && now <= end;
  const progress = within ? Math.round(((now - start) / (end - start)) * 100) : null;
  const minutesLeft = progress === null ? null : Math.max(0, Math.ceil((end - now) / 60_000));
  const delay = realtime && Number.isFinite(trip.delay) ? trip.delay : null;
  return {
    departureTime:formatRealtimeTime(departure),
    arrivalTime:formatRealtimeTime(arrival),
    timeType:realtime?"Prognose":"Fahrplan",
    progress,
    etaLabel:minutesLeft === null ? "Keine aktuelle ETA" : minutesLeft === 0 ? "Zielzeit erreicht" : `Ankunft in ${minutesLeft} min`,
    delayLabel:delay === null ? "Keine aktuelle Verspätung" : delay > 0 ? `+${delay} min` : delay < 0 ? `${delay} min` : "Pünktlich",
    delayTone:delay === null?"neutral":delay <= 0?"success":delay <= 10?"warning":"danger",
    evidenceLabel:progress === null ? "Keine aktuelle Fortschrittsprognose" : `Zeitfortschritt ${progress} % · Modell, kein GPS`,
  };
}
