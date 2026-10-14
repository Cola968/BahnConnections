"use client";
import {useEffect,useRef,useState} from "react";
import type {Station} from "./network-data";
import {requireTransitousStopId} from "./transitous";
import {VisibilityPoller} from "./visibility-poller";
import {extractStationNotices,filterStationNotices,noticeCategoryCounts,combineStationNoticeFeeds,affectedNoticeLines,type NoticeStopTime,type RailNotice,type RailNoticeFilter,type RailNoticeSort} from "./station-disruptions-data";
import {UiIcon} from "./ui-icon";
import {readPreferenceJson,writePreference} from "./local-preferences";
import {INCIDENT_WATCH_KEY,parseIncidentWatches,toggleIncidentWatch,readIncidentWatch,filterWatchedIncidents} from "./incident-watch";
import {formatIncidentDigest} from "./incident-digest";
import {serviceBadgeStyle,type RailCategory} from "./transit-style";

function lineCategory(line:string):RailCategory{
 if(/^S\s*\d/i.test(line))return "sbahn";
 if(/^U\s*\d/i.test(line))return "ubahn";
 if(/^(ICE|IC|EC|EN|RJ|TGV|FLX)\b/i.test(line))return "fern";
 if(/^(M|T)\s*\d/i.test(line))return "tram";
 return "regional";
}
const formatTime=(value:string)=>new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(value));

const noticeFilters:readonly {id:RailNoticeFilter;name:string}[]=[
 {id:"all",name:"Alle"},
 {id:"construction",name:"Bauarbeiten"},
 {id:"cancellation",name:"Ausfälle"},
 {id:"incident",name:"Sonstige"},
];

