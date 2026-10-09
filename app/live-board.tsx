"use client";

import { RealtimeTime } from "./realtime-time";
import { RealtimePlatform } from "./realtime-platform";
import { deriveRealtimePresentation } from "./realtime-presentation";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Station } from "./network-data";
import { occupancyForecast } from "./occupancy";
import { decodePolyline } from "./live-trains";
import { cleanDestination, compactStationLabel, serviceBadgeStyle } from "./transit-style";
import { berlinTimestamp, inBatches, requireTransitousStopId } from "./transitous";
import { trimRepeatedStationLoop } from "./trip-trimming";

type BoardMode = "departures" | "arrivals";
type BoardKind = "departure" | "arrival";
type ProductFilter = "all" | "fern" | "regional" | "sbahn" | "ubahn" | "tram";
type DelayFilter = "all" | "ontime" | "delayed" | "canceled";
type SortMode = "time" | "delay" | "platform" | "product";
type BoardWindow = 60 | 120 | 180 | 240 | 500;
type BoardVerificationStatus = "matched" | "different" | "unavailable";

type BoardEntry = {
  tripId?: string;
  kind: BoardKind;
  when?: string;
  plannedWhen?: string;
  platform?: string | null;
  plannedPlatform?: string | null;
  canceled?: boolean;
  cancellationScope?: "stop" | "leg";
  realtime?: boolean;
  direction?: string;
  provenance?: string;
  alerts?: string[];
  line?: { name?: string; product?: string; routeId?: string; color?: string; textColor?: string };
};

export type BoardSummary = {
  stationId: string;
  windowMinutes: 500;
  total: number;
  realtime: number;
  canceled: number;
  delayed6: number;
  delayed15: number;
  delayed30: number;
  averageDelay: number;
  products: { ice: number; ic: number; ec: number; sbahn: number; ubahn: number; tram: number; regional: number };
  updatedAt?: string;
  realtimeStatus?: "live" | "schedule" | "stale";
  warnings?: string[];
};

export type BoardMapTrip = {
  tripId: string;
  name: string;
  category: "fern" | "regional" | "sbahn" | "ubahn" | "tram";
  realtime: boolean;
  color?: string;
  textColor?: string;
  points: [number, number][];
  segments: [number, number][][];
  stops: { name: string; lat?: number; lon?: number; arrival?: string; departure?: string; scheduledArrival?: string; scheduledDeparture?: string; track?: string; scheduledTrack?: string; cancelled?: boolean; realtime?: boolean }[];
};

type TransitousEntry = {
  place: { arrival?: string; departure?: string; scheduledArrival?: string; scheduledDeparture?: string; track?: string; scheduledTrack?: string; cancelled?: boolean };
  mode?: string;
  headsign?: string;
  tripFrom?: { name?: string };
  tripTo?: { name?: string };
  displayName?: string;
  routeShortName?: string;
  routeLongName?: string;
  routeId?: string;
  routeColor?: string;
  routeTextColor?: string;
  tripId?: string;
  cancelled?: boolean;
  tripCancelled?: boolean;
  realTime?: boolean;
  alerts?: { header?: string; headerText?: { translation?: { text?: string }[] } }[];
};

type TripPlace = {
  realtime?: boolean;
  name?: string;
  lat?: number;
  lon?: number;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  track?: string;
  scheduledTrack?: string;
  cancelled?: boolean;
};

type TripLeg = {
  mode?: string;
  displayName?: string;
  realTime?: boolean;
  cancelled?: boolean;
  routeColor?: string;
  routeTextColor?: string;
  from?: TripPlace;
  to?: TripPlace;
  intermediateStops?: TripPlace[];
  legGeometry?: { points?: string; precision?: number };
};

type TripDetail = { stops: TripPlace[]; points: [number, number][]; segments: [number, number][][]; realtime: boolean; origin?: string; destination?: string; color?: string; textColor?: string };

function alertHeader(alert: { header?: string; headerText?: { translation?: { text?: string }[] } }) {
  return cleanDestination(alert.header) ?? cleanDestination(alert.headerText?.translation?.find((item) => item.text)?.text);
}

function delayMinutes(entry: BoardEntry) {
  if (!entry.when || !entry.plannedWhen) return 0;
  return Math.max(0, Math.round((new Date(entry.when).getTime() - new Date(entry.plannedWhen).getTime()) / 60_000));
}

function product(mode?: string) {
  if (mode === "HIGHSPEED_RAIL") return "fern-express";
  if (["LONG_DISTANCE", "NIGHT_RAIL"].includes(mode ?? "")) return "fern";
  if (mode === "SUBURBAN") return "sbahn";
  if (mode === "SUBWAY") return "ubahn";
  if (mode === "TRAM") return "tram";
  return "regional";
}

