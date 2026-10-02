import { stationOccurrenceIndexes, trimRepeatedStationLoop } from "../app/trip-trimming.ts";

const base = process.env.BAHNCONNECTIONS_BASE_URL ?? "http://localhost:3101";
const siteAuthorization = process.env.BAHNCONNECTIONS_AUTH;
const report = { checkedAt:new Date().toISOString(), base, checks:[] };

async function json(path, init) {
  const headers = new Headers(init?.headers);
  if (siteAuthorization) headers.set("OAI-Sites-Authorization", `Bearer ${siteAuthorization}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  const payload = await response.json();
  if (!response.ok) throw new Error(`${path}: ${response.status} ${(payload.warnings ?? []).join(" · ")}`);
  for (const field of ["source", "updatedAt", "realtimeStatus", "warnings"]) if (!(field in payload)) throw new Error(`${path}: Metadatenfeld ${field} fehlt`);
  return payload;
}

function nextWeekdayAtTenUtc() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  while ([0, 6].includes(value.getUTCDay())) value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(10, 0, 0, 0);
  return value.toISOString();
}

function assertRingTrimmingRegression() {
  const station = { name:"Berlin Gesundbrunnen", lat:52.5486, lon:13.3894 };
  const stops = [
    { name:"Berlin Gesundbrunnen", lat:52.5486, lon:13.3894, departure:"2026-10-02T10:00:00+02:00" },
    { name:"Berlin Schönhauser Allee", lat:52.5492, lon:13.4141, departure:"2026-10-02T10:04:00+02:00" },
    { name:"Berlin Ostkreuz", lat:52.5031, lon:13.4694, departure:"2026-10-02T10:15:00+02:00" },
    { name:"Berlin Südkreuz", lat:52.4758, lon:13.3659, departure:"2026-10-02T10:31:00+02:00" },
    { name:"Berlin Westkreuz", lat:52.5008, lon:13.2838, departure:"2026-10-02T10:43:00+02:00" },
    { name:"Berlin Gesundbrunnen", lat:52.5486, lon:13.3894, departure:"2026-10-02T10:58:00+02:00" },
    { name:"Berlin Schönhauser Allee", lat:52.5492, lon:13.4141, departure:"2026-10-02T11:02:00+02:00" },
  ];
  const result = trimRepeatedStationLoop(stops, [], station, stops[0].departure);
  if (!result.trimmed || result.stops.length !== 6) {
    throw new Error(`Ringlinien-Regressionsfall fehlgeschlagen (${result.stops.length}/${stops.length} Halte)`);
  }
  report.checks.push({ name:"Ringlinien-Regression", ok:true, rawStops:stops.length, displayedStops:result.stops.length });
}

try {
  assertRingTrimmingRegression();

  const gesundbrunnenSearch = await json(`/api/stations/search?q=${encodeURIComponent("Berlin Gesundbrunnen")}`);
  const gesundbrunnen = gesundbrunnenSearch.stations?.find((station) => station.transitousId);
  if (!gesundbrunnen) throw new Error("Gesundbrunnen fehlt in der internen Haltestellensuche");
  report.checks.push({ name:"Stationssuche", ok:true, station:gesundbrunnen.name, id:gesundbrunnen.transitousId });

  const stationId = encodeURIComponent(gesundbrunnen.transitousId);
  const services = await json(`/api/stations/${stationId}/services?n=1200`);
  if (!services.routes?.length || !services.stopTimes?.length) throw new Error("Linien-API liefert keinen vollständigen Bahnhofsdatenbestand");
  if (!services.routes.some((route) => (route.routeShortName ?? "").replaceAll(" ", "").toUpperCase() === "S15")) throw new Error("S15 fehlt in /services");
  report.checks.push({ name:"Vollständige Linien", ok:true, routes:services.routes.length, stopTimes:services.stopTimes.length });

  const ringSample = services.stopTimes.find((item) => [item.routeShortName, item.displayName].some((name) => String(name ?? "").replaceAll(" ", "").toUpperCase() === "S42") && item.tripId);
  if (!ringSample?.tripId) throw new Error("S42-Referenzfahrt fehlt am Gesundbrunnen");
  const ringTrip = await json(`/api/trips/transitous/${encodeURIComponent(ringSample.tripId)}`);
  const rawRingStops = (ringTrip.trip?.legs ?? []).flatMap((leg) => [leg.from, ...(leg.intermediateStops ?? []), leg.to]).filter((stop) => stop?.name);
  const ringStops = rawRingStops.filter((stop, index) => index === 0 || stop.name !== rawRingStops[index - 1]?.name || (stop.departure ?? stop.arrival) !== (rawRingStops[index - 1]?.departure ?? rawRingStops[index - 1]?.arrival));
  const ringOccurrences = stationOccurrenceIndexes(ringStops, gesundbrunnen);
  const ringSection = trimRepeatedStationLoop(ringStops, ringStops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon)).map((stop) => [stop.lat, stop.lon]), gesundbrunnen, ringSample.place?.departure ?? ringSample.place?.scheduledDeparture);
  if (ringOccurrences.length >= 2) {
    if (!ringSection.trimmed || ringSection.stops.length < 5 || ringSection.stops.length > 60) {
      throw new Error(`S42-Ringrunde konnte trotz wiederholtem Referenzbahnhof nicht begrenzt werden (${ringSection.stops.length}/${ringStops.length} Halte)`);
    }
  } else {
    if (ringSection.trimmed) throw new Error("S42-Abschnitt wurde ohne wiederholten Referenzbahnhof unerwartet gekürzt");
    if (ringStops.length < 2 || ringStops.length > 60) throw new Error(`S42 liefert einen unplausiblen bereits begrenzten Abschnitt (${ringStops.length} Halte)`);
  }
  report.checks.push({
    name:"Ringlinienabschnitt",
    ok:true,
    line:"S42",
    rawStops:ringStops.length,
    displayedStops:ringSection.stops.length,
    referenceOccurrences:ringOccurrences.length,
    sourceShape:ringOccurrences.length >= 2 ? "repeated-loop" : "already-bounded",
  });

  const board = await json(`/api/stations/${stationId}/board?n=300&kind=departure`);
  const sample = board.stopTimes?.find((item) => item.tripId);
  if (!sample?.tripId) throw new Error("Bahnhofstafel enthält keine Fahrt-ID");
  if (!board.verification || !["matched","different","unavailable"].includes(board.verification.status)) throw new Error("Bahnhofstafel enthält keinen nachvollziehbaren DB-Gegenprüfungsstatus");
  if (board.verification.status !== "matched" && !board.warnings?.length) throw new Error("Nicht bestätigte Bahnhofstafel wird nicht sichtbar gekennzeichnet");
  report.checks.push({ name:"Bahnhofstafel", ok:true, rows:board.stopTimes.length, realtimeStatus:board.realtimeStatus, verification:board.verification.status, comparedRows:board.verification.comparedRows });

  const trip = await json(`/api/trips/transitous/${encodeURIComponent(sample.tripId)}`);
  const stops = (trip.trip?.legs ?? []).flatMap((leg) => [leg.from, ...(leg.intermediateStops ?? []), leg.to]).filter((stop) => stop?.name);
  if (stops.length < 2) throw new Error("Fahrt-API enthält keine vollständige Haltefolge");
  report.checks.push({ name:"Fahrtverlauf", ok:true, stops:stops.length });

  const [fromSearch, toSearch] = await Promise.all([
    json(`/api/stations/search?q=${encodeURIComponent("Greifswalder Straße Berlin")}`),
    json(`/api/stations/search?q=${encodeURIComponent("Berlin Hbf")}`),
  ]);
  const from = fromSearch.stations?.find((station) => station.transitousId);
  const to = toSearch.stations?.find((station) => station.transitousId);
  if (!from || !to) throw new Error("Planer-Referenzstationen fehlen");
  const journeys = await json("/api/journeys", {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body:JSON.stringify({ from, to, departure:nextWeekdayAtTenUtc(), arriveBy:false, maxTransfers:5, minTransferMinutes:0, categories:["fern","regional","sbahn","ubahn"], wheelchair:false, bike:false }),
  });
  if (!journeys.journeys?.length) throw new Error("Planer-API liefert keine Verbindung");
  const arrivals = journeys.journeys.map((journey) => new Date(journey.endTime).getTime());
  if (arrivals.some((value, index) => index && value < arrivals[index - 1])) throw new Error("Reiseoptionen sind nicht nach erwarteter Ankunft sortiert");
  if (!journeys.journeys.some((journey) => journey.transitLegs?.some((leg) => leg.name?.replaceAll(" ", "").toUpperCase() === "S15"))) throw new Error("Allgemeine Anschluss-Ergänzung findet S15 nicht");
  report.checks.push({ name:"Schnellste Reiseoptionen", ok:true, journeys:journeys.journeys.length, firstArrival:journeys.journeys[0].endTime, s15Included:true });

  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
