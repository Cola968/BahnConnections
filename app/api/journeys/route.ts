import { fetchLiveJourneysDirect, type LiveJourneyRequest } from "../../live-journey";

export async function POST(request: Request) {
  const updatedAt = new Date().toISOString();
  try {
    const body = await request.json() as Omit<LiveJourneyRequest, "signal">;
    if (!body.from?.name || !body.to?.name || !body.departure || !Array.isArray(body.categories)) return Response.json({ journeys:[], source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:"partial", warnings:["Ungültige Planer-Anfrage"] }, { status:400 });
    const journeys = await fetchLiveJourneysDirect(body);
    const warnings = [...new Set(journeys.flatMap((journey) => journey.warnings))];
    return Response.json({ journeys, source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:journeys.some((journey) => journey.realtimeStatus === "partial") ? "partial" : journeys.some((journey) => journey.realtimeStatus === "live") ? "live" : "schedule", warnings });
  } catch (error) {
    return Response.json({ journeys:[], source:"Transitous / MOTIS + DB-Gegenprüfung", updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Verbindungssuche nicht erreichbar"] }, { status:502 });
  }
}
