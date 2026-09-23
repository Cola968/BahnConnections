import { transitousRequestHeaders } from "../../transitous";
import { distanceMeters, parseWalkingRoute } from "../../walking-route";

export async function POST(request: Request) {
  const updatedAt = new Date().toISOString();
  let body: { from?: { lat?: number; lon?: number }; to?: { lat?: number; lon?: number } };
  try { body = await request.json(); } catch { return Response.json({ error:"Ungültige Anfrage", updatedAt }, { status:400 }); }
  const from = body.from;
  const to = body.to;
  if (!from || !to || !Number.isFinite(from.lat) || !Number.isFinite(from.lon) || !Number.isFinite(to.lat) || !Number.isFinite(to.lon) || Math.abs(from.lat!) > 90 || Math.abs(to.lat!) > 90 || Math.abs(from.lon!) > 180 || Math.abs(to.lon!) > 180) {
    return Response.json({ error:"Ungültige Standortkoordinaten", updatedAt }, { status:400 });
  }
  if (distanceMeters(from as { lat:number; lon:number }, to as { lat:number; lon:number }) > 9_000) {
    return Response.json({ error:"Für diesen langen Weg ist keine reine Fußroute verfügbar. Wähle einen näheren Bahnhof.", updatedAt }, { status:422 });
  }
  const url = new URL("https://api.transitous.org/api/v6/plan");
  url.searchParams.set("fromPlace", `${from.lat},${from.lon}`);
  url.searchParams.set("toPlace", `${to.lat},${to.lon}`);
  url.searchParams.set("transitModes", "");
  url.searchParams.set("directModes", "WALK");
  url.searchParams.set("maxDirectTime", "7200");
  url.searchParams.set("detailedLegs", "true");
  try {
    const response = await fetch(url, { headers:transitousRequestHeaders(), signal:AbortSignal.timeout(15_000), cache:"no-store" });
    if (!response.ok) throw new Error(`Routendienst ${response.status}`);
    const route = parseWalkingRoute(await response.json(), from as { lat:number; lon:number }, to as { lat:number; lon:number }, updatedAt);
    if (!route) return Response.json({ error:"Kein verlässlicher Fußweg mit Straßengeometrie gefunden.", updatedAt, source:"Transitous / MOTIS" }, { status:404, headers:{ "Cache-Control":"no-store" } });
    return Response.json({ route, source:route.source, updatedAt }, { headers:{ "Cache-Control":"no-store" } });
  } catch {
    return Response.json({ error:"Der Fußwegdienst ist gerade nicht erreichbar.", updatedAt, source:"Transitous / MOTIS" }, { status:502, headers:{ "Cache-Control":"no-store" } });
  }
}
