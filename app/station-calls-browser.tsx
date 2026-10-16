"use client";

import {useId,useMemo,useState} from "react";
import {UiIcon} from "./ui-icon";
import {listStationCalls,type StationCall,type StationRadarDirection} from "./station-radar-data";

export type StationCallsView = {
  calls:Map<string,StationCall>;
  status:"loading"|"ready"|"stale"|"error";
  coverage:"complete"|"partial"|"unknown";
  updatedAt:number;
  refresh:()=>void;
};

type Props = {
  stationName:string;
  open:boolean;
  onToggle:()=>void;
  snapshot:StationCallsView;
};

const timeLabel=(value:number|undefined)=>value===undefined?"–":new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date(value));

export function StationCallsBrowser({stationName,open,onToggle,snapshot}:Props){
  const regionId=useId();
  const [query,setQuery]=useState("");
  const [direction,setDirection]=useState<StationRadarDirection>("all");
  const [limit,setLimit]=useState(40);
  const rows=useMemo(()=>listStationCalls(snapshot.calls,direction,query),[snapshot.calls,direction,query]);
  const visible=rows.slice(0,limit);
  const valid=snapshot.status==="ready"&&snapshot.updatedAt>0&&Date.now()-snapshot.updatedAt<120_000;
  const partial=snapshot.coverage!=="complete";
  return <section className="v61-call-browser" aria-label="Bahnhofsfahrten aus Fahrplandaten">
    <button type="button" className="v61-call-toggle" aria-expanded={open} aria-controls={regionId} onClick={onToggle}>
      <span><UiIcon name="train"/><span><strong>Weitere Bahnhofshalte</strong><small>Auch Fahrten ohne Kartenmarker</small></span></span>
      <UiIcon name="chevron" className={open?"v61-call-chevron is-open":"v61-call-chevron"}/>
    </button>
    {open&&<div className="v61-call-content" id={regionId}>
      <p className="v61-call-context">Gemeldete Halte für {stationName}. Die Liste ist unabhängig vom sichtbaren Kartenausschnitt. Sie kann unvollständig sein; es werden keine Zugpositionen berechnet.</p>
      {snapshot.status==="loading"&&<p role="status" className="v61-call-message">Bahnhofshalte werden geladen …</p>}
      {snapshot.status==="error"&&<div className="v61-call-message" role="status"><span>Bahnhofshalte gerade nicht erreichbar.</span><button type="button" onClick={snapshot.refresh}>Erneut versuchen</button></div>}
      {(snapshot.status==="ready"||snapshot.status==="stale")&&<>
        <div className="v61-call-status" role="status">
          <span>{snapshot.status==="stale"?"Letzte Abfrage fehlgeschlagen · älterer Stand":partial?"Ankunft oder Abfahrt teilweise nicht erreichbar":"Ankunft und Abfahrt abgefragt"}</span>
          <button type="button" onClick={snapshot.refresh}>Aktualisieren</button>
        </div>
        <div className="v61-call-filters">
          <label htmlFor={regionId+"-search"}>Zug oder Ziel suchen</label>
          <input id={regionId+"-search"} type="search" maxLength={100} value={query} onChange={event=>{setQuery(event.target.value);setLimit(40);}} placeholder="z. B. ICE 100 oder Hamburg"/>
          <div className="v61-call-directions" role="group" aria-label="Bahnhofshalte nach Richtung filtern">
            {([["all","Alle"],["inbound","Ankünfte"],["outbound","Abfahrten"]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={direction===value} onClick={()=>{setDirection(value);setLimit(40);}}>{label}</button>)}
          </div>
        </div>
        <p className="v61-call-count">{rows.length} {rows.length===1?"Fahrt":"Fahrten"} im abgefragten Zeitfenster{query?" für diese Suche":""}.</p>
        {rows.length===0?<p className="v61-call-message">Keine passenden Fahrten in den verfügbaren Daten.</p>:<ol className="v61-call-list">
          {visible.map(({tripId,call})=>{
            const isArrival=direction==="inbound" || (direction==="all"&&(call.arrival??Infinity)<=(call.departure??Infinity));
            const value=isArrival?(call.arrival??call.departure):(call.departure??call.arrival);
            const realtime=valid&&(isArrival?call.arrivalRealtime:call.departureRealtime);
            return <li key={tripId} className="v61-call-row">
              <time dateTime={value!==undefined?new Date(value).toISOString():undefined}>{timeLabel(value)}</time>
              <span className="v61-call-identity"><strong>{call.name||"Zugfahrt"}</strong><small>{call.destination||"Ziel nicht gemeldet"}</small></span>
              <span className="v61-call-evidence">{call.cancelled?"Ausfall":realtime?"Prognose":"Fahrplan"}<small>{isArrival?"Ankunft":"Abfahrt"}</small></span>
            </li>;
          })}
        </ol>}
        {rows.length>visible.length&&<button className="v61-call-more" type="button" onClick={()=>setLimit(value=>value+40)}>Weitere {Math.min(40,rows.length-visible.length)} anzeigen</button>}
        <p className="v61-call-disclaimer">Quelle: gemeldete Halte über Transitous / MOTIS. Prognosen nur bei aktuellem Datenstand. Fehlende Fahrten oder Teilhaltestellen werden nicht ergänzt.</p>
      </>}
    </div>}
  </section>;
}
