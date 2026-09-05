import { RAIL_MODES, transitousRequestHeaders } from "../../../../transitous";

export async function GET(request: Request, context: { params:Promise<{ id:string }> }) {
  const { id } = await context.params;
  const stopId = decodeURIComponent(id);
  const query = new URL(request.url).searchParams;
  const updatedAt = new Date().toISOString();
  const stopUrl = new URL("https://api.transitous.org/api/v6/stop");
  stopUrl.searchParams.set("stopId", stopId);
  stopUrl.searchParams.set("language", "de");
  const timeUrl = new URL("https://api.transitous.org/api/v6/stoptimes");
  timeUrl.searchParams.set("stopId", stopId);
  timeUrl.searchParams.set("n", String(Math.min(5000, Math.max(200, Number(query.get("n") ?? 4000)))));
  timeUrl.searchParams.set("direction", "LATER");
  timeUrl.searchParams.set("realtimeMode", "REALTIME");
  timeUrl.searchParams.set("mode", RAIL_MODES);
  timeUrl.searchParams.set("withAlerts", "true");
  timeUrl.searchParams.set("language", "de");
  if (query.get("time")) timeUrl.searchParams.set("time", query.get("time")!);
  const [stopResult, timeResult] = await Promise.allSettled([fetch(stopUrl, { headers:transitousRequestHeaders() }), fetch(timeUrl, { headers:transitousRequestHeaders() })]);
  const warnings: string[] = [];
  let routes: unknown[] = [];
  let stopTimes: unknown[] = [];
  if (stopResult.status === "fulfilled" && stopResult.value.ok) routes = ((await stopResult.value.json()) as { routes?:unknown[] }).routes ?? [];
  else warnings.push("Linien-Stammliste derzeit unvollständig.");
  if (timeResult.status === "fulfilled" && timeResult.value.ok) stopTimes = ((await timeResult.value.json()) as { stopTimes?:unknown[] }).stopTimes ?? [];
  else warnings.push("Fahrten und Endziele derzeit unvollständig.");
  if (!routes.length && !stopTimes.length) return Response.json({ routes, stopTimes, source:"Transitous / MOTIS", updatedAt, realtimeStatus:"partial", warnings }, { status:502 });
  const hasRealtime = stopTimes.some((item) => Boolean((item as { realTime?:boolean }).realTime));
  return Response.json({ routes, stopTimes, source:"Transitous / MOTIS", updatedAt, realtimeStatus:warnings.length ? "partial" : hasRealtime ? "live" : "schedule", warnings });
}
