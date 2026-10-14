"use client";

import type { LiveJourney } from "./live-journey";
import {useState} from "react";
import {sortJourneys,walkingMinutes,journeyDateRange,type JourneySort} from "./journey-tools";
import { formatDuration } from "./network-data";
import { UiIcon } from "./ui-icon";
import { compactStationLabel } from "./transit-style";

import { JourneyTimeRange } from "./journey-time-range";
import { RealtimeTime } from "./realtime-time";
import { RealtimePlatform } from "./realtime-platform";

export function JourneyAlternatives({ journeys, selected, limit, label, onSelect, onMore }: {
  journeys:LiveJourney[]; selected:LiveJourney; limit:number; label:(journey:LiveJourney, first:LiveJourney) => string;
  onSelect:(journey:LiveJourney) => void; onMore:() => void;
}) {
  const [order,setOrder]=useState<JourneySort>('recommended');
  const alternatives = sortJourneys(journeys.filter(journey => journey.id !== selected.id),order);
  const disrupted=selected.cancelled||selected.transitLegs.some(leg=>leg.cancelled);
  if (!alternatives.length) return null;
  return <details className="journey-alternatives">
    <summary>{disrupted?"Fahrt fällt aus · Alternativen prüfen":"Andere Verbindungen"} <span>{alternatives.length}<UiIcon name="chevron" width="16" height="16" /></span></summary>
    <div className="v58-alternative-sort" role="group" aria-label="Andere Verbindungen sortieren">{([["recommended","Empfohlen"],["arrival","Früh ankommen"],["duration","Schnell"],["changes","Wenig Umstiege"],["walking","Wenig Fußweg"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={order===id} onClick={()=>setOrder(id)}>{label}</button>)}</div>
    <div>{alternatives.slice(0,limit).map(journey => <button type="button" key={journey.id} onClick={event => { event.currentTarget.closest('details')?.removeAttribute('open'); onSelect(journey); }}>
      <em>{label(journey,journeys[0])}</em>
      <small>{journeyDateRange(journey)}</small>
      <JourneyTimeRange journey={journey} />
      <small>{formatDuration(Math.round(journey.durationSeconds / 60))} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "Direkt"}</small>
      <small>{journey.transitLegs.map(leg => leg.name).join(" · ")}</small>
      <small>{walkingMinutes(journey)} Min. Fußweg · {Math.round((journey.durationSeconds-selected.durationSeconds)/60)>0?'+':''}{Math.round((journey.durationSeconds-selected.durationSeconds)/60)} Min. gegenüber Auswahl{journey.cancelled?' · Ausfall':''}</small>
    </button>)}{alternatives.length > limit && <button type="button" className="journey-more" onClick={onMore}>Weitere Verbindungen anzeigen</button>}</div>
  </details>;
}

export function TransferNotice({ journey, index, minutes }: {journey:LiveJourney; index:number; minutes:number}) {
  const previous = journey.transitLegs[index];
  const next = journey.transitLegs[index + 1];
  if (!next) return null;
  const walking = journey.legs.filter(leg => leg.category === "walk" && new Date(leg.startTime) >= new Date(previous.endTime) && new Date(leg.endTime) <= new Date(next.startTime)).reduce((seconds,leg) => seconds + leg.durationSeconds,0);
  return <div className={`transfer-step ${minutes < 7 ? "risk" : minutes < 12 ? "medium" : "good"}`}>
    <span><b>{minutes < 0 ? "Anschluss voraussichtlich verpasst" : `${minutes} Min. Umstieg in ${compactStationLabel(previous.to.name) ?? previous.to.name}`}</b>
      <span className="transfer-times"><span>Ankunft <RealtimeTime scheduled={previous.scheduledEndTime} actual={previous.endTime} realtime={previous.realtime} cancelled={previous.cancelled || previous.to.cancelled} cancellationLabel={previous.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /> · <RealtimePlatform scheduled={previous.to.scheduledTrack} actual={previous.to.track} /></span><span>Abfahrt <RealtimeTime scheduled={next.scheduledStartTime} actual={next.startTime} realtime={next.realtime} cancelled={next.cancelled || next.from.cancelled} cancellationLabel={next.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /> · <RealtimePlatform scheduled={next.from.scheduledTrack} actual={next.from.track} /></span></span>
      <small>{next.name}{walking ? ` · ${Math.ceil(walking / 60)} Min. Fußweg enthalten` : ""}{minutes >= 0 && minutes < 7 ? " · Kurzer Anschluss, bitte prüfen" : ""}</small>
    </span>
  </div>;
}

