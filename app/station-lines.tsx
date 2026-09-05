"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { BoardMapTrip } from "./live-board";
import { decodePolyline } from "./live-trains";
import type { Station } from "./network-data";
import { cleanDestination, serviceBadgeStyle } from "./transit-style";
import { berlinTimestamp, inBatches, requireTransitousStopId } from "./transitous";
import { trimRepeatedStationLoop } from "./trip-trimming";

export type StationLineCategory = "fern" | "regional" | "sbahn" | "ubahn";

export type StationLineSummary = {
  stationId: string;
  total: number;
  fern: number;
  regional: number;
  sbahn: number;
  ubahn: number;
  operators: string[];
};

type ApiRoute = {
  routeId?: string;
  routeShortName?: string;
  routeLongName?: string;
  mode?: string;
  agencyName?: string;
  routeColor?: string;
  routeTextColor?: string;
};

type StopTime = ApiRoute & {
  tripId?: string;
  displayName?: string;
  headsign?: string;
  tripFrom?: { name?: string };
  tripTo?: { name?: string };
  place?: { departure?: string; scheduledDeparture?: string };
  realTime?: boolean;
};

type LineSample = {
  tripId: string;
  origin?: string;
  destination?: string;
  time?: string;
  realtime: boolean;
};

type StationLine = ApiRoute & {
  key: string;
  category: StationLineCategory;
  shortName: string;
  longName: string;
  operator: string;
  destinations: string[];
  origins: string[];
  samples: LineSample[];
  reportedTrips: number;
  realtimeTrips: number;
  nextTime?: string;
};

type TripPlace = {
  name?: string;
  lat?: number;
  lon?: number;
  arrival?: string;
  departure?: string;
  track?: string;
  cancelled?: boolean;
};

type TripLeg = {
  realTime?: boolean;
  from?: TripPlace;
  to?: TripPlace;
  intermediateStops?: TripPlace[];
  routeColor?: string;
  routeTextColor?: string;
  legGeometry?: { points?: string; precision?: number };
};

const RAIL_MODES = new Map<string, StationLineCategory>([
  ["HIGHSPEED_RAIL", "fern"],
  ["LONG_DISTANCE", "fern"],
  ["NIGHT_RAIL", "fern"],
  ["REGIONAL_FAST_RAIL", "regional"],
  ["REGIONAL_RAIL", "regional"],
  ["SUBURBAN", "sbahn"],
  ["SUBWAY", "ubahn"],
]);

const CATEGORY_LABELS: Record<StationLineCategory, string> = {
  fern:"Fernverkehr",
  regional:"Regionalverkehr",
  sbahn:"S-Bahn",
  ubahn:"U-Bahn",
};

function lineBadge(line: StationLine) {
  if (line.category === "sbahn" || line.category === "ubahn") return line.shortName.replace(/\s+/g, "");
  if (line.category === "regional") return line.shortName.match(/^(RE|RB|MEX|IRE)/i)?.[0]?.toUpperCase() ?? "R";
  return line.shortName.match(/^(ICE|IC|EC|ECE|RJX?|TGV|NJ|EN|FLX)/i)?.[0]?.toUpperCase() ?? (line.mode === "HIGHSPEED_RAIL" ? "ICE" : "FV");
}

function routeKey(route: ApiRoute) {
  const category = RAIL_MODES.get(route.mode ?? "");
  const shortName = route.routeShortName?.trim() || route.routeLongName?.trim() || "Linie";
  return category ? `${category}|${shortName.toLocaleLowerCase("de")}` : "";
}

