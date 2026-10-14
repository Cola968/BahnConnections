"use client";

import {useEffect,useEffectEvent,useRef,useState} from 'react';
import {PanelTools,type MobileSheetState,type PanelControls} from './panel-tools';
import {RealtimeTime} from './realtime-time';
import {trainArrivalView} from './train-arrival';
import {remainingArrivalMinutes} from './arrival-countdown';
import {activeEstimatedPosition,decodePolyline,realtimeModelSpeed,type LiveTrip} from './live-trains';
import type {BoardMapTrip} from './live-board';
import {splitRailGeometry} from './rail-geometry';
import {compactStationLabel,serviceBadgeStyle} from './transit-style';
import {nextTrainStopIndex,normaliseTrainStops,relevantTrainStops,sourceFreshness,trainStopPhase,type TrainStop} from './train-inspector-data';
import {UiIcon} from './ui-icon';
import {RAIL_MODES} from './transitous';
import {formatTrainShare} from './v60-train-share';

type Props={trip:LiveTrip;controls:PanelControls;mobileState:MobileSheetState;onMobileState:(state:MobileSheetState)=>void;onClose:()=>void;tracked:boolean;onTrack:()=>void;radarUpdatedAt:Date|null;radarStatus:'loading'|'ready'|'stale'|'error';inRadar:boolean;stationName?:string;onRoute?:(route:BoardMapTrip)=>void;onShowRoute?:()=>void};
const at=(time?:string)=>{const n=Date.parse(time??'');return Number.isFinite(n)?n:null;};
const label=(name?:string)=>compactStationLabel(name)??name??'Unbekannt';

