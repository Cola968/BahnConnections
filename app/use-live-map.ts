"use client";
import { useEffect, useRef, type RefObject } from 'react';
import type * as Leaflet from 'leaflet';
import { LiveMapRenderer, type LiveMapOptions } from './live-map-renderer';
import type { LiveTrip } from './live-trains';

export function useLiveMap(ready:boolean,leaflet:RefObject<typeof Leaflet|null>,mapRef:RefObject<Leaflet.Map|null>,layerRef:RefObject<Leaflet.LayerGroup|null>,trips:LiveTrip[],enabled:boolean,options:LiveMapOptions,onSelect:(trip:LiveTrip)=>void){
  const renderer=useRef<LiveMapRenderer|null>(null);
  useEffect(()=>{
    if(!ready||!leaflet.current||!mapRef.current||!layerRef.current)return;
    const instance=new LiveMapRenderer(leaflet.current,mapRef.current,layerRef.current,onSelect);renderer.current=instance;
    return ()=>{instance.dispose();renderer.current=null;};
  },[ready,leaflet,mapRef,layerRef,onSelect]);
  const {zoom,view,trails,trackedId,selectedId,radarReady,radarUpdatedAtMs,appearance}=options;
  useEffect(()=>{
    function update(){
      if(document.hidden)return;
      const age=radarUpdatedAtMs===null||radarUpdatedAtMs===undefined ? Number.POSITIVE_INFINITY : Date.now()-radarUpdatedAtMs;
      const sourceFresh=radarReady===true && age>=0 && age<=90_000;
      // Never animate extrapolated vehicles when source polling fails or expires.
      renderer.current?.sync(enabled&&sourceFresh?trips:[],{zoom,view,trails,trackedId,selectedId});
    }
    update();const timer=enabled?setInterval(update,4000):null;
    document.addEventListener('visibilitychange',update);
    return ()=>{if(timer!==null)clearInterval(timer);document.removeEventListener('visibilitychange',update);};
  },[ready,enabled,trips,zoom,view,trails,trackedId,selectedId,radarReady,radarUpdatedAtMs,appearance,mapRef]);
}
