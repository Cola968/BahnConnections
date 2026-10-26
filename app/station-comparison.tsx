"use client";
import {useEffect,useMemo,useState} from "react";
import type {Station} from "./network-data";
import {requireTransitousStopId} from "./transitous";
import {compareStationBoard,stationComparisonVerdict,type CompareBoardResponse,type StationCompareSnapshot} from "./station-compare-core";

type Loaded={left:StationCompareSnapshot|null;right:StationCompareSnapshot|null;leftError:string|null;rightError:string|null;loading:boolean};
const empty:Loaded={left:null,right:null,leftError:null,rightError:null,loading:true};
const number=(count:number)=>count.toLocaleString("de-DE");
const metric=(data:StationCompareSnapshot|null,formatter:(s:StationCompareSnapshot)=>string)=>data?formatter(data):"–";
const byModes=(snapshot:StationCompareSnapshot,modes:string[])=>number(modes.reduce((sum,mode)=>sum+(snapshot.byMode[mode]??0),0));
const quality=(snapshot:StationCompareSnapshot|null)=>{
  if(!snapshot)return "Nicht verfügbar";
  if(snapshot.freshness!=="recent")return "Quelle nicht aktuell";
  return snapshot.sampleCoverage==="partial"?"Teilantwort":"Zeitnaher Abruf";
};

