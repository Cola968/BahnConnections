"use client";
import {useEffect,useState} from 'react';
import type {Station} from './network-data';
import {fetchStationCallSnapshot,type StationCall} from './station-radar-data';
import {VisibilityPoller} from './visibility-poller';

export function useStationRadar(station:Station|null,enabled:boolean){
  const key=station?`${station.id}:${station.lat}:${station.lon}`:null;
  const [snapshot,setSnapshot]=useState<{key:string|null;calls:Map<string,StationCall>;status:'loading'|'ready'|'error';updatedAt:number;coverage:'complete'|'partial'|'unknown'}>({key:null,calls:new Map(),status:'loading',updatedAt:0,coverage:'unknown'});
  useEffect(()=>{
    if(!station||!enabled)return;
    const poller=new VisibilityPoller(async signal=>{
      try{const result=await fetchStationCallSnapshot(station,signal);if(!signal.aborted)setSnapshot({key,calls:result.calls,coverage:result.coverage,status:'ready',updatedAt:Date.now()});}
      catch{if(!signal.aborted)setSnapshot({key,calls:new Map(),status:'error',updatedAt:0,coverage:'unknown'});}
    },45_000,document);
    return()=>poller.dispose();
  },[station,enabled,key]);
  return enabled&&snapshot.key===key?snapshot:{calls:new Map<string,StationCall>(),status:'loading' as const,updatedAt:0,coverage:'unknown' as const};
}
