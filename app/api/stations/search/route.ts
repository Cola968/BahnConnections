import { RAIL_MODES, transitousRequestHeaders } from "../../../transitous";

type GeocodeStop = { type?:string; id?:string; name?:string; lat?:number; lon?:number; country?:string; modes?:string[]; areas?:{ name?:string; adminLevel?:number; default?:boolean }[] };

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  const updatedAt = new Date().toISOString();
  if (query.length < 2) return Response.json({ stations:[], source:"Transitous / MOTIS", updatedAt, realtimeStatus:"schedule", warnings:[] });
  try {
    const url = new URL("https://api.transitous.org/api/v1/geocode");
    url.searchParams.set("text", query);
    url.searchParams.set("type", "STOP");
    url.searchParams.set("mode", RAIL_MODES);
    url.searchParams.set("language", "de");
    url.searchParams.set("numResults", "12");
    const response = await fetch(url, { headers:transitousRequestHeaders() });
    if (!response.ok) throw new Error(`Transitous ${response.status}`);
    const payload = await response.json() as GeocodeStop[];
    const stations = payload.filter((item) => item.type === "STOP" && item.id && item.name && Number.isFinite(item.lat) && Number.isFinite(item.lon)).map((item) => ({
      id:`motis:${item.id}`, transitousId:item.id, name:item.name, lat:item.lat, lon:item.lon, country:item.country ?? "DE", source:"db",
      kind:`Live-Haltestelle${item.modes?.includes("SUBWAY") ? " · U-Bahn" : item.modes?.includes("SUBURBAN") ? " · S-Bahn" : ""}`,
      state:item.areas?.find((area) => area.default)?.name ?? item.areas?.find((area) => area.adminLevel === 4)?.name,
      modes:item.modes ?? [],
    }));
    return Response.json({ stations, source:"Transitous / MOTIS", updatedAt, realtimeStatus:"schedule", warnings:[] });
  } catch (error) {
    return Response.json({ stations:[], source:"Transitous / MOTIS", updatedAt, realtimeStatus:"partial", warnings:[error instanceof Error ? error.message : "Haltestellensuche nicht erreichbar"] }, { status:502 });
  }
}
