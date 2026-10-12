import { decodeRouteSegment } from "../../../decode-route-segment";
import { RAIL_MODES, transitousRequestHeaders } from "../../../../transitous";

export async function GET(request: Request, context: { params:Promise<{ id:string }> }) {
  const { id } = await context.params;
  const stopId = decodeRouteSegment(id);
  const query = new URL(request.url).searchParams;
  const updatedAt = new Date().toISOString();
  if (!stopId || stopId.length > 500) return Response.json({routes:[],stopTimes:[],warnings:["Ungültige Haltestellen-ID"]}, {status:400});
  const rawCount = Number(query.get("n") ?? 4000);
  const count=Number.isFinite(rawCount) ? Math.min(5000,Math.max(200,Math.floor(rawCount))) : 4000;
  const requestedTime=query.get("time");
  if (requestedTime && (!Number.isFinite(Date.parse(requestedTime)) || requestedTime.length>80))
    return Response.json({routes:[],stopTimes:[],warnings:["Ungültiger Abfragezeitpunkt"]}, {status:400});

  const stopUrl = new URL("https://api.transitous.org/api/v6/stop");
  stopUrl.searchParams.set("stopId", stopId);
  stopUrl.searchParams.set("language", "de");
  const timeUrl = new URL("https://api.transitous.org/api/v6/stoptimes");
  timeUrl.searchParams.set("stopId", stopId);
  timeUrl.searchParams.set("n", String(count));
  timeUrl.searchParams.set("direction", "LATER");
  timeUrl.searchParams.set("realtimeMode", "REALTIME");
  timeUrl.searchParams.set("mode", RAIL_MODES);
  timeUrl.searchParams.set("withAlerts", "true");
  timeUrl.searchParams.set("language", "de");
  if (requestedTime) timeUrl.searchParams.set("time",requestedTime);
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(12_000)]);
  const load=async (url:URL,field:"routes"|"stopTimes"):Promise<unknown[]>=>{
    const response=await fetch(url,{headers:transitousRequestHeaders(),signal});
    if(!response.ok)throw new Error("Transitous "+response.status);
    const data=await response.json() as {routes?:unknown;stopTimes?:unknown};
    if(!Array.isArray(data?.[field]))throw new Error("Ungültige "+field+"-Antwort");
    return data[field] as unknown[];
  };
  // Parse JSON independently: corrupt/timeout in one source must not hide the other.
  const [stopResult,timeResult]=await Promise.allSettled([load(stopUrl,"routes"),load(timeUrl,"stopTimes")]);
  const warnings:string[]=[];
  const routes=stopResult.status==="fulfilled"?stopResult.value:[];
  const stopTimes=timeResult.status==="fulfilled"?timeResult.value:[];
  if(stopResult.status!=="fulfilled")warnings.push("Linien-Stammliste derzeit unvollständig.");
  if(timeResult.status!=="fulfilled")warnings.push("Fahrten und Endziele derzeit unvollständig.");
  if(!routes.length&&!stopTimes.length)
    return Response.json({routes,stopTimes,source:"Transitous / MOTIS",updatedAt,realtimeStatus:"partial",warnings},{status:502,headers:{"Cache-Control":"no-store"}});
  const hasRealtime=stopTimes.some(item=>Boolean(item && typeof item==="object" && (item as {realTime?:unknown}).realTime));
  return Response.json({routes,stopTimes,source:"Transitous / MOTIS",updatedAt,realtimeStatus:warnings.length?"partial":hasRealtime?"live":"schedule",warnings},{headers:{"Cache-Control":"no-store"}});
}
