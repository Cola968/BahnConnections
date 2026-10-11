"use client";

import { useEffect, useState } from "react";
import { PanelTools, type MobileSheetState, type PanelControls } from "./panel-tools";
import { RealtimeTime } from "./realtime-time";
import { deriveRealtimePresentation } from "./realtime-presentation";
import { liveTripProgress, pointOnTrip, segmentAverageSpeed, realtimeModelSpeed, type LiveTrip } from "./live-trains";
import { compactStationLabel } from "./transit-style";
import { cardinalDirection, headingDegrees, nextTrainStopIndex, normaliseTrainStops, sourceFreshness, type TrainStop } from "./train-inspector-data";
import { UiIcon } from "./ui-icon";

type Props={
  trip:LiveTrip;
  controls:PanelControls;
  mobileState:MobileSheetState;
  onMobileState:(state:MobileSheetState)=>void;
  onClose:()=>void;
  tracked:boolean;
  onTrack:()=>void;
  radarUpdatedAt:Date|null;
  radarStatus:"loading"|"ready"|"stale"|"error";
  inRadar:boolean;
};
const validDate=(time?:string)=>{const n=Date.parse(time??"");return Number.isFinite(n)?n:null;};
const clock=(value?:string)=>{const n=validDate(value);return n===null?"–":new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(n);};
const stationName=(name?:string)=>compactStationLabel(name)??name??"Unbekannt";

