/// <reference types="vite/client" />
import RailWorker from './track-worker?worker';
import type { GeoStation, TrackGeometry } from './track-routing';

/** Synchronous cache reads; graph construction and routing never block map gestures. */
export class WorkerTrackRouter {
  private worker: Worker;
  private cache = new Map<string, TrackGeometry>();
  private pending = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(onReady:()=>void, onChange:()=>void, onError:()=>void) {
    this.worker = new RailWorker();
    this.worker.onmessage = event => {
      if (event.data.error) { onError(); return; }
      if (event.data.ready) { onReady(); return; }
      this.cache.set(event.data.key,event.data.geometry);
      this.pending.delete(event.data.key);
      // Several lines may finish together. Refresh the map once for the batch.
      if (this.timer === null) this.timer = setTimeout(()=>{this.timer=null;onChange();},80);
    };
    this.worker.onerror = onError;
    this.worker.postMessage({url:new URL('/db-rail-network.json',location.origin).href});
  }
  geometry(stations:GeoStation[]):TrackGeometry {
    const key=stations.map(stop=>`${stop.id}:${stop.lat}:${stop.lon}:${stop.country}`).join('|');
    const cached=this.cache.get(key);
    if(cached) return cached;
    if(!this.pending.has(key)) { this.pending.add(key);this.worker.postMessage({key,stations}); }
    return {points:[],segments:[],coverage:0};
  }
  get completedPoints() { return [...this.cache.values()].reduce((count,geometry)=>count+geometry.points.length,0); }
  dispose() { this.worker.terminate();if(this.timer!==null)clearTimeout(this.timer); }
}
