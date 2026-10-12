"use client";
import {useEffect,useState} from "react";
import type {Station} from "./network-data";
import {requireTransitousStopId} from "./transitous";
import {extractStationNotices,type NoticeStopTime,type RailNotice} from "./station-disruptions-data";
import {UiIcon} from "./ui-icon";

export function StationDisruptions({station}:{station:Station}){
 const [refresh,setRefresh]=useState(0);
 const [state,setState]=useState<"loading"|"ready"|"error">("loading");
 const [items,setItems]=useState<RailNotice[]>([]);
 const [updated,setUpdated]=useState("");
 const [warning,setWarning]=useState("");
 const [onlyConstruction,setOnlyConstruction]=useState(false);
 useEffect(()=>{
  const abort=new AbortController();
  let mounted=true;
  const load=async()=>{
   setState("loading");setItems([]);setWarning("");
   try{
    const id=await requireTransitousStopId(station,abort.signal);
    const url=new URL("/api/stations/"+encodeURIComponent(id)+"/board",window.location.origin);
    url.searchParams.set("n","350");
    const response=await fetch(url,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(20_000)]),cache:"no-store"});
    if(!response.ok)throw new Error("Hinweise HTTP "+response.status);
    const payload=await response.json() as {stopTimes?:NoticeStopTime[];updatedAt?:string;warnings?:string[]};
    if(abort.signal.aborted||!mounted)return;
    setItems(extractStationNotices(Array.isArray(payload.stopTimes)?payload.stopTimes:[]));
    setUpdated(payload.updatedAt??new Date().toISOString());
    setWarning(Array.isArray(payload.warnings)?payload.warnings.filter(x=>typeof x==="string"&&!x.startsWith("DB-Gegenprüfung")).slice(0,2).join(" · "):"");
    setState("ready");
   }catch{if(mounted&&!abort.signal.aborted)setState("error");}
  };
  void load();
  return()=>{mounted=false;abort.abort();};
 },[station.id,refresh,station]);
 const visible=onlyConstruction?items.filter(item=>item.kind==="construction"):items;
 const date=updated&&Number.isFinite(Date.parse(updated))?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(updated)):"";
 return <section className="station-incidents" aria-labelledby="incidents-heading">
  <header className="station-incidents-head"><div><p className="incidents-eyebrow">BETRIEBSLAGE</p><h2 id="incidents-heading">Störungen & Bauarbeiten</h2><p>{station.name}</p></div><button type="button" onClick={()=>setRefresh(n=>n+1)} disabled={state==="loading"}><UiIcon name="refresh"/>Aktualisieren</button></header>
  <div className="incidents-source"><UiIcon name="info"/><span>Meldungen zu abgerufenen Fahrten an diesem Bahnhof.{date?(" · "+date+" Uhr"):""}</span></div>
  <div className="incidents-filters" aria-label="Meldungstyp"><button type="button" aria-pressed={!onlyConstruction} className={!onlyConstruction?"active":""} onClick={()=>setOnlyConstruction(false)}>Alle Hinweise</button><button type="button" aria-pressed={onlyConstruction} className={onlyConstruction?"active":""} onClick={()=>setOnlyConstruction(true)}>Nur Bauarbeiten</button></div>
  {state==="loading"&&<p className="incidents-state" role="status">Aktuelle Hinweise werden geladen …</p>}
  {state==="error"&&<div className="incidents-state" role="alert"><b>Hinweise derzeit nicht abrufbar.</b><p>Bitte Internetverbindung prüfen und erneut versuchen. </p><button type="button" onClick={()=>setRefresh(n=>n+1)}>Erneut versuchen</button></div>}
  {state==="ready"&&<><p className="incidents-total" role="status">{visible.length?visible.length+" gemeldete Hinweise im geladenen Fahrplanfenster":"Keine passenden Meldungen im geladenen Fahrplanfenster"}</p>{warning&&<p className="incidents-warning">{warning}</p>}{!visible.length&&<div className="incidents-state"><b>Keine {onlyConstruction?"Baumeldungen":"Hinweise"} in den abgerufenen Fahrten.</b><p>Andere Fahrten können trotzdem betroffen sein.</p></div>}
  <div className="incidents-list">{visible.map(item=><article key={item.key} className={"incident-card "+item.kind}><div className="incident-card-top"><span>{item.kind==="construction"?"Bauarbeiten":item.kind==="cancellation"?"Ausfall":"Betriebshinweis"}</span>{item.lines.length>0&&<small>{item.lines.join(" · ")}</small>}</div><h3>{item.headline}</h3><div className="incident-context"><span><b>Bahnhof</b>{station.name}</span>{item.direction&&<span><b>Richtung</b>{item.direction}</span>}{item.journey&&<span><b>Fahrt</b>{item.journey}</span>}</div>{item.detail&&item.detail!==item.headline&&<p className="incident-detail">{item.detail}</p>}{!item.journey&&!item.direction&&<small>Weitere Streckenangaben nicht verfügbar.</small>}{item.plannedTime&&Number.isFinite(Date.parse(item.plannedTime))&&<small>Abfahrt / Ankunft: {new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(item.plannedTime))} Uhr</small>}</article>)}</div></>}
 </section>;
}
