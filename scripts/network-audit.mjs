const USER_AGENT = "BahnConnections/14 network-audit";
const MODES = "HIGHSPEED_RAIL,LONG_DISTANCE,NIGHT_RAIL,REGIONAL_FAST_RAIL,REGIONAL_RAIL,SUBURBAN,SUBWAY";
const stations = ["Berlin Hbf", "Berlin Gesundbrunnen", "Flughafen BER", "Hamburg Hbf", "München Hbf", "Frankfurt (Main) Hbf", "Köln Hbf", "Greifswald"];
const report = { checkedAt:new Date().toISOString(), stations:[], checks:[], warnings:[] };

async function json(url) {
  const response = await fetch(url, { headers:{ "User-Agent":USER_AGENT, Accept:"application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  return response.json();
}

async function stopFor(name) {
  const url = new URL("https://api.transitous.org/api/v1/geocode");
  url.searchParams.set("text", name);
  url.searchParams.set("type", "STOP");
  url.searchParams.set("mode", MODES);
  url.searchParams.set("language", "de");
  url.searchParams.set("numResults", "8");
  const items = await json(url);
  return items.find((item) => item.type === "STOP" && item.id);
}

async function inspectStation(query) {
  const stop = await stopFor(query);
  if (!stop) throw new Error(`Station nicht gefunden: ${query}`);
  const stopUrl = new URL("https://api.transitous.org/api/v6/stop");
  stopUrl.searchParams.set("stopId", stop.id);
  stopUrl.searchParams.set("language", "de");
  const boardUrl = new URL("https://api.transitous.org/api/v6/stoptimes");
  boardUrl.searchParams.set("stopId", stop.id);
  boardUrl.searchParams.set("n", "1200");
  boardUrl.searchParams.set("direction", "LATER");
  boardUrl.searchParams.set("realtimeMode", "REALTIME");
  boardUrl.searchParams.set("mode", MODES);
  boardUrl.searchParams.set("language", "de");
  const [info, board] = await Promise.all([json(stopUrl), json(boardUrl)]);
  const routes = info.routes ?? [];
  const stopTimes = board.stopTimes ?? [];
  const destinations = stopTimes.filter((item) => item.headsign || item.tripTo?.name).length;
  if (!routes.length) throw new Error(`${query}: keine Bahnlinien`);
  if (!stopTimes.length) report.warnings.push(`${query}: keine bevorstehenden Fahrten im aktuellen Fenster`);
  if (stopTimes.length && destinations / stopTimes.length < .9) report.warnings.push(`${query}: ${stopTimes.length - destinations} Fahrten ohne gemeldetes Ziel`);
  const item = { query, id:stop.id, resolvedName:stop.name, routes:routes.length, departures:stopTimes.length, destinations, routeData:routes, stopTimes };
  report.stations.push({ query, id:stop.id, resolvedName:stop.name, routes:routes.length, departures:stopTimes.length, destinations });
  return item;
}

function nextWeekdayAtTenUtc() {
  const value = new Date();
  value.setUTCDate(value.getUTCDate() + 1);
  while ([0, 6].includes(value.getUTCDay())) value.setUTCDate(value.getUTCDate() + 1);
  value.setUTCHours(10, 0, 0, 0);
  return value.toISOString();
}

function serviceName(leg) {
  return leg.displayName ?? leg.tripShortName ?? leg.routeShortName ?? "";
}

async function inspectPlannerCompletion() {
  const [from, to] = await Promise.all([stopFor("Greifswalder Straße Berlin"), stopFor("Berlin Hbf")]);
  if (!from?.id || !to?.id) throw new Error("Planer-Referenzbahnhöfe konnten nicht eindeutig aufgelöst werden");
  const time = nextWeekdayAtTenUtc();
  const url = new URL("https://api.transitous.org/api/v6/plan");
  url.searchParams.set("fromPlace", from.id);
  url.searchParams.set("toPlace", to.id);
  url.searchParams.set("time", time);
  url.searchParams.set("arriveBy", "false");
  url.searchParams.set("maxTransfers", "5");
  url.searchParams.set("minTransferTime", "0");
  url.searchParams.set("transitModes", MODES);
  url.searchParams.set("numItineraries", "24");
  url.searchParams.set("maxItineraries", "32");
  url.searchParams.set("searchWindow", "10800");
  url.searchParams.set("timetableView", "true");
  url.searchParams.set("detailedLegs", "true");
  url.searchParams.set("withScheduledSkippedStops", "true");
  url.searchParams.set("withAlerts", "true");
  url.searchParams.set("realtimeMode", "REALTIME");
  url.searchParams.set("language", "de");
  const payload = await json(url);
  const itineraries = payload.itineraries ?? [];
  if (!itineraries.length) throw new Error("Planer liefert keine Referenzverbindung Greifswalder Straße → Berlin Hbf");
  const sorted = [...itineraries].filter((item) => item.endTime).sort((a, b) => new Date(a.endTime).getTime() - new Date(b.endTime).getTime());
  if (!sorted.length) throw new Error("Planer-Referenzverbindungen besitzen keine Ankunftszeit");
  const contextLeg = itineraries.flatMap((item) => item.legs ?? []).find((leg) => serviceName(leg).replaceAll(" ", "").toUpperCase() === "S42" && leg.to?.name?.includes("Gesundbrunnen") && leg.to?.stopId && leg.endTime);
  if (!contextLeg) throw new Error("S42-Zubringer nach Gesundbrunnen fehlt in der Referenzsuche");

  const boardUrl = new URL("https://api.transitous.org/api/v6/stoptimes");
  boardUrl.searchParams.set("stopId", contextLeg.to.stopId);
  boardUrl.searchParams.set("time", contextLeg.endTime);
  boardUrl.searchParams.set("n", "100");
  boardUrl.searchParams.set("direction", "LATER");
  boardUrl.searchParams.set("realtimeMode", "REALTIME");
  boardUrl.searchParams.set("mode", MODES);
  boardUrl.searchParams.set("withAlerts", "true");
  boardUrl.searchParams.set("language", "de");
  const board = await json(boardUrl);
  const s15 = (board.stopTimes ?? []).find((item) => (item.displayName ?? item.routeShortName ?? "").replaceAll(" ", "").toUpperCase() === "S15" && item.tripId && new Date(item.place?.departure ?? item.place?.scheduledDeparture ?? 0) >= new Date(contextLeg.endTime));
  if (!s15?.tripId) throw new Error("S15 wird bei der allgemeinen Anschluss-Ergänzungsprüfung nicht gefunden");
  const tripUrl = new URL("https://api.transitous.org/api/v6/trip");
  tripUrl.searchParams.set("tripId", s15.tripId);
  tripUrl.searchParams.set("withScheduledSkippedStops", "true");
  tripUrl.searchParams.set("detailedLegs", "true");
  tripUrl.searchParams.set("language", "de");
  const trip = await json(tripUrl);
  const tripStops = (trip.legs ?? []).flatMap((leg) => [leg.from, ...(leg.intermediateStops ?? []), leg.to]).filter(Boolean);
  if (!tripStops.some((stop) => stop.name?.includes("Berlin Hauptbahnhof"))) throw new Error("Ergänzte S15-Fahrt erreicht Berlin Hbf nicht");
  const invalidCoordinates = tripStops.filter((stop) => !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon) || Math.abs(stop.lat) > 90 || Math.abs(stop.lon) > 180);
  if (invalidCoordinates.length) throw new Error("S15-Fahrt enthält ungültige Haltekoordinaten");
  report.checks.push({
    name:"Planer-Anschlussprüfung S42 → S15",
    ok:true,
    searchTime:time,
    fastestTransitousArrival:sorted[0].endTime,
    s15Departure:s15.place?.departure ?? s15.place?.scheduledDeparture,
    s15Stops:tripStops.map((stop) => stop.name),
  });
}

try {
  const inspected = [];
  for (const name of stations) inspected.push(await inspectStation(name));
  const gesundbrunnen = inspected[1];
  const s15Routes = gesundbrunnen.routeData.filter((route) => /^S\s?15$/i.test(route.routeShortName ?? ""));
  if (!s15Routes.length) throw new Error("S15 fehlt in der Linien-Stammliste von Gesundbrunnen");
  report.checks.push({ name:"S15 in Gesundbrunnen", ok:true, variants:s15Routes.length });

  const s15Departure = gesundbrunnen.stopTimes.find((item) => /^S\s?15$/i.test(item.displayName ?? item.routeShortName ?? "") && item.tripId);
  if (s15Departure?.tripId) {
    const tripUrl = new URL("https://api.transitous.org/api/v6/trip");
    tripUrl.searchParams.set("tripId", s15Departure.tripId);
    tripUrl.searchParams.set("withScheduledSkippedStops", "true");
    tripUrl.searchParams.set("detailedLegs", "true");
    tripUrl.searchParams.set("language", "de");
    const trip = await json(tripUrl);
    const names = (trip.legs ?? []).flatMap((leg) => [leg.from, ...(leg.intermediateStops ?? []), leg.to]).map((item) => item?.name ?? "");
    for (const required of ["Hauptbahnhof", "Wedding", "Gesundbrunnen"]) if (!names.some((name) => name.includes(required))) throw new Error(`S15-Fahrt ohne ${required}`);
    report.checks.push({ name:"S15 vollständige Halte", ok:true, stops:names });
  } else report.warnings.push("S15 ist vorhanden, aber im aktuellen Abfahrtsfenster lag keine abrufbare Fahrt-ID vor");

  const alexanderplatz = await inspectStation("Berlin Alexanderplatz");
  const u2 = alexanderplatz.routeData.find((route) => /^U\s?2$/i.test(route.routeShortName ?? ""));
  if (!u2) throw new Error("U2 fehlt am Alexanderplatz");
  if ((u2.routeColor ?? "").toLowerCase() !== "da421e") throw new Error(`U2-Farbe unerwartet: ${u2.routeColor ?? "fehlend"}`);
  report.checks.push({ name:"Berlin U2 Originalfarbe", ok:true, color:`#${u2.routeColor}` });

  await inspectPlannerCompletion();

  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.error = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify(report, null, 2));
  process.exitCode = 1;
}
