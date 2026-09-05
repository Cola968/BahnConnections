import type { Station } from "./network-data";
import { decodePolyline } from "./live-trains";
import { RAIL_MODES, resolveTransitousStopId, transitousPlace, transitousRequestHeaders } from "./transitous";

export type PlannerCategory = "fern" | "regional" | "sbahn" | "ubahn" | "tram";
export type JourneyLegCategory = PlannerCategory | "walk";
export type JourneySource = "transitous" | "db-transport" | "transitous-completed" | "cross-checked";

export type LiveJourneyStop = {
  id?: string;
  name: string;
  lat: number;
  lon: number;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled: boolean;
};

export type LiveJourneyAlert = {
  header: string;
  description?: string;
};

export type LiveJourneyLeg = {
  mode: string;
  category: JourneyLegCategory;
  name: string;
  operator?: string;
  headsign?: string;
  routeColor?: string;
  routeTextColor?: string;
  tripId?: string;
  from: LiveJourneyStop;
  to: LiveJourneyStop;
  stops: LiveJourneyStop[];
  points: [number, number][];
  startTime: string;
  endTime: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  durationSeconds: number;
  realtime: boolean;
  cancelled: boolean;
  bikesAllowed?: boolean;
  wheelchairAccessible?: string;
  alerts: LiveJourneyAlert[];
};

export type LiveJourney = {
  id: string;
  durationSeconds: number;
  transfers: number;
  startTime: string;
  endTime: string;
  scheduledStartTime: string;
  scheduledEndTime: string;
  realtime: boolean;
  cancelled: boolean;
  legs: LiveJourneyLeg[];
  transitLegs: LiveJourneyLeg[];
  source: JourneySource;
  sourceLabel: string;
  updatedAt: string;
  realtimeStatus: "live" | "schedule" | "partial";
  warnings: string[];
};

export type LiveJourneyRequest = {
  from: Station;
  to: Station;
  departure: string;
  arriveBy: boolean;
  maxTransfers: number;
  minTransferMinutes: number;
  categories: PlannerCategory[];
  wheelchair: boolean;
  bike: boolean;
  signal?: AbortSignal;
};

type ApiPlace = {
  name?: string;
  stopId?: string;
  lat?: number;
  lon?: number;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled?: boolean;
};

type ApiAlert = {
  headerText?: { translation?: { text?: string }[] };
  descriptionText?: { translation?: { text?: string }[] };
  header?: string;
  description?: string;
};

type ApiLeg = {
  mode?: string;
  from?: ApiPlace;
  to?: ApiPlace;
  duration?: number;
  startTime?: string;
  endTime?: string;
  scheduledStartTime?: string;
  scheduledEndTime?: string;
  realTime?: boolean;
  headsign?: string;
  tripId?: string;
  displayName?: string;
  tripShortName?: string;
  routeShortName?: string;
  routeColor?: string;
  routeTextColor?: string;
  agencyName?: string;
  cancelled?: boolean;
  intermediateStops?: ApiPlace[];
  legGeometry?: { points?: string; precision?: number };
  bikesAllowed?: boolean;
  wheelchairAccessible?: string;
  alerts?: ApiAlert[];
};

type ApiItinerary = {
  id?: string;
  duration?: number;
  transfers?: number;
  startTime?: string;
  endTime?: string;
  legs?: ApiLeg[];
};

export function categoryForMode(mode = ""): JourneyLegCategory {
  if (mode === "SUBURBAN") return "sbahn";
  if (mode === "SUBWAY") return "ubahn";
  if (mode === "TRAM") return "tram";
  if (mode === "REGIONAL_RAIL" || mode === "REGIONAL_FAST_RAIL") return "regional";
  if (["HIGHSPEED_RAIL", "LONG_DISTANCE", "NIGHT_RAIL"].includes(mode)) return "fern";
  return "walk";
}

function stop(place: ApiPlace | undefined, fallback: string): LiveJourneyStop {
  return {
    id: place?.stopId,
    name: place?.name?.replace(/^S\+U\s+/i, "").replace(/^S\s+(?=[A-ZÄÖÜ])/i, "") || fallback,
    lat: place?.lat ?? 0,
    lon: place?.lon ?? 0,
    arrival: place?.arrival,
    departure: place?.departure,
    scheduledArrival: place?.scheduledArrival,
    scheduledDeparture: place?.scheduledDeparture,
    track: place?.track,
    scheduledTrack: place?.scheduledTrack,
    cancelled: Boolean(place?.cancelled),
  };
}

