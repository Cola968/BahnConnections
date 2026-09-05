import { RAIL_MODES, transitousRequestHeaders } from "../../../../transitous";
import { compareBoardRows, type BoardCrossCheck, type DbBoardRow, type TransitousBoardRow } from "../../../../board-verification";

type TransitousPlace = { name?:string; lat?:number; lon?:number };
type DbLocation = { id?:string; name?:string; type?:string; location?:{ latitude?:number; longitude?:number } };

function normaliseName(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de")
    .replace(/^s\+u\s+|^s\s+|^u\s+/i, "").replace(/hauptbahnhof|bahnhof|bhf\.?|bf\.?/g, "hbf")
    .replace(/[^a-z0-9]+/g, " ").trim();
}

function distanceMeters(a: { lat:number; lon:number }, b: { lat:number; lon:number }) {
  const radians = Math.PI / 180;
  const dLat = (b.lat - a.lat) * radians;
  const dLon = (b.lon - a.lon) * radians;
  const lat1 = a.lat * radians;
  const lat2 = b.lat * radians;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function json<T>(url: URL, signal?:AbortSignal) {
  const response = await fetch(url, { signal, headers:{ Accept:"application/json", "User-Agent":"BahnConnections/24" } });
  if (!response.ok) throw new Error(`${url.hostname} ${response.status}`);
  return await response.json() as T;
}

async function resolveDbStop(place: TransitousPlace, signal:AbortSignal) {
  if (!place.name || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)) throw new Error("Haltestellenlage fehlt");
  const point = { lat:place.lat!, lon:place.lon! };
  const url = new URL("https://v6.db.transport.rest/locations");
  url.searchParams.set("query", place.name);
  url.searchParams.set("results", "10");
  url.searchParams.set("stops", "true");
  url.searchParams.set("addresses", "false");
  url.searchParams.set("poi", "false");
  url.searchParams.set("language", "de");
  const candidates = (await json<DbLocation[]>(url, signal)).filter((item): item is DbLocation & { id:string; name:string; location:{ latitude:number; longitude:number } } => item.type === "stop" && Boolean(item.id && item.name) && Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude));
  const targetName = normaliseName(place.name);
  const ranked = candidates.map((item) => {
    const distance = distanceMeters(point, { lat:item.location.latitude, lon:item.location.longitude });
    const candidateName = normaliseName(item.name);
    const nameMatches = candidateName === targetName || candidateName.includes(targetName) || targetName.includes(candidateName);
    return { item, distance, nameMatches };
  }).filter((candidate) => candidate.distance <= 1_200).sort((left, right) => Number(right.nameMatches) - Number(left.nameMatches) || left.distance - right.distance);
  const match = ranked[0];
  if (!match || (!match.nameMatches && match.distance > 450)) throw new Error("Keine eindeutige DB-Haltestelle gefunden");
  return match.item;
}

async function crossCheck(stopId:string, stopTimes:TransitousBoardRow[], arrival:boolean, startTime:Date): Promise<BoardCrossCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_800);
  const checkedAt = new Date().toISOString();
  try {
    const stopUrl = new URL("https://api.transitous.org/api/v6/stop");
    stopUrl.searchParams.set("stopId", stopId);
    stopUrl.searchParams.set("language", "de");
    const stopPayload = await json<{ place?:TransitousPlace }>(stopUrl, controller.signal);
    const dbStop = await resolveDbStop(stopPayload.place ?? {}, controller.signal);
    const boardUrl = new URL(`https://v6.db.transport.rest/stops/${encodeURIComponent(dbStop.id)}/${arrival ? "arrivals" : "departures"}`);
    boardUrl.searchParams.set("when", startTime.toISOString());
    boardUrl.searchParams.set("duration", "500");
    boardUrl.searchParams.set("results", "500");
    boardUrl.searchParams.set("remarks", "true");
    boardUrl.searchParams.set("stopovers", "false");
    boardUrl.searchParams.set("includeRelatedStations", "false");
    boardUrl.searchParams.set("language", "de");
    boardUrl.searchParams.set("nationalExpress", "true");
    boardUrl.searchParams.set("national", "true");
    boardUrl.searchParams.set("regionalExpress", "true");
    boardUrl.searchParams.set("regional", "true");
    boardUrl.searchParams.set("suburban", "true");
    boardUrl.searchParams.set("subway", "true");
    boardUrl.searchParams.set("bus", "false");
    boardUrl.searchParams.set("tram", "false");
    boardUrl.searchParams.set("ferry", "false");
    boardUrl.searchParams.set("taxi", "false");
    const dbPayload = await json<DbBoardRow[] | { departures?:DbBoardRow[]; arrivals?:DbBoardRow[] }>(boardUrl, controller.signal);
    const dbRows = Array.isArray(dbPayload)
      ? dbPayload
      : (arrival ? dbPayload.arrivals : dbPayload.departures) ?? [];
    return { source:"DB transport.rest", checkedAt, stationId:dbStop.id, ...compareBoardRows(stopTimes, dbRows, arrival, startTime) };
  } catch {
    return { source:"DB transport.rest", status:"unavailable", checkedAt, comparedRows:0, matchedRows:0, message:"DB-Gegenprüfung derzeit nicht erreichbar. Die Tafel basiert ausschließlich auf Transitous / MOTIS." };
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: Request, context: { params:Promise<{ id:string }> }) {
  const { id } = await context.params;
  const stopId = decodeURIComponent(id);
  const query = new URL(request.url).searchParams;
  const updatedAt = new Date().toISOString();
  try {
    const url = new URL("https://api.transitous.org/api/v6/stoptimes");
    url.searchParams.set("stopId", stopId);
    url.searchParams.set("n", String(Math.min(5000, Math.max(50, Number(query.get("n") ?? 1400)))));
    const arrival = query.get("kind") === "arrival";
    url.searchParams.set("arriveBy", arrival ? "true" : "false");
    url.searchParams.set("direction", "LATER");
    url.searchParams.set("realtimeMode", "REALTIME");
    url.searchParams.set("mode", RAIL_MODES);
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    if (query.get("time")) url.searchParams.set("time", query.get("time")!);
    const response = await fetch(url, { headers:transitousRequestHeaders() });
    if (!response.ok) throw new Error(`Transitous ${response.status}`);
    const stopTimes = ((await response.json()) as { stopTimes?:TransitousBoardRow[] }).stopTimes ?? [];
    const hasRealtime = stopTimes.some((item) => Boolean(item.realTime));
    const startTime = query.get("time") ? new Date(query.get("time")!) : new Date();
    const verification = await crossCheck(stopId, stopTimes, arrival, Number.isNaN(startTime.getTime()) ? new Date() : startTime);
    const warnings = [
      ...(hasRealtime ? [] : ["Für diese Zeilen liegen derzeit nur Fahrplandaten vor."]),
      ...(verification.status === "matched" ? [] : [verification.message]),
    ];
    return Response.json({ stopTimes, verification, source:verification.status === "matched" ? "Transitous / MOTIS · DB-Gegenprüfung" : "Transitous / MOTIS", updatedAt, realtimeStatus:hasRealtime ? "live" : "schedule", warnings });
  } catch (error) {
    return Response.json({ stopTimes:[], source:"Transitous / MOTIS", updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Bahnhofstafel nicht erreichbar"] }, { status:502 });
  }
}
