"use client";
import { useEffect, useEffectEvent, useState } from 'react';
import type { Station } from './network-data';
import { fetchLiveTrips, type LiveTrip } from './live-trains';
import { VisibilityPoller } from './visibility-poller';
import { radarCoverageKey } from './radar-coverage';

export function useLiveRadar(station:Station|null,enabled:boolean,onRefresh:(trips:LiveTrip[])=>void){
  const key = station ? radarCoverageKey(station) : null;
  const [data,setData]=useState<{coverageKey:string|null;trips:LiveTrip[];state:'loading'|'ready'|'stale'|'error';updatedAt:Date|null}>({coverageKey:null,trips:[],state:'loading',updatedAt:null});
  const refresh=useEffectEvent(onRefresh);
  useEffect(()=>{
    if(!station||!enabled)return;
    let loaded=false;
    const poller=new VisibilityPoller(async signal=>{
      try {
        const trips=await fetchLiveTrips(station,signal);if(signal.aborted)return;
        loaded=true;setData({coverageKey:key,trips,state:'ready',updatedAt:new Date()});refresh(trips);
      } catch {
        if(signal.aborted)return;
        setData(current=>loaded?{...current,state:'stale'}:{coverageKey:key,trips:[],state:'error',updatedAt:null});
      }
    },45_000,document);
    return ()=>poller.dispose();
  },[station,enabled,key]);
  // Never expose a previous station's data while its successor is loading.
  return enabled&&key&&data.coverageKey===key?data:{trips:[],state:'loading' as const,updatedAt:null};
}
