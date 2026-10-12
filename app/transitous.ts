import { chooseStationMatch } from "./station-match.ts";
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

export function transitousRequestHeaders(): Record<string, string> {
  return typeof window === "undefined" ? { Accept:"application/json", "User-Agent":"BahnConnections/16" } : { Accept:"application/json" };
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
    const url = new URL("https://api.transitous.org/api/v1/geocode");
    url.searchParams.set("text", station.name);
    url.searchParams.set("type", "STOP");
    url.searchParams.set("mode", RAIL_MODES);
    url.searchParams.set("language", "de");
    url.searchParams.set("numResults", "12");
    const response = await fetch(url, { signal:signal ? AbortSignal.any([signal,AbortSignal.timeout(10_000)]) : AbortSignal.timeout(10_000), headers:transitousRequestHeaders() });
    if (!response.ok) return null;
    const payload = await response.json() as GeocodeStop[];
    const candidates = payload.filter((item): item is GeocodeStop & { id:string; lat:number; lon:number } => item.type === "STOP" && Boolean(item.id) && Number.isFinite(item.lat) && Number.isFinite(item.lon));
    return chooseStationMatch(station,candidates)?.id ?? null;
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