export function StationComparison({station,stations}:{station:Station;stations:Station[]}){
  const [selectedId,setSelectedId]=useState(()=>{
    const nearby=stations.filter(item=>item.id!==station.id);
    if(station.id==="berlin"&&nearby.some(item=>item.id==="berlin_ost"))return "berlin_ost";
    return nearby.sort((a,b)=>((a.lat-station.lat)**2+(a.lon-station.lon)**2)-((b.lat-station.lat)**2+(b.lon-station.lon)**2))[0]?.id??"";
  });
  const [lookup,setLookup]=useState("");
  const [windowMinutes,setWindowMinutes]=useState<60|120|180>(120);
  const [reload,setReload]=useState(0);
  const [loaded,setLoaded]=useState<Loaded>(empty);
  const other=stations.find(item=>item.id===selectedId&&item.id!==station.id)
    ??stations.find(item=>item.id==="berlin"&&item.id!==station.id)
    ??stations.find(item=>item.id!==station.id);
  const options=useMemo(()=>{
    const matches=stations.filter(item=>item.id!==station.id&&item.name.toLocaleLowerCase("de").includes(lookup.trim().toLocaleLowerCase("de"))).slice(0,60);
    if(other&&!matches.some(item=>item.id===other.id))matches.unshift(other);
    return matches;
  },[lookup,other,station.id,stations]);

  useEffect(()=>{
    if(!other)return;
    const controller=new AbortController();
    setLoaded(empty);
    const from=Date.now()-60_000;
    // Both stations use exactly the same window start; avoid accidental day-shift bias.
    const fetchSnapshot=async(item:Station):Promise<StationCompareSnapshot>=>{
      const id=await requireTransitousStopId(item,controller.signal);
      const endpoint=new URL(`/api/stations/${encodeURIComponent(id)}/board`,window.location.origin);
      endpoint.searchParams.set("kind","departure");
      endpoint.searchParams.set("time",new Date(from).toISOString());
      endpoint.searchParams.set("window",String(windowMinutes*60));
      endpoint.searchParams.set("n","50");
      endpoint.searchParams.set("verify","0");
      const signal=AbortSignal.any([controller.signal,AbortSignal.timeout(20_000)]);
      const response=await fetch(endpoint,{signal,cache:"no-store"});
      if(!response.ok)throw new Error(`Bahnhofsdaten HTTP ${response.status}`);
      const payload=await response.json() as CompareBoardResponse;
      if(!Array.isArray(payload.stopTimes))throw new Error("Keine gültige Tafelantwort");
      return compareStationBoard(payload,from,windowMinutes,Date.now());
    };
    void Promise.allSettled([fetchSnapshot(station),fetchSnapshot(other)]).then(results=>{
      if(controller.signal.aborted)return;
      setLoaded({
        left:results[0].status==="fulfilled"?results[0].value:null,
        right:results[1].status==="fulfilled"?results[1].value:null,
        leftError:results[0].status==="rejected"?(results[0].reason instanceof Error?results[0].reason.message:"Abfrage fehlgeschlagen"):null,
        rightError:results[1].status==="rejected"?(results[1].reason instanceof Error?results[1].reason.message:"Abfrage fehlgeschlagen"):null,
        loading:false
      });
    });
    return ()=>controller.abort();
  },[station,other,windowMinutes,reload]);

  if(!other)return <p role="status">Für einen Vergleich wird ein zweiter Bahnhof benötigt.</p>;
  const verdict=stationComparisonVerdict(loaded.left,loaded.right);
  const maxBucket=Math.max(1,...(loaded.left?.departuresByBucket??[]),...(loaded.right?.departuresByBucket??[]));
  const rows:{label:string;format:(s:StationCompareSnapshot)=>string}[]=[
    {label:"Gemeldete Abfahrten",format:s=>number(s.total)},
    {label:"Fernverkehr",format:s=>byModes(s,["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL"])},
    {label:"Regionalverkehr",format:s=>byModes(s,["REGIONAL_FAST_RAIL","REGIONAL_RAIL"])},
    {label:"S-Bahn",format:s=>byModes(s,["SUBURBAN"])},
    {label:"U-Bahn",format:s=>byModes(s,["SUBWAY"])},
    {label:"Straßenbahn",format:s=>byModes(s,["TRAM"])},
    {label:"Ausfälle (gemeldet)",format:s=>number(s.cancelled)},
    {label:"Fahrten mit aktueller Prognose",format:s=>number(s.realtimeCount)},
    {label:"Davon auswertbare Verspätungen",format:s=>number(s.validDelaySamples)},
    {label:"Ab 6 Min. verspätet",format:s=>s.validDelaySamples?number(s.delayed6):"Nicht auswertbar"},
    {label:"Anteil ab 6 Min. (Prognosen)",format:s=>s.validDelaySamples?`${(100*s.delayed6/s.validDelaySamples).toLocaleString("de-DE",{maximumFractionDigits:1})} %`:"Nicht auswertbar"}
  ];
  return <section className="v63-station-compare" id="station-panel-compare" role="tabpanel" aria-labelledby="station-tab-compare">
    <header className="v63-compare-header"><span className="eyebrow plain">V63 · Stationsvergleich</span><h2>Zwei Bahnhöfe vergleichen</h2>
      <p>Gleiches Zeitfenster, getrennte Abfragen. Die Werte gelten nur für gemeldete Abfahrten — nicht für das gesamte Verkehrsangebot.</p>
    </header>
    <div className="v63-compare-controls">
      <div><label htmlFor="v63-compare-search">Vergleichsbahnhof suchen</label><input id="v63-compare-search" value={lookup} onChange={event=>setLookup(event.target.value)} placeholder="Bahnhofsname filtern" type="search" autoComplete="off"/></div>
      <div><label htmlFor="v63-compare-target">Zweiten Bahnhof wählen</label><select id="v63-compare-target" value={other.id} onChange={event=>{setSelectedId(event.target.value);setLookup("");}}>{options.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div><label htmlFor="v63-compare-period">Zeitspanne</label><select id="v63-compare-period" value={windowMinutes} onChange={event=>setWindowMinutes(Number(event.target.value) as 60|120|180)}><option value={60}>60 Minuten</option><option value={120}>120 Minuten</option><option value={180}>180 Minuten</option></select></div>
      <button type="button" onClick={()=>setReload(value=>value+1)} disabled={loaded.loading}>{loaded.loading?"Lädt …":"Beide aktualisieren"}</button>
    </div>
    <div role="status" aria-live="polite" className="v63-compare-status">
      {loaded.loading?"Beide Bahnhofstafeln werden gleichzeitig abgefragt …":loaded.leftError||loaded.rightError?"Mindestens eine Tafel ist momentan nicht verfügbar.":"Abfragen abgeschlossen · Angaben ohne unabhängige DB-Gegenprüfung."}
    </div>
    <table className="v63-compare-table">
      <caption>Abfahrtsstichprobe für die nächsten {windowMinutes} Minuten</caption>
      <thead><tr><th scope="col">Kennzahl</th><th scope="col">{station.name}</th><th scope="col">{other.name}</th></tr></thead>
      <tbody>
        <tr><th scope="row">Datenstatus</th><td>{loaded.loading?"Lädt":loaded.leftError??quality(loaded.left)}</td><td>{loaded.loading?"Lädt":loaded.rightError??quality(loaded.right)}</td></tr>
        {rows.map(row=><tr key={row.label}><th scope="row">{row.label}</th><td>{loaded.loading?"–":metric(loaded.left,row.format)}</td><td>{loaded.loading?"–":metric(loaded.right,row.format)}</td></tr>)}
      </tbody>
    </table>
    {!loaded.loading&&(loaded.left||loaded.right)&&<section className="v63-compare-activity" aria-labelledby="v63-activity-title">
      <h3 id="v63-activity-title">Abfahrten im Zeitverlauf</h3>
      <p>Sechs gleiche Abschnitte. Balkenhöhen zeigen die Anzahl tatsächlich gemeldeter Abfahrten im abgefragten Fenster, keine Hochrechnung.</p>
      <div className="v63-compare-legend"><span><i className="first"/> {station.name}</span><span><i className="second"/> {other.name}</span></div>
      <div className="v63-compare-activity-grid" role="img" aria-label={`Abfahrten in sechs Zeitabschnitten: ${station.name} ${loaded.left?.departuresByBucket.join(", ")??"ohne Daten"}; ${other.name} ${loaded.right?.departuresByBucket.join(", ")??"ohne Daten"}`}>
        {Array.from({length:6},(_,index)=>{
          const first=loaded.left?.departuresByBucket[index]??0;
          const second=loaded.right?.departuresByBucket[index]??0;
          const chunk=windowMinutes/6;
          return <div className="v63-compare-bucket" key={index}>
            <div className="v63-compare-bar-frame"><i className="first" style={{height:`${100*first/maxBucket}%`}}/><i className="second" style={{height:`${100*second/maxBucket}%`}}/></div>
            <small>{Math.round(index*chunk)}–{Math.round((index+1)*chunk)}′</small>
          </div>;
        })}
      </div>
      <p className="v63-compare-gap">Größter beobachteter Abstand zwischen gemeldeten Abfahrten: <b>{metric(loaded.left,s=>s.longestObservedGapMinutes===null?"–":`${s.longestObservedGapMinutes} Min.`)}</b> gegenüber <b>{metric(loaded.right,s=>s.longestObservedGapMinutes===null?"–":`${s.longestObservedGapMinutes} Min.`)}</b>. Keine Aussage über ausgefallene oder nicht erfasste Fahrten.</p>
    </section>}
    {!loaded.loading&&<div className="v63-compare-evidence">
      <strong>{verdict.comparable?"Beide Datenstichproben liegen zeitnah vor":"Eingeschränkte Vergleichbarkeit"}</strong>
      {verdict.reasons.map(reason=><p key={reason}>{reason}</p>)}
      {loaded.left?.warnings.length? <details><summary>Quellenhinweise · {station.name}</summary>{loaded.left.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</details>:null}
      {loaded.right?.warnings.length? <details><summary>Quellenhinweise · {other.name}</summary>{loaded.right.warnings.map((warning,i)=><p key={i}>{warning}</p>)}</details>:null}
    </div>}
    <p className="v63-compare-footer">Quelle: Transitous / MOTIS. Abfragezeitfenster identisch, Stationen können unterschiedliche Betreiber- und Teilhaltestellenabdeckung haben. Verzögerungen werden nur aus frischen Prognosen berechnet; fehlende Prognosen sind nicht pünktlich. Die Anzahl gemeldeter Fahrten beweist keine Vollständigkeit.</p>
  </section>;
}
