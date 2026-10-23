import { APP_VERSION } from "./app-version.ts";
import { chooseStationMatch,stationNameKey,stationDistanceMeters } from "./station-match.ts";
import type { Station } from "./network-data";

type GeocodeStop = {
  type?: string;
  id?: string;
  name?: string;
  lat?: number;
  lon?: number;
  country?: string;
  modes?: string[];
};

const stopIdCache = new Map<string, Promise<string | null>>();

export const RAIL_MODES = "HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL,REGIONAL_FAST_RAIL,REGIONAL_RAIL,SUBURBAN,SUBWAY,TRAM";
// A station can temporarily have only bus calls. Preserve the reported mode;
// a route name such as S7 is not evidence that a BUS record is a train or SEV.
export const BOARD_MODES = `${RAIL_MODES},BUS`;

export function transitousRequestHeaders(): Record<string, string> {
  return typeof window === "undefined" ? { Accept:"application/json", "User-Agent":`BahnConnections/${APP_VERSION} (+https://github.com/Cola968/BahnConnections)` } : { Accept:"application/json" };
}

export function embeddedTransitousStopId(station: Station) {
  return station.transitousId ?? (station.id.startsWith("motis:") ? station.id.slice(6) : undefined);
}

export async function resolveTransitousStopId(station: Station, signal?: AbortSignal) {
  const embedded = embeddedTransitousStopId(station);
  if (embedded) return embedded;
  const key = `${station.name}|${station.lat.toFixed(5)}|${station.lon.toFixed(5)}`;
  const cached = stopIdCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    const lookupSignal=signal ? AbortSignal.any([signal,AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000);
    const simplified=station.name.replace(/\([^)]*\)/g," ").replace(/\bSt\.?\s/gi,"Sankt ").replace(/\bFernbf\b/gi,"Fernbahnhof").replace(/\s+/g," ").trim();
    const queries=[...new Set([station.name,simplified])];
    for(const query of queries){
      const url = new URL("https://api.transitous.org/api/v1/geocode");
      url.searchParams.set("text", query);
      url.searchParams.set("place", `${station.lat},${station.lon}`);
      url.searchParams.set("type", "STOP");
      url.searchParams.set("mode", RAIL_MODES);
      url.searchParams.set("language", "de");
      url.searchParams.set("numResults", "12");
      const response = await fetch(url, { signal:lookupSignal, headers:transitousRequestHeaders() });
      if (!response.ok) return null;
      const payload = await response.json() as GeocodeStop[];
      const candidates = payload.filter((item): item is GeocodeStop & { id:string; lat:number; lon:number } => item.type === "STOP" && Boolean(item.id) && Number.isFinite(item.lat) && Number.isFinite(item.lon)&&
        (item.modes===undefined||item.modes.some(mode=>RAIL_MODES.split(',').includes(mode))));
      const match=chooseStationMatch(station,candidates);
      if(match)return match.id;
    }
    // Reverse lookup never merges nearby stops. Rail matches retain priority.
    const nearby=new URL("https://api.transitous.org/api/v1/reverse-geocode");
    nearby.searchParams.set("place",`${station.lat},${station.lon}`);
    nearby.searchParams.set("type","STOP");
    nearby.searchParams.set("numResults","8");
    const response=await fetch(nearby,{signal:lookupSignal,headers:transitousRequestHeaders()});
    if(!response.ok)return null;
    const payload=await response.json() as GeocodeStop[];
    const nearbyStops=payload.filter((item):item is GeocodeStop & {id:string;lat:number;lon:number}=>
      item.type==="STOP"&&Boolean(item.id)&&Number.isFinite(item.lat)&&Number.isFinite(item.lon));
    const rail=nearbyStops.filter(item=>item.modes?.some(mode=>RAIL_MODES.split(',').includes(mode)));
    const matched=chooseStationMatch(station,rail);
    if(matched)return matched.id;
    // Only a known DB railway point may keep its identity under a bus-only
    // timetable: exact normalized name, <=50 m, one opaque ID. This does not
    // infer a replacement service and never accepts generic bus-only searches.
    if(station.source!=="db")return null;
    const buses=nearbyStops.filter(item=>item.modes?.length&&item.modes.every(mode=>mode==='BUS')&&
      stationNameKey(item.name)===stationNameKey(station.name)&&stationDistanceMeters(station,item)<=50);
    const ids=[...new Set(buses.map(item=>item.id))];
    return ids.length===1?ids[0]:null;
  })().catch(() => null);
  // An aborted caller must not poison the station ID for other views or retries.
  const stopId = await request;
  if (stopId && !signal?.aborted) stopIdCache.set(key, Promise.resolve(stopId));
  return signal?.aborted ? null : stopId;
}

export async function requireTransitousStopId(station: Station, signal?: AbortSignal) {
  const stopId = await resolveTransitousStopId(station, signal);
  if (!stopId) throw new Error(`Keine eindeutige Haltestellen-ID für ${station.name} gefunden.`);
  return stopId;
}

export async function transitousPlace(station: Station, signal?: AbortSignal) {
  return requireTransitousStopId(station, signal);
}

export function berlinTimestamp(value = new Date()) {
  return new Intl.DateTimeFormat("de-DE", {
    timeZone:"Europe/Berlin",
    dateStyle:"short",
    timeStyle:"short",
  }).format(value);
}

export async function inBatches<T, R>(items: T[], size: number, worker: (item: T) => Promise<R>, onBatch?: (results: PromiseSettledResult<R>[], completed: number) => void | Promise<void>) {
  const all: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += size) {
    const results = await Promise.allSettled(items.slice(index, index + size).map(worker));
    all.push(...results);
    await onBatch?.(results, Math.min(items.length, index + size));
  }
  return all;
}