export function brandFor(entry: BoardEntry) {
  const name = (entry.line?.name ?? "Zug").trim();
  if (entry.line?.product === "tram") return { label:name.replace(/\s+/g, ""), number:"", className:"tram" };
  const number = name.replace(/^(?:FlixTrain\s+)?(ICE|IC|EC|RJX?|TGV|NJ|EN|FLX|RE|RB|S|U)\s*/i, "").trim();
  if (/^ICE\b/i.test(name) || entry.line?.product === "fern-express") return { label:"ICE", number, className:"ice" };
  if (/^IC\b/i.test(name)) return { label:"IC", number, className:"ic" };
  if (/^(?:FlixTrain\s+)?FLX\b/i.test(name)) return { label:"FLX", number, className:"ec" };
  if (/^(EC|RJ|RJX|TGV|NJ|EN)\b/i.test(name)) return { label:name.match(/^[A-Z]+/i)?.[0] ?? "EC", number, className:"ec" };
  if (entry.line?.product === "sbahn" || /^S\s?\d+/i.test(name)) return { label:name.replace(/\s+/g, ""), number:"", className:"sbahn" };
  if (entry.line?.product === "ubahn" || /^U\s?\d+/i.test(name)) return { label:name.replace(/\s+/g, ""), number:"", className:"ubahn" };
  if (/^(RE|RB)\b/i.test(name)) return { label:name.match(/^[A-Z]+/i)?.[0] ?? "R", number, className:"regional" };
  if (entry.line?.product === "fern") return { label:"FV", number:name, className:"ec" };
  return { label:"R", number:name, className:"regional" };
}

function summaryProduct(entry: BoardEntry): keyof BoardSummary["products"] {
  const brand = brandFor(entry);
  if (brand.className === "ice") return "ice";
  if (brand.className === "ec") return "ec";
  if (brand.className === "sbahn") return "sbahn";
  if (brand.className === "ubahn") return "ubahn";
  if (brand.className === "tram") return "tram";
  if (brand.className === "ic") return "ic";
  return "regional";
}

function serviceQuality(entry: BoardEntry) {
  const name = entry.line?.name ?? "";
  if (/^(ICE|IC|EC|RJ|TGV|FLX)\s?\d+$/i.test(name)) return 3;
  if (!name.includes("(")) return 2;
  return 1;
}

function entryKey(entry: BoardEntry) {
  return [entry.kind, entry.tripId ?? entry.line?.name, entry.plannedWhen, entry.direction, entry.provenance].join("|");
}

function deduplicate(entries: BoardEntry[]) {
  const unique = new Map<string, BoardEntry>();
  for (const entry of entries) {
    const key = entry.tripId ? `${entry.kind}|${entry.tripId}|${entry.plannedWhen}` : [entry.kind, entry.plannedWhen, entry.plannedPlatform, entry.direction, entry.provenance, entry.line?.product].join("|");
    const current = unique.get(key);
    if (!current || serviceQuality(entry) > serviceQuality(current)) unique.set(key, entry);
  }
  return [...unique.values()];
}

async function loadBoard(station: Station, kind: BoardKind, signal: AbortSignal) {
  const arrivals = kind === "arrival";
  const stopId = await requireTransitousStopId(station, signal);
  const url = new URL(`/api/stations/${encodeURIComponent(stopId)}/board`, window.location.origin);
  url.searchParams.set("n", "1400");
  url.searchParams.set("kind", kind);
  const response = await fetch(url, { signal });
  const payload = await response.json() as { stopTimes?: TransitousEntry[]; source?:string; updatedAt?:string; warnings?:string[]; verification?:{ status?:BoardVerificationStatus; message?:string } };
  if (!response.ok) throw new Error(payload.warnings?.[0] ?? `Live-Dienst ${response.status}`);
  const entries = (payload.stopTimes ?? []).map((entry): BoardEntry => ({
    tripId: entry.tripId,
    kind,
    when: arrivals ? entry.place.arrival : entry.place.departure,
    plannedWhen: arrivals ? entry.place.scheduledArrival : entry.place.scheduledDeparture,
    platform: entry.place.track,
    plannedPlatform: entry.place.scheduledTrack,
    canceled: entry.cancelled || entry.tripCancelled || entry.place.cancelled,
    cancellationScope:entry.tripCancelled || entry.cancelled ? "leg" : entry.place.cancelled ? "stop" : undefined,
    realtime: entry.realTime,
    direction: compactStationLabel(entry.headsign) ?? compactStationLabel(entry.tripTo?.name) ?? compactStationLabel(entry.routeLongName),
    provenance: compactStationLabel(entry.tripFrom?.name),
    alerts:(entry.alerts ?? []).map(alertHeader).filter((value): value is string => Boolean(value)),
    line: { name: entry.displayName || entry.routeShortName, product: product(entry.mode), routeId:entry.routeId, color:entry.routeColor, textColor:entry.routeTextColor },
  }));
  return { entries, source:payload.source ?? "Transitous / MOTIS", updatedAt:payload.updatedAt, warnings:payload.warnings ?? [], verificationStatus:payload.verification?.status ?? "unavailable", verificationMessage:payload.verification?.message };
}

