/// <reference types="vite/client" />
import TripWorker from './station-trip-worker?worker';
import { prepareStationTrip, type StationTripInput } from './station-trip-geometry';
import type { BoardMapTrip } from './live-board';

/** Give input and paint priority over background station work. */
export function yieldToBrowser(signal?:AbortSignal):Promise<void> {
  signal?.throwIfAborted();
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{signal?.removeEventListener('abort',abort);resolve();},0);
    function abort(){clearTimeout(timer);reject(signal?.reason);}
    signal?.addEventListener('abort',abort,{once:true});
  });
}

export class StationTripProcessor {
  private worker:Worker|null=null;
  private next=0;
  private disposed=false;
  private pending=new Map<number,{resolve:(trip:BoardMapTrip)=>void;reject:(error:unknown)=>void;cleanup:()=>void}>();
  constructor(){
    if(typeof Worker==='undefined')return;
    try { this.worker=new TripWorker(); } catch { return; }
    this.worker.onmessage=(event:MessageEvent<{id:number;trip:BoardMapTrip;error?:string}>)=>{
      const request=this.pending.get(event.data.id);if(!request)return;
      this.pending.delete(event.data.id);request.cleanup();
      if(event.data.error)request.reject(new Error(event.data.error));else request.resolve(event.data.trip);
    };
    this.worker.onerror=()=>this.dispose(new Error('Fahrtgeometrie nicht verfügbar'));
  }
  async prepare(input:StationTripInput,signal:AbortSignal):Promise<BoardMapTrip>{
    signal.throwIfAborted();
    if(this.disposed)throw new DOMException('Bahnhof gewechselt','AbortError');
    if(!this.worker){await yieldToBrowser(signal);signal.throwIfAborted();return prepareStationTrip(input);}
    return new Promise((resolve,reject)=>{
      const id=++this.next;
      const abort=()=>{this.pending.delete(id);reject(signal.reason);};
      signal.addEventListener('abort',abort,{once:true});
      this.pending.set(id,{resolve,reject,cleanup:()=>signal.removeEventListener('abort',abort)});
      try { this.worker!.postMessage({id,input}); }
      catch(error){this.pending.delete(id);signal.removeEventListener('abort',abort);reject(error);}
    });
  }
  dispose(reason:unknown=new DOMException('Bahnhof gewechselt','AbortError')){
    this.disposed=true;this.worker?.terminate();
    for(const request of this.pending.values()){request.cleanup();request.reject(reason);}
    this.pending.clear();
  }
}
