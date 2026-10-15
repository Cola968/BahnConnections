"use client";
import {useEffect,useMemo,useState} from "react";
import {listStationCalls,type StationCall,type StationRadarDirection} from "./station-radar-data";
import {RealtimeTime} from "./realtime-time";
import {RealtimePlatform} from "./realtime-platform";

type Stop={name?:string;arrival?:string;departure?:string;scheduledArrival?:string;scheduledDeparture?:string;cancelled?:boolean};
type Leg={from?:Stop;to?:Stop;intermediateStops?:Stop[];cancelled?:boolean};
type DisplayStop={name:string;arrival?:string;departure?:string;cancelled:boolean};
type Detail={id:string;state:"loading"|"ready"|"error";stops:DisplayStop[]};
const time=(value:string|number|undefined)=>{
  if(value===undefined)return "–";
  const date=new Date(value);
  return Number.isFinite(date.getTime())?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(date):"–";
};
function parseStops(legs:Leg[]):DisplayStop[]{
  const stops:DisplayStop[]=[];
  for(const leg of legs){
    for(const stop of [leg.from,...(Array.isArray(leg.intermediateStops)?leg.intermediateStops:[]),leg.to]){
      if(typeof stop?.name!=="string"||!stop.name.trim())continue;
      const arrival=stop.arrival??stop.scheduledArrival,departure=stop.departure??stop.scheduledDeparture;
      const previous=stops.at(-1);
      if(previous?.name===stop.name&&previous.arrival===arrival&&previous.departure===departure){
        previous.cancelled ||= Boolean(leg.cancelled||stop.cancelled);continue;
      }
      stops.push({name:stop.name,arrival,departure,cancelled:Boolean(leg.cancelled||stop.cancelled)});
    }
  }
  return stops;
}
function EventTime({call,kind,fresh}:{call:StationCall;kind:"arrival"|"departure";fresh:boolean}){
  const actual=call[kind],planned=kind==="arrival"?call.scheduledArrival:call.scheduledDeparture;
  const predicted=kind==="arrival"?call.arrivalRealtime:call.departureRealtime;
  const platform=kind==="arrival"?call.arrivalTrack:call.departureTrack;
  const plannedPlatform=kind==="arrival"?call.arrivalScheduledTrack:call.departureScheduledTrack;
  if(actual===undefined&&planned===undefined)return null;
  const label=kind==="arrival"?"Ankunft":"Abfahrt";
  // Expired predictions cannot masquerade as live after a failed poll.
  const current=predicted&&!fresh ? planned : actual;
  const date=current===undefined?null:new Date(current);
  return <span className="station-radar-event">
    <small>{label}{date&&Number.isFinite(date.getTime())?" · "+new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit"}).format(date):""}</small>
    {current===undefined?<strong className="station-radar-time-missing">Prognose veraltet</strong>
      :<RealtimeTime scheduled={planned!==undefined?new Date(planned).toISOString():undefined}
        actual={!predicted||fresh?new Date(current).toISOString():undefined}
        realtime={Boolean(predicted&&fresh)} cancelled={call.cancelled} compact />}
    {(platform||plannedPlatform)&&<small className="station-radar-platform">
      <RealtimePlatform scheduled={plannedPlatform}
        actual={predicted&&fresh?platform:plannedPlatform??(!predicted?platform:undefined)} />
    </small>}
  </span>;
}
/** Only fetch a trip on user selection; never fan out to thousands of trip endpoints. */
export function StationRadarTripList({calls,direction,status,coverage,updatedAt,onRefresh}:{
  calls:Map<string,StationCall>;direction:StationRadarDirection;
  status:"loading"|"ready"|"stale"|"error";coverage:"complete"|"partial"|"unknown";updatedAt:number;onRefresh:()=>void;
}){
  const [open,setOpen]=useState(false),[query,setQuery]=useState("");
  const [limit,setLimit]=useState(60),[selected,setSelected]=useState<string|null>(null);
  const [detail,setDetail]=useState<Detail|null>(null),[retry,setRetry]=useState(0);
  const [clock,setClock]=useState(0);
  useEffect(()=>{
    const tick=()=>setClock(Date.now());
    const initial=window.setTimeout(tick,0);
    const timer=window.setInterval(tick,30_000);
    return()=>{window.clearTimeout(initial);window.clearInterval(timer);};
  },[]);
  const rows=useMemo(()=>listStationCalls(calls,direction,query),[calls,direction,query]);
  // Render remains pure. Even a "ready" result expires while a page is hidden;
  // its old predictions must never continue to look live after 150 seconds.
  const fresh=status==="ready"&&clock>0&&updatedAt>0&&clock-updatedAt>=-10_000&&clock-updatedAt<=150_000;
  useEffect(()=>{
    if(!open||!selected)return;
    const controller=new AbortController();
    void (async()=>{
      try{
        const response=await fetch(`/api/trips/transitous/${encodeURIComponent(selected)}`,{signal:AbortSignal.any([controller.signal,AbortSignal.timeout(12_000)]),cache:"no-store"});
        if(!response.ok)throw Error("Fahrtverlauf nicht erreichbar");
        const payload=await response.json() as {trip?:{legs?:Leg[]}};
        if(!Array.isArray(payload.trip?.legs))throw Error("Ungültiger Fahrtverlauf");
        const stops=parseStops(payload.trip.legs);
        if(!controller.signal.aborted)setDetail({id:selected,state:"ready",stops});
      }catch{if(!controller.signal.aborted)setDetail({id:selected,state:"error",stops:[]});}
    })();
    return()=>controller.abort();
  },[open,selected,retry]);
  const toggle=(id:string)=>{
    if(id===selected){setSelected(null);setDetail(null);}
    else{setSelected(id);setDetail({id,state:"loading",stops:[]});}
  };
  return <div className="station-radar-trip-browser">
    <button type="button" className="station-radar-trip-toggle" aria-expanded={open} aria-controls="station-radar-trip-browser-list"
      onClick={()=>{setOpen(value=>!value);setSelected(null);setDetail(null);}}>
      {open?"Fahrtenliste schließen":`Alle Bahnhofshalte ansehen (${calls.size})`}
    </button>
    {open&&<div id="station-radar-trip-browser-list" className="station-radar-trip-browser-list">
      <p className="station-radar-trip-disclosure" role="status">
        {status==="loading"?"Halte werden geladen …":status==="error"?"Bahnhofshalte nicht erreichbar":status==="stale"?`${rows.length} ältere Fahrten · Aktualisierung fehlgeschlagen (nicht live)`:`${rows.length} von ${calls.size} Fahrten`}
        {coverage==="partial"?" · Teilweise verfügbar":""}{status==="ready"&&!fresh&&clock>0?" · Echtzeitstand veraltet":""}
        {updatedAt>0?` · Abgerufen ${time(updatedAt)}`:""} · Keine GPS-Positionen
      </p>
      <button type="button" className="station-radar-trip-more" onClick={onRefresh} disabled={status==="loading"}>Aktualisieren</button>
      <label className="station-radar-trip-search">Fahrten durchsuchen
        <input type="search" value={query} onChange={event=>{setQuery(event.target.value);setLimit(60);}} placeholder="Linie, Ziel oder Fahrt-ID"/>
      </label>
      {status==="error"&&<p>Bahnhofshalte konnten nicht geladen werden. Bitte später erneut versuchen.</p>}
      {status==="ready"&&rows.length===0&&<p>Keine passenden Fahrten im gelieferten Zeitfenster.</p>}
      <ul className="station-radar-trip-rows">{rows.slice(0,limit).map(({tripId,call})=><li key={tripId}>
        <button type="button" aria-expanded={selected===tripId} aria-controls={selected===tripId?"station-radar-selected-trip":undefined} onClick={()=>toggle(tripId)}>
          <b>{call.name??"Zugfahrt"}</b><span>{call.destination??"Ziel nicht gemeldet"}<small>{call.cancelled?"Halt entfällt":status==="stale"?"Alter Abruf – keine aktuelle Prognose":call.realtime?"Prognose vorhanden":"Fahrplan / Status unbekannt"}</small></span>
          <span className="station-radar-events">
            <EventTime call={call} kind="arrival" fresh={fresh}/>
            <EventTime call={call} kind="departure" fresh={fresh}/>
          </span>
        </button>
        {selected===tripId&&<div id="station-radar-selected-trip" className="station-radar-trip-detail" role="region" aria-label="Fahrtverlauf">
          {detail?.id!==tripId||detail.state==="loading"?<p role="status">Fahrtverlauf wird geladen …</p>
          :detail.state==="error"?<p role="status">Fahrtverlauf nicht erreichbar. <button type="button" onClick={()=>{setDetail({id:tripId,state:"loading",stops:[]});setRetry(value=>value+1);}}>Erneut versuchen</button></p>
          :detail.stops.length===0?<p>Der Anbieter liefert keinen Halteverlauf.</p>
          :<><p>{detail.stops.length} gemeldete Halte · Transitous / MOTIS · ohne Positionsschätzung</p>
            <ol>{detail.stops.map((stop,index)=><li key={index}><b>{stop.name}</b><span>{stop.cancelled?"Entfällt · ":""}{stop.arrival?"An "+time(stop.arrival):""}{stop.arrival&&stop.departure?" · ":""}{stop.departure?"Ab "+time(stop.departure):""}{!stop.arrival&&!stop.departure?"Keine Zeitangabe":""}</span></li>)}</ol></>}
        </div>}
      </li>)}</ul>
      {rows.length>limit&&<button type="button" className="station-radar-trip-more" onClick={()=>setLimit(value=>value+60)}>Weitere {Math.min(60,rows.length-limit)} Fahrten anzeigen</button>}
    </div>}
  </div>;
}
