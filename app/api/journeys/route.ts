import { fetchLiveJourneysDirect, type LiveJourneyRequest, type PlannerCategory } from "../../live-journey";
import { readLimitedJson, RequestInputError } from "../request-limits";

const ALLOWED_CATEGORIES=new Set<PlannerCategory>(["fern","regional","sbahn","ubahn","tram"]);
function validStation(value:unknown):value is LiveJourneyRequest["from"] {
  if(!value||typeof value!=="object")return false;
  const station=value as Record<string,unknown>;
  return typeof station.name==="string"&&station.name.length>0&&station.name.length<=150
    &&typeof station.lat==="number"&&Number.isFinite(station.lat)&&Math.abs(station.lat)<=90
    &&typeof station.lon==="number"&&Number.isFinite(station.lon)&&Math.abs(station.lon)<=180;
}
function validBody(value:unknown):value is Omit<LiveJourneyRequest,"signal"> {
  if(!value||typeof value!=="object")return false;
  const b=value as Record<string,unknown>;
  return validStation(b.from)&&validStation(b.to)&&typeof b.departure==="string"
    &&b.departure.length<=80&&Number.isFinite(Date.parse(b.departure))
    &&typeof b.arriveBy==="boolean" &&typeof b.bike==="boolean" &&typeof b.wheelchair==="boolean"
    &&typeof b.maxTransfers==="number"&&Number.isInteger(b.maxTransfers)&&Number(b.maxTransfers)>=0&&Number(b.maxTransfers)<=8
    &&typeof b.minTransferMinutes==="number"&&Number.isInteger(b.minTransferMinutes)&&Number(b.minTransferMinutes)>=0&&Number(b.minTransferMinutes)<=60
    &&Array.isArray(b.categories)&&b.categories.length<=5
    &&b.categories.every(category=>typeof category==="string"&&ALLOWED_CATEGORIES.has(category as PlannerCategory));
}

export async function POST(request: Request) {
  const updatedAt = new Date().toISOString();
  try {
    const body:unknown = await readLimitedJson(request);
    if (!validBody(body)) return Response.json({ journeys:[], source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:"partial", warnings:["Ungültige Planer-Anfrage"] }, { status:400 });
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(23_000)]);
    const journeys = await fetchLiveJourneysDirect({...body,signal});
    const warnings = [...new Set(journeys.flatMap((journey) => journey.warnings))];
    return Response.json({ journeys, source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:journeys.some((journey) => journey.realtimeStatus === "partial") ? "partial" : journeys.some((journey) => journey.realtimeStatus === "live") ? "live" : "schedule", warnings },{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    return Response.json({ journeys:[], source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Verbindungssuche nicht erreichbar"] }, { status:error instanceof RequestInputError ? error.status : 502,headers:{"Cache-Control":"no-store"} });
  }
}
