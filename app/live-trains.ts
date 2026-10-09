import type { Station } from "./network-data";
import { railDistanceKm } from "./rail-geometry.ts";

export type LiveRailMode = "HIGHSPEED_RAIL" | "LONG_DISTANCE" | "NIGHT_RAIL" | "REGIONAL_FAST_RAIL" | "REGIONAL_RAIL" | "SUBURBAN" | "SUBWAY" | "TRAM";
export type LiveTrainCategory = "fern" | "regional" | "sbahn" | "ubahn" | "tram";

export type LiveTrip = {
  tripId: string;
  name: string;
  mode: LiveRailMode;
  category: LiveTrainCategory;
  from: { name: string; lat: number; lon: number };
  to: { name: string; lat: number; lon: number };
  departure: string;
  arrival: string;
  scheduledDeparture: string;
  scheduledArrival: string;
  realTime: boolean;
  delay: number;
  distance: number;
  points: [number, number][];
};

type ApiTripSegment = {
  trips?: { tripId?: string; displayName?: string }[];
  mode?: string;
  distance?: number;
  from?: { name?: string; lat?: number; lon?: number };
  to?: { name?: string; lat?: number; lon?: number };
  departure?: string;
  arrival?: string;
  scheduledDeparture?: string;
  scheduledArrival?: string;
  realTime?: boolean;
  polyline?: string;
};

const RAIL_MODES = new Set<LiveRailMode>(["HIGHSPEED_RAIL", "LONG_DISTANCE", "NIGHT_RAIL", "REGIONAL_FAST_RAIL", "REGIONAL_RAIL", "SUBURBAN", "SUBWAY", "TRAM"]);

function category(mode: LiveRailMode): LiveTrainCategory {
  if (mode === "SUBURBAN") return "sbahn";
  if (mode === "SUBWAY") return "ubahn";
  if (mode === "TRAM") return "tram";
  if (mode === "REGIONAL_RAIL" || mode === "REGIONAL_FAST_RAIL") return "regional";
  return "fern";
}

/** Reject corrupt geometry as a whole; a partial decode can invent a rail link. */
export function decodePolyline(encoded: string, precision = 4): [number, number][] {
  if (!Number.isInteger(precision) || precision < 0 || precision > 7 || encoded.length > 2_000_000) return [];
  const factor = 10 ** precision;
  const points: [number, number][] = [];
  let index = 0, lat = 0, lon = 0;
  const readDelta = () => {
    let value = 0;
    for (let group = 0; group < 8 && index < encoded.length; group += 1) {
      const byte = encoded.charCodeAt(index++) - 63;
      if (byte < 0 || byte > 63) return null;
      value += (byte & 31) * 2 ** (group * 5);
      if (byte < 32) return value % 2 ? -(value + 1) / 2 : value / 2;
    }
    return null;
  };
  while (index < encoded.length) {
    const dLat = readDelta(), dLon = readDelta();
    if (dLat === null || dLon === null) return [];
    lat += dLat; lon += dLon;
    const point: [number, number] = [lat / factor, lon / factor];
    if (Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) return [];
    points.push(point);
  }
  return points;
}

export function liveTripProgress(trip: LiveTrip, at = Date.now()) {
  const start = new Date(trip.departure).getTime();
  const end = new Date(trip.arrival).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5;
  return Math.max(0, Math.min(1, (at - start) / (end - start)));
}

function tripLocation(trip: LiveTrip, progress: number) {
  if (trip.points.length < 2 || !Number.isFinite(progress)) return null;
  const distances = trip.points.slice(1).map((point, index) => railDistanceKm(trip.points[index], point));
  const total = distances.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total)) return null;
  let target = total * Math.max(0, Math.min(1, progress));
  for (let index = 0; index < distances.length; index += 1) {
    if (target <= distances[index] || index === distances.length - 1) {
      const from = trip.points[index], to = trip.points[index + 1];
      // No interpolated marker travelling through an unsurveyed gap or across the dateline.
      if (distances[index] > 2 || Math.abs(to[1] - from[1]) > 180) return null;
      const ratio = distances[index] ? Math.min(1, target / distances[index]) : 0;
      return {index, point:[from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio] as [number, number]};
    }
    target -= distances[index];
  }
  return null;
}