export function LiveTripInspector({trip,controls,mobileState,onMobileState,onClose,tracked,onTrack,radarUpdatedAt,radarStatus,inRadar}:Props) {
  const [now,setNow]=useState(()=>Date.now());
  const [stops,setStops]=useState<TrainStop[]>([]);
  const [detailState,setDetailState]=useState<"loading"|"ready"|"error">("loading");
  const [showAllStops,setShowAllStops]=useState(false);
  const [detailRetry,setDetailRetry]=useState(0);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)setNow(Date.now());};
    const timer=window.setInterval(refresh,4000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      setDetailState("loading");setStops([]);setShowAllStops(false);
      try {
        if(!trip.tripId || trip.tripId.length>500)throw new Error("Keine abrufbare Fahrt-ID");
        const response=await fetch(`/api/trips/transitous/${encodeURIComponent(trip.tripId)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(16000)]),cache:"no-store"});
        if(!response.ok)throw new Error(`Fahrtverlauf HTTP ${response.status}`);
        const data=await response.json() as {trip?:{legs?:unknown}};
        const raw=data.trip?.legs;
        const result=normaliseTrainStops(Array.isArray(raw)?raw:[]);
        if(!controller.signal.aborted){setStops(result);setDetailState(result.length?"ready":"error");}
      }catch{if(!controller.signal.aborted)setDetailState("error");}
    }
    void load();
    return()=>controller.abort();
  },[trip.tripId,detailRetry]);

  const progress=liveTripProgress(trip,now);
  const position=pointOnTrip(trip,progress);
  const speed=segmentAverageSpeed(trip);
  const future=pointOnTrip(trip,Math.min(1,progress+.006));
  const past=pointOnTrip(trip,Math.max(0,progress-.006));
  const heading=headingDegrees(past,future);
  const compass=cardinalDirection(heading);
  const realtime=deriveRealtimePresentation({scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime});
  const freshness=sourceFreshness(radarUpdatedAt,now,inRadar);
  const modelSpeed = freshness==="current" && radarStatus==="ready" ? realtimeModelSpeed(trip,now) : null;
  const statusText=!inRadar?"Außerhalb Radarbereich":radarStatus!=="ready"||freshness==="old"?"Radar-Daten veraltet":freshness==="current"?(trip.realTime?"Echtzeitprognose":"Fahrplan"):"Radar nicht verfügbar";
  const remaining=validDate(trip.arrival);
  const etaMinutes=remaining===null?null:Math.max(0,Math.ceil((remaining-now)/60000));
  const nextIndex=nextTrainStopIndex(stops,now);
  const upcoming=nextIndex>=0?stops[nextIndex]:null;
  const visibleStops=showAllStops?stops:stops.length>6?[...stops.slice(0,2),...stops.slice(Math.max(2,nextIndex-1),Math.max(2,nextIndex-1)+4)].filter((stop,index,array)=>array.findIndex(candidate=>candidate===stop)===index):stops;
  const from=stationName(trip.from.name),to=stationName(trip.to.name);

  return <section className="live-trip-card floating-panel mobile-sheet-panel train-inspector" data-tracking={tracked?"true":"false"} style={controls.style} aria-label={`Zug ${trip.name} – Fahrtinformationen`}>
    <PanelTools controls={controls} label="Zugdetails" mobileTitle={trip.name} onClose={onClose} mobileState={mobileState} onMobileStateChange={onMobileState} mobileSummary={`${from} → ${to}`} />
    <div className="panel-body">
      <div className="train-header">
        <div className="train-heading-row">
          <span className={`service-pill ${trip.category==="fern"?"ice":trip.category==="regional"?"regional":trip.category}`}>{trip.name}</span>
          <span className={`train-source-tag ${freshness}`}><i aria-hidden="true"/>{statusText}</span>
        </div>
        <h2>{from} <span aria-hidden="true">→</span> {to}</h2>
        <p>{position?"Position anhand der Haltezeiten geschätzt":"Keine belastbare Position verfügbar"}</p>
      </div>

      {tracked&&<div className="train-follow-state" role="status"><span className="train-follow-dot" aria-hidden="true"/> Kartenkamera folgt {trip.name} <small>Manuell verschieben beendet die Verfolgung</small></div>}
      <div className="train-hero-stats">
        <div className="train-metric train-metric-primary"><small>Aktuell · geschätzt</small><strong>{modelSpeed===null?"—":modelSpeed} <em>km/h</em></strong><span>{modelSpeed===null?"Keine belastbare Echtzeit-Schätzung":"Aus Echtzeit-Haltezeiten · kein GPS"}</span></div>
        <div className="train-metric"><small>Ø Abschnitt</small><strong>{speed===null?"—":speed} <em>km/h</em></strong><span>{speed===null?"Keine Distanzangabe":"Aus Distanz und Fahrzeit berechnet"}</span></div>
        <div className="train-metric"><small>Ankunft Abschnitt</small><strong>{clock(trip.arrival)}</strong><span>{etaMinutes===null?"Keine Zeitangabe":etaMinutes===0?"Fahrzeit abgelaufen":`in etwa ${etaMinutes} Min.`}</span></div>
        <div className="train-metric"><small>Verspätung</small><strong className={`train-delay-${realtime.tone}`}>{realtime.delayMinutes===null?"—":realtime.delayMinutes>0?`+${realtime.delayMinutes} Min.`:`${realtime.delayMinutes} Min.`}</strong><span>{realtime.delayMinutes===null?"Keine bestätigte Prognose":trip.realTime?"Prognose der Ankunft":"Fahrplanangabe"}</span></div>
      </div>

      <section className="train-progress-panel" aria-label="Verlauf des aktuellen Abschnitts">
        <div className="train-progress-head"><b>Unterwegs</b><span>{position?`${Math.round(progress*100)} % geschätzt`:"Position unbekannt"}</span></div>
        <div className="train-progress-line" role="progressbar" aria-valuenow={position?Math.round(progress*100):undefined} aria-valuemin={0} aria-valuemax={100} aria-label="Geschätzter Fortschritt zwischen zwei Halten"><i style={{width:`${position?progress*100:0}%`}}/>{position&&<span style={{left:`${progress*100}%`}}><UiIcon name="train"/></span>}</div>
        <div className="train-endpoints"><div><small>Letzter Halt / Start</small><b>{from}</b><RealtimeTime scheduled={trip.scheduledDeparture} actual={trip.departure} realtime={trip.realTime} compact/></div><div><small>Nächster Halt / Ziel</small><b>{to}</b><RealtimeTime scheduled={trip.scheduledArrival} actual={trip.arrival} realtime={trip.realTime} compact/></div></div>
      </section>

      <div className="train-action-row">
        <button type="button" className={tracked?"track-button active":"track-button"} onClick={onTrack} disabled={(!position||!inRadar)&&!tracked} aria-pressed={tracked}><UiIcon name="location"/>{tracked?"Verfolgung beenden":"Zug verfolgen"}</button>
        <span className="train-heading-pill" title={heading===null?"Keine zuverlässige Streckenrichtung":`Geschätzte Kursrichtung ${Math.round(heading)}°`}>{heading===null?<UiIcon name="info"/>:<UiIcon name="arrow" style={{transform:`rotate(${heading-90}deg)`}}/>}{compass}</span>
      </div>

      <section className="train-stops-section">
        <div className="train-stops-header"><div><b>Fahrtverlauf</b><small>{detailState==="loading"?"Wird geladen …":detailState==="ready"?`${stops.length} gemeldete Halte`:"Fahrtverlauf nicht verfügbar"}</small></div>{detailState==="ready"&&stops.length>6&&<button onClick={()=>setShowAllStops(x=>!x)} type="button">{showAllStops?"Weniger":"Alle Halte"}</button>}</div>
        {upcoming&&<div className="train-next-stop"><UiIcon name="location"/><span><small>Nächster gemeldeter Halt</small><b>{stationName(upcoming.name)}</b></span><strong>{clock(upcoming.arrival??upcoming.departure)}</strong></div>}
        {detailState==="loading"&&<p className="train-stops-state">Halte werden von Transitous geladen.</p>}
        {detailState==="error"&&<div className="train-stops-retry"><p className="train-stops-state">Der vollständige Fahrtverlauf ist gerade nicht erreichbar. Die beiden Abschnittshalte bleiben sichtbar.</p><button type="button" onClick={()=>setDetailRetry(retry=>retry+1)}>Erneut laden</button></div>}
        {detailState==="ready"&&<ol className="train-stop-list">{visibleStops.map((stop,index)=>{
          const isNext=stop===upcoming;const time=stop.arrival??stop.departure;
          const past=validDate(time);const occurred=past!==null&&past<now-60000;
          return <li key={`${stop.name}-${index}-${time??""}`} className={isNext?"next":stop.cancelled?"cancelled":occurred?"passed":""}><i aria-hidden="true"/><span><b>{stationName(stop.name)}</b><small>{stop.cancelled?"Halt entfällt":isNext?"Nächster Halt":stop.platform?`Gleis ${stop.platform}`:""}</small></span><RealtimeTime scheduled={stop.scheduledArrival??stop.scheduledDeparture} actual={stop.arrival??stop.departure} realtime={stop.realtime} cancelled={stop.cancelled} compact/></li>;
        })}</ol>}
      </section>
      <details className="train-data-disclosure"><summary>Datenquelle & Genauigkeit</summary><p>Transitous/MOTIS liefert Halte und – wo vorhanden – Echtzeitprognosen. Position, Richtung und der aktuelle Geschwindigkeits-Schätzwert entstehen aus Streckengeometrie und prognostizierten Haltezeiten. Der km/h-Wert ist ein Modell, keine gemessene Momentangeschwindigkeit und nicht fahrzeugspezifische Telemetrie. Ohne gültige Echtzeitdaten bleibt er leer.</p><small>Radar aktualisiert: {radarUpdatedAt?new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(radarUpdatedAt):"unbekannt"} · Status: {radarStatus}</small></details>
    </div>
  </section>;
}