function alertText(value?: { translation?: { text?: string }[] }) {
  return value?.translation?.find((item) => item.text)?.text;
}

function parseAlert(alert: ApiAlert): LiveJourneyAlert | null {
  const header = alert.header ?? alertText(alert.headerText);
  if (!header) return null;
  return { header, description: alert.description ?? alertText(alert.descriptionText) };
}

function uniqueStops(stops: LiveJourneyStop[]) {
  return stops.filter((item, index) => {
    const previous = stops[index - 1];
    if (!previous) return true;
    return !(item.id && previous.id === item.id && (item.departure ?? item.arrival) === (previous.departure ?? previous.arrival));
  });
}

function parseLeg(leg: ApiLeg): LiveJourneyLeg | null {
  if (!leg.from || !leg.to || !leg.startTime || !leg.endTime) return null;
  const from = stop(leg.from, "Start");
  const to = stop(leg.to, "Ziel");
  const category = categoryForMode(leg.mode);
  const encoded = leg.legGeometry?.points;
  const points = encoded ? decodePolyline(encoded, leg.legGeometry?.precision ?? 6) : [] as [number, number][];
  const alerts = (leg.alerts ?? []).map(parseAlert).filter((item): item is LiveJourneyAlert => Boolean(item));
  return {
    mode: leg.mode ?? "WALK",
    category,
    name: category === "walk" ? "Fußweg" : leg.displayName || leg.tripShortName || leg.routeShortName || (category === "sbahn" ? "S-Bahn" : category === "ubahn" ? "U-Bahn" : category === "tram" ? "Straßenbahn" : category === "regional" ? "Regionalzug" : "Fernzug"),
    operator: leg.agencyName,
    headsign: leg.headsign,
    routeColor:leg.routeColor,
    routeTextColor:leg.routeTextColor,
    tripId: leg.tripId,
    from,
    to,
    stops: uniqueStops([from, ...(leg.intermediateStops ?? []).map((item) => stop(item, "Zwischenhalt")), to]),
    points,
    startTime: leg.startTime,
    endTime: leg.endTime,
    scheduledStartTime: leg.scheduledStartTime ?? leg.startTime,
    scheduledEndTime: leg.scheduledEndTime ?? leg.endTime,
    durationSeconds: leg.duration ?? Math.max(0, (new Date(leg.endTime).getTime() - new Date(leg.startTime).getTime()) / 1000),
    realtime: Boolean(leg.realTime),
    cancelled: Boolean(leg.cancelled || from.cancelled || to.cancelled),
    bikesAllowed: leg.bikesAllowed,
    wheelchairAccessible: leg.wheelchairAccessible,
    alerts,
  };
}

function parseItinerary(item: ApiItinerary, index: number, source: JourneySource = "transitous"): LiveJourney | null {
  const legs = (item.legs ?? []).map(parseLeg).filter((leg): leg is LiveJourneyLeg => Boolean(leg));
  const transitLegs = legs.filter((leg) => leg.category !== "walk");
  if (!legs.length || !transitLegs.length) return null;
  const first = legs[0];
  const last = legs.at(-1)!;
  return {
    id: item.id || `${first.startTime}-${last.endTime}-${index}`,
    durationSeconds: item.duration ?? Math.max(0, (new Date(last.endTime).getTime() - new Date(first.startTime).getTime()) / 1000),
    transfers: item.transfers ?? Math.max(0, transitLegs.length - 1),
    startTime: item.startTime ?? first.startTime,
    endTime: item.endTime ?? last.endTime,
    scheduledStartTime: first.scheduledStartTime,
    scheduledEndTime: last.scheduledEndTime,
    realtime: transitLegs.some((leg) => leg.realtime),
    cancelled: transitLegs.some((leg) => leg.cancelled),
    legs,
    transitLegs,
    source,
    sourceLabel:source === "db-transport" ? "DB-Navigator-nahe Gegenprüfung" : source === "transitous-completed" ? "Transitous · Direktfahrt ergänzt" : "Transitous / MOTIS",
    updatedAt:new Date().toISOString(),
    realtimeStatus:transitLegs.some((leg) => leg.realtime) ? "live" : "schedule",
    warnings:[],
  };
}

export function delayMinutes(actual?: string, planned?: string) {
  if (!actual || !planned) return 0;
  return Math.round((new Date(actual).getTime() - new Date(planned).getTime()) / 60_000);
}

