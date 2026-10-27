import type { LiveTrip } from "./live-trains";

/** Only the packaged Android WebView injects this bridge; browsers never notify. */
type AndroidFollowBridge = {
  protocolVersion?:number;
  start(id:string,name:string,from:string,to:string,departure:string,arrival:string,delay?:number|null,realtime?:boolean,updatedAt?:number):void;
  stop():void;
  status?:()=>void;
};
declare global {
  interface Window { BahnConnectionsAndroid?: AndroidFollowBridge }
}

export function syncAndroidFollow(trip:LiveTrip|null,updatedAt:Date|null=null,current=false) {
  if (typeof window === "undefined" || !window.BahnConnectionsAndroid) return;
  if (!trip) { window.BahnConnectionsAndroid.stop(); return; }
  // Existing preview APKs expose a six-argument JavascriptInterface. Their
  // method dispatch rejects extra arguments; do not silently break that host.
  if(window.BahnConnectionsAndroid.protocolVersion!==2){
    window.BahnConnectionsAndroid.start(trip.tripId,trip.name,trip.from.name,trip.to.name,trip.departure,trip.arrival);
    return;
  }
  window.BahnConnectionsAndroid.start(trip.tripId,trip.name,trip.from.name,trip.to.name,trip.departure,trip.arrival,
    trip.realTime&&Number.isFinite(trip.delay)?trip.delay:null,trip.realTime&&current,updatedAt?.getTime()??0);
}
