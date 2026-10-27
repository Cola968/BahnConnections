import {assessStationRows} from "../../../../station-route-validity";
import { decodeRouteSegment } from "../../../decode-route-segment";
import { loadStationBoardWithFallback, StationSourceThrottledError, type StoptimesMode } from "../../../../station-board-fallback";
import { boardRequestWindow } from "../../../../board-request-window";
import { chooseStationMatch } from "../../../../station-match";
import { BOARD_MODES, transitousRequestHeaders } from "../../../../transitous";
import { compareBoardRows, type BoardCrossCheck, type DbBoardRow, type TransitousBoardRow } from "../../../../board-verification";

type TransitousPlace = { name?:string; lat?:number; lon?:number; stopId?:string; parentId?:string };
type DbLocation = { id?:string; name?:string; type?:string; location?:{ latitude?:number; longitude?:number } };

async function json<T>(url: URL, signal?:AbortSignal) {
  const response = await fetch(url, { signal, headers:transitousRequestHeaders() });
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
  const match = chooseStationMatch({...point,name:place.name},candidates.map(item => ({...item,lat:item.location.latitude,lon:item.location.longitude})));
  if (!match) throw new Error("Keine eindeutige DB-Haltestelle gefunden");
  return match;

}

async function crossCheck(place:TransitousPlace|undefined, stopTimes:TransitousBoardRow[], arrival:boolean, startTime:Date, requestSignal:AbortSignal): Promise<BoardCrossCheck> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 2_800);
  const signal = AbortSignal.any([controller.signal, requestSignal]);
  const checkedAt = new Date().toISOString();
  try {
    // MOTIS exposes the requested stop as Place on /stoptimes. There is no
    // /api/v6/stop endpoint in its published schema; avoid that undocumented dependency.
    const dbStop = await resolveDbStop(place ?? {}, signal);
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
    boardUrl.searchParams.set("bus", stopTimes.some(row=>row.mode==='BUS')?"true":"false");
    boardUrl.searchParams.set("tram", "true");
    boardUrl.searchParams.set("ferry", "false");
    boardUrl.searchParams.set("taxi", "false");
    const dbPayload = await json<DbBoardRow[] | { departures?:DbBoardRow[]; arrivals?:DbBoardRow[] }>(boardUrl, signal);
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
  const stopId = decodeRouteSegment(id);
  if (!stopId || stopId.length > 500) return Response.json({ stopTimes:[], warnings:["Ungültige Haltestellen-ID"] }, { status:400 });
  const query = new URL(request.url).searchParams;
  const updatedAt = new Date().toISOString();
  try {
    const url = new URL("https://api.transitous.org/api/v6/stoptimes");
    url.searchParams.set("stopId", stopId);
    const requestedCount=Number(query.get("n")??1400);
    url.searchParams.set("n",String(Number.isFinite(requestedCount)?Math.min(5000,Math.max(50,Math.floor(requestedCount))):1400));
    // MOTIS returns at least n events OR the whole requested time window.
    // A bounded window prevents distant future services from dominating the
    // selected station's timetable and allows realistic station-wide coverage.
    const windowSeconds=boardRequestWindow(query.get("window"));
    if(windowSeconds===undefined)
      return Response.json({stopTimes:[],warnings:["Ungültiges Zeitfenster"]},{status:400});
    if(windowSeconds!==null) url.searchParams.set("window",String(windowSeconds));
    const arrival = query.get("kind") === "arrival";
    url.searchParams.set("arriveBy", arrival ? "true" : "false");
    url.searchParams.set("direction", "LATER");
    url.searchParams.set("realtimeMode", "REALTIME");
    url.searchParams.set("mode", BOARD_MODES);
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    const requestedTime=query.get("time");
    if (requestedTime && (!Number.isFinite(Date.parse(requestedTime)) || requestedTime.length>80)) return Response.json({ stopTimes:[], warnings:["Ungültiger Abfragezeitpunkt"] }, { status:400 });
    if (requestedTime) url.searchParams.set("time", requestedTime);
    // Per-station and per-direction: no map viewport is consulted.
    // If realtime fails or lacks records, retry the same stop as timetable-only.
    let providerPlace:TransitousPlace|undefined;
    const requestRows=async(mode:StoptimesMode):Promise<unknown>=>{
      const candidate=new URL(url);
      candidate.searchParams.set("realtimeMode",mode);
      const response=await fetch(candidate,{headers:transitousRequestHeaders(),signal:AbortSignal.any([request.signal,AbortSignal.timeout(15_000)])});
      if(response.status===429)throw new StationSourceThrottledError("Transitous meldet eine Abfragesperre (429). Bitte später erneut versuchen.");
      if(!response.ok)throw new Error(`Transitous ${response.status}`);
      const responseData=await response.json() as {stopTimes?:unknown;place?:TransitousPlace}|null;
      providerPlace=responseData?.place;
      return responseData?.stopTimes;
    };
    const {stopTimes:rawStopTimes,fallback,warning}=await loadStationBoardWithFallback(requestRows);
    const guarded=assessStationRows(rawStopTimes);
    const stopTimes=guarded.stopTimes;
    const hasRealtime = !fallback && stopTimes.some((item) => item.realTime === true);
    const startTime = query.get("time") ? new Date(query.get("time")!) : new Date();
    // MOTIS's default scope includes the parent and same-name stations plus
    // their children. Preserve its opaque IDs; never trim IDs or mix a radius.
    const safeId=(value:unknown)=>typeof value==='string'&&value.length<=500?value:undefined;
    const stationScope={requestedStopId:stopId,providerStopId:safeId(providerPlace?.stopId),parentId:safeId(providerPlace?.parentId),
      grouping:'MOTIS default parent/same-name grouping',operatorCoverage:'unverified'};
    const busWarning=stopTimes.some(row=>row.mode==='BUS')?["Busfahrten sind als Bus gekennzeichnet. Eine Liniennummer allein bestätigt keinen Schienenersatzverkehr."]:[];
    const primary = { ...guarded,stopTimes,stationScope, source:"Transitous / MOTIS", updatedAt, realtimeStatus:hasRealtime ? "live" : "schedule", warnings:[...guarded.warnings,...busWarning,...(warning ? [warning] : hasRealtime ? [] : ["Für diese Zeilen liegen derzeit nur Fahrplandaten vor."])] };
    // The disruption screen needs route-specific alerts, not a second DB check
    // for each direction. Streamed live boards retain full verification.
    if(query.get("verify")==="0" && query.get("stream")!=="1"){
      return Response.json({...primary,verification:{status:"unavailable",message:"DB-Gegenprüfung für diese Hinweisansicht nicht angefordert."}},{headers:{"Cache-Control":"no-store"}});
    }
    const verificationController=new AbortController();
    const verificationSignal=AbortSignal.any([request.signal,verificationController.signal]);
    const verify = async () => {
      const verification = await crossCheck(providerPlace,stopTimes,arrival,Number.isNaN(startTime.getTime()) ? new Date() : startTime,verificationSignal);
      return { verification, source:verification.status === "matched" ? "Transitous / MOTIS · DB-Gegenprüfung" : primary.source,
        warnings:[...primary.warnings,...(verification.status === "matched" ? [] : [verification.message])] };
    };
    if(query.get("stream") === "1") {
      const encoder=new TextEncoder();let cancelled=false;
      const body=new ReadableStream<Uint8Array>({
        async start(controller) {
          controller.enqueue(encoder.encode(JSON.stringify({type:"board",...primary,verification:{status:"pending",message:"DB-Gegenprüfung läuft"}})+"\n"));
          try {const checked=await verify();if(!cancelled&&!request.signal.aborted)controller.enqueue(encoder.encode(JSON.stringify({type:"verification",...checked})+"\n"));}
          finally {if(!cancelled)controller.close();}
        },cancel(){cancelled=true;verificationController.abort();}
      });
      return new Response(body,{headers:{"Content-Type":"application/x-ndjson; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
    }
    return Response.json({...primary,...await verify()},{headers:{"Cache-Control":"no-store"}});
  } catch (error) {
    const throttled=error instanceof StationSourceThrottledError;
    return Response.json({ stopTimes:[], source:"Transitous / MOTIS", updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Bahnhofstafel nicht erreichbar"] }, { status:throttled?429:502,headers:{"Cache-Control":"no-store",...(throttled?{"Retry-After":"60"}:{})} });
  }
}
