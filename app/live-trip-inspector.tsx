"use client";
import { useEffect, useState } from 'react';
import { PanelTools, type MobileSheetState, type PanelControls } from './panel-tools';
import { RealtimeTime } from './realtime-time';
import { liveTripProgress, pointOnTrip, segmentAverageSpeed, type LiveTrip } from './live-trains';
import { compactStationLabel } from './transit-style';

export function LiveTripInspector({trip,controls,mobileState,onMobileState,onClose,tracked,onTrack}:{trip:LiveTrip;controls:PanelControls;mobileState:MobileSheetState;onMobileState:(state:MobileSheetState)=>void;onClose:()=>void;tracked:boolean;onTrack:()=>void}) {
  const [at,setAt]=useState(()=>Date.now());
  useEffect(()=>{const timer=setInterval(()=>{if(!document.hidden)setAt(Date.now());},4000);return()=>clearInterval(timer);},[]);
  const progress=liveTripProgress(trip,at),position=pointOnTrip(trip,progress),speed=segmentAverageSpeed(trip);
  const from=compactStationLabel(trip.from.name),to=compactStationLabel(trip.to.name);
  const product=trip.category==='fern'?'ice':trip.category==='regional'?'regional':trip.category;
  return <section className="live-trip-card floating-panel mobile-sheet-panel" style={controls.style}>
    <PanelTools controls={controls} label="Zugdetails" mobileTitle={trip.name} onClose={onClose} mobileState={mobileState} onMobileStateChange={onMobileState} mobileSummary={`${from} → ${to}`} />
    <div className="panel-body">
      <div className="live-trip-title"><span className={`service-pill ${product}`} title={trip.name}>{trip.name}</span><div><b>{from} → {to}</b><small>{position ? `Position aus ${trip.realTime?'Echtzeit-Haltezeiten':'Fahrplan'} geschätzt · keine GPS-Ortung` : 'Keine belastbare Positionsschätzung verfügbar'}</small></div></div>
      {position && <div className="trip-progress" aria-label={`Geschätzt ${Math.round(progress*100)} Prozent des Abschnitts`}><i style={{width:`${progress*100}%`}}/><span style={{left:`${progress*100}%`}}/></div>}
      <div className="live-trip-stops"><span><small>Abschnittsbeginn</small><b title={trip.from.name}>{from}</b><RealtimeTime scheduled={trip.scheduledDeparture} actual={trip.departure} realtime={trip.realTime} showStatus compact/></span><span><small>Abschnittsende</small><b title={trip.to.name}>{to}</b><RealtimeTime scheduled={trip.scheduledArrival} actual={trip.arrival} realtime={trip.realTime} showStatus compact/></span></div>
      <div className="live-trip-stats"><span><b>{speed===null?"—":`${speed} km/h`}</b> {speed===null?"Keine Geschwindigkeitsmessung":"Durchschnitt im Abschnitt · nicht live gemessen"}</span>{position&&<span><b>{Math.round(progress*100)}%</b> Fahrfortschritt geschätzt</span>}</div>
      <button type="button" disabled={!position} className={tracked?'track-button active':'track-button'} onClick={onTrack}>{tracked?'Kamerafolge beenden':'Zug auf Karte verfolgen'}</button>
    </div>
  </section>;
}
