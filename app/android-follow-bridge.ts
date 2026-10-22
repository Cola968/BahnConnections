import type { LiveTrip } from "./live-trains";

/** Only the packaged Android WebView injects this bridge; browsers never notify. */
type AndroidFollowBridge = {
  start(id:string,name:string,from:string,to:string,departure:string,arrival:string):void;
  stop():void;
};
declare global {
  interface Window { BahnConnectionsAndroid?: AndroidFollowBridge }
}

export function syncAndroidFollow(trip:LiveTrip|null) {
  if (typeof window === "undefined" || !window.BahnConnectionsAndroid) return;
  if (!trip) { window.BahnConnectionsAndroid.stop(); return; }
  window.BahnConnectionsAndroid.start(trip.tripId,trip.name,trip.from.name,trip.to.name,trip.departure,trip.arrival);
}
