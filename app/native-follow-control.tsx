"use client";

import {useEffect,useState} from "react";
import {syncAndroidFollow} from "./android-follow-bridge";
import {trainFollowView} from "./train-follow-view";

type NativeSession = {
  id:string;
  name:string;
  from:string;
  to:string;
  departure?:string;
  arrival?:string;
  delay?:number|null;
  realtime?:boolean;
  updatedAt?:number;
  status?:"unverified"|"blocked"|"cancelled"|"stop-cancelled";
};

/** Reconcile Android's actual persisted follow state, not a React-only tracking flag. */
export function NativeFollowControl(){
  const [session,setSession]=useState<NativeSession|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  const [now,setNow]=useState(()=>Date.now());
  useEffect(()=>{
    const update=(event:Event)=>{
      const detail=(event as CustomEvent<NativeSession|null>).detail;
      setSession(detail&&typeof detail.id==="string"&&typeof detail.name==="string"?detail:null);
      setUnavailable(false);
      setNow(Date.now());
    };
    const stopped=()=>setSession(null);
    const refresh=()=>window.BahnConnectionsAndroid?.status?.();
    const failed=()=>setUnavailable(true);
    const clock=window.setInterval(()=>{if(!document.hidden)setNow(Date.now());},30_000);
    window.addEventListener("bahnconnections-native-follow-state",update);
    window.addEventListener("bahnconnections-native-follow-stopped",stopped);
    window.addEventListener("bahnconnections-native-ready",refresh);
    window.addEventListener("bahnconnections-native-follow-unavailable",failed);
    refresh();
    return()=>{
      window.clearInterval(clock);
      window.removeEventListener("bahnconnections-native-follow-state",update);
      window.removeEventListener("bahnconnections-native-follow-stopped",stopped);
      window.removeEventListener("bahnconnections-native-ready",refresh);
      window.removeEventListener("bahnconnections-native-follow-unavailable",failed);
    };
  },[]);
  if(unavailable)return <p role="status">Android-Verfolgung nicht gestartet. Benachrichtigungsberechtigung und WebView-Unterstützung prüfen.</p>;
  if(!session)return null;

  const current=session.status==="unverified"&&session.realtime===true&&typeof session.updatedAt==="number"&&
    session.updatedAt>0&&now>=session.updatedAt&&now-session.updatedAt<=150_000;
  const view=trainFollowView({
    departure:session.departure??"",arrival:session.arrival??"",
    realTime:session.realtime===true,
    delay:typeof session.delay==="number"?session.delay:Number.NaN,
  },now,current);
  const state=session.status==="blocked"?"Routenkonflikt – Verlauf nicht bestätigt":
    session.status==="cancelled"?"Fahrt fällt aus":
    session.status==="stop-cancelled"?"Halt entfällt":
    view.progress===null?"Keine aktuelle Fortschrittsprognose":"Aktuelle Zeitprognose";
  return <section className="v62-native-follow" aria-label="Aktive Android-Zugverfolgung">
    <div className="v62-native-follow-heading">
      <div><small>Auf diesem Gerät verfolgt</small><strong>{session.name}</strong></div>
      <span className={view.progress===null?"v62-native-follow-status":"v62-native-follow-status is-current"}>{state}</span>
    </div>
    <div className="v62-native-follow-route">
      <div><small>Von</small><b>{session.from}</b><time dateTime={session.departure}>{view.departureTime}</time></div>
      <span aria-hidden="true">→</span>
      <div><small>Nach</small><b>{session.to}</b><time dateTime={session.arrival}>{view.arrivalTime}</time></div>
    </div>
    {view.progress!==null&&<progress value={view.progress} max={100} aria-label="Modellierter Zeitfortschritt, kein GPS"/>}
    <div className="v62-native-follow-footer">
      <small>{view.progress===null?"Gespeicherte Zeitangaben · keine live bestätigte Position":`${view.etaLabel} · Modell, kein GPS`}</small>
      <button type="button" onClick={()=>syncAndroidFollow(null)}>Verfolgung beenden</button>
    </div>
  </section>;
}
