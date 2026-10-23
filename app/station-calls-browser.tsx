"use client";

import {useEffect,useId,useLayoutEffect,useMemo,useRef,useState} from "react";
import {revealPanelContent} from "./panel-content-visibility";
import {UiIcon} from "./ui-icon";
import {type StationCall,type StationRadarDirection} from "./station-radar-data";
import {browseStationCalls,type CallQuickFilter} from "./station-call-presentation";

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
  const [quick,setQuick]=useState<CallQuickFilter>("all");
  const [clock,setClock]=useState<number|null>(null);
  const sectionRef=useRef<HTMLElement>(null);
  const filtersRef=useRef<HTMLDivElement>(null);
  const needsReveal=useRef(true);
  useLayoutEffect(()=>{
    if(!open){needsReveal.current=true;return;}
    if(!needsReveal.current)return;
    const frame=requestAnimationFrame(()=>{
      revealPanelContent(sectionRef.current,filtersRef.current);
      if(snapshot.status!=="loading")needsReveal.current=false;
    });
    return()=>cancelAnimationFrame(frame);
  },[open,snapshot.status]);
  useEffect(()=>{
    if(!open)return;
    const update=()=>setClock(Date.now());
    const start=window.setTimeout(update,0);
    const timer=window.setInterval(update,30_000);
    return()=>{window.clearTimeout(start);window.clearInterval(timer);};
  },[open]);
  const valid=snapshot.status==="ready"&&snapshot.updatedAt>0&&clock!==null&&clock>=snapshot.updatedAt-10_000&&clock-snapshot.updatedAt<120_000;
  const rows=useMemo(()=>browseStationCalls(snapshot.calls,direction,query,quick,clock??0,valid),[snapshot.calls,direction,query,quick,clock,valid]);
  const visible=rows.slice(0,limit);
  const partial=snapshot.coverage!=="complete";
  return <section ref={sectionRef} className="v61-call-browser" aria-label="Bahnhofsfahrten aus Fahrplandaten">
    <button type="button" className="v61-call-toggle" aria-expanded={open} aria-controls={regionId} onClick={onToggle}>
      <span><UiIcon name="train"/><span><strong>Weitere Bahnhofshalte</strong><small>Auch Fahrten ohne Kartenmarker</small></span></span>
      <UiIcon name="chevron" className={open?"v61-call-chevron is-open":"v61-call-chevron"}/>
    </button>
    {open&&<div className="v61-call-content" id={regionId}>
      <p className="v61-call-context">Gemeldete Halte für {stationName}, unabhängig vom Kartenausschnitt. Prognosen und Gleisänderungen werden nur bei aktuellen Quelldaten hervorgehoben. Keine berechneten Zugpositionen.</p>
      {snapshot.status==="loading"&&<p role="status" className="v61-call-message">Bahnhofshalte werden geladen …</p>}
      {snapshot.status==="error"&&<div className="v61-call-message" role="status"><span>Bahnhofshalte gerade nicht erreichbar.</span><button type="button" onClick={snapshot.refresh}>Erneut versuchen</button></div>}
      {(snapshot.status==="ready"||snapshot.status==="stale")&&<>
        <div className="v61-call-status" role="status">
          <span>{snapshot.status==="stale"?"Letzte Abfrage fehlgeschlagen · älterer Stand":partial?"Ankunft oder Abfahrt teilweise nicht erreichbar":"Ankunft und Abfahrt abgefragt"}</span>
          <button type="button" onClick={snapshot.refresh}>Aktualisieren</button>
        </div>
        <div ref={filtersRef} className="v61-call-filters">
          <label htmlFor={regionId+"-search"}>Zug oder Ziel suchen</label>
          <input id={regionId+"-search"} type="search" maxLength={100} value={query} onChange={event=>{setQuery(event.target.value);setLimit(40);}} placeholder="z. B. ICE 100 oder Hamburg"/>
          <div className="v61-call-directions" role="group" aria-label="Bahnhofshalte nach Richtung filtern">
            {([["all","Alle"],["inbound","Ankünfte"],["outbound","Abfahrten"]] as const).map(([value,label])=><button key={value} type="button" aria-pressed={direction===value} onClick={()=>{setDirection(value);setLimit(40);}}>{label}</button>)}
          </div>
        </div>
        <div className="v62-call-quick-filters" role="group" aria-label="Schnellfilter für Bahnhofshalte">
          {([["all","Alle"],["next-hour","Nächste 60 Min"],["late","Verspätet"],["platform-change","Gleiswechsel"]] as const).map(([value,label])=>
            <button type="button" key={value} aria-pressed={quick===value} disabled={!valid&&(value==="late"||value==="platform-change")} onClick={()=>{setQuick(value);setLimit(40);}}>{label}</button>)}
        </div>
        {!valid&&<p className="v62-call-freshness">Echtzeitfilter sind nur mit aktueller, vollständiger Quellenantwort verfügbar. Fahrplanzeiten werden weiterhin angezeigt, sofern bestätigt vorhanden.</p>}
        <p className="v61-call-count">{rows.length} {rows.length===1?"Fahrt":"Fahrten"} im abgefragten Zeitfenster{query?" für diese Suche":""}.</p>
        {rows.length===0?<p className="v61-call-message">Keine passenden Fahrten in den verfügbaren Daten.</p>:<ol className="v61-call-list">
          {visible.map(({tripId,call,view})=><li key={tripId} className="v61-call-row v62-call-row">
              <span className="v62-call-clock">
                <time dateTime={view.eventTime!==null?new Date(view.eventTime).toISOString():undefined}>{timeLabel(view.eventTime??undefined)}</time>
                {view.status==="forecast"&&view.plannedTime!==null&&view.plannedTime!==view.eventTime&&<del aria-label="Planmäßige Zeit">{timeLabel(view.plannedTime)}</del>}
              </span>
              <span className="v61-call-identity">
                <strong>{call.name||"Zugfahrt"}</strong><small>{call.destination||"Ziel nicht gemeldet"}</small>
                {view.platform&&<small className={view.platformChanged?"v62-platform-change":"v62-platform"}>Gleis {view.platform}{view.platformChanged&&view.plannedPlatform?` · statt ${view.plannedPlatform}`:""}</small>}
              </span>
              <span className="v61-call-evidence">
                {view.status==="forecast"?"Prognose":"Fahrplan"}
                {view.delayMinutes!==null&&view.delayMinutes!==0&&<b className={view.delayMinutes>0?"v62-delay-late":"v62-delay-early"}>{view.delayMinutes>0?"+":""}{view.delayMinutes} Min.</b>}
                <small>{view.kind==="arrival"?"Ankunft":"Abfahrt"}</small>
              </span>
            </li>)}
        </ol>}
        {rows.length>visible.length&&<button className="v61-call-more" type="button" onClick={()=>setLimit(value=>value+40)}>Weitere {Math.min(40,rows.length-visible.length)} anzeigen</button>}
        <p className="v61-call-disclaimer">Quelle: Transitous / MOTIS. Bei veralteten Daten werden vorherige Prognosezeiten und Gleiswechsel nicht als gültiger Fahrplan ausgegeben. Ausfälle und nicht verifizierte Halte werden nicht als bestätigte Fahrten ergänzt.</p>
      </>}
    </div>}
  </section>;
}
