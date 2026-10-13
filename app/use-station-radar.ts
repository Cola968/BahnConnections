"use client";
import {useEffect,useState} from 'react';
import type {Station} from './network-data';
import {fetchStationCalls,type StationCall} from './station-radar-data';
import {VisibilityPoller} from './visibility-poller';

export function useStationRadar(station:Station|null,enabled:boolean){
  const key=station?`${station.id}:${station.lat}:${station.lon}`:null;
  const [snapshot,setSnapshot]=useState<{key:string|null;calls:Map<string,StationCall>;status:'loading'|'ready'|'error';updatedAt:number}>({key:null,calls:new Map(),status:'loading',updatedAt:0});
  useEffect(()=>{
    if(!station||!enabled)return;
    const poller=new VisibilityPoller(async signal=>{
      try{const calls=await fetchStationCalls(station,signal);if(!signal.aborted)setSnapshot({key,calls,status:'ready',updatedAt:Date.now()});}
      catch{if(!signal.aborted)setSnapshot({key,calls:new Map(),status:'error',updatedAt:0});}
    },45_000,document);
    return()=>poller.dispose();
  },[station,enabled,key]);
  return enabled&&snapshot.key===key?snapshot:{calls:new Map<string,StationCall>(),status:'loading' as const,updatedAt:0};
}
