"use client";

import {useSyncExternalStore} from "react";

export type AvailableAppUpdate={label:string;activate:()=>void};
let update:AvailableAppUpdate|null=null;
const listeners=new Set<()=>void>();
const subscribe=(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};};
const snapshot=()=>update;
const serverSnapshot=()=>null;

export function publishAvailableAppUpdate(next:AvailableAppUpdate|null){
  update=next;
  for(const listener of listeners)listener();
}

export function useAvailableAppUpdate(){
  return useSyncExternalStore(subscribe,snapshot,serverSnapshot);
}
