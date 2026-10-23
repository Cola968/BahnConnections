"use client";

import { useEffect, useState } from "react";
import { activeEstimatedPosition, realtimeModelSpeed, type LiveTrip } from "./live-trains";
import { sourceFreshness } from "./train-inspector-data";
import { trainFollowView } from "./train-follow-view";

type Props = {
  trip: LiveTrip;
  radarStatus: "loading"|"ready"|"stale"|"error";
  radarUpdatedAt: Date|null;
  inRadar: boolean;
  onEnd: () => void;
};

/** FR24-inspired glanceability without pretending timetable interpolation is GPS. */
export function TrainRadarHud({trip,radarStatus,radarUpdatedAt,inRadar,onEnd}:Props) {
  const [now,setNow]=useState(()=>Date.now());
  const [expanded,setExpanded]=useState(false);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)setNow(Date.now());};
    const interval=window.setInterval(refresh,15_000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  const fresh=radarStatus==="ready" && sourceFreshness(radarUpdatedAt,now,inRadar)==="current" &&
    activeEstimatedPosition(trip,now)!==null;
  const view=trainFollowView(trip,now,fresh);
  const speed=fresh?realtimeModelSpeed(trip,now):null;
  return <div className="train-tracking-map-hud train-radar-hud v62-follow-hud" data-expanded={expanded} role="region" aria-label={`Zugverfolgung ${trip.name}`}>
    <header className="v62-follow-heading">
      <span className={`train-tracking-map-pulse${view.progress===null?" is-stale":""}`} aria-hidden="true"/>
      <div className="v62-follow-heading-copy">
        <strong>{trip.name}</strong>
        <small>{view.progress===null?"Fahrplan · keine aktuelle Position":"Aktive Zeitprognose · kein GPS"}</small>
      </div>
      <button type="button" className="v62-follow-stop" onClick={onEnd} aria-label="Zugverfolgung beenden">Beenden</button>
      <button type="button" className="v62-follow-details-toggle" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?"Weniger":"Details"}</button>
    </header>
    <div className="v62-follow-route" aria-label={`Von ${trip.from.name} nach ${trip.to.name}`}>
      <span title={trip.from.name}>{trip.from.name}</span>
      <span className="v62-follow-direction" aria-hidden="true">→</span>
      <span title={trip.to.name}>{trip.to.name}</span>
    </div>
    <div className="v62-follow-status" aria-live="polite">
      <span>{view.etaLabel}</span>
      <span className={`v62-follow-delay v62-follow-${view.delayTone}`}>{view.delayLabel}</span>
      <span className="train-hud-speed v62-follow-mini-speed" aria-label={speed===null?"Geschwindigkeitsschätzung nicht verfügbar":`Geschätzt ${speed} Kilometer pro Stunde`}><strong>{speed===null?"—":speed}</strong><small>km/h · Modell</small></span>
    </div>
    {expanded&&<div className="v62-follow-expanded">
      <div className="v62-follow-times">
        <div><small>Abfahrt · {view.timeType}</small><time dateTime={view.timeType==="Prognose"?trip.departure:trip.scheduledDeparture??trip.departure}>{view.departureTime}</time></div>
        <div><small>Ankunft · {view.timeType}</small><time dateTime={view.timeType==="Prognose"?trip.arrival:trip.scheduledArrival??trip.arrival}>{view.arrivalTime}</time></div>
      </div>
      {view.progress!==null&&<progress aria-label="Modellierter Zeitfortschritt der Fahrt, kein GPS" max={100} value={view.progress}/>}
      <p>{view.evidenceLabel}{radarUpdatedAt&&fresh?` · Daten ${new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(radarUpdatedAt)}`:""}</p>
    </div>}
  </div>;
}
