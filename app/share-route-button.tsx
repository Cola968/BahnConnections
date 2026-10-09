"use client";

import { useEffect, useState } from 'react';
import { routeShareUrl } from './route-sharing';
import type { Station } from './network-data';

export function ShareRouteButton({from,to,departure}:{from:Station|null;to:Station|null;departure:string}) {
  const [fallback,setFallback]=useState('');
  const [copied,setCopied]=useState(false);
  useEffect(()=>{const timer=window.setTimeout(()=>{setFallback('');setCopied(false);},0);return()=>window.clearTimeout(timer);},[from,to,departure]);
  useEffect(()=>{if(!copied)return;const timer=window.setTimeout(()=>setCopied(false),4000);return()=>window.clearTimeout(timer);},[copied]);
  const copy=async()=>{
    if(!from||!to)return;
    const url=routeShareUrl(location.origin,from,to,departure);
    if(!url)return;
    try {await navigator.clipboard.writeText(url);setCopied(true);setFallback('');}
    catch {setFallback(url);}
  };
  return <div className="route-share">
    <button type="button" onClick={()=>void copy()} disabled={!from||!to||from.id===to.id}>Suchlink kopieren</button>
    <span role="status">{copied?'Link kopiert. Fahrpläne werden beim Öffnen neu geprüft.':fallback?'Markiere und kopiere den Link.':''}</span>
    {fallback&&<input aria-label="Link zur Verbindungssuche" readOnly value={fallback} onFocus={event=>event.currentTarget.select()} />}
  </div>;
}
