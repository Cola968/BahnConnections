"use client";

import type { LiveJourney } from "./live-journey";
import { formatDuration } from "./network-data";
import { UiIcon } from "./ui-icon";

const clock = (time:string) => new Intl.DateTimeFormat("de-DE", {timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(time));

export function JourneyAlternatives({ journeys, selected, limit, label, onSelect, onMore }: {
  journeys:LiveJourney[]; selected:LiveJourney; limit:number; label:(journey:LiveJourney, first:LiveJourney) => string;
  onSelect:(journey:LiveJourney) => void; onMore:() => void;
}) {
  const alternatives = journeys.filter(journey => journey.id !== selected.id);
  if (!alternatives.length) return null;
  return <details className="journey-alternatives">
    <summary>Andere Verbindungen <span>{alternatives.length}<UiIcon name="chevron" width="16" height="16" /></span></summary>
    <div>{alternatives.slice(0,limit).map(journey => <button type="button" key={journey.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onSelect(journey); }}>
      <em>{label(journey,journeys[0])}</em>
      <b>{clock(journey.startTime)} → {clock(journey.endTime)}</b>
      <small>{formatDuration(Math.round(journey.durationSeconds / 60))} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "Direkt"}</small>
      <small>{journey.transitLegs.map(leg => leg.name).join(" · ")}{journey.cancelled ? " · Ausfall enthalten" : journey.realtime ? " · mit Echtzeit" : " · Fahrplan"}</small>
    </button>)}{alternatives.length > limit && <button type="button" className="journey-more" onClick={onMore}>Weitere Verbindungen anzeigen</button>}</div>
  </details>;
}

export function TransferNotice({ journey, index, minutes }: {journey:LiveJourney; index:number; minutes:number}) {
  const previous = journey.transitLegs[index];
  const next = journey.transitLegs[index + 1];
  if (!next) return null;
  const walking = journey.legs.filter(leg => leg.category === "walk" && new Date(leg.startTime) >= new Date(previous.endTime) && new Date(leg.endTime) <= new Date(next.startTime)).reduce((seconds,leg) => seconds + leg.durationSeconds,0);
  return <div className={`transfer-step ${minutes < 7 ? "risk" : minutes < 12 ? "medium" : "good"}`}>
    <span><b>{minutes < 0 ? "Anschluss voraussichtlich verpasst" : `${minutes} Min. Umstieg in ${previous.to.name}`}</b>
      <small>Ankunft {clock(previous.endTime)}{previous.to.track ? ` · Gleis ${previous.to.track}` : ""} → Abfahrt {clock(next.startTime)}{next.from.track ? ` · Gleis ${next.from.track}` : ""}</small>
      <small>{next.name}{walking ? ` · ${Math.ceil(walking / 60)} Min. Fußweg enthalten` : ""}{minutes >= 0 && minutes < 7 ? " · Kurzer Anschluss, bitte prüfen" : ""}</small>
    </span>
  </div>;
}
