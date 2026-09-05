import type { Station } from "./network-data";

export type LiveRailMode = "HIGHSPEED_RAIL" | "LONG_DISTANCE" | "NIGHT_RAIL" | "REGIONAL_FAST_RAIL" | "REGIONAL_RAIL" | "SUBURBAN" | "SUBWAY";
export type LiveTrainCategory = "fern" | "regional" | "sbahn" | "ubahn";

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

const RAIL_MODES = new Set<LiveRailMode>(["HIGHSPEED_RAIL", "LONG_DISTANCE", "NIGHT_RAIL", "REGIONAL_FAST_RAIL", "REGIONAL_RAIL", "SUBURBAN", "SUBWAY"]);

function category(mode: LiveRailMode): LiveTrainCategory {
  if (mode === "SUBURBAN") return "sbahn";
  if (mode === "SUBWAY") return "ubahn";
  if (mode === "REGIONAL_RAIL" || mode === "REGIONAL_FAST_RAIL") return "regional";
  return "fern";
}

export function decodePolyline(encoded: string, precision = 4): [number, number][] {
  const factor = 10 ** precision;
  const points: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lon = 0;
  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte: number;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lat += result & 1 ? ~(result >> 1) : result >> 1;
    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20 && index < encoded.length);
    lon += result & 1 ? ~(result >> 1) : result >> 1;
    points.push([lat / factor, lon / factor]);
  }
  return points;
}

export function liveTripProgress(trip: LiveTrip, at = Date.now()) {
  const start = new Date(trip.departure).getTime();
  const end = new Date(trip.arrival).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0.5;
  return Math.max(0, Math.min(1, (at - start) / (end - start)));
}

export function pointOnTrip(trip: LiveTrip, progress = liveTripProgress(trip)): [number, number] {
  if (trip.points.length < 2) return [trip.from.lat, trip.from.lon] as [number, number];
  const distances = trip.points.slice(1).map((point, index) => Math.hypot(point[0] - trip.points[index][0], point[1] - trip.points[index][1]));
  const total = distances.reduce((sum, value) => sum + value, 0);
  let target = total * progress;
  for (let index = 0; index < distances.length; index += 1) {
    if (target <= distances[index]) {
      const ratio = distances[index] ? target / distances[index] : 0;
      const from = trip.points[index];
      const to = trip.points[index + 1];
      return [from[0] + (to[0] - from[0]) * ratio, from[1] + (to[1] - from[1]) * ratio] as [number, number];
    }
    target -= distances[index];
  }
  return trip.points.at(-1) ?? [trip.to.lat, trip.to.lon];
}

export function trailForTrip(trip: LiveTrip, progress = liveTripProgress(trip)) {
  const end = Math.max(1, Math.round((trip.points.length - 1) * progress));
  const start = Math.max(0, end - Math.max(2, Math.round(trip.points.length * 0.16)));
  return [...trip.points.slice(start, end + 1), pointOnTrip(trip, progress)];
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
  const response = await fetch(url, { signal });
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
    const current = found.get(tripId);
    const currentDistance = current ? Math.abs(liveTripProgress(current) - 0.5) : Number.POSITIVE_INFINITY;
    if (!current || Math.abs(liveTripProgress(trip) - 0.5) < currentDistance) found.set(tripId, trip);
  }
  return [...found.values()].sort((a, b) => b.delay - a.delay || a.name.localeCompare(b.name, "de")).slice(0, 180);
}