/** Position estimated from timing on supplied geometry, never a GPS observation. */
export function pointOnTrip(trip: LiveTrip, progress = liveTripProgress(trip)): [number, number] | null {
  return tripLocation(trip, progress)?.point ?? null;
}

export function trailForTrip(trip: LiveTrip, progress = liveTripProgress(trip)): [number, number][] {
  const location = tripLocation(trip, progress);
  if (!location) return [];
  let start = location.index;
  const limit = Math.max(2, Math.round(trip.points.length * 0.16));
  while (start > 0 && location.index - start < limit && railDistanceKm(trip.points[start - 1], trip.points[start]) <= 2 && Math.abs(trip.points[start - 1][1] - trip.points[start][1]) <= 180) start -= 1;
  return [...trip.points.slice(start, location.index + 1), location.point];
}

export async function fetchLiveTrips(station: Station, signal?: AbortSignal): Promise<LiveTrip[]> {
  const now = Date.now();
  const url = new URL("https://api.transitous.org/api/v6/map/trips");
  url.searchParams.set("zoom", "11");
  url.searchParams.set("min", `${(station.lat - 0.04).toFixed(4)},${(station.lon - 0.06).toFixed(4)}`);
  url.searchParams.set("max", `${(station.lat + 0.04).toFixed(4)},${(station.lon + 0.06).toFixed(4)}`);
  url.searchParams.set("startTime", new Date(now - 45_000).toISOString());
  url.searchParams.set("endTime", new Date(now + 45_000).toISOString());
  url.searchParams.set("precision", "4");
  url.searchParams.set("language", "de");
  const response = await fetch(url, { signal:signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error(`Live-Radar ${response.status}`);
  const payload = await response.json() as ApiTripSegment[];
  const found = new Map<string, LiveTrip>();
  for (const segment of payload) {
    if (!RAIL_MODES.has(segment.mode as LiveRailMode) || !segment.polyline || !segment.departure || !segment.arrival || !segment.from || !segment.to) continue;
    const tripInfo = segment.trips?.[0];
    const tripId = tripInfo?.tripId ?? `${tripInfo?.displayName}-${segment.departure}-${segment.to.name}`;
    const mode = segment.mode as LiveRailMode;
    const actualDeparture = new Date(segment.departure).getTime();
    const plannedDeparture = new Date(segment.scheduledDeparture ?? segment.departure).getTime();
    const trip: LiveTrip = {
      tripId,
      name: tripInfo?.displayName ?? (mode === "SUBURBAN" ? "S-Bahn" : mode === "SUBWAY" ? "U-Bahn" : mode === "REGIONAL_RAIL" || mode === "REGIONAL_FAST_RAIL" ? "Regionalzug" : "Fernzug"),
      mode,
      category: category(mode),
      from: { name: segment.from.name ?? "Letzter Halt", lat: segment.from.lat ?? station.lat, lon: segment.from.lon ?? station.lon },
      to: { name: segment.to.name ?? "Nächster Halt", lat: segment.to.lat ?? station.lat, lon: segment.to.lon ?? station.lon },
      departure: segment.departure,
      arrival: segment.arrival,
      scheduledDeparture: segment.scheduledDeparture ?? segment.departure,
      scheduledArrival: segment.scheduledArrival ?? segment.arrival,
      realTime: Boolean(segment.realTime),
      delay: Math.max(0, Math.round((actualDeparture - plannedDeparture) / 60_000)),
      distance: segment.distance ?? 0,
      points: decodePolyline(segment.polyline, 4),
    };
    if (trip.points.length < 2 || !Number.isFinite(actualDeparture) || !Number.isFinite(new Date(trip.arrival).getTime())) continue;
    const current = found.get(tripId);
    const currentDistance = current ? Math.abs(liveTripProgress(current) - 0.5) : Number.POSITIVE_INFINITY;
    if (!current || Math.abs(liveTripProgress(trip) - 0.5) < currentDistance) found.set(tripId, trip);
  }
  return [...found.values()].sort((a, b) => b.delay - a.delay || a.name.localeCompare(b.name, "de")).slice(0, 180);
}
