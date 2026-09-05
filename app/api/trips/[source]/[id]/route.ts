import { transitousRequestHeaders } from "../../../../transitous";

export async function GET(_request: Request, context: { params:Promise<{ source:string; id:string }> }) {
  const { source, id } = await context.params;
  const tripId = decodeURIComponent(id);
  const updatedAt = new Date().toISOString();
  try {
    if (source !== "transitous") throw new Error(`Fahrtquelle ${source} wird für Detailabrufe nicht unterstützt`);
    const url = new URL("https://api.transitous.org/api/v6/trip");
    url.searchParams.set("tripId", tripId);
    url.searchParams.set("withScheduledSkippedStops", "true");
    url.searchParams.set("detailedLegs", "true");
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    const response = await fetch(url, { headers:transitousRequestHeaders() });
    if (!response.ok) throw new Error(`Transitous ${response.status}`);
    const trip = await response.json() as { legs?:{ realTime?:boolean; cancelled?:boolean }[] };
    const hasRealtime = (trip.legs ?? []).some((leg) => leg.realTime);
    const cancelled = (trip.legs ?? []).some((leg) => leg.cancelled);
    return Response.json({ trip, source:"Transitous / MOTIS", updatedAt, realtimeStatus:hasRealtime ? "live" : "schedule", warnings:cancelled ? ["Mindestens ein Fahrtabschnitt ist als ausgefallen gemeldet."] : [] });
  } catch (error) {
    return Response.json({ trip:null, source, updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Fahrtverlauf nicht erreichbar"] }, { status:502 });
  }
}
