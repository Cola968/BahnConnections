"use client";

import {memo,useMemo,useState} from "react";
import {listStationCalls,type StationCall,type StationRadarDirection} from "./station-radar-data";

const timeFormatter=new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",timeZone:"Europe/Berlin"});

// Map movement and board refreshes must not rebuild a closed list. Keep its
// query/open state local and search the full snapshot, including unloaded rows.
export const RadarStationCalls=memo(function RadarStationCalls({calls,direction}:{calls:Map<string,StationCall>;direction:StationRadarDirection}){
  const [open,setOpen]=useState(false);
  const [query,setQuery]=useState("");
  const [limit,setLimit]=useState(40);
  const rows=useMemo(()=>listStationCalls(calls,direction,query),[calls,direction,query]);
  return <details className="station-radar-calls" onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>Bahnhofsfahrten ({rows.length})</summary>
    {open&&<>
      <label className="station-radar-call-search"><span className="sr-only">Bahnhofsfahrten suchen</span><input aria-label="Bahnhofsfahrten suchen" type="search" maxLength={100} value={query} onChange={event=>{setQuery(event.target.value);setLimit(40);}} placeholder="Zug oder Ziel suchen" /></label>
      <p className="station-radar-call-note">Bestätigte Halte aus der Bahnhofstafel. Nur Züge mit verfügbarer Geometrie erscheinen auf der Karte.</p>
      <ul className="station-radar-call-list">{rows.slice(0,limit).map(({tripId,call})=>{
        const at=call.departure??call.arrival;
        const date=at!==undefined&&Number.isFinite(at)?new Date(at):null;
        return <li key={tripId}><span><b>{call.name??"Fahrt"}</b><small>{call.destination??"Ziel unbekannt"}{call.cancelled?" · Ausfall":""}</small></span><time dateTime={date?.toISOString()}>{date?timeFormatter.format(date):"–"}{call.realtime?" · Live":" · Plan"}</time></li>;
      })}</ul>
      {rows.length>limit&&<button type="button" className="radar-calls-more v61-call-more" onClick={()=>setLimit(value=>value+40)}>Weitere Fahrten ({limit} von {rows.length})</button>}
      {!rows.length&&<p className="station-radar-call-note">Keine passenden Fahrten im aktuellen Zeitfenster.</p>}
    </>}
  </details>;
});