async function loadTrip(tripId: string, station?: Station, referenceTime?: string, signal?: AbortSignal): Promise<TripDetail> {
  const url = new URL(`/api/trips/transitous/${encodeURIComponent(tripId)}`, window.location.origin);
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Fahrtverlauf ${response.status}`);
  const envelope = await response.json() as { trip?: { legs?: TripLeg[] } };
  const payload = envelope.trip ?? {};
  const stops: TripPlace[] = [];
  const segments: [number, number][][] = [];
  for (const leg of payload.legs ?? []) {
    if (leg.legGeometry?.points) {
      const legPoints = decodePolyline(leg.legGeometry.points, leg.legGeometry.precision ?? 6);
      if (legPoints.length > 1) segments.push(legPoints);
    }
    for (const stop of [leg.from, ...(leg.intermediateStops ?? []), leg.to]) {
      if (!stop?.name) continue;
      const previous = stops.at(-1);
      if (previous?.name === stop.name && (previous.departure ?? previous.arrival) === (stop.departure ?? stop.arrival)) {
        // A shared boundary is confirmed only when both adjoining legs confirm realtime.
        previous.realtime = Boolean(previous.realtime && leg.realTime);
        previous.cancelled = Boolean(previous.cancelled || stop.cancelled || leg.cancelled);
        continue;
      }
      stops.push({ ...stop, realtime:Boolean(leg.realTime), cancelled:Boolean(stop.cancelled || leg.cancelled) });
    }
  }
  const points = segments.flat();
  const selected = station ? trimRepeatedStationLoop(stops, points, station, referenceTime) : { stops, points };
  const selectedSegments = "trimmed" in selected && selected.trimmed && segments.length === 1 && selected.points.length > 1 ? [selected.points] : segments;
  const legs = payload.legs ?? [];
  return {
    stops:selected.stops,
    points:selected.points,
    segments:selectedSegments,
    realtime:legs.some((leg) => leg.realTime),
    origin:compactStationLabel(selected.stops[0]?.name),
    destination:compactStationLabel(selected.stops.at(-1)?.name),
    color:legs.find((leg) => leg.routeColor)?.routeColor,
    textColor:legs.find((leg) => leg.routeTextColor)?.routeTextColor,
  };
}

function mapTrip(entry: BoardEntry, detail: TripDetail): BoardMapTrip {
  return {
    tripId:entry.tripId ?? entryKey(entry),
    name:entry.line?.name ?? "Fahrt",
    category:entry.line?.product === "sbahn" ? "sbahn" : entry.line?.product === "ubahn" ? "ubahn" : entry.line?.product === "tram" ? "tram" : ["fern","fern-express"].includes(entry.line?.product ?? "") ? "fern" : "regional",
    realtime:Boolean(entry.realtime || detail.realtime),
    color:entry.line?.color ?? detail.color,
    textColor:entry.line?.textColor ?? detail.textColor,
    points:detail.points,
    segments:detail.segments,
    stops:detail.stops.filter((stop): stop is TripPlace & { name:string } => Boolean(stop.name)).map((stop) => ({ name:compactStationLabel(stop.name) ?? stop.name, lat:stop.lat, lon:stop.lon, arrival:stop.arrival, departure:stop.departure, scheduledArrival:stop.scheduledArrival, scheduledDeparture:stop.scheduledDeparture, track:stop.track, scheduledTrack:stop.scheduledTrack, cancelled:stop.cancelled, realtime:stop.realtime })),
  };
}

export function LiveBoard({ station, onSummary, onMapTrip, onStationTrips }: { station: Station; onSummary?: (summary: BoardSummary) => void; onMapTrip?: (trip: BoardMapTrip) => void; onStationTrips?: (trips: BoardMapTrip[]) => void }) {
  const [mode, setMode] = useState<BoardMode>("departures");
  const [productFilter, setProductFilter] = useState<ProductFilter>("all");
  const [delayFilter, setDelayFilter] = useState<DelayFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [windowMinutes, setWindowMinutes] = useState<BoardWindow>(240);
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [entries, setEntries] = useState<BoardEntry[]>([]);
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [tripDetails, setTripDetails] = useState<Record<string, TripDetail>>({});
  const [tripDetailState, setTripDetailState] = useState<Record<string, "loading" | "ready" | "error">>({});
  const [pinned, setPinned] = useState<string[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [sourceLabel, setSourceLabel] = useState("Transitous / MOTIS");
  const [sourceWarnings, setSourceWarnings] = useState<string[]>([]);
  const [verificationStatus, setVerificationStatus] = useState<BoardVerificationStatus>("unavailable");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [stale, setStale] = useState(false);
  const [now, setNow] = useState(0);
  const [refreshToken, setRefreshToken] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(50);
  const previewSignatureRef = useRef("");
  const rowRequestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    rowRequestRef.current = controller;
    return () => controller.abort();
  }, []);
  const endpointSignatureRef = useRef("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setPinned(JSON.parse(localStorage.getItem("bahnconnections-pinned-trips") ?? "[]")); } catch { setPinned([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => { window.clearTimeout(firstTick); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      if (!entries.length) setStatus("loading");
      try {
        const kind: BoardKind = mode === "arrivals" ? "arrival" : "departure";
        const board = await loadBoard(station, kind, controller.signal);
        if (controller.signal.aborted) return;
        setEntries(deduplicate(board.entries));
        setSourceLabel(board.source);
        setSourceWarnings(board.warnings);
        setVerificationStatus(board.verificationStatus);
        setVerificationMessage(board.verificationMessage ?? "");
        setExpandedRows([]);
        setUpdatedAt(board.updatedAt ? new Date(board.updatedAt) : new Date());
        setStale(false);
        setStatusMessage("");
        setStatus("ready");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setStale(entries.length > 0);
          setStatusMessage((error as Error).message);
          setStatus(entries.length ? "ready" : "error");
        }
      }
      if (controller.signal.aborted) return;
      timer = setTimeout(() => setRefreshToken((value) => value + 1), 75_000);
    }
    load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
    // Cached rows intentionally stay available when a refresh fails.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, refreshToken, station]);

  const platformOptions = useMemo(() => [...new Set(entries.map((entry) => entry.platform ?? entry.plannedPlatform).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "de", { numeric:true })), [entries]);
  const productCounts = useMemo(() => ({
    fern: entries.filter((entry) => ["fern", "fern-express"].includes(entry.line?.product ?? "")).length,
    regional: entries.filter((entry) => entry.line?.product === "regional").length,
    sbahn: entries.filter((entry) => entry.line?.product === "sbahn").length,
    ubahn: entries.filter((entry) => entry.line?.product === "ubahn").length,
    tram: entries.filter((entry) => entry.line?.product === "tram").length,
  }), [entries]);

  const visibleEntries = useMemo(() => {
    const normalisedQuery = query.trim().toLocaleLowerCase("de");
    return entries.filter((entry) => {
      const productName = entry.line?.product ?? "regional";
      if (productFilter === "fern" && !["fern", "fern-express"].includes(productName)) return false;
      if (productFilter === "regional" && productName !== "regional") return false;
      if (productFilter === "sbahn" && productName !== "sbahn") return false;
      if (productFilter === "ubahn" && productName !== "ubahn") return false;
      if (productFilter === "tram" && productName !== "tram") return false;
      const delay = delayMinutes(entry);
      if (delayFilter === "ontime" && (entry.canceled || !entry.realtime || !entry.when || !entry.plannedWhen || new Date(entry.when) < new Date(entry.plannedWhen) || delay >= 6)) return false;
      if (delayFilter === "delayed" && (entry.canceled || delay < 6)) return false;
      if (delayFilter === "canceled" && !entry.canceled) return false;
      const platform = entry.platform ?? entry.plannedPlatform ?? "";
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (normalisedQuery && ![entry.line?.name, entry.direction, entry.provenance, platform].filter(Boolean).join(" ").toLocaleLowerCase("de").includes(normalisedQuery)) return false;
      const eventTime = new Date(entry.when ?? entry.plannedWhen ?? 0).getTime();
      return eventTime >= now - 5 * 60_000 && eventTime <= now + windowMinutes * 60_000;
    }).sort((a, b) => {
      const pinnedDifference = Number(pinned.includes(entryKey(b))) - Number(pinned.includes(entryKey(a)));
      if (pinnedDifference) return pinnedDifference;
      if (sortMode === "delay") return delayMinutes(b) - delayMinutes(a);
      if (sortMode === "platform") return String(a.platform ?? a.plannedPlatform ?? "").localeCompare(String(b.platform ?? b.plannedPlatform ?? ""), "de", { numeric: true });
      if (sortMode === "product") return String(a.line?.name ?? "").localeCompare(String(b.line?.name ?? ""), "de", { numeric: true });
      return new Date(a.when ?? a.plannedWhen ?? 0).getTime() - new Date(b.when ?? b.plannedWhen ?? 0).getTime();
    });
  }, [delayFilter, entries, now, pinned, platformFilter, productFilter, query, sortMode, windowMinutes]);

  const displayedEntries = useMemo(() => visibleEntries.slice(0, displayLimit), [displayLimit, visibleEntries]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDisplayLimit(compact ? 50 : 100), 0);
    return () => window.clearTimeout(timer);
  }, [compact, delayFilter, mode, platformFilter, productFilter, query, sortMode, station.id, windowMinutes]);

  const boardStats = useMemo(() => ({
    realtime: visibleEntries.filter((entry) => entry.realtime).length,
    delayed: visibleEntries.filter((entry) => !entry.canceled && delayMinutes(entry) >= 6).length,
    canceled: visibleEntries.filter((entry) => entry.canceled).length,
  }), [visibleEntries]);

  const summary = useMemo((): BoardSummary => {
    const scoped = entries.filter((entry) => {
      const eventTime = new Date(entry.when ?? entry.plannedWhen ?? 0).getTime();
      return eventTime >= now - 5 * 60_000 && eventTime <= now + 500 * 60_000;
    });
    const validDelays = scoped.filter((entry) => !entry.canceled).map(delayMinutes);
    const products = { ice:0, ic:0, ec:0, sbahn:0, ubahn:0, tram:0, regional:0 };
    for (const entry of scoped) products[summaryProduct(entry)] += 1;
    return {
      stationId:station.id, windowMinutes:500, total:scoped.length,
      realtime:scoped.filter((entry) => entry.realtime).length,
      canceled:scoped.filter((entry) => entry.canceled).length,
      delayed6:scoped.filter((entry) => !entry.canceled && delayMinutes(entry) >= 6).length,
      delayed15:scoped.filter((entry) => !entry.canceled && delayMinutes(entry) >= 15).length,
      delayed30:scoped.filter((entry) => !entry.canceled && delayMinutes(entry) >= 30).length,
      averageDelay:validDelays.length ? validDelays.reduce((sum, value) => sum + value, 0) / validDelays.length : 0,
      products,
      updatedAt:updatedAt?.toISOString(),
      realtimeStatus:stale ? "stale" : scoped.some((entry) => entry.realtime) ? "live" : "schedule",
      warnings:[...sourceWarnings, ...(stale ? ["Die letzte Aktualisierung ist fehlgeschlagen; vorhandene Zeilen können veraltet sein."] : [])],
    };
  }, [entries, now, sourceWarnings, stale, station.id, updatedAt]);

  useEffect(() => { if (status === "ready") onSummary?.(summary); }, [onSummary, status, summary]);

  useEffect(() => {
    if (status !== "ready") return;
    const unresolved = entries.filter((entry) => entry.tripId && (mode === "departures" ? !entry.direction : !entry.provenance)).slice(0, 90);
    const signature = `${station.id}|${mode}|${unresolved.map((entry) => entry.tripId).join("|")}`;
    if (!unresolved.length || endpointSignatureRef.current === signature) return;
    endpointSignatureRef.current = signature;
    const controller = new AbortController();
    let active = true;
    void Promise.allSettled(unresolved.map(async (entry) => ({
      tripId:entry.tripId!,
      detail:await loadTrip(entry.tripId!, station, entry.when ?? entry.plannedWhen, controller.signal),
    }))).then((results) => {
      if (!active) return;
      const resolved = new Map(results.filter((result): result is PromiseFulfilledResult<{ tripId:string; detail:TripDetail }> => result.status === "fulfilled").map((result) => [result.value.tripId, result.value.detail]));
      if (!resolved.size) return;
      setTripDetails((current) => {
        const next = { ...current };
        for (const entry of unresolved) {
          const detail = entry.tripId ? resolved.get(entry.tripId) : undefined;
          if (detail) next[entryKey(entry)] = detail;
        }
        return next;
      });
      setEntries((current) => current.map((entry) => {
        const detail = entry.tripId ? resolved.get(entry.tripId) : undefined;
        if (!detail) return entry;
        return {
          ...entry,
          direction:entry.direction ?? detail.destination,
          provenance:entry.provenance ?? detail.origin,
          line:{ ...entry.line, color:entry.line?.color ?? detail.color, textColor:entry.line?.textColor ?? detail.textColor },
        };
      }));
    });
    return () => { active = false; controller.abort(); };
  }, [entries, mode, station, status]);

  useEffect(() => {
    if (status !== "ready" || !onStationTrips) return;
    const previewPerCategory = 6;
    const candidates: BoardEntry[] = [];
    const seenDirections = new Set<string>();
    for (const category of ["fern","regional","sbahn","ubahn","tram"] as const) {
      let categoryCount = 0;
      for (const entry of entries) {
        const entryCategory = entry.line?.product === "sbahn" ? "sbahn" : entry.line?.product === "ubahn" ? "ubahn" : entry.line?.product === "tram" ? "tram" : ["fern","fern-express"].includes(entry.line?.product ?? "") ? "fern" : "regional";
        const directionKey = `${entry.line?.routeId ?? entry.line?.name ?? entryCategory}|${entry.direction ?? entry.tripId}`;
        if (entryCategory !== category || !entry.tripId || seenDirections.has(directionKey)) continue;
        candidates.push(entry); seenDirections.add(directionKey); categoryCount += 1;
        if (categoryCount >= previewPerCategory) break;
      }
    }
    const signature = `${station.id}|${mode}|${candidates.map((entry) => entry.tripId).join("|")}`;
    if (previewSignatureRef.current === signature) return;
    previewSignatureRef.current = signature;
    if (!candidates.length) { onStationTrips([]); return; }
    let active = true;
    const controller = new AbortController();
    const collected: BoardMapTrip[] = [];
    void inBatches(candidates, 6, async (entry) => {
      if (!active) throw new DOMException("Abgebrochen", "AbortError");
      return mapTrip(entry, await loadTrip(entry.tripId!, station, entry.when ?? entry.plannedWhen, controller.signal));
    }, (results) => {
      if (!active) return;
      collected.push(...results.filter((result): result is PromiseFulfilledResult<BoardMapTrip> => result.status === "fulfilled" && result.value.points.length > 1).map((result) => result.value));
      onStationTrips([...collected]);
    });
    return () => { active = false; controller.abort(); };
  }, [entries, mode, onStationTrips, station, status]);

  function togglePinned(entry: BoardEntry) {
    const key = entryKey(entry);
    setPinned((current) => {
      const next = current.includes(key) ? current.filter((item) => item !== key) : [key, ...current].slice(0, 30);
      localStorage.setItem("bahnconnections-pinned-trips", JSON.stringify(next));
      return next;
    });
  }

  async function toggleRow(entry: BoardEntry) {
    const key = entryKey(entry);
    const opening = !expandedRows.includes(key);
    setExpandedRows((current) => opening ? [...current, key] : current.filter((item) => item !== key));
    if (!opening || !entry.tripId || tripDetailState[key] === "loading") return;
    const existing = tripDetails[key];
    if (existing) {
      if (existing.points.length) onMapTrip?.(mapTrip(entry, existing));
      return;
    }
    setTripDetailState((current) => ({ ...current, [key]:"loading" }));
    const controller = rowRequestRef.current ?? new AbortController();
    rowRequestRef.current = controller;
    try {
      const detail = await loadTrip(entry.tripId, station, entry.when ?? entry.plannedWhen, controller.signal);
      if (controller.signal.aborted) return;
      setTripDetails((current) => ({ ...current, [key]:detail }));
      setTripDetailState((current) => ({ ...current, [key]:"ready" }));
      if (detail.points.length) onMapTrip?.(mapTrip(entry, detail));
    } catch {
      if (controller.signal.aborted) return;
      setTripDetailState((current) => ({ ...current, [key]:"error" }));
    }
  }

  function openBoardWindow() {
    const url = new URL(window.location.href);
    url.searchParams.set("station", station.id);
    url.searchParams.set("board", "1");
    window.open(url, "bahnconnections-liveboard", "noopener,noreferrer,width=1180,height=860");
  }

  return (
    <section className={`live-board realistic${compact ? " compact" : " expanded-detail"}`} aria-live="polite">
      <div className="board-primary-bar">
        <div className="board-mode-tabs" role="tablist" aria-label="Live-Tafel">
          <button role="tab" aria-selected={mode === "departures"} className={mode === "departures" ? "active" : ""} onClick={() => setMode("departures")}>Abfahrt</button>
          <button role="tab" aria-selected={mode === "arrivals"} className={mode === "arrivals" ? "active" : ""} onClick={() => setMode("arrivals")}>Ankunft</button>
        </div>
        <div className="board-actions">
          <button className={filtersOpen ? "active" : ""} onClick={() => setFiltersOpen((value) => !value)} aria-expanded={filtersOpen}>Filter</button>
          <button onClick={() => setCompact((value) => !value)} aria-pressed={!compact}>{compact ? "Erweitert" : "Kompakt"}</button>
          <button onClick={openBoardWindow} title="In eigenem Fenster öffnen" aria-label="Live-Tafel in eigenem Fenster öffnen">↗</button>
        </div>
      </div>

      <div className="board-product-tabs" aria-label="Verkehrsmittel">
        <button className={productFilter === "fern" ? "active" : ""} onClick={() => setProductFilter("fern")}>Fern</button>
        {productCounts.regional > 0 && <button className={productFilter === "regional" ? "active" : ""} onClick={() => setProductFilter("regional")}>Regio</button>}
        {productCounts.sbahn > 0 && <button className={productFilter === "sbahn" ? "active" : ""} onClick={() => setProductFilter("sbahn")}>S-Bahn</button>}
        {productCounts.tram > 0 && <button className={productFilter === "tram" ? "active" : ""} onClick={() => setProductFilter("tram")}>Straßenbahn</button>}
        {productCounts.ubahn > 0 && <button className={productFilter === "ubahn" ? "active" : ""} onClick={() => setProductFilter("ubahn")}>U-Bahn</button>}
        <button className={productFilter === "all" ? "active" : ""} onClick={() => setProductFilter("all")}>Alle</button>
      </div>

      <div className="board-search-row">
        <label className="board-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Zug, Ziel oder Gleis" aria-label="Innerhalb der Bahnhofstafel suchen" />{query && <button onClick={() => setQuery("")} aria-label="Tafelsuche leeren">×</button>}</label>
      </div>

      {filtersOpen && (
        <div className="board-filter-panel">
          <label>Status<select value={delayFilter} onChange={(event) => setDelayFilter(event.target.value as DelayFilter)}><option value="all">Alle Lagen</option><option value="ontime">Pünktlich</option><option value="delayed">Ab +6 Min.</option><option value="canceled">Nur Ausfälle</option></select></label>
          <label>Gleis<select value={platformFilter} onChange={(event) => setPlatformFilter(event.target.value)}><option value="all">Alle Gleise</option>{platformOptions.map((platform) => <option key={platform} value={platform}>{platform}</option>)}</select></label>
          <label>Zeitraum<select value={windowMinutes} onChange={(event) => setWindowMinutes(Number(event.target.value) as BoardWindow)}><option value="60">60 Minuten</option><option value="120">120 Minuten</option><option value="180">180 Minuten</option><option value="240">240 Minuten</option><option value="500">500 Minuten</option></select></label>
          <label>Sortierung<select value={sortMode} onChange={(event) => setSortMode(event.target.value as SortMode)}><option value="time">Abfahrtszeit</option><option value="delay">Verspätung</option><option value="platform">Gleis</option><option value="product">Zuggattung</option></select></label>
        </div>
      )}

      {status === "ready" && (boardStats.delayed > 0 || boardStats.canceled > 0) && <div className="board-live-summary">{boardStats.delayed > 0 && <span className="late">{boardStats.delayed} verspätet</span>}{boardStats.canceled > 0 && <span className="cancel">{boardStats.canceled} Ausfälle</span>}</div>}

      <div className="board-table">
        <div className="board-table-head"><span /><span>Zug / Bus</span><span>Zeit</span><span>Über</span><span>{mode === "arrivals" ? "Von" : "Ziel"}</span><span>Gleis</span></div>
        {status === "loading" && <div className="board-skeleton" aria-label="Live-Daten werden geladen">{[1,2,3,4,5].map((item) => <i key={item} />)}</div>}
        {status === "error" && <div className="board-state error"><b>Live-Tafel gerade nicht erreichbar.</b><span>{statusMessage.startsWith("Keine eindeutige Haltestellen-ID") ? statusMessage : "Live-Daten derzeit unvollständig. Karte und Fahrplanmodell bleiben verfügbar."}</span><button onClick={() => setRefreshToken((value) => value + 1)}>Erneut laden</button></div>}
        {status === "ready" && (
          <div className="board-list">
            {displayedEntries.map((entry, index) => {
              const presentation = deriveRealtimePresentation({ scheduled:entry.plannedWhen, actual:entry.when, realtime:entry.realtime, cancelled:entry.canceled });
              const key = entryKey(entry);
              const rowOpen = expandedRows.includes(key);
              const brand = brandFor(entry);
              const forecast = occupancyForecast(entry.when ?? entry.plannedWhen, entry.line?.name);
              const detail = tripDetails[key];
              const detailState = tripDetailState[key];
              const severity = presentation.kind === "cancelled" ? "cancel" : presentation.severe ? "severe" : presentation.kind;
              const destination = entry.kind === "arrival" ? entry.provenance ?? entry.direction ?? "Ziel wird ermittelt …" : entry.direction ?? "Ziel wird ermittelt …";
              return (
                <article className={`board-row ${severity}${rowOpen ? " open" : ""}`} key={`${key}-${index}`}>
                  <button className="board-row-summary" onClick={() => void toggleRow(entry)} aria-expanded={rowOpen}>
                    <i className="row-status" aria-hidden="true" />
                    <span className="board-service"><span className={`service-logo ${brand.className}`} style={serviceBadgeStyle(brand.className === "ice" || brand.className === "ic" || brand.className === "ec" ? "fern" : brand.className === "sbahn" ? "sbahn" : brand.className === "ubahn" ? "ubahn" : brand.className === "tram" ? "tram" : "regional", entry.line?.color, entry.line?.textColor, entry.line?.name, `${station.state ?? ""} ${entry.provenance ?? ""} ${entry.direction ?? ""}`)}>{brand.label}</span>{brand.number ? <b>{brand.number}</b> : null}</span>
                    <span className="board-time"><RealtimeTime scheduled={entry.plannedWhen} actual={entry.when} realtime={entry.realtime} cancelled={entry.canceled} cancellationLabel={entry.cancellationScope === "stop" ? "Halt entfällt" : "Fahrt entfällt"} compact /></span>
                    <span className="board-destination" title={destination}><b>{destination}</b>{!entry.canceled && entry.alerts?.length ? <small>Betriebshinweis</small> : null}</span>
                    <span className="board-platform"><RealtimePlatform scheduled={entry.plannedPlatform} actual={entry.platform} compact /></span>
                  </button>
                  {rowOpen && <div className="board-row-detail">
                    <div className="trip-detail-summary"><div>{entry.canceled ? <b>Fahrt entfällt</b> : null}{entry.alerts?.slice(0,2).map((alert, alertIndex) => <small className="board-alert" key={`${alert}-${alertIndex}`}>{alert}</small>)}</div><div className={`occupancy-forecast level-${forecast.level}`}><b>Auslastung {forecast.label.toLocaleLowerCase("de")}</b><span className="occupancy-bars" aria-hidden="true">{[1,2,3].map((item) => <i className={item <= forecast.level ? "active" : ""} key={item} />)}</span></div><button className={pinned.includes(key) ? "pin active" : "pin"} onClick={() => togglePinned(entry)}>{pinned.includes(key) ? "★ Gemerkt" : "☆ Merken"}</button></div>
                    <div className="trip-stop-panel"><div className="trip-stop-heading"><b>Fahrtverlauf</b><span>{detail?.stops.length ? `${detail.stops.length} Halte` : ""}</span>{detail?.points.length ? <button onClick={() => onMapTrip?.(mapTrip(entry, detail))}>◎ Auf Karte</button> : null}</div>{detailState === "loading" && <p className="trip-stop-state">Halte und Zeiten werden live geladen …</p>}{detailState === "error" && <p className="trip-stop-state error">Der Live-Fahrtverlauf ist gerade nicht erreichbar. Die Tafelzeile bleibt verfügbar.</p>}{detailState === "ready" && detail?.stops.length ? <ol className="trip-stop-list">{detail.stops.map((stop, stopIndex) => { const actual=stop.departure ?? stop.arrival; const planned=stop.scheduledDeparture ?? stop.scheduledArrival; const stopName=compactStationLabel(stop.name) ?? stop.name; return <li className={stop.cancelled ? "cancelled" : ""} key={`${stop.name}-${stopIndex}`}><i aria-hidden="true" /><span className="stop-description"><b>{stopName}</b><small><RealtimePlatform scheduled={stop.scheduledTrack} actual={stop.track} /></small></span><RealtimeTime scheduled={planned} actual={actual} realtime={stop.realtime} cancelled={stop.cancelled} compact /></li>; })}</ol> : null}{detailState === "ready" && detail?.stops.length && !detail.points.length ? <p className="trip-stop-state geometry-missing">Die Halte sind verfügbar; die Quelle liefert für diese Fahrt gerade keine belastbare Streckengeometrie. Deshalb wird keine Luftlinie gezeichnet.</p> : null}{detailState === "ready" && !detail?.stops.length && <p className="trip-stop-state">Für diese Fahrt liefert die Quelle derzeit keine Haltefolge.</p>}{!entry.tripId && <p className="trip-stop-state">Für diese Fahrplanzeile ist keine abrufbare Fahrt-ID vorhanden.</p>}</div>
                  </div>}
                </article>
              );
            })}
            {!visibleEntries.length && <div className="board-state">Keine passenden Fahrten in den nächsten {windowMinutes} Minuten.</div>}
            {displayedEntries.length < visibleEntries.length && <button className="board-more" onClick={() => setDisplayLimit((value) => value + 50)}>Weitere 50 Fahrten anzeigen <span>{displayedEntries.length}/{visibleEntries.length}</span></button>}
          </div>
        )}
      </div>
      <footer className="board-footer"><a className={`verification-${verificationStatus}`} href="https://transitous.org/sources/" target="_blank" rel="noreferrer" title={verificationMessage || sourceWarnings.join(" · ")}><i /> {stale ? "Live-Daten unvollständig · letzter Stand" : verificationStatus === "matched" ? "Transitous · DB-geprüft" : verificationStatus === "different" ? "Transitous · Quellenabweichung" : entries.some((entry) => entry.realtime) ? `${sourceLabel} · DB-Prüfung offen` : "Nur Fahrplandaten verfügbar"}</a><button onClick={() => setRefreshToken((value) => value + 1)} aria-label="Live-Tafel aktualisieren">↻ {updatedAt ? berlinTimestamp(updatedAt) : "Aktualisieren"}</button></footer>
    </section>
  );
}