function normaliseRoutes(routes: ApiRoute[], stopTimes: StopTime[]) {
  const unique = new Map<string, StationLine>();
  const ensure = (route: ApiRoute) => {
    const category = RAIL_MODES.get(route.mode ?? "");
    if (!category) return undefined;
    const shortName = route.routeShortName?.trim() || route.routeLongName?.trim() || "Linie";
    const key = routeKey(route);
    const current = unique.get(key);
    if (current) {
      if (!current.longName && route.routeLongName?.trim()) current.longName = route.routeLongName.trim();
      current.routeColor ||= route.routeColor;
      current.routeTextColor ||= route.routeTextColor;
      current.routeId ||= route.routeId;
      return current;
    }
    const line: StationLine = {
      ...route,
      key,
      category,
      shortName,
      longName:route.routeLongName?.trim() || "",
      operator:route.agencyName?.trim() || "Betreiber nicht gemeldet",
      destinations:[],
      origins:[],
      samples:[],
      reportedTrips:0,
      realtimeTrips:0,
    };
    unique.set(key, line);
    return line;
  };

  for (const route of routes) ensure(route);
  for (const entry of stopTimes) {
    const line = ensure({ ...entry, routeShortName:entry.routeShortName || entry.displayName });
    if (!line || !entry.tripId) continue;
    const destination = cleanDestination(entry.headsign) ?? cleanDestination(entry.tripTo?.name);
    const origin = cleanDestination(entry.tripFrom?.name);
    if (destination && !line.destinations.includes(destination)) line.destinations.push(destination);
    if (origin && !line.origins.includes(origin)) line.origins.push(origin);
    line.reportedTrips += 1;
    if (entry.realTime) line.realtimeTrips += 1;
    const time = entry.place?.departure ?? entry.place?.scheduledDeparture;
    if (time && (!line.nextTime || new Date(time).getTime() < new Date(line.nextTime).getTime())) line.nextTime = time;
    const directionKey = `${origin ?? ""}|${destination ?? ""}`;
    const directionSamples = line.samples.filter((sample) => `${sample.origin ?? ""}|${sample.destination ?? ""}` === directionKey);
    if (directionSamples.length < 3 && !line.samples.some((sample) => sample.tripId === entry.tripId)) line.samples.push({ tripId:entry.tripId, origin, destination, time, realtime:Boolean(entry.realTime) });
  }

  const order: Record<StationLineCategory, number> = { fern:0, regional:1, sbahn:2, ubahn:3 };
  return [...unique.values()]
    .sort((left, right) => order[left.category] - order[right.category] || left.shortName.localeCompare(right.shortName, "de", { numeric:true }) || left.operator.localeCompare(right.operator, "de"));
}

