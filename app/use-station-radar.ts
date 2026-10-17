"use client";
import {useCallback,useEffect,useState} from 'react';
import type {Station} from './network-data';
import {fetchStationCallSnapshot,type StationCall} from './station-radar-data';
import {VisibilityPoller} from './visibility-poller';
import {failedStationRadarSnapshot,type StationRadarSnapshot} from './station-radar-state';

export function useStationRadar(station:Station|null,enabled:boolean){
  const key=station?`${station.id}:${station.lat}:${station.lon}`:null;
  const [snapshot,setSnapshot]=useState<StationRadarSnapshot>({key:null,calls:new Map(),status:'loading',updatedAt:0,coverage:'unknown'});
  const [refreshVersion,setRefreshVersion]=useState(0);
  const refresh=useCallback(()=>setRefreshVersion(version=>version+1),[]);
  useEffect(()=>{
    if(!station||!enabled)return;
    const poller=new VisibilityPoller(async signal=>{
      try{const result=await fetchStationCallSnapshot(station,signal);if(!signal.aborted)setSnapshot({key,calls:result.calls,coverage:result.coverage,status:'ready',updatedAt:Date.now()});}
      catch{if(!signal.aborted)setSnapshot(previous=>failedStationRadarSnapshot(previous,key));}
    },45_000,document);
    return()=>poller.dispose();
  },[station,enabled,key,refreshVersion]);
  return enabled&&snapshot.key===key?{...snapshot,refresh}:{calls:new Map<string,StationCall>(),status:'loading' as const,updatedAt:0,coverage:'unknown' as const,refresh};
}