export function journeyPoints(journey: LiveJourney) {
  return journey.legs.flatMap((leg, index) => index ? leg.points.slice(1) : leg.points);
}

export function transferWaitMinutes(journey: LiveJourney, transitIndex: number) {
  const leg = journey.transitLegs[transitIndex];
  const next = journey.transitLegs[transitIndex + 1];
  if (!leg || !next) return null;
  return Math.max(0, Math.round((new Date(next.startTime).getTime() - new Date(leg.endTime).getTime()) / 60_000));
}

type DbLocation = { id?: string; name?: string; type?: string; location?: { latitude?: number; longitude?: number } };
type DbLine = { name?: string; product?: string; operator?: { name?: string } };
type DbStopover = {
  stop?: DbLocation;
  arrival?: string;
  plannedArrival?: string;
  departure?: string;
  plannedDeparture?: string;
  arrivalPlatform?: string;
  plannedArrivalPlatform?: string;
  departurePlatform?: string;
  plannedDeparturePlatform?: string;
  cancelled?: boolean;
};
type DbLeg = {
  origin?: DbLocation;
  destination?: DbLocation;
  departure?: string;
  plannedDeparture?: string;
  arrival?: string;
  plannedArrival?: string;
  departurePlatform?: string;
  plannedDeparturePlatform?: string;
  arrivalPlatform?: string;
  plannedArrivalPlatform?: string;
  line?: DbLine;
  direction?: string;
  tripId?: string;
  stopovers?: DbStopover[];
  polyline?: { features?: { geometry?: { coordinates?: number[] } }[] };
  remarks?: { summary?: string; text?: string }[];
  cancelled?: boolean;
  walking?: boolean;
};
type DbJourney = { legs?: DbLeg[] };

const dbLocationCache = new Map<string, Promise<DbLocation | null>>();
const tripLegCache = new Map<string, Promise<LiveJourneyLeg[]>>();

