import { transitousRequestHeaders } from "../../../../transitous";

export async function GET(request: Request, context: { params:Promise<{ source:string; id:string }> }) {
  const { source, id } = await context.params;
  const tripId = decodeURIComponent(id);
  const updatedAt = new Date().toISOString();
  try {
    if (source !== "transitous") return Response.json({ trip:null, source, updatedAt, realtimeStatus:"partial", warnings:["Fahrtquelle nicht unterstützt"] }, { status:400 });
    if (!tripId || tripId.length > 500) return Response.json({ trip:null, source, updatedAt, realtimeStatus:"partial", warnings:["Ungültige Fahrt-ID"] }, { status:400 });
    const url = new URL("https://api.transitous.org/api/v6/trip");
    url.searchParams.set("tripId", tripId);
    url.searchParams.set("withScheduledSkippedStops", "true");
    url.searchParams.set("detailedLegs", "true");
    url.searchParams.set("withAlerts", "true");
    url.searchParams.set("language", "de");
    const response = await fetch(url, { headers:transitousRequestHeaders(), signal:AbortSignal.any([request.signal,AbortSignal.timeout(12_000)]) });
    if (!response.ok) throw new Error(`Transitous ${response.status}`);
    const trip = await response.json() as { legs?:{ realTime?:boolean; cancelled?:boolean }[] };
    const hasRealtime = (trip.legs ?? []).some((leg) => leg.realTime);
    const cancelled = (trip.legs ?? []).some((leg) => leg.cancelled);
    return Response.json({ trip, source:"Transitous / MOTIS", updatedAt, realtimeStatus:hasRealtime ? "live" : "schedule", warnings:cancelled ? ["Mindestens ein Fahrtabschnitt ist als ausgefallen gemeldet."] : [] });
  } catch (error) {
    return Response.json({ trip:null, source, updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Fahrtverlauf nicht erreichbar"] }, { status:502 });
  }
}
