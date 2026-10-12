"use client";

import { useEffect, useState } from "react";
import { activeEstimatedPosition, realtimeModelSpeed, type LiveTrip } from "./live-trains";
import { sourceFreshness } from "./train-inspector-data";

type Props = {
  trip: LiveTrip;
  radarStatus: "loading"|"ready"|"stale"|"error";
  radarUpdatedAt: Date|null;
  inRadar: boolean;
  onEnd: () => void;
};

export function TrainRadarHud({trip,radarStatus,radarUpdatedAt,inRadar,onEnd}:Props) {
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)setNow(Date.now());};
    const interval=window.setInterval(refresh,4000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(interval);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  const fresh=radarStatus==="ready" && sourceFreshness(radarUpdatedAt,now,inRadar)==="current" && activeEstimatedPosition(trip,now)!==null;
  const speed=fresh?realtimeModelSpeed(trip,now):null;
  const stamp=radarUpdatedAt && fresh ? new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(radarUpdatedAt):null;
  return <div className="train-tracking-map-hud train-radar-hud" role="region" aria-label="Zugverfolgung">
    <span className={`train-tracking-map-pulse${fresh?"":" is-stale"}`} aria-hidden="true"/>
    <span className="train-hud-copy"><b>{trip.name} · {fresh?"Kamera folgt":"Tracking pausiert"}</b><small>{fresh?`Positionsmodell · Daten ${stamp}`:"Kein aktueller Zugstandort"}</small></span>
    <span className="train-hud-speed" aria-label={speed===null?"Geschwindigkeitsschätzung nicht verfügbar":`Geschätzt ${speed} Kilometer pro Stunde`}><strong>{speed===null?"—":speed}</strong><small>km/h · Modell</small></span>
    <button type="button" onClick={onEnd} aria-label="Zugverfolgung beenden">Beenden</button>
  </div>;
}