function normaliseStopName(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de")
    .replace(/^s\+u\s+|^s\s+|^u\s+/i, "").replace(/hauptbahnhof|bahnhof|bhf\.?|bf\.?/g, "hbf")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function coordinateDistance(a: { lat:number; lon:number }, b: { lat:number; lon:number }) {
  const dy = (a.lat - b.lat) * 111_000;
  const dx = (a.lon - b.lon) * 111_000 * Math.cos(a.lat * Math.PI / 180);
  return Math.hypot(dx, dy);
}

async function fetchJsonWithTimeout<T>(url: URL, signal?: AbortSignal, timeout = 6_500): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  else signal?.addEventListener("abort", abort, { once:true });
  const timer = setTimeout(abort, timeout);
  try {
    const response = await fetch(url, { signal:controller.signal, headers:{ Accept:"application/json" } });
    if (!response.ok) throw new Error(`${url.hostname} ${response.status}`);
    return await response.json() as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

async function dbLocation(station: Station, signal?: AbortSignal) {
  if (station.dbId) return { id:station.dbId, name:station.name, type:"stop", location:{ latitude:station.lat, longitude:station.lon } } satisfies DbLocation;
  const key = `${station.name}|${station.lat.toFixed(4)}|${station.lon.toFixed(4)}`;
  const cached = dbLocationCache.get(key);
  if (cached) return cached;
  const request = (async () => {
    const url = new URL("https://v6.db.transport.rest/locations");
    url.searchParams.set("query", station.name);
    url.searchParams.set("results", "8");
    url.searchParams.set("stops", "true");
    url.searchParams.set("addresses", "false");
    url.searchParams.set("poi", "false");
    const items = await fetchJsonWithTimeout<DbLocation[]>(url, signal, 4_500);
    return items.filter((item) => item.type === "stop" && item.id).sort((left, right) => {
      const leftPoint = left.location?.latitude != null && left.location?.longitude != null ? { lat:left.location.latitude, lon:left.location.longitude } : null;
      const rightPoint = right.location?.latitude != null && right.location?.longitude != null ? { lat:right.location.latitude, lon:right.location.longitude } : null;
      return (leftPoint ? coordinateDistance(station, leftPoint) : Number.MAX_SAFE_INTEGER) - (rightPoint ? coordinateDistance(station, rightPoint) : Number.MAX_SAFE_INTEGER);
    })[0] ?? null;
  })().catch(() => null);
  dbLocationCache.set(key, request);
  return request;
}

export function dbCategory(product?: string): JourneyLegCategory {
  if (["nationalExpress","national"].includes(product ?? "")) return "fern";
  if (["regionalExpress","regional"].includes(product ?? "")) return "regional";
  if (product === "suburban") return "sbahn";
  if (product === "subway") return "ubahn";
  if (product === "tram") return "tram";
  return "walk";
}

function dbStop(place: DbLocation | undefined, values: Partial<DbStopover>, fallback: string): LiveJourneyStop {
  return {
    id:place?.id,
    name:place?.name ?? fallback,
    lat:place?.location?.latitude ?? 0,
    lon:place?.location?.longitude ?? 0,
    arrival:values.arrival,
    scheduledArrival:values.plannedArrival,
    departure:values.departure,
    scheduledDeparture:values.plannedDeparture,
    track:values.departurePlatform ?? values.arrivalPlatform,
    scheduledTrack:values.plannedDeparturePlatform ?? values.plannedArrivalPlatform,
    cancelled:Boolean(values.cancelled),
  };
}

function parseDbJourney(item: DbJourney, index: number): LiveJourney | null {
  const legs = (item.legs ?? []).map((leg): LiveJourneyLeg | null => {
    if (!leg.origin || !leg.destination || !leg.departure || !leg.arrival) return null;
    const category = leg.walking ? "walk" : dbCategory(leg.line?.product);
    if (category === "walk" && !leg.walking) return null;
    const from = dbStop(leg.origin, { departure:leg.departure, plannedDeparture:leg.plannedDeparture, departurePlatform:leg.departurePlatform, plannedDeparturePlatform:leg.plannedDeparturePlatform, cancelled:leg.cancelled }, "Start");
    const to = dbStop(leg.destination, { arrival:leg.arrival, plannedArrival:leg.plannedArrival, arrivalPlatform:leg.arrivalPlatform, plannedArrivalPlatform:leg.plannedArrivalPlatform, cancelled:leg.cancelled }, "Ziel");
    const stops = leg.stopovers?.length ? leg.stopovers.map((item) => dbStop(item.stop, item, "Zwischenhalt")) : [from, to];
    const points = (leg.polyline?.features ?? []).map((feature) => feature.geometry?.coordinates).filter((point): point is number[] => Boolean(point && point.length >= 2)).map((point) => [point[1], point[0]] as [number, number]);
    return {
      mode:leg.line?.product ?? (leg.walking ? "WALK" : "TRANSIT"), category,
      name:category === "walk" ? "Fußweg" : leg.line?.name ?? "Bahn",
      operator:leg.line?.operator?.name, headsign:leg.direction, tripId:leg.tripId,
      from, to, stops:uniqueStops(stops.length ? stops : [from, to]), points:points.length > 1 ? points : [],
      startTime:leg.departure, endTime:leg.arrival, scheduledStartTime:leg.plannedDeparture ?? leg.departure, scheduledEndTime:leg.plannedArrival ?? leg.arrival,
      durationSeconds:Math.max(0, (new Date(leg.arrival).getTime() - new Date(leg.departure).getTime()) / 1000),
      realtime:Boolean(leg.plannedDeparture && leg.departure !== leg.plannedDeparture || leg.plannedArrival && leg.arrival !== leg.plannedArrival),
      cancelled:Boolean(leg.cancelled), alerts:(leg.remarks ?? []).map((remark) => ({ header:remark.summary ?? remark.text ?? "Betriebshinweis", description:remark.text })).filter((alert) => Boolean(alert.header)),
    };
  }).filter((leg): leg is LiveJourneyLeg => Boolean(leg));
  const transitLegs = legs.filter((leg) => leg.category !== "walk");
  if (!legs.length || !transitLegs.length) return null;
  const first = legs[0];
  const last = legs.at(-1)!;
  return {
    id:`db-${first.startTime}-${last.endTime}-${index}`, durationSeconds:Math.max(0, (new Date(last.endTime).getTime() - new Date(first.startTime).getTime()) / 1000),
    transfers:Math.max(0, transitLegs.length - 1), startTime:first.startTime, endTime:last.endTime, scheduledStartTime:first.scheduledStartTime, scheduledEndTime:last.scheduledEndTime,
    realtime:transitLegs.some((leg) => leg.realtime), cancelled:transitLegs.some((leg) => leg.cancelled), legs, transitLegs,
    source:"db-transport", sourceLabel:"DB-Navigator-nahe Gegenprüfung", updatedAt:new Date().toISOString(), realtimeStatus:transitLegs.some((leg) => leg.realtime) ? "live" : "schedule", warnings:[],
  };
}

async function fetchDbJourneys(request: LiveJourneyRequest) {
  const [from, to] = await Promise.all([dbLocation(request.from, request.signal), dbLocation(request.to, request.signal)]);
  if (!from?.id || !to?.id) throw new Error("DB-Gegenprüfung: Station nicht gefunden");
  const url = new URL("https://v6.db.transport.rest/journeys");
  url.searchParams.set("from", from.id);
  url.searchParams.set("to", to.id);
  url.searchParams.set(request.arriveBy ? "arrival" : "departure", new Date(request.departure).toISOString());
  url.searchParams.set("results", "20");
  url.searchParams.set("transfers", String(request.maxTransfers));
  url.searchParams.set("transferTime", String(request.minTransferMinutes));
  url.searchParams.set("stopovers", "true");
  url.searchParams.set("remarks", "true");
  url.searchParams.set("polylines", "true");
  url.searchParams.set("tickets", "false");
  const enabled = new Set(request.categories);
  url.searchParams.set("nationalExpress", String(enabled.has("fern")));
  url.searchParams.set("national", String(enabled.has("fern")));
  url.searchParams.set("regionalExpress", String(enabled.has("regional")));
  url.searchParams.set("regional", String(enabled.has("regional")));
  url.searchParams.set("suburban", String(enabled.has("sbahn")));
  url.searchParams.set("subway", String(enabled.has("ubahn")));
  url.searchParams.set("bus", "false");
  url.searchParams.set("tram", String(enabled.has("tram")));
  url.searchParams.set("ferry", "false");
  url.searchParams.set("taxi", "false");
  const payload = await fetchJsonWithTimeout<{ journeys?: DbJourney[] }>(url, request.signal, 7_000);
  return (payload.journeys ?? []).map(parseDbJourney).filter((item): item is LiveJourney => Boolean(item));
}

function stopMatchesTarget(item: LiveJourneyStop, target: Station) {
  if (item.id && target.transitousId && item.id === target.transitousId) return true;
  if (item.lat && item.lon && coordinateDistance(item, target) <= 450) return true;
  const itemName = normaliseStopName(item.name);
  const targetName = normaliseStopName(target.name);
  return itemName === targetName || itemName.includes(targetName) || targetName.includes(itemName);
}

function nearestPoint(points: [number, number][], stop: LiveJourneyStop, start = 0) {
  let best = start;
  let distance = Number.MAX_SAFE_INTEGER;
  for (let index = start; index < points.length; index += 1) {
    const current = coordinateDistance({ lat:points[index][0], lon:points[index][1] }, stop);
    if (current < distance) { distance = current; best = index; }
  }
  return best;
}

function sliceTripLeg(leg: LiveJourneyLeg, originId: string, originName: string, target: Station) {
  const fromIndex = leg.stops.findIndex((item) => item.id === originId || normaliseStopName(item.name) === normaliseStopName(originName));
  const targetIndex = leg.stops.findIndex((item, index) => index > Math.max(-1, fromIndex) && stopMatchesTarget(item, target));
  if (fromIndex < 0 || targetIndex <= fromIndex) return null;
  const stops = leg.stops.slice(fromIndex, targetIndex + 1);
  const from = stops[0];
  const to = stops.at(-1)!;
  const pointStart = leg.points.length > 1 ? nearestPoint(leg.points, from) : 0;
  const pointEnd = leg.points.length > 1 ? nearestPoint(leg.points, to, pointStart) : 0;
  const points = pointEnd > pointStart ? leg.points.slice(pointStart, pointEnd + 1) : [] as [number, number][];
  const startTime = from.departure ?? from.arrival;
  const endTime = to.arrival ?? to.departure;
  if (!startTime || !endTime) return null;
  return {
    ...leg, from, to, stops, points, startTime, endTime,
    scheduledStartTime:from.scheduledDeparture ?? from.scheduledArrival ?? startTime,
    scheduledEndTime:to.scheduledArrival ?? to.scheduledDeparture ?? endTime,
    durationSeconds:Math.max(0, (new Date(endTime).getTime() - new Date(startTime).getTime()) / 1000),
  } satisfies LiveJourneyLeg;
}

async function fetchTransitousTripLegs(tripId: string, signal?: AbortSignal) {
  const cached = tripLegCache.get(tripId);
  if (cached) return cached;
  const request = (async () => {
    const url = new URL("https://api.transitous.org/api/v6/trip");
    url.searchParams.set("tripId", tripId);
    url.searchParams.set("withScheduledSkippedStops", "true");
    url.searchParams.set("detailedLegs", "true");
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    const response = await fetch(url, { signal, headers:transitousRequestHeaders() });
    if (!response.ok) throw new Error(`Fahrtverlauf ${response.status}`);
    const payload = await response.json() as { legs?: ApiLeg[] };
    return (payload.legs ?? []).map(parseLeg).filter((item): item is LiveJourneyLeg => Boolean(item));
  })();
  tripLegCache.set(tripId, request);
  request.catch(() => tripLegCache.delete(tripId));
  return request;
}

type CompletionStopTime = { tripId?: string; headsign?: string; tripTo?: { name?: string }; place?: { departure?: string; scheduledDeparture?: string; cancelled?: boolean }; cancelled?: boolean };
type CompletionContext = { stopId:string; stopName:string; readyAt:string; prefix:LiveJourneyLeg[] };

async function completeMissingDirectTrips(request: LiveJourneyRequest, base: LiveJourney[]) {
  if (request.arriveBy) return [];
  const contexts: CompletionContext[] = [];
  const originId = await resolveTransitousStopId(request.from, request.signal);
  if (originId) contexts.push({ stopId:originId, stopName:request.from.name, readyAt:request.departure, prefix:[] });
  for (const journey of base) {
    for (const transitLeg of journey.transitLegs.slice(0, -1)) {
      const stopId = transitLeg.to.id;
      if (!stopId || stopMatchesTarget(transitLeg.to, request.to)) continue;
      const legIndex = journey.legs.indexOf(transitLeg);
      contexts.push({ stopId, stopName:transitLeg.to.name, readyAt:transitLeg.endTime, prefix:journey.legs.slice(0, legIndex + 1) });
    }
  }
  const uniqueContexts = contexts.filter((item, index, items) => items.findIndex((candidate) => candidate.stopId === item.stopId && candidate.readyAt.slice(0,16) === item.readyAt.slice(0,16)) === index);
  const completed: LiveJourney[] = [];
  await Promise.allSettled(uniqueContexts.map(async (context) => {
    const url = new URL("https://api.transitous.org/api/v6/stoptimes");
    url.searchParams.set("stopId", context.stopId);
    url.searchParams.set("time", context.readyAt);
    url.searchParams.set("n", "80");
    url.searchParams.set("direction", "LATER");
    url.searchParams.set("realtimeMode", "REALTIME");
    url.searchParams.set("mode", RAIL_MODES);
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    const response = await fetch(url, { signal:request.signal, headers:transitousRequestHeaders() });
    if (!response.ok) return;
    const payload = await response.json() as { stopTimes?: CompletionStopTime[] };
    const ready = new Date(context.readyAt).getTime() + request.minTransferMinutes * 60_000;
    const candidates = (payload.stopTimes ?? []).filter((item) => item.tripId && !item.cancelled && !item.place?.cancelled && new Date(item.place?.departure ?? item.place?.scheduledDeparture ?? 0).getTime() >= ready);
    const targetName = normaliseStopName(request.to.name);
    const likely = candidates.filter((item) => normaliseStopName(item.headsign ?? item.tripTo?.name).includes(targetName));
    const fallback = candidates.filter((item) => !likely.includes(item)).slice(0, 6);
    const selected = [...likely, ...fallback].filter((item, index, items) => items.findIndex((candidate) => candidate.tripId === item.tripId) === index);
    const results = await Promise.allSettled(selected.map(async (candidate) => {
      const legs = await fetchTransitousTripLegs(candidate.tripId!, request.signal);
      for (const leg of legs) {
        const segment = sliceTripLeg(leg, context.stopId, context.stopName, request.to);
        if (!segment || new Date(segment.startTime).getTime() < ready) continue;
        const journeyLegs = [...context.prefix, segment];
        const transitLegs = journeyLegs.filter((item) => item.category !== "walk");
        if (transitLegs.length - 1 > request.maxTransfers) return null;
        const first = journeyLegs[0];
        const last = journeyLegs.at(-1)!;
        return {
          id:`completed-${candidate.tripId}-${first.startTime}`, durationSeconds:Math.max(0, (new Date(last.endTime).getTime() - new Date(first.startTime).getTime()) / 1000),
          transfers:Math.max(0, transitLegs.length - 1), startTime:first.startTime, endTime:last.endTime, scheduledStartTime:first.scheduledStartTime, scheduledEndTime:last.scheduledEndTime,
          realtime:transitLegs.some((item) => item.realtime), cancelled:transitLegs.some((item) => item.cancelled), legs:journeyLegs, transitLegs,
          source:"transitous-completed", sourceLabel:"Transitous · Direktfahrt ergänzt", updatedAt:new Date().toISOString(), realtimeStatus:transitLegs.some((item) => item.realtime) ? "live" : "schedule",
          warnings:[`Direktfahrt ab ${context.stopName} aus Haltestellen-Fahrplan und vollständigem Fahrtverlauf ergänzt.`],
        } satisfies LiveJourney;
      }
      return null;
    }));
    completed.push(...results.filter((result): result is PromiseFulfilledResult<LiveJourney> => result.status === "fulfilled" && Boolean(result.value)).map((result) => result.value));
  }));
  return completed;
}

function journeySignature(item: LiveJourney) {
  return `${item.startTime.slice(0,16)}|${item.endTime.slice(0,16)}|${item.transitLegs.map((leg) => normaliseStopName(leg.name)).join("+")}`;
}

function serviceSignature(item: LiveJourney) {
  return item.transitLegs.map((leg) => normaliseStopName(leg.name)).join("|");
}

function mergeJourneys(items: LiveJourney[], secondaryUnavailable: boolean) {
  const sorted = [...items].sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime() || a.durationSeconds - b.durationSeconds || a.transfers - b.transfers);
  const merged: LiveJourney[] = [];
  for (const item of sorted) {
    const duplicate = merged.find((candidate) => journeySignature(candidate) === journeySignature(item) || Math.abs(new Date(candidate.startTime).getTime() - new Date(item.startTime).getTime()) <= 60_000 && Math.abs(new Date(candidate.endTime).getTime() - new Date(item.endTime).getTime()) <= 60_000 && candidate.transitLegs.map((leg) => normaliseStopName(leg.name)).join("|") === item.transitLegs.map((leg) => normaliseStopName(leg.name)).join("|"));
    if (!duplicate) {
      const crossSource = merged.find((candidate) => candidate.source !== item.source && [candidate.source, item.source].includes("db-transport") && Math.abs(new Date(candidate.startTime).getTime() - new Date(item.startTime).getTime()) <= 3 * 60_000 && serviceSignature(candidate) === serviceSignature(item));
      if (crossSource) {
        const primary = item.source === "db-transport" ? crossSource : item;
        const other = primary === item ? crossSource : item;
        const arrivalDifference = Math.round(Math.abs(new Date(primary.endTime).getTime() - new Date(other.endTime).getTime()) / 60_000);
        const warning = `Die DB-Gegenprüfung weicht bei der erwarteten Ankunft um ${arrivalDifference} Min. ab. Gezeigt wird die vollständig belegte Transitous-Fahrt ohne Datenmischung.`;
        const verified = { ...primary, sourceLabel:"Transitous · DB-Abweichung", realtimeStatus:"partial" as const, warnings:[...new Set([...primary.warnings, warning])] };
        const index = merged.indexOf(crossSource);
        if (index >= 0) merged[index] = verified;
        continue;
      }
      merged.push({ ...item, warnings:secondaryUnavailable && item.source !== "db-transport" ? [...item.warnings, "Die unabhängige Gegenprüfung war für diese Suche nicht erreichbar."] : item.warnings });
      continue;
    }
    if (duplicate.source !== item.source && [duplicate.source, item.source].includes("db-transport")) {
      const primary = item.source === "db-transport" ? duplicate : item;
      const verified = { ...primary, source:"cross-checked" as const, sourceLabel:"Transitous + DB-Gegenprüfung" };
      const index = merged.indexOf(duplicate);
      if (index >= 0) merged[index] = verified;
    }
  }
  return merged;
}

export async function fetchLiveJourneysDirect(request: LiveJourneyRequest): Promise<LiveJourney[]> {
  if (!request.categories.length) return [];
  const modeMap: Record<PlannerCategory, string[]> = {
    fern: ["HIGHSPEED_RAIL", "LONG_DISTANCE", "NIGHT_RAIL"],
    regional: ["REGIONAL_FAST_RAIL", "REGIONAL_RAIL"],
    sbahn: ["SUBURBAN"],
    ubahn: ["SUBWAY"],
    tram: ["TRAM"],
  };
  const makeUrl = (fromPlace: string, toPlace: string, timetableView: boolean) => {
    const url = new URL("https://api.transitous.org/api/v6/plan");
    url.searchParams.set("fromPlace", fromPlace);
    url.searchParams.set("toPlace", toPlace);
    url.searchParams.set("time", new Date(request.departure).toISOString());
    url.searchParams.set("arriveBy", String(request.arriveBy));
    url.searchParams.set("maxTransfers", String(request.maxTransfers));
    url.searchParams.set("minTransferTime", String(request.minTransferMinutes));
    url.searchParams.set("transitModes", [...new Set(request.categories.flatMap((item) => modeMap[item]))].join(","));
    url.searchParams.set("maxDirectTime", "0");
    url.searchParams.set("maxPreTransitTime", "900");
    url.searchParams.set("maxPostTransitTime", "900");
    url.searchParams.set("numItineraries", timetableView ? "24" : "12");
    url.searchParams.set("maxItineraries", timetableView ? "32" : "18");
    url.searchParams.set("searchWindow", "10800");
    url.searchParams.set("timetableView", String(timetableView));
    url.searchParams.set("detailedLegs", "true");
    url.searchParams.set("detailedTransfers", "false");
    url.searchParams.set("joinInterlinedLegs", "false");
    url.searchParams.set("withScheduledSkippedStops", "true");
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("realtimeMode", "REALTIME");
    url.searchParams.set("language", "de");
    if (request.wheelchair) url.searchParams.set("pedestrianProfile", "WHEELCHAIR");
    if (request.bike) url.searchParams.set("requireBikeTransport", "true");
    return url;
  };

  const transitousTask = (async () => {
    const [fromPlace, toPlace] = await Promise.all([transitousPlace(request.from, request.signal), transitousPlace(request.to, request.signal)]);
    const results = await Promise.allSettled([makeUrl(fromPlace, toPlace, false), makeUrl(fromPlace, toPlace, true)].map(async (url) => {
      const response = await fetch(url, { signal:request.signal, headers:transitousRequestHeaders() });
      if (!response.ok) throw new Error(`Verbindungssuche ${response.status}`);
      return await response.json() as { itineraries?: ApiItinerary[] };
    }));
    const payloads = results.filter((result): result is PromiseFulfilledResult<{ itineraries?: ApiItinerary[] }> => result.status === "fulfilled").map((result) => result.value);
    if (!payloads.length) throw new Error("Transitous-Verbindungssuche nicht erreichbar");
    const partial = results.some((result) => result.status === "rejected");
    return payloads.flatMap((payload) => payload.itineraries ?? [])
      .map((item, index) => parseItinerary(item, index, "transitous"))
      .filter((item): item is LiveJourney => Boolean(item))
      .map((item) => partial ? { ...item, realtimeStatus:"partial" as const, warnings:[...item.warnings, "Eine der beiden Transitous-Suchansichten war nicht erreichbar."] } : item)
      .filter((item, index, items) => items.findIndex((candidate) => candidate.id === item.id || journeySignature(candidate) === journeySignature(item)) === index);
  })();

  const [transitousResult, dbResult] = await Promise.allSettled([transitousTask, fetchDbJourneys(request)]);
  const transitousJourneys = transitousResult.status === "fulfilled" ? transitousResult.value : [];
  const dbJourneys = dbResult.status === "fulfilled" ? dbResult.value : [];
  if (!transitousJourneys.length && !dbJourneys.length) throw new Error("Keine Fahrplanquelle erreichbar");

  const completed = transitousJourneys.length ? await completeMissingDirectTrips(request, transitousJourneys) : [];
  const journeys = mergeJourneys([...transitousJourneys, ...completed, ...dbJourneys], dbResult.status === "rejected");
  return journeys.sort((a, b) => request.arriveBy
    ? new Date(b.startTime).getTime() - new Date(a.startTime).getTime() || a.durationSeconds - b.durationSeconds || a.transfers - b.transfers
    : new Date(a.endTime).getTime() - new Date(b.endTime).getTime() || a.durationSeconds - b.durationSeconds || a.transfers - b.transfers
  );
}

export async function fetchLiveJourneys(request: LiveJourneyRequest): Promise<LiveJourney[]> {
  if (typeof window === "undefined") return fetchLiveJourneysDirect(request);
  const { signal, ...body } = request;
  const response = await fetch("/api/journeys", {
    method:"POST",
    headers:{ "Content-Type":"application/json", Accept:"application/json" },
    body:JSON.stringify(body),
    signal,
  });
  const payload = await response.json() as { journeys?:LiveJourney[]; warnings?:string[] };
  if (!response.ok) throw new Error(payload.warnings?.[0] ?? `Verbindungssuche ${response.status}`);
  return payload.journeys ?? [];
}
