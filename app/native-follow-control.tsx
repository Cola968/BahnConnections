"use client";
import {useEffect,useState} from 'react';
import {syncAndroidFollow} from './android-follow-bridge';
type NativeSession={id:string;name:string;from:string;to:string};

/** Reflect the service's persisted state after WebView/process recreation. */
export function NativeFollowControl(){
  const [session,setSession]=useState<NativeSession|null>(null);
  const [unavailable,setUnavailable]=useState(false);
  useEffect(()=>{
    const update=(event:Event)=>{
      const detail=(event as CustomEvent<NativeSession|null>).detail;
      setSession(detail&&typeof detail.id==='string'&&typeof detail.name==='string'?detail:null);
      setUnavailable(false);
    };
    const stopped=()=>setSession(null);
    const refresh=()=>window.BahnConnectionsAndroid?.status?.();
    const failed=()=>setUnavailable(true);
    window.addEventListener('bahnconnections-native-follow-state',update);
    window.addEventListener('bahnconnections-native-follow-stopped',stopped);
    window.addEventListener('bahnconnections-native-ready',refresh);
    window.addEventListener('bahnconnections-native-follow-unavailable',failed);
    refresh();
    return()=>{
      window.removeEventListener('bahnconnections-native-follow-state',update);
      window.removeEventListener('bahnconnections-native-follow-stopped',stopped);
      window.removeEventListener('bahnconnections-native-ready',refresh);
      window.removeEventListener('bahnconnections-native-follow-unavailable',failed);
    };
  },[]);
  if(unavailable)return <p role="status">Android-Verfolgung nicht gestartet. Benachrichtigungsberechtigung und WebView-Unterstützung prüfen.</p>;
  if(!session)return null;
  return <div className="v53-version-row"><span><b>Android verfolgt {session.name}</b><small>{session.from} → {session.to}</small></span>
    <button type="button" onClick={()=>syncAndroidFollow(null)}>Stop Following</button></div>;
}