export function LiveTripInspector({trip,controls,mobileState,onMobileState,onClose,tracked,onTrack,radarUpdatedAt,radarStatus,inRadar,stationName,onRoute,onShowRoute}:Props){
  const [now,setNow]=useState(()=>Date.now());
  const [details,setDetails]=useState<{tripId:string;stops:TrainStop[];state:'loading'|'ready'|'error';updatedAt:Date|null}>({tripId:'',stops:[],state:'loading',updatedAt:null});
  const [retry,setRetry]=useState(0);
  const [shareResult,setShareResult]=useState<{tripId:string;message:string}>({tripId:'',message:''});
  const [stopView,setStopView]=useState<{tripId:string;onlyRemaining:boolean}>({tripId:'',onlyRemaining:false});
  const nextStopRef=useRef<HTMLLIElement|null>(null);
  const [route,setRoute]=useState<BoardMapTrip|null>(null);
  const publishRoute=useEffectEvent((route:BoardMapTrip)=>onRoute?.(route));
  useEffect(()=>{const refresh=()=>{if(!document.hidden)setNow(Date.now());};const timer=window.setInterval(refresh,4000);document.addEventListener('visibilitychange',refresh);return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',refresh);};},[]);
  useEffect(()=>{
    let disposed=false,pending:AbortController|null=null;
    async function load(){
      if(disposed||document.hidden||pending)return;
      const controller=new AbortController();pending=controller;
      try{
        if(!trip.tripId||trip.tripId.length>500)throw Error('Keine abrufbare Fahrt-ID');
        const response=await fetch(`/api/trips/transitous/${encodeURIComponent(trip.tripId)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(16000)]),cache:'no-store'});
        if(!response.ok)throw Error('Fahrtverlauf nicht erreichbar');
        const data=await response.json() as {trip?:{legs?:unknown};updatedAt?:string};
        const stops=normaliseTrainStops(Array.isArray(data.trip?.legs)?data.trip.legs:[]);
        if(!stops.length)throw Error('Keine Halte');
        if(!disposed&&!controller.signal.aborted){
          const stamp=at(data.updatedAt);setNow(Date.now());setDetails({tripId:trip.tripId,stops,state:'ready',updatedAt:stamp===null?null:new Date(stamp)});
          const legs=Array.isArray(data.trip?.legs)?data.trip.legs:[];
          const segments:[number,number][][]=legs.flatMap((leg:{mode?:string;legGeometry?:{points?:string;precision?:number}})=>{
            if(!leg || !RAIL_MODES.split(',').includes(leg.mode??'') || typeof leg.legGeometry?.points!=='string')return [];
            return splitRailGeometry(decodePolyline(leg.legGeometry.points,leg.legGeometry.precision??6));
          });
          setRoute(segments.length?{tripId:trip.tripId,name:trip.name,category:trip.category,realtime:stops.some(stop=>stop.realtime),segments,points:segments.flat(),stops:stops.map(stop=>({...stop,track:stop.platform}))}:null);
        }
      }catch{if(!disposed&&!controller.signal.aborted)setDetails(previous=>({tripId:trip.tripId,stops:previous.tripId===trip.tripId?previous.stops:[],state:'error',updatedAt:previous.tripId===trip.tripId?previous.updatedAt:null}));}
      finally{if(pending===controller)pending=null;}
    }
    void load();const timer=window.setInterval(()=>void load(),60_000);const visible=()=>{if(!document.hidden)void load();};document.addEventListener('visibilitychange',visible);
    return()=>{disposed=true;pending?.abort();window.clearInterval(timer);document.removeEventListener('visibilitychange',visible);};
  },[trip.tripId,trip.name,trip.category,retry]);
  const currentDetails=details.tripId===trip.tripId?details:{stops:[],state:'loading' as const,updatedAt:null};
  const {stops,state:detailState,updatedAt:detailsUpdatedAt}=currentDetails;
  const detailFresh=detailState==='ready'&&sourceFreshness(detailsUpdatedAt,now,true)==='current';
  useEffect(()=>{
    if(route?.tripId!==trip.tripId)return;
    // Map stop tooltips follow the same freshness gate as the itinerary.
    publishRoute(detailFresh?route:{...route,realtime:false,stops:route.stops.map(stop=>({...stop,realtime:false,arrival:stop.scheduledArrival,departure:stop.scheduledDeparture,track:undefined}))});
  },[route,trip.tripId,detailFresh]);
  const radarFresh=radarStatus==='ready'&&sourceFreshness(radarUpdatedAt,now,inRadar)==='current';
  const canTrack=radarFresh&&activeEstimatedPosition(trip,now)!==null;
  const first=stops[0],last=stops.at(-1),complete=stops.length>1;
  const from=label(first?.name??trip.from.name),to=label(last?.name??trip.to.name);
  const nextIndex=detailFresh?nextTrainStopIndex(stops,now):-1,nextStop=nextIndex>=0?stops[nextIndex]:null;
  const nextPhase=nextStop?trainStopPhase(nextStop,now):'unknown';
  const onlyRemaining=stopView.tripId===trip.tripId&&stopView.onlyRemaining;
  const {stops:shownStops,hidden:hiddenStops}=relevantTrainStops(stops,now,onlyRemaining,detailFresh);
  const canHideEarlier=detailFresh&&nextIndex>0;
  const destinationActual=complete?last?.arrival??last?.departure:trip.arrival;
  const destinationPlanned=complete?last?.scheduledArrival??last?.scheduledDeparture:trip.scheduledArrival;
  const destinationFresh=complete?detailFresh:radarFresh;
  const destinationRealtime=complete?Boolean(last?.realtime):trip.realTime;
  const nextActual=nextStop?.arrival??nextStop?.departure;
  const nextPlanned=nextStop?.scheduledArrival??nextStop?.scheduledDeparture;
  const nextArrival=trainArrivalView({scheduled:nextPlanned,actual:nextActual,realtime:Boolean(nextStop?.realtime),fresh:detailFresh});
  const nextMinutes=remainingArrivalMinutes(nextArrival.expected??nextArrival.planned,now,detailFresh);
  const confirmedDwell=Boolean(nextStop?.realtime&&at(nextStop.arrival)!==null&&at(nextStop.departure)!==null);
  const dwellDeparture=confirmedDwell?nextStop?.departure:nextStop?.scheduledDeparture??nextStop?.departure;
  const dwellMinutes=nextPhase==='at-stop'?remainingArrivalMinutes(dwellDeparture,now,detailFresh):null;
  const nextStopCaption=nextPhase==='at-stop'
    ? `Aufenthalt laut ${confirmedDwell?'Prognose':'Fahrplan'}${dwellMinutes===null?'':` · Abfahrt in ${dwellMinutes} Min.`}`
    : `Nächster Halt${nextMinutes===null?'':` · ${nextMinutes} Min.`}`;
  const speed=canTrack?realtimeModelSpeed(trip,now):null;
  const start=at(first?.departure??first?.arrival),end=at(destinationActual);
  const progress=complete&&detailFresh&&start!==null&&end!==null&&end>start?Math.max(0,Math.min(100,(now-start)/(end-start)*100)):null;
  const routeSummary=complete?`${from} → ${to}`:detailState==='loading'?'Fahrtverlauf wird geladen …':`Abschnitt: ${from} → ${to}`;
  const status=detailFresh?(stops.some(stop=>stop.realtime)?'Echtzeitprognose':'Fahrplan'):detailState==='loading'?'Wird geladen':stops.length?'Letzter Datenstand':'Verlauf nicht verfügbar';
  async function shareTrain(){
    const text=formatTrainShare({
      name:trip.name,from,to,
      plannedDeparture:complete?first?.scheduledDeparture??first?.scheduledArrival:trip.scheduledDeparture,
      plannedArrival:complete?last?.scheduledArrival??last?.scheduledDeparture:trip.scheduledArrival,
      actualDeparture:complete?first?.departure??first?.arrival:trip.departure,
      actualArrival:complete?last?.arrival??last?.departure:trip.arrival,
      realtime:complete?stops.some(stop=>stop.realtime):trip.realTime,
      fresh:complete?detailFresh:radarFresh,
      updatedAt:complete?detailsUpdatedAt:radarUpdatedAt,
      stops:complete?stops:[],
    });
    try{
      if(navigator.share){
        await navigator.share({title:`BahnConnections – ${trip.name}`,text});
        setShareResult({tripId:trip.tripId,message:"Fahrtinformationen geteilt."});
        return;
      }
    }catch(error){if((error as Error)?.name==="AbortError")return;}
    try{
      if(!navigator.clipboard?.writeText)throw new Error("Clipboard unsupported");
      await navigator.clipboard.writeText(text);
      setShareResult({tripId:trip.tripId,message:"Fahrtinformationen kopiert."});
    }catch{
      setShareResult({tripId:trip.tripId,message:"Teilen auf diesem Gerät nicht verfügbar."});
    }
  }
  return <section className="live-trip-card floating-panel mobile-sheet-panel train-inspector train-inspector-v57" data-tracking={tracked?'true':'false'} style={controls.style} aria-label={`Zug ${trip.name} – Fahrtinformationen`}>
    <PanelTools controls={controls} label="Fahrtverlauf" mobileTitle={trip.name} mobileSummary={status} fullTitle={routeSummary} onClose={onClose} mobileState={mobileState} onMobileStateChange={onMobileState}/>
    <div className="panel-body">
      <header className="train-route-header">
        <div className="train-route-identity"><span className="service-pill" style={serviceBadgeStyle(trip.category,undefined,undefined,trip.name,from)}>{trip.name}</span><span className="train-route-status">{status}</span></div>
        <div className="train-full-route" aria-label={complete?'Gesamter Fahrtverlauf':'Aktueller Abschnitt'}><div><small>{complete?'Startbahnhof':'Abschnitt von'}</small><b>{from}</b></div><UiIcon name="arrow"/><div><small>{complete?'Zielbahnhof':'Abschnitt nach'}</small><b>{to}</b></div></div>
        {stationName&&<p className="train-station-context">Halt an {label(stationName)}</p>}
        {progress!==null&&<div className="train-route-progress" role="progressbar" aria-label="Zeitlicher Fortschritt der gesamten Fahrt, geschätzt" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}><i style={{width:`${progress}%`}}/></div>}
      </header>
      <div className="train-arrival-overview">
        <div><small>{nextStop?nextStopCaption:'Nächster Halt'}</small><b>{nextStop?label(nextStop.name):detailState==='loading'?'Wird geladen …':'Nicht aktuell verfügbar'}</b>{nextStop&&<RealtimeTime scheduled={nextPlanned} actual={detailFresh?nextActual:nextPlanned} realtime={detailFresh&&nextStop.realtime} compact/>}</div>
        <div><small>{complete?'Ankunft am Ziel':'Ankunft im Abschnitt'}</small><b>{to}</b><RealtimeTime scheduled={destinationPlanned} actual={destinationFresh?destinationActual:destinationPlanned} realtime={destinationFresh&&destinationRealtime} cancelled={last?.cancelled} compact/></div>
      </div>
      <div className="train-action-row"><button type="button" className={tracked?'track-button active':'track-button'} onClick={onTrack} aria-pressed={tracked} disabled={!tracked&&!canTrack}><UiIcon name="location"/>{tracked?'Verfolgung beenden':'Auf Karte verfolgen'}</button><button type="button" className="train-jump-next" onClick={()=>void shareTrain()}><UiIcon name="share"/>Fahrt teilen</button>{onShowRoute&&route?.tripId===trip.tripId&&<button type="button" className="train-jump-next" onClick={onShowRoute}>Gesamte Strecke auf Karte</button>}{nextStop&&<button type="button" className="train-jump-next" onClick={()=>{nextStopRef.current?.scrollIntoView({block:'center',behavior:document.documentElement.dataset.motion==='reduced'||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});nextStopRef.current?.focus({preventScroll:true});}}>Zum nächsten Halt</button>}</div>
      {shareResult.tripId===trip.tripId&&shareResult.message&&<p className="train-tracking-caption" role="status">{shareResult.message}</p>}
      {tracked&&<p className="train-tracking-caption" role="status">{canTrack?'Kamera folgt der geschätzten Zugposition.':'Verfolgung pausiert: keine aktuelle Position.'}</p>}
      <section className="train-stops-section" aria-label="Vollständiger Fahrtverlauf">
        <div className="train-stops-header"><div><b>Alle Halte</b><small>{stops.length?(hiddenStops? `${shownStops.length} von ${stops.length} Halten · ${hiddenStops} frühere ausgeblendet`:`${stops.length} Halte`):'Start → Ziel'}</small></div>{canHideEarlier&&<button type="button" aria-pressed={onlyRemaining} onClick={()=>setStopView({tripId:trip.tripId,onlyRemaining:!onlyRemaining})}>{onlyRemaining?'Alle zeigen':'Ab jetzt'}</button>}</div>
        {detailState==='loading'&&<p className="train-stops-state" role="status">Vollständiger Fahrtverlauf wird geladen …</p>}
        {detailState==='error'&&<div className="train-route-error" role="status"><p>{stops.length?'Aktualisierung fehlgeschlagen. Der letzte Fahrtverlauf bleibt sichtbar.':'Vollständiger Fahrtverlauf derzeit nicht verfügbar. Oben ist nur der aktuelle Abschnitt zu sehen.'}</p><button type="button" onClick={()=>setRetry(value=>value+1)}>Erneut laden</button></div>}
        <ol className="train-stop-list">{shownStops.map((stop,shownIndex)=>{
          const index=shownIndex+hiddenStops;
          const isNext=index===nextIndex,isPast=detailFresh&&at(stop.departure??stop.arrival)!==null&&at(stop.departure??stop.arrival)!<now-60_000;
          const actual=index===0?stop.departure??stop.arrival:stop.arrival??stop.departure,scheduled=index===0?stop.scheduledDeparture??stop.scheduledArrival:stop.scheduledArrival??stop.scheduledDeparture;
          return <li key={`${index}-${stop.name}`} ref={isNext?nextStopRef:undefined} tabIndex={isNext?-1:undefined} aria-current={isNext?'step':undefined} className={stop.cancelled?'cancelled':isNext?'next':isPast?'passed':''}><i aria-hidden="true"/><span><b>{label(stop.name)}</b><small>{stop.cancelled?'Halt entfällt':[index===0?'Start':index===stops.length-1?'Ziel':isNext?(nextPhase==='at-stop'?'Aufenthalt laut Fahrzeiten':'Nächster Halt'):'',stop.platform?`Gleis ${stop.platform}`:''].filter(Boolean).join(' · ')}</small></span><RealtimeTime scheduled={scheduled} actual={detailFresh?actual:scheduled} realtime={detailFresh&&stop.realtime} cancelled={stop.cancelled} compact/></li>;
        })}</ol>
      </section>
      <details className="train-data-disclosure"><summary>Position & Datenquelle</summary><p>Position und Richtung sind aus Streckengeometrie und Haltezeiten geschätzt, keine GPS-Ortung.{speed===null?'':` Geschwindigkeit zwischen den Halten: ungefähr ${speed} km/h (Modell).`}</p><small>Transitous / MOTIS · Fahrtverlauf: {detailsUpdatedAt?detailsUpdatedAt.toLocaleTimeString('de-DE',{timeZone:'Europe/Berlin',hour:'2-digit',minute:'2-digit'}):'nicht verfügbar'} · {detailFresh?'aktuell':'nicht aktuell'}</small></details>
    </div>
  </section>;
}
