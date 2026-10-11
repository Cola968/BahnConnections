"use client";
import { useEffect, useState } from "react";
import { PanelTools, type MobileSheetState, type PanelControls } from "./panel-tools";
import { RealtimeTime } from "./realtime-time";
import { deriveRealtimePresentation } from "./realtime-presentation";
import { liveTripProgress, pointOnTrip, segmentAverageSpeed, type LiveTrip } from "./live-trains";
import { compactStationLabel } from "./transit-style";

function minutesUntil(date:string,now:number) {
  const time=Date.parse(date);
  if(!Number.isFinite(time))return null;
  return Math.round((time-now)/60_000);
}
function clockLabel(date:string){
  const stamp=Date.parse(date);
  return Number.isFinite(stamp)?new Date(stamp).toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}):"—";
}
function timeUntil(value:number|null){
  if(value===null)return "Keine Prognose";
  if(value>0)return `In ${value} Min.`;
  if(value===0)return "Jetzt";
  return "Abschnitt beendet";
}

export function LiveTripInspector({trip,controls,mobileState,onMobileState,onClose,tracked,onTrack}:{trip:LiveTrip;controls:PanelControls;mobileState:MobileSheetState;onMobileState:(state:MobileSheetState)=>void;onClose:()=>void;tracked:boolean;onTrack:()=>void}) {
  const [at,setAt]=useState(()=>Date.now());
  const [showMethod,setShowMethod]=useState(false);
  useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setAt(Date.now());},4000);return()=>clearInterval(timer);},[]);
  const progress=liveTripProgress(trip,at),position=pointOnTrip(trip,progress),averageSpeed=segmentAverageSpeed(trip);
  const from=compactStationLabel(trip.from.name)??trip.from.name,to=compactStationLabel(trip.to.name)??trip.to.name;
  const product=trip.category==="fern"?"ice":trip.category==="regional"?"regional":trip.category;
  const state=deriveRealtimePresentation({scheduled:trip.scheduledArrival,actual:trip.arrival,realtime:trip.realTime});
  const arrivalIn=minutesUntil(trip.arrival,at);
  const positionStatus=position?(trip.realTime?"Zeitbasierte Positionsschätzung":"Fahrplanbasierte Positionsschätzung"):"Position derzeit unbekannt";
  return <section className="live-trip-card floating-panel mobile-sheet-panel rail-flight-inspector" style={controls.style}>
    <PanelTools controls={controls} label="Zugdetails" mobileTitle={trip.name} onClose={onClose} mobileState={mobileState} onMobileStateChange={onMobileState} mobileSummary={`${from} → ${to}`}/>
    <div className="panel-body rail-inspector-body">
      <header className="rail-inspector-head">
        <div className="rail-inspector-headline"><span className={`service-pill ${product}`}>{trip.name}</span><span className={`rail-inspector-state status-${state.tone}`}>{state.delayMinutes===null?"Fahrplandaten":state.delayMinutes<0?`${Math.abs(state.delayMinutes)} Min. früher`:state.delayMinutes===0?"Pünktlich":`+${state.delayMinutes} Min.`}</span></div>
        <h2>{from}<span aria-hidden="true"> → </span>{to}</h2>
        <p>{positionStatus}</p>
      </header>
      <div className="rail-inspector-stats" aria-label="Aktueller Abschnitt">
        <div><small>Nächster Halt</small><strong>{to}</strong><span>{timeUntil(arrivalIn)}</span></div>
        <div><small>Geplante Ankunft</small><strong>{clockLabel(trip.scheduledArrival??trip.arrival)}</strong><span>Ist {clockLabel(trip.arrival)}</span></div>
      </div>
      {position&&<div className="rail-inspector-progress" role="img" aria-label={`Fortschritt im Abschnitt ungefähr ${Math.round(progress*100)} Prozent`}>
        <div className="rail-inspector-progress-top"><span>{from}</span><span>{to}</span></div>
        <div className="trip-progress"><i style={{width:`${progress*100}%`}}/><span style={{left:`${progress*100}%`}}/></div>
        <small>Geschätzter Abschnittsfortschritt · {Math.round(progress*100)} %</small>
      </div>}
      <div className="rail-inspector-metrics">
        <div><span>Geschwindigkeit</span><strong>—</strong><small>Live-Wert nicht verfügbar</small></div>
        <div><span>Ø Abschnitt</span><strong>{averageSpeed===null?"—":`${averageSpeed} km/h`}</strong><small>Aus Entfernung und Fahrzeit berechnet</small></div>
      </div>
      <div className="rail-inspector-timeline" aria-label="Aktueller Fahrtabschnitt">
        <div className="rail-inspector-timeline-row"><i aria-hidden="true"/><div><strong>{from}</strong><small>Abfahrt</small></div><RealtimeTime scheduled={trip.scheduledDeparture} actual={trip.departure} realtime={trip.realTime} showStatus compact/></div>
        <div className="rail-inspector-timeline-row"><i aria-hidden="true"/><div><strong>{to}</strong><small>Ankunft</small></div><RealtimeTime scheduled={trip.scheduledArrival} actual={trip.arrival} realtime={trip.realTime} showStatus compact/></div>
      </div>
      <button type="button" className={tracked?"track-button active":"track-button"} disabled={!position} onClick={onTrack}>{tracked?"✓ Verfolgung beenden":"◎ Zug auf der Karte verfolgen"}</button>
      <button type="button" className="rail-inspector-method-toggle" aria-expanded={showMethod} onClick={()=>setShowMethod(x=>!x)}>Datenquelle & Genauigkeit <span aria-hidden="true">{showMethod?"−":"+"}</span></button>
      {showMethod&&<p className="rail-inspector-method">Die Position wird aus Abschnittszeiten und Streckengeometrie abgeleitet – sie ist keine GPS-Ortung. Die angezeigte Durchschnittsgeschwindigkeit ist kein gemessener Live-Wert. Die Quelle liefert für diesen Abschnitt {trip.realTime?"Echtzeit-Haltezeiten.":"Fahrplanzeiten."} Ein vollständiger Fahrtverlauf benötigt gesonderte Haltestellendaten.</p>}
    </div>
  </section>;
}
