"use client";

import { useEffect, useState } from "react";
import { PanelTools, type MobileSheetState, type PanelControls } from "./panel-tools";
import { RealtimeTime } from "./realtime-time";
import { trainArrivalView } from "./train-arrival";
import { TrainArrivalPanel } from "./train-arrival-panel";
import { activeEstimatedPosition, liveTripProgress, pointOnTrip, segmentAverageSpeed, realtimeModelSpeed, type LiveTrip } from "./live-trains";
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
  const [detailUpdatedAt,setDetailUpdatedAt]=useState<Date|null>(null);
  const [showAllStops,setShowAllStops]=useState(false);
  useEffect(()=>{
    const refresh=()=>{if(!document.hidden)setNow(Date.now());};
    const timer=window.setInterval(refresh,4000);
    document.addEventListener("visibilitychange",refresh);
    return()=>{window.clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[]);
  useEffect(()=>{
    const controller=new AbortController();
    async function load(){
      setDetailState("loading");setDetailUpdatedAt(null);setStops([]);setShowAllStops(false);
      try {
        if(!trip.tripId || trip.tripId.length>500)throw new Error("Keine abrufbare Fahrt-ID");
        const response=await fetch(`/api/trips/transitous/${encodeURIComponent(trip.tripId)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(16000)]),cache:"no-store"});
        if(!response.ok)throw new Error(`Fahrtverlauf HTTP ${response.status}`);
        const data=await response.json() as {trip?:{legs?:unknown}};
        const raw=data.trip?.legs;
        const result=normaliseTrainStops(Array.isArray(raw)?raw:[]);
        if(!controller.signal.aborted){setStops(result);setDetailUpdatedAt(result.length?new Date():null);setDetailState(result.length?"ready":"error");}
      }catch{if(!controller.signal.aborted)setDetailState("error");}
    }
    void load();
    return()=>controller.abort();
  },[trip.tripId]);

  const progress=liveTripProgress(trip,now);
  const position=activeEstimatedPosition(trip,now);
  const speed=segmentAverageSpeed(trip);
  const future=pointOnTrip(trip,Math.min(1,progress+.006));
  const past=pointOnTrip(trip,Math.max(0,progress-.006));
  const heading=headingDegrees(past,future);
  const compass=cardinalDirection(heading);
  const freshness=sourceFreshness(radarUpdatedAt,now,inRadar);
  const sourceCurrent=freshness==="current" && radarStatus==="ready";
  const detailsCurrent=detailState==="ready" && sourceFreshness(detailUpdatedAt,now,true)==="current";
  const arrival=trainArrivalView({scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime,fresh:sourceCurrent});
  const modelSpeed = sourceCurrent ? realtimeModelSpeed(trip,now) : null;
  const canStartTracking = sourceCurrent && activeEstimatedPosition(trip,now)!==null;
  const statusText=!inRadar?"Außerhalb Radarbereich":radarStatus!=="ready"||freshness==="old"?"Radar-Daten veraltet":freshness==="current"?(trip.realTime?"Echtzeitprognose":"Fahrplan"):"Radar nicht verfügbar";
  const remaining=validDate(arrival.expected??arrival.planned??undefined);
  const etaMinutes=remaining===null?null:Math.max(0,Math.ceil((remaining-now)/60000));
  const nextIndex=nextTrainStopIndex(stops,now);
  const upcoming=nextIndex>=0?stops[nextIndex]:null;
  const visibleStops=showAllStops?stops:stops.length>6?[...stops.slice(0,2),...stops.slice(Math.max(2,nextIndex-1),Math.max(2,nextIndex-1)+4)].filter((stop,index,array)=>array.findIndex(candidate=>candidate===stop)===index):stops;
  const from=stationName(trip.from.name),to=stationName(trip.to.name);
  const finalStop=detailState==="ready" ? stops.at(-1) : undefined;
  const showDestination=Boolean(finalStop && stationName(finalStop.name)!==to);

  return <section className="live-trip-card floating-panel mobile-sheet-panel train-inspector" data-tracking={tracked?"true":"false"} style={controls.style} aria-label={`Zug ${trip.name} – Fahrtinformationen`}>
    <PanelTools controls={controls} label="Zugradar" mobileTitle={trip.name} onClose={onClose} mobileState={mobileState} onMobileStateChange={onMobileState} mobileSummary={`${from} → ${to}`} />
    <div className="panel-body">
      <div className="train-header">
        <div className="train-heading-row">
          <span className={`service-pill ${trip.category==="fern"?"ice":trip.category==="regional"?"regional":trip.category}`}>{trip.name}</span>
          <span className={`train-source-tag ${freshness}`}><i aria-hidden="true"/>{statusText}</span>
        </div>
        <h2>{from} <span aria-hidden="true">→</span> {to}</h2>
        <p>{sourceCurrent&&position?"Position anhand der Haltezeiten geschätzt":"Keine aktuelle Positionsschätzung"}</p>
      </div>

      {tracked&&<div className={canStartTracking?"train-follow-state":"train-follow-state is-paused"} role="status"><span className="train-follow-dot" aria-hidden="true"/> {canStartTracking?`Kartenkamera folgt ${trip.name}`:"Verfolgung pausiert: keine aktuelle Positionsprognose"} <small>{canStartTracking?"Manuell verschieben beendet die Verfolgung":"Erneute Radardaten abwarten oder Verfolgung beenden"}</small></div>}
      
      <section className="train-cockpit" aria-label="Zugradar und Geschwindigkeit">
        <div className="train-cockpit-eyebrow"><span><UiIcon name="train"/> ZUGRADAR</span><span className={canStartTracking&&trip.realTime?"train-cockpit-feed active":"train-cockpit-feed"}><i aria-hidden="true"/>{canStartTracking?(trip.realTime?"Echtzeitprognose":"Fahrplanmodell"):"Keine aktuellen Positionsdaten"}</span></div>
        <div className="train-cockpit-route">
          <div><small>Von</small><b>{from}</b></div>
          <div className="train-cockpit-track" aria-hidden="true"><i/><UiIcon name="train"/><i/></div>
          <div><small>Nach</small><b>{to}</b></div>
        </div>
        <TrainArrivalPanel destination={to} scheduled={trip.scheduledArrival} actual={trip.arrival} realtime={trip.realTime} fresh={sourceCurrent}/>
        <div className="train-cockpit-bottom">
          <div className="train-cockpit-speed"><small>Geschwindigkeit · Modell</small><strong>{modelSpeed===null?"—":modelSpeed}<em>km/h</em></strong><span>{modelSpeed===null?"Kein gültiger Echtzeit-Schätzwert":"Aus Streckenlänge und prognostizierter Fahrzeit"}</span></div>
          <div className="train-cockpit-provenance"><b>{modelSpeed===null?"Keine Messung":"Modellschätzung"}</b><small>Kein GPS / Tacho</small><small>{radarUpdatedAt&&radarStatus==="ready"&&freshness==="current"?`Datenstand ${new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(radarUpdatedAt)}`:"Keine frischen Radar-Daten"}</small></div>
        </div>
      </section>
      <div className="train-action-row">
        <button type="button" className={tracked?"track-button active":"track-button"} onClick={onTrack} disabled={!tracked&&!canStartTracking} aria-pressed={tracked}><UiIcon name="location"/>{tracked?"Verfolgung beenden":"Auf Karte verfolgen"}</button>
        <span className="train-heading-pill" title={heading===null?"Keine zuverlässige Streckenrichtung":`Geschätzte Kursrichtung ${Math.round(heading)}°`}>{heading===null?<UiIcon name="info"/>:<UiIcon name="arrow" style={{transform:`rotate(${heading-90}deg)`}}/>}{compass}</span>
      </div>
      <div className="train-hero-stats">
        <div className="train-metric"><small>Ø Abschnitt</small><strong>{speed===null?"—":speed} <em>km/h</em></strong><span>{speed===null?"Keine Distanzangabe":"Aus Distanz und Fahrzeit berechnet"}</span></div>
        <div className="train-metric"><small>Bis zum nächsten Halt</small><strong>{etaMinutes===null?"—":etaMinutes===0?"0":etaMinutes} <em>{etaMinutes===null?"":"Min."}</em></strong><span>{etaMinutes===null?"Keine Ankunftszeit":etaMinutes===0?"Ankunftszeit erreicht":arrival.isFreshPrediction?"Laut aktueller Prognose":"Nach Fahrplan"}</span></div>
        <div className="train-metric"><small>Verspätung</small><strong className={`train-delay-${arrival.tone}`}>{arrival.delayMinutes===null?"—":arrival.delayMinutes>0?`+${arrival.delayMinutes} Min.`:arrival.delayMinutes<0?`${arrival.delayMinutes} Min.`:"0 Min."}</strong><span>{arrival.delayMinutes===null?"Keine aktuelle Verspätungsprognose":arrival.delayMinutes===0?"Pünktlich laut Prognose":arrival.delayMinutes<0?"Früher als geplant":"Aktuelle Ankunftsprognose"}</span></div>
      </div>

      <section className="train-progress-panel" aria-label="Verlauf des aktuellen Abschnitts">
        <div className="train-progress-head"><b>Unterwegs</b><span>{sourceCurrent&&position?`${Math.round(progress*100)} % geschätzt`:"Position nicht aktuell"}</span></div>
        <div className="train-progress-line" role="progressbar" aria-valuenow={sourceCurrent&&position?Math.round(progress*100):undefined} aria-valuemin={0} aria-valuemax={100} aria-label="Geschätzter Fortschritt zwischen zwei Halten"><i style={{width:`${sourceCurrent&&position?progress*100:0}%`}}/>{sourceCurrent&&position&&<span style={{left:`${progress*100}%`}}><UiIcon name="train"/></span>}</div>
        <div className="train-endpoints"><div><small>Letzter Halt / Start</small><b>{from}</b><RealtimeTime scheduled={trip.scheduledDeparture} actual={trip.departure} realtime={trip.realTime&&sourceCurrent} compact/></div><div><small>Nächster Halt / Ziel</small><b>{to}</b><RealtimeTime scheduled={trip.scheduledArrival} actual={trip.arrival} realtime={trip.realTime&&sourceCurrent} compact/></div></div>
      </section>

      {showDestination&&finalStop&&<TrainArrivalPanel secondary heading="Fahrtziel (laut Fahrtdaten)" destination={stationName(finalStop.name)} scheduled={finalStop.scheduledArrival??finalStop.scheduledDeparture} actual={finalStop.arrival??finalStop.departure} realtime={finalStop.realtime} fresh={detailsCurrent} cancelled={finalStop.cancelled}/>}
      <section className="train-stops-section">
        <div className="train-stops-header"><div><b>Fahrtverlauf</b><small>{detailState==="loading"?"Wird geladen …":detailState==="ready"?`${stops.length} gemeldete Halte`:"Fahrtverlauf nicht verfügbar"}</small></div>{detailState==="ready"&&stops.length>6&&<button onClick={()=>setShowAllStops(x=>!x)} type="button">{showAllStops?"Weniger":"Alle Halte"}</button>}</div>
        {upcoming&&<div className="train-next-stop"><UiIcon name="location"/><span><small>Nächster gemeldeter Halt</small><b>{stationName(upcoming.name)}</b></span><strong>{clock(upcoming.arrival??upcoming.departure)}</strong></div>}
        {detailState==="loading"&&<p className="train-stops-state">Halte werden von Transitous geladen.</p>}
        {detailState==="error"&&<p className="train-stops-state">Der vollständige Fahrtverlauf ist derzeit nicht verfügbar. Die beiden Abschnittshalte oben bleiben sichtbar.</p>}
        {detailState==="ready"&&<ol className="train-stop-list">{visibleStops.map((stop,index)=>{
          const isNext=stop===upcoming;const time=stop.arrival??stop.departure;
          const past=validDate(time);const occurred=past!==null&&past<now-60000;
          return <li key={`${stop.name}-${index}-${time??""}`} className={isNext?"next":stop.cancelled?"cancelled":occurred?"passed":""}><i aria-hidden="true"/><span><b>{stationName(stop.name)}</b><small>{stop.cancelled?"Halt entfällt":isNext?"Nächster Halt":stop.platform?`Gleis ${stop.platform}`:""}</small></span><RealtimeTime scheduled={stop.scheduledArrival??stop.scheduledDeparture} actual={stop.arrival??stop.departure} realtime={stop.realtime&&detailsCurrent} cancelled={stop.cancelled} compact/></li>;
        })}</ol>}
      </section>
      <details className="train-data-disclosure"><summary>Datenquelle & Genauigkeit</summary><p>Transitous/MOTIS liefert Halte und – wo vorhanden – Echtzeitprognosen. Position, Richtung und der aktuelle Geschwindigkeits-Schätzwert entstehen aus Streckengeometrie und prognostizierten Haltezeiten. Der km/h-Wert ist ein Modell, keine gemessene Momentangeschwindigkeit und nicht fahrzeugspezifische Telemetrie. Ohne gültige Echtzeitdaten bleibt er leer.</p><small>Radar aktualisiert: {radarUpdatedAt?new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(radarUpdatedAt):"unbekannt"} · Status: {radarStatus}</small></details>
    </div>
  </section>;
}