async function loadFullTrip(line: StationLine, sample: LineSample, station: Station, signal: AbortSignal): Promise<BoardMapTrip> {
  const url = new URL(`/api/trips/transitous/${encodeURIComponent(sample.tripId)}`, window.location.origin);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Fahrtverlauf ${response.status}`);
  const envelope = await response.json() as { trip?: { legs?: TripLeg[] } };
  const payload = envelope.trip ?? {};
  const stops: BoardMapTrip["stops"] = [];
  const segments: [number, number][][] = [];
  const legs = payload.legs ?? [];
  for (const leg of legs) {
    if (leg.legGeometry?.points) {
      const legPoints = decodePolyline(leg.legGeometry.points, leg.legGeometry.precision ?? 6);
      if (legPoints.length > 1) segments.push(legPoints);
    }
    for (const stop of [leg.from, ...(leg.intermediateStops ?? []), leg.to]) {
      if (!stop?.name) continue;
      const previous = stops.at(-1);
      if (previous?.name === stop.name && (previous.departure ?? previous.arrival) === (stop.departure ?? stop.arrival)) continue;
      stops.push({ name:stop.name, lat:stop.lat, lon:stop.lon, arrival:stop.arrival, departure:stop.departure, track:stop.track, cancelled:stop.cancelled });
    }
  }
  const points = segments.flat();
  const selected = trimRepeatedStationLoop(stops, points, station, sample.time);
  const selectedSegments = selected.trimmed && segments.length === 1 && selected.points.length > 1 ? [selected.points] : segments;
  return {
    tripId:sample.tripId,
    name:line.shortName,
    category:line.category,
    realtime:sample.realtime || legs.some((leg) => leg.realTime),
    color:line.routeColor ?? legs.find((leg) => leg.routeColor)?.routeColor,
    textColor:line.routeTextColor ?? legs.find((leg) => leg.routeTextColor)?.routeTextColor,
    points:selected.points,
    segments:selectedSegments,
    stops:selected.stops,
  };
}

function tripDirection(trip: BoardMapTrip) {
  return `${trip.stops[0]?.name ?? "Start"} → ${trip.stops.at(-1)?.name ?? "Ziel"}`;
}

function lineTime(value?: string) {
  return value ? new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" }).format(new Date(value)) : "";
}

export function StationLines({ station, onSummary, onMapTrip, onMapTrips }: { station: Station; onSummary?: (summary: StationLineSummary) => void; onMapTrip?: (trip: BoardMapTrip) => void; onMapTrips?: (trips: BoardMapTrip[]) => void }) {
  const [lines, setLines] = useState<StationLine[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [category, setCategory] = useState<StationLineCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [routeDetails, setRouteDetails] = useState<Record<string, BoardMapTrip[]>>({});
  const [routeStates, setRouteStates] = useState<Record<string, "loading" | "ready" | "error">>({});
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [bulk, setBulk] = useState<{ state:"idle" | "loading" | "ready"; completed:number; total:number; failed:number }>({ state:"idle", completed:0, total:0, failed:0 });
  const bulkControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setStatus("loading");
      setLines([]);
      setExpandedKey(null);
      setRouteDetails({});
      setBulk({ state:"idle", completed:0, total:0, failed:0 });
      bulkControllerRef.current?.abort();
      try {
        const stopId = await requireTransitousStopId(station, controller.signal);
        const url = new URL(`/api/stations/${encodeURIComponent(stopId)}/services`, window.location.origin);
        url.searchParams.set("n", "4000");
        const response = await fetch(url, { signal:controller.signal });
        if (!response.ok) throw new Error(`Linienauskunft ${response.status}`);
        const payload = await response.json() as { routes?:ApiRoute[]; stopTimes?:StopTime[] };
        setLines(normaliseRoutes(payload.routes ?? [], payload.stopTimes ?? []));
        setStatusMessage("");
        setUpdatedAt(new Date());
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStatusMessage((error as Error).message);
          setStatus("error");
        }
      }
    }
    void load();
    return () => controller.abort();
  }, [station]);

  const summary = useMemo<StationLineSummary>(() => ({
    stationId:station.id,
    total:lines.length,
    fern:lines.filter((line) => line.category === "fern").length,
    regional:lines.filter((line) => line.category === "regional").length,
    sbahn:lines.filter((line) => line.category === "sbahn").length,
    ubahn:lines.filter((line) => line.category === "ubahn").length,
    operators:[...new Set(lines.map((line) => line.operator))].sort((a,b) => a.localeCompare(b,"de")),
  }), [lines, station.id]);

  useEffect(() => { if (status === "ready") onSummary?.(summary); }, [onSummary, status, summary]);

  const visibleLines = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("de");
    return lines.filter((line) => (category === "all" || line.category === category) && (!needle || `${line.shortName} ${line.longName} ${line.operator} ${line.destinations.join(" ")}`.toLocaleLowerCase("de").includes(needle)));
  }, [category, lines, query]);

  async function toggleLine(line: StationLine) {
    if (expandedKey === line.key) { setExpandedKey(null); return; }
    setExpandedKey(line.key);
    if (routeDetails[line.key] || routeStates[line.key] === "loading") return;
    if (!line.samples.length) { setRouteStates((current) => ({ ...current, [line.key]:"error" })); return; }
    setRouteStates((current) => ({ ...current, [line.key]:"loading" }));
    try {
      const controller = new AbortController();
      const results = await inBatches(line.samples, 6, (sample) => loadFullTrip(line, sample, station, controller.signal));
      const trips = results.filter((result): result is PromiseFulfilledResult<BoardMapTrip> => result.status === "fulfilled" && result.value.stops.length > 1);
      const longestByDirection = new Map<string, BoardMapTrip>();
      for (const result of trips) {
        const direction = tripDirection(result.value);
        const current = longestByDirection.get(direction);
        if (!current || result.value.stops.length > current.stops.length) longestByDirection.set(direction, result.value);
      }
      const resolved = [...longestByDirection.values()].sort((a, b) => b.stops.length - a.stops.length);
      setRouteDetails((current) => ({ ...current, [line.key]:resolved }));
      setRouteStates((current) => ({ ...current, [line.key]:resolved.length ? "ready" : "error" }));
    } catch {
      setRouteStates((current) => ({ ...current, [line.key]:"error" }));
    }
  }

  async function showAllOnMap() {
    if (bulk.state === "loading") {
      bulkControllerRef.current?.abort();
      setBulk((current) => ({ ...current, state:"idle" }));
      return;
    }
    const chosen: { line:StationLine; sample:LineSample }[] = [];
    const seen = new Set<string>();
    for (const line of visibleLines) {
      for (const sample of line.samples) {
        const key = `${line.key}|${sample.destination ?? sample.origin ?? sample.tripId}`;
        if (seen.has(key)) continue;
        seen.add(key);
        chosen.push({ line, sample });
      }
    }
    if (!chosen.length) return;
    const controller = new AbortController();
    bulkControllerRef.current = controller;
    const collected: BoardMapTrip[] = [];
    let failed = 0;
    setBulk({ state:"loading", completed:0, total:chosen.length, failed:0 });
    await inBatches(chosen, 5, ({ line, sample }) => loadFullTrip(line, sample, station, controller.signal), (results, completed) => {
      if (controller.signal.aborted) return;
      collected.push(...results.filter((result): result is PromiseFulfilledResult<BoardMapTrip> => result.status === "fulfilled" && result.value.points.length > 1).map((result) => result.value));
      failed += results.filter((result) => result.status === "rejected").length;
      onMapTrips?.([...collected]);
      setBulk({ state:"loading", completed, total:chosen.length, failed });
    });
    if (!controller.signal.aborted) setBulk({ state:"ready", completed:chosen.length, total:chosen.length, failed });
  }

  return (
    <section className="station-lines" aria-live="polite">
      <div className="station-lines-proof"><i /><span><b>Vollständiger Linienbestand</b><small>Linien kommen aus der Haltestellen-Stammliste; Ziele und Echtzeit aus den gemeldeten Fahrten.</small></span></div>
      {status === "ready" && <div className="station-lines-mapbar"><button className={bulk.state === "loading" ? "active" : ""} onClick={() => void showAllOnMap()} disabled={!visibleLines.some((line) => line.samples.length)}>{bulk.state === "loading" ? "Laden abbrechen" : "Alle gefilterten Linien auf Karte"}</button><span>{bulk.state === "idle" ? `${visibleLines.length} Linien auswählbar` : `${bulk.completed}/${bulk.total} Verläufe${bulk.failed ? ` · ${bulk.failed} nicht verfügbar` : ""}`}</span></div>}
      <div className="station-line-filters" aria-label="Linienarten">
        <button className={category === "all" ? "active" : ""} onClick={() => setCategory("all")}>Alle <span>{summary.total}</span></button>
        {(["fern","regional","sbahn","ubahn"] as StationLineCategory[]).map((item) => <button className={`${category === item ? "active " : ""}${item}`} onClick={() => setCategory(item)} key={item}>{CATEGORY_LABELS[item]} <span>{summary[item]}</span></button>)}
      </div>
      <label className="station-line-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Linie, Ziel oder Betreiber suchen" aria-label="Linien am Bahnhof durchsuchen" />{query && <button onClick={() => setQuery("")} aria-label="Liniensuche leeren">×</button>}</label>
      {status === "loading" && <div className="station-line-state"><i />Linien und Fahrtziele werden live geprüft …</div>}
      {status === "error" && <div className="station-line-state error"><b>Linienauskunft gerade nicht erreichbar.</b><span>{statusMessage.startsWith("Keine eindeutige Haltestellen-ID") ? statusMessage : "Live-Daten derzeit unvollständig. Es wird bewusst keine statische Ersatzliste als vollständig ausgegeben."}</span></div>}
      {status === "ready" && <div className="station-line-list">
        {visibleLines.map((line) => {
          const details = routeDetails[line.key] ?? [];
          const detailState = routeStates[line.key];
          const expanded = expandedKey === line.key;
          return <article className={`station-line-item ${expanded ? "expanded" : ""}`} key={line.key}>
            <button className={`station-line-row ${line.category}`} onClick={() => void toggleLine(line)} aria-expanded={expanded}>
              <span className={`service-logo ${line.category}`} style={serviceBadgeStyle(line.category, line.routeColor, line.routeTextColor, line.shortName, `${station.state ?? ""} ${line.operator}`)}>{lineBadge(line)}</span>
              <span><b>{line.category === "sbahn" || line.category === "ubahn" ? CATEGORY_LABELS[line.category] : line.shortName}</b><small>{line.destinations.length ? `Richtung ${line.destinations.join(" · ")}` : line.longName || "Heute keine weitere Fahrt gemeldet"}</small><em>{line.operator}{line.reportedTrips ? ` · ${line.reportedTrips} gemeldete Fahrten` : ""}</em></span>
              <span>{expanded ? "Schließen" : line.nextTime ? `${lineTime(line.nextTime)} · ${line.realtimeTrips ? "Live" : "Plan"}` : "keine weitere"}</span>
            </button>
            {expanded && <div className="station-line-routes">
              {detailState === "loading" && <div className="station-line-state"><i />Vollständige Fahrtverläufe werden verglichen …</div>}
              {detailState === "error" && <div className="station-line-state error"><b>Kein abrufbarer Fahrtverlauf im aktuellen Zeitfenster.</b><span>Die Linie und ihre gemeldeten Ziele bleiben sichtbar.</span></div>}
              {detailState === "ready" && details.map((trip) => <section className="line-route-detail" style={{ borderTopColor:serviceBadgeStyle(line.category, trip.color, trip.textColor).backgroundColor }} key={trip.tripId}>
                <header><span className={`service-logo ${line.category}`} style={serviceBadgeStyle(line.category, trip.color, trip.textColor, line.shortName, `${station.state ?? ""} ${line.operator}`)}>{lineBadge(line)}</span><span><b>{tripDirection(trip)}</b><small>{trip.realtime ? "Aktuelle Fahrt mit Echtzeit" : "Aktueller Fahrplan"}</small></span>{trip.points.length ? <button onClick={() => onMapTrip?.(trip)} aria-label={`${line.shortName} auf Karte zeigen`}>◎</button> : null}</header>
                <div className="line-route-kpis"><span><b>{trip.stops.length}</b> Halte</span><span><b>{trip.points.length.toLocaleString("de-DE")}</b> Geometriepunkte</span><span><b>{trip.realtime ? "Live" : "Plan"}</b> Datenlage</span></div>
                <p>Gezeigt wird die längste gefundene aktuelle Fahrt dieser Richtung – nicht nur der Abschnitt ab {station.name}. Betriebliche Kurzführungen bleiben als solche korrekt.</p>
                {trip.points.length ? <div className="line-route-actions"><button onClick={() => onMapTrip?.(trip)}>Exakten Verlauf auf Karte</button><button onClick={() => onMapTrip?.(trip)}>Alle Halte anzeigen</button></div> : <p className="geometry-missing">Die Quelle liefert aktuell keine belastbare Streckengeometrie. Die Halte bleiben sichtbar; eine Luftlinie wird bewusst nicht gezeichnet.</p>}
                <div className="line-stop-heading"><b>Vollständige Haltefolge</b><span>{trip.stops.length} Stationen</span></div>
                <ol className="line-stop-list">{trip.stops.map((stop, index) => <li key={`${stop.name}-${index}`}><button onClick={() => onMapTrip?.(trip)}><i style={{ backgroundColor:serviceBadgeStyle(line.category, trip.color, trip.textColor).backgroundColor, boxShadow:`0 0 0 1px ${serviceBadgeStyle(line.category, trip.color, trip.textColor).backgroundColor}` }} /><span><b>{stop.name}</b><small>{index === 0 ? "Start" : index === trip.stops.length - 1 ? "Endstation" : stop.track ? `Gleis ${stop.track}` : "Zwischenhalt"}</small></span><time>{stop.departure || stop.arrival ? lineTime(stop.departure ?? stop.arrival) : "–"}</time></button></li>)}</ol>
              </section>)}
            </div>}
          </article>;
        })}
        {!visibleLines.length && <div className="station-line-state">Keine passenden Bahnlinien in dieser Auswahl.</div>}
      </div>}
      {status === "ready" && <footer><span><i /> Transitous-Stammdaten + aktueller Fahrplan</span><b>{summary.total} Linien · {summary.operators.length} Betreiber · {updatedAt ? berlinTimestamp(updatedAt) : "gerade geprüft"}</b></footer>}
    </section>
  );
}