export function StationDisruptions({station}:{station:Station}){
 const [refresh,setRefresh]=useState(0);
 const [state,setState]=useState<"loading"|"ready"|"refreshing"|"error">("loading");
 const [items,setItems]=useState<RailNotice[]>([]);
 const [updated,setUpdated]=useState("");
 const [warning,setWarning]=useState("");
 const [filter,setFilter]=useState<RailNoticeFilter>("all");
 const [query,setQuery]=useState("");
 const [lineFocus,setLineFocus]=useState("all");
 const [sortOrder,setSortOrder]=useState<RailNoticeSort>("recommended");
 const [copyMessage,setCopyMessage]=useState("");
 const [watchedLines,setWatchedLines]=useState<string[]>([]);
 const [watchOnly,setWatchOnly]=useState(false);
 const [watchMessage,setWatchMessage]=useState("");
 const currentStationRef=useRef("");
 const hasSuccessfulDataRef=useRef(false);

 useEffect(()=>{
  // Never display stale notices from a previous station as the new station's notices.
  if(currentStationRef.current!==station.id){
   currentStationRef.current=station.id;
   hasSuccessfulDataRef.current=false;
   setItems([]);setUpdated("");setWarning("");setState("loading");
   setFilter("all");setQuery("");setLineFocus("all");setSortOrder("recommended");setCopyMessage("");
  }
  const poller=new VisibilityPoller(async signal=>{
   if(signal.aborted)return;
   setState(hasSuccessfulDataRef.current?"refreshing":"loading");
   const requestSignal=AbortSignal.any([signal,AbortSignal.timeout(20_000)]);
   try{
    const id=await requireTransitousStopId(station,requestSignal);
    // A station may have reports on arriving trains that are absent from its departure list.
    // Share the 350-row budget between both directions rather than doubling the load.
    const kinds=["departure","arrival"] as const;
    const requests=kinds.map(async kind=>{
     const url=new URL("/api/stations/"+encodeURIComponent(id)+"/board",window.location.origin);
     url.searchParams.set("n","175");
     url.searchParams.set("kind",kind);
     url.searchParams.set("verify","0");
     const response=await fetch(url,{signal:requestSignal,cache:"no-store"});
     if(!response.ok)throw new Error("Hinweise "+kind+" HTTP "+response.status);
     const payload=await response.json() as {stopTimes?:unknown;warnings?:unknown};
     return {
      stopTimes:Array.isArray(payload?.stopTimes)?payload.stopTimes as NoticeStopTime[]:[],
      warnings:Array.isArray(payload?.warnings)?payload.warnings.filter((value):value is string=>typeof value==="string"):[]
     };
    });
    if(station.country==='DE')requests.push((async()=>{
     const response=await fetch('/api/stations/'+encodeURIComponent(id)+'/notices',{signal:requestSignal,cache:'no-store'});
     if(!response.ok)throw new Error('Ergänzende regionale Störungsquelle nicht erreichbar');
     const payload=await response.json() as {stopTimes?:unknown;warnings?:unknown};
     return {stopTimes:Array.isArray(payload.stopTimes)?payload.stopTimes as NoticeStopTime[]:[],warnings:Array.isArray(payload.warnings)?payload.warnings.filter((item):item is string=>typeof item==='string'):[]};
    })());
    const results=await Promise.allSettled(requests);
    if(requestSignal.aborted)return;
    const merged=combineStationNoticeFeeds(results);
    if(!merged.successful)throw new Error("Keine Meldungsquellen erreichbar");
    const sourceWarnings=merged.warnings
      .filter(value=>!value.startsWith("DB-Gegenprüfung")).slice(0,2);
    if(merged.partial)sourceWarnings.unshift("Teilansicht: Mindestens eine Fahrplan- oder Störungsquelle war nicht erreichbar.");
    setItems(extractStationNotices(merged.entries));
    setUpdated(new Date().toISOString());
    setWarning(sourceWarnings.join(" · "));
    hasSuccessfulDataRef.current=true;
    setState("ready");
   }catch{
    if(signal.aborted)return;
    if(hasSuccessfulDataRef.current){
     setWarning("Aktualisierung fehlgeschlagen – letzte erfolgreich abgerufene Hinweise werden weiter angezeigt.");
     setState("ready");
    }else setState("error");
   }
  },120_000,document);
  return()=>poller.dispose();
 },[station,station.id,refresh]);

 useEffect(()=>{
  // Delay the optional persistence read until after React commits the station switch.
  const timer=window.setTimeout(()=>{
   try{
    const current=parseIncidentWatches(readPreferenceJson(window.localStorage,INCIDENT_WATCH_KEY));
    setWatchedLines(readIncidentWatch(current,station.id));
   }catch{setWatchedLines([]);}
   setWatchOnly(false);setWatchMessage("");
  },0);
  return()=>window.clearTimeout(timer);
 },[station.id]);

 function toggleWatchedLine(line:string){
  let nextLines:string[];
  try{
   const prev=parseIncidentWatches(readPreferenceJson(window.localStorage,INCIDENT_WATCH_KEY));
   // Preserve items bookmarked in a previous tab when storage is available.
   const next=toggleIncidentWatch(prev,station.id,line);
   nextLines=readIncidentWatch(next,station.id);
   const saved=writePreference(window.localStorage,INCIDENT_WATCH_KEY,JSON.stringify(next));
   setWatchMessage(saved?"Linienauswahl auf diesem Gerät gespeichert.":"Speichern nicht möglich – Auswahl bleibt nur bis zum Neuladen.");
  }catch{
   const next=toggleIncidentWatch({[station.id]:watchedLines},station.id,line);
   nextLines=readIncidentWatch(next,station.id);
   setWatchMessage("Lokale Speicherung nicht verfügbar – Auswahl bleibt nur bis zum Neuladen.");
  }
  setWatchedLines(nextLines);
  if(!nextLines.length)setWatchOnly(false);
 }

 const counts=noticeCategoryCounts(items);
 const filtered=filterStationNotices(items,filter,query,lineFocus,sortOrder);
 const visible=watchOnly?filterWatchedIncidents(filtered,watchedLines):filtered;
 const date=updated?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(updated)):"";
 const hasQuery=Boolean(query.trim());
 const hasFilters=filter!=="all"||hasQuery||lineFocus!=="all"||watchOnly;
 const loaded=state==="ready"||state==="refreshing";
 const affectedLines=affectedNoticeLines(items);
 async function copyNotice(item:RailNotice){
  const lines=[item.headline,item.lines.length?"Betroffene Linien: "+item.lines.join(", "):"Bahnhofshinweis",
   item.direction?"Richtung: "+item.direction:"",item.detail].filter(Boolean);
  if(!navigator.clipboard?.writeText){setCopyMessage("Kopieren auf diesem Gerät nicht verfügbar.");return;}
  try{await navigator.clipboard.writeText(lines.join("\n"));setCopyMessage("Hinweis kopiert.");}
  catch{setCopyMessage("Kopieren nicht möglich. Bitte Geräteberechtigung prüfen.");}
 }
 async function shareIncidentDigest(){
  const digest=formatIncidentDigest({stationName:station.name,retrievedAt:updated,notices:visible,warning});
  try{
   if(navigator.share){
    try{await navigator.share({title:"Betriebslage – "+station.name,text:digest});setCopyMessage("Betriebslage geteilt.");return;}
    catch(error){if((error as Error)?.name==="AbortError")return;}
   }
   if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(digest);setCopyMessage("Gefilterte Betriebslage kopiert.");return;}
   setCopyMessage("Teilen auf diesem Gerät nicht verfügbar.");
  }catch{setCopyMessage("Betriebslage konnte nicht geteilt werden.");}
 }
 const lineBadge=(line:string)=><span key={line} className="incident-line-badge" style={serviceBadgeStyle(lineCategory(line),undefined,undefined,line,station.name)}>{line}</span>;
 return <section className="station-incidents" aria-labelledby="incidents-heading">
  <header className="station-incidents-head"><div><h2 id="incidents-heading">Betriebslage</h2><p>{loaded?`${counts.all} ${counts.all===1?"Meldung":"Meldungen"} im Fahrplanfenster`:"Abfahrten & Ankünfte"}{date&&<> · Stand {date}</>}</p></div><button type="button" onClick={()=>setRefresh(value=>value+1)} disabled={state==="loading"||state==="refreshing"} aria-label="Störungsmeldungen aktualisieren" title="Aktualisieren"><UiIcon name="refresh"/></button></header>
  {loaded&&<div className="incidents-watch">
   <div className="incidents-watch-head"><h3>Meine Linien</h3><p>Nur auf diesem Gerät · keine Push-Benachrichtigungen</p></div>
   {affectedLines.length>0&&<div className="incidents-watch-lines" role="group" aria-label="Linien am Bahnhof merken">{affectedLines.map(line=><button type="button" key={line} aria-pressed={watchedLines.includes(line)} aria-label={watchedLines.includes(line)?line+" nicht mehr merken":line+" merken"} onClick={()=>toggleWatchedLine(line)}><UiIcon name="star"/>{lineBadge(line)}</button>)}</div>}
   {watchedLines.length>0&&<div className="incidents-watch-selected"><span>Gemerkt: {watchedLines.join(", ")}</span><button type="button" aria-pressed={watchOnly} onClick={()=>setWatchOnly(value=>!value)}>{watchOnly?"Alle Meldungen anzeigen":"Nur meine Linien anzeigen"}</button></div>}
   {watchMessage&&<p className="incidents-watch-feedback" role="status">{watchMessage}</p>}
  </div>}
  {loaded&&<><div className="incidents-search-row"><label className="incidents-search"><span className="sr-only">Hinweise durchsuchen</span><input type="search" value={query} maxLength={100} onChange={event=>setQuery(event.target.value)} placeholder="Linie, Störung oder Ziel suchen" aria-label="Störungsmeldungen durchsuchen"/></label>{hasQuery&&<button type="button" onClick={()=>setQuery("")} aria-label="Suche leeren">Löschen</button>}</div>
   <div className="incidents-filters" role="group" aria-label="Meldungstyp">{noticeFilters.map(item=><button type="button" key={item.id} aria-pressed={filter===item.id} className={filter===item.id?"active":""} onClick={()=>setFilter(item.id)}>{item.name} <span aria-hidden="true">{counts[item.id]}</span></button>)}</div>
   <div className="incidents-tools">
    <label><span>Linienfokus</span><select value={lineFocus} onChange={event=>setLineFocus(event.target.value)} aria-label="Störungslinie filtern"><option value="all">Alle betroffenen Linien</option>{affectedLines.map(line=><option key={line} value={line}>{line}</option>)}</select></label>
    <label><span>Reihenfolge</span><select value={sortOrder} onChange={event=>setSortOrder(event.target.value as RailNoticeSort)} aria-label="Meldungen sortieren"><option value="recommended">Standard</option><option value="time">Nach Uhrzeit</option><option value="line">Nach Linie</option></select></label>
   </div>
   <div className="incidents-share-action"><button type="button" onClick={()=>void shareIncidentDigest()}><UiIcon name="copy"/> Ansicht teilen</button><span>Enthält nur geladene Hinweise und Quellstand.</span></div>
  </>}
  {state==="loading"&&<p className="incidents-state" role="status">Aktuelle Hinweise werden geladen …</p>}
  {state==="refreshing"&&<p className="incidents-refreshing" role="status">Hinweise werden im Hintergrund aktualisiert …</p>}
  {state==="error"&&<div className="incidents-state" role="alert"><b>Hinweise derzeit nicht abrufbar.</b><p>Bitte Internetverbindung prüfen und erneut versuchen.</p><button type="button" onClick={()=>setRefresh(value=>value+1)}>Erneut versuchen</button></div>}
  {loaded&&<>{hasFilters&&<p className="incidents-total" role="status">{visible.length} von {counts.all} gemeldeten Hinweisen im geladenen Fahrplanfenster</p>}{copyMessage&&<p className="incidents-copy-feedback" role="status">{copyMessage}</p>}{warning&&<p className="incidents-warning" role="status">{warning}</p>}
   {!visible.length&&<div className="incidents-state"><b>{hasFilters?"Keine Hinweise passen zur Auswahl.":"Keine Hinweise in den abgerufenen Fahrten."}</b><p>Andere Fahrten können trotzdem betroffen sein.</p>{hasFilters&&<button type="button" onClick={()=>{setFilter("all");setQuery("");setLineFocus("all");setSortOrder("recommended");setWatchOnly(false);}}>Alle Hinweise anzeigen</button>}</div>}
   <div className="incidents-list">{visible.map(item=><article key={item.key} className={"incident-card "+item.kind}>
    <details className="incident-disclosure"><summary>
     <span className="incident-row-lines">{item.lines.length?item.lines.map(lineBadge):<UiIcon name="train"/>}</span>
     <span className="incident-row-copy"><span className="incident-kind">{item.kind==="construction"?"Bauarbeiten":item.kind==="cancellation"?"Ausfall":"Störung"}</span><h3>{item.headline}</h3>{item.direction&&<span className="incident-direction">Richtung {item.direction}</span>}{item.plannedTime&&Number.isFinite(Date.parse(item.plannedTime))&&<time dateTime={item.plannedTime}><UiIcon name="clock"/>{formatTime(item.plannedTime)} Uhr</time>}</span>
     <span className="incident-chevron" aria-hidden="true"><UiIcon name="chevron"/></span>
    </summary><div className="incident-expanded">
     {item.detail&&item.detail!==item.headline&&<p className="incident-detail">{item.detail}</p>}
     {item.journey&&<div className="incident-context"><span><b>Gesamte Fahrt</b>{item.journey}</span></div>}
     {!item.journey&&(!item.detail||item.detail===item.headline)&&<p>Keine weiteren Angaben zur Meldung verfügbar.</p>}
     <button className="incident-copy" type="button" onClick={()=>void copyNotice(item)} aria-label={"Meldung kopieren: "+item.headline}><UiIcon name="copy"/> Meldung kopieren</button>
    </div></details>
   </article>)}</div>
  </>}
  <details className="incidents-provenance"><summary>Daten & Aktualisierung</summary><p>Hinweise aus Abfahrten und Ankünften am gewählten Bahnhof: Transitous / MOTIS, in Deutschland ergänzt durch VBB beziehungsweise DB transport.rest.{date?" Letzte erfolgreiche Abfrage: "+date+" Uhr.":" Noch keine erfolgreiche Abfrage."} Automatische Aktualisierung bei geöffneter Ansicht etwa alle zwei Minuten. Das geladene Fahrplanfenster ist keine vollständige Übersicht aller Netzstörungen. Gemerkte Linien werden nur in diesem Browser gespeichert, nicht im Hintergrund überwacht.</p></details>
 </section>;
}
