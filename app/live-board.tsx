"use client";

import { boardDelayStatistics } from "./board-statistics";
import { boardDedupeKey } from "./board-dedup";
import { readPreferenceIds, writePreference } from "./local-preferences";
import { matchesBoardDelayFilter, type BoardDelayFilter } from "./board-delay-filter";
import { readBoardStream } from "./board-stream";
import { VisibilityPoller } from "./visibility-poller";
import { RealtimeTime } from "./realtime-time";
import { boardDisplayActual,boardDisplayPlatform,boardEventTime,boardPredictionFresh } from "./board-time";
import { RealtimePlatform } from "./realtime-platform";
import { BoardToolbar } from "./board-toolbar";
import { UiIcon } from "./ui-icon";
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
type SortMode = "time" | "delay" | "platform" | "product";
type BoardWindow = 60 | 120 | 180 | 240 | 500;
type BoardVerificationStatus = "matched" | "different" | "inconclusive" | "unavailable" | "pending";

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
  averageDelay: number | null;
  delaySamples: number;
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
  previewSegments?: [number, number][][];
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

function delayMinutes(entry: BoardEntry, fresh:boolean) {
  if (!fresh || !entry.realtime || !entry.when || !entry.plannedWhen) return 0;
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
  const regional=name.match(/^(RE|RB)\s*(\d{1,3}[A-Z]?)(?=\b|\s|\()/i);
  if (regional) return {label:`${regional[1].toUpperCase()}${regional[2].toUpperCase()}`,number:"",className:"regional"};
  if (/^(RE|RB)\b/i.test(name)) return {label:name.match(/^(RE|RB)/i)?.[0].toUpperCase()??"Regio",number:"",className:"regional"};
  if (entry.line?.product === "fern") return { label:"FV", number:name, className:"ec" };
  // An unrecognised operator/train ID is not a proven RE/RB route number.
  // Show its human-readable name once, not a fabricated "R" badge plus internal feed ID.
  return { label:name.replace(/\s*\([^)]*\)\s*$/,"").slice(0,12)||"Regio", number:"", className:"regional" };
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
  return boardDedupeKey(entry);
}

function deduplicate(entries: BoardEntry[]) {
  const unique = new Map<string, BoardEntry>();
  for (const entry of entries) {
    const key = boardDedupeKey(entry);
    const current = unique.get(key);
    if (!current || serviceQuality(entry) > serviceQuality(current)) unique.set(key, entry);
  }
  return [...unique.values()];
}

type BoardPayload = { type?:"board"|"verification"; stopTimes?:TransitousEntry[]; source?:string; updatedAt?:string; warnings?:string[]; verification?:{status?:BoardVerificationStatus;message?:string} };
async function loadBoard(station: Station, kind: BoardKind, signal: AbortSignal, onPrimary:(board:ReturnType<typeof boardResult>)=>void, onVerification:(payload:BoardPayload)=>void) {
  const stopId = await requireTransitousStopId(station, signal);
  const url = new URL(`/api/stations/${encodeURIComponent(stopId)}/board`, window.location.origin);
  url.searchParams.set("n", "1400");
  url.searchParams.set("kind", kind);
  url.searchParams.set("stream","1");
  const response = await fetch(url, { signal });
  if(!response.ok)throw new Error(`Live-Dienst ${response.status}`);
  if(response.headers.get("Content-Type")?.includes("application/x-ndjson")) {
    let received=false;
    await readBoardStream<BoardPayload>(response,signal,payload=>{
      if(payload.type==="board"){received=true;onPrimary(boardResult(payload,kind));}
      else if(payload.type==="verification")onVerification(payload);
    });
    if(!received)throw new Error("Keine Tafelzeilen empfangen");
  } else {const payload=await response.json() as BoardPayload;signal.throwIfAborted();onPrimary(boardResult(payload,kind));}
}
function boardResult(payload:BoardPayload,kind:BoardKind) {
  const arrivals=kind==="arrival";
  // One malformed row must not blank the complete live board.
  const validRows=Array.isArray(payload.stopTimes) ? payload.stopTimes.filter(entry=>entry && entry.place && typeof entry.place==="object") : [];
  const entries = validRows.map((entry): BoardEntry => ({
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
  const [delayFilter, setDelayFilter] = useState<BoardDelayFilter>("all");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [sortMode, setSortMode] = useState<SortMode>("time");
  const [windowMinutes, setWindowMinutes] = useState<BoardWindow>(240);
  const [query, setQuery] = useState("");
  const [compact, setCompact] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    if (!filtersOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest('.board-filter-panel,.board-filter-toggle')) setFiltersOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [filtersOpen]);
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
  const boardLive=boardPredictionFresh(updatedAt,now,stale);
  const [refreshToken, setRefreshToken] = useState(0);
  const [displayLimit, setDisplayLimit] = useState(50);
  const previewSignatureRef = useRef("");
  const rowRequestRef = useRef<AbortController | null>(null);
  useEffect(() => {
    // Switching stations or direction must invalidate pending detail requests.
    const controller = new AbortController();
    rowRequestRef.current = controller;
    return () => { controller.abort(); if(rowRequestRef.current===controller)rowRequestRef.current=null; };
  }, [station.id,mode]);
  const enrichmentAttemptsRef = useRef<Map<string,number>>(new Map());

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { setPinned(readPreferenceIds(localStorage,"bahnconnections-pinned-trips")); } catch { setPinned([]); }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const firstTick = window.setTimeout(() => setNow(Date.now()), 0);
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => { window.clearTimeout(firstTick); window.clearInterval(timer); };
  }, []);

  const boardScope=useRef("");
  const boardHasRows=useRef(false);
  useEffect(() => {
    let hasRows=boardHasRows.current;
    const kind:BoardKind=mode==="arrivals"?"arrival":"departure";
    const scope=`${station.id}:${kind}`;
    const reset=boardScope.current!==scope?setTimeout(()=>{setEntries([]);setExpandedRows([]);setTripDetails({});setTripDetailState({});enrichmentAttemptsRef.current.clear();previewSignatureRef.current="";setStatus("loading");setStale(false);setUpdatedAt(null);setVerificationStatus("unavailable");setVerificationMessage("");setSourceWarnings([]);},0):undefined;
    if(boardScope.current!==scope){hasRows=false;boardHasRows.current=false;boardScope.current=scope;}
    const poller=new VisibilityPoller(async signal=>{
      try {
        await loadBoard(station,kind,signal,board=>{
          if(signal.aborted)return;clearTimeout(reset);hasRows=board.entries.length>0;boardHasRows.current=hasRows;
          setEntries(deduplicate(board.entries));setSourceLabel(board.source);setSourceWarnings(board.warnings);
          setVerificationStatus(board.verificationStatus);setVerificationMessage(board.verificationMessage??"");
          setUpdatedAt(board.updatedAt?new Date(board.updatedAt):new Date());setStale(false);setStatusMessage("");setStatus("ready");
        },payload=>{
          if(signal.aborted)return;
          setSourceLabel(payload.source??"Transitous / MOTIS");setSourceWarnings(payload.warnings??[]);
          setVerificationStatus(payload.verification?.status??"unavailable");setVerificationMessage(payload.verification?.message??"");
        });
      } catch(error) {
        if(signal.aborted)return;
        setStale(hasRows);setStatusMessage(error instanceof Error?error.message:"Tafel nicht erreichbar");setStatus(hasRows?"ready":"error");
        setVerificationStatus("unavailable");
      }
    },75_000,document);
    return()=>{clearTimeout(reset);poller.dispose();};
  },[mode,refreshToken,station]);

  const platformOptions = useMemo(() => [...new Set(entries.map((entry) => boardDisplayPlatform(entry,boardLive) ?? entry.plannedPlatform).filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b, "de", { numeric:true })), [entries,boardLive]);
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
      const delayState=deriveRealtimePresentation({scheduled:entry.plannedWhen,actual:boardDisplayActual(entry,boardLive),realtime:entry.realtime&&boardLive,cancelled:entry.canceled});
      if (!matchesBoardDelayFilter(delayFilter,delayState)) return false;
      const platform = boardDisplayPlatform(entry,boardLive) ?? entry.plannedPlatform ?? "";
      if (platformFilter !== "all" && platform !== platformFilter) return false;
      if (normalisedQuery && ![entry.line?.name, entry.direction, entry.provenance, platform].filter(Boolean).join(" ").toLocaleLowerCase("de").includes(normalisedQuery)) return false;
      const eventTime = boardEventTime(entry,boardLive);
      return eventTime !== null && eventTime >= now - 5 * 60_000 && eventTime <= now + windowMinutes * 60_000;
    }).sort((a, b) => {
      const pinnedDifference = Number(pinned.includes(entryKey(b))) - Number(pinned.includes(entryKey(a)));
      if (pinnedDifference) return pinnedDifference;
      if (sortMode === "delay") return delayMinutes(b,boardLive) - delayMinutes(a,boardLive);
      if (sortMode === "platform") return String(boardDisplayPlatform(a,boardLive) ?? a.plannedPlatform ?? "").localeCompare(String(boardDisplayPlatform(b,boardLive) ?? b.plannedPlatform ?? ""), "de", { numeric: true });
      if (sortMode === "product") return String(a.line?.name ?? "").localeCompare(String(b.line?.name ?? ""), "de", { numeric: true });
      return (boardEventTime(a,boardLive)??Number.POSITIVE_INFINITY)-(boardEventTime(b,boardLive)??Number.POSITIVE_INFINITY);
    });
  }, [boardLive,delayFilter, entries, now, pinned, platformFilter, productFilter, query, sortMode, windowMinutes]);

  const displayedEntries = useMemo(() => visibleEntries.slice(0, displayLimit), [displayLimit, visibleEntries]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDisplayLimit(compact ? 50 : 100), 0);
    return () => window.clearTimeout(timer);
  }, [compact, delayFilter, mode, platformFilter, productFilter, query, sortMode, station.id, windowMinutes]);

  const summary = useMemo((): BoardSummary => {
    const scoped = entries.filter((entry) => {
      const eventTime = boardEventTime(entry,boardLive);
      return eventTime !== null && eventTime >= now - 5 * 60_000 && eventTime <= now + 500 * 60_000;
    });
    const delayStats = boardDelayStatistics(scoped.map(entry => ({scheduled:entry.plannedWhen,actual:boardDisplayActual(entry,boardLive),realtime:entry.realtime&&boardLive,cancelled:entry.canceled})));
    const products = { ice:0, ic:0, ec:0, sbahn:0, ubahn:0, tram:0, regional:0 };
    for (const entry of scoped) products[summaryProduct(entry)] += 1;
    return {
      stationId:station.id, windowMinutes:500, total:scoped.length,
      realtime:boardLive?scoped.filter((entry) => entry.realtime).length:0,
      canceled:scoped.filter((entry) => entry.canceled).length,
      ...delayStats,
      products,
      updatedAt:updatedAt?.toISOString(),
      realtimeStatus:!boardLive ? "stale" : scoped.some((entry) => entry.realtime) ? "live" : "schedule",
      warnings:[...sourceWarnings, ...(!boardLive ? ["Echtzeitprognosen nicht aktuell; nur belastbare Fahrplanzeiten werden angezeigt."] : [])],
    };
  }, [boardLive,entries, now, sourceWarnings, station.id, updatedAt]);

  useEffect(() => { if (status === "ready") onSummary?.(summary); }, [onSummary, status, summary]);

  useEffect(() => {
    if (status !== "ready" || boardScope.current !== `${station.id}:${mode === "arrivals" ? "arrival" : "departure"}`) return;
    // Only enrich the first visible candidates; never fan out ninety requests.
    // Failed lookups are eligible to retry after 150 seconds, not every render.
    const now = Date.now();
    const unresolved = entries.filter(entry => {
      if (!entry.tripId || (mode === "departures" ? !!entry.direction : !!entry.provenance)) return false;
      return now - (enrichmentAttemptsRef.current.get(entryKey(entry)) ?? -Infinity) >= 150_000;
    }).slice(0, 36);
    if (!unresolved.length) return;
    for (const entry of unresolved) enrichmentAttemptsRef.current.set(entryKey(entry),now);
    const controller = new AbortController();
    let active = true;
    const resolved = new Map<string,TripDetail>();
    void inBatches(unresolved, 6, async entry => {
      controller.signal.throwIfAborted();
      const detail = await loadTrip(entry.tripId!,station,entry.when ?? entry.plannedWhen,controller.signal);
      return {key:entryKey(entry),detail};
    }, results => {
      if (!active || controller.signal.aborted) return;
      const batch = results
        .filter((result):result is PromiseFulfilledResult<{key:string;detail:TripDetail}> => result.status === "fulfilled")
        .map(result => result.value);
      if (!batch.length) return;
      for (const item of batch) resolved.set(item.key,item.detail);
      // Detail panels may show successful stops before slower batches finish.
      setTripDetails(current => {
        const next = {...current};
        for (const item of batch) next[item.key] = item.detail;
        return next;
      });
    }).then(() => {
      if (!active || controller.signal.aborted || !resolved.size) return;
      // One final entry update avoids restarting the effect between batches.
      setEntries(current => current.map(entry => {
        const detail = resolved.get(entryKey(entry));
        if (!detail) return entry;
        return {
          ...entry,
          direction:entry.direction ?? detail.destination,
          provenance:entry.provenance ?? detail.origin,
          line:{...entry.line,color:entry.line?.color ?? detail.color,textColor:entry.line?.textColor ?? detail.textColor},
        };
      }));
    }).catch(() => { /* An aborted station request cannot change the next station. */ });
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
      try { writePreference(localStorage,"bahnconnections-pinned-trips",JSON.stringify(next)); } catch { /* Storage can be unavailable in restricted contexts. */ }
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
      <BoardToolbar mode={mode} onMode={setMode} filtersOpen={filtersOpen}
        filtersActive={productFilter !== "all" || Boolean(query) || delayFilter !== "all" || platformFilter !== "all" || sortMode !== "time" || windowMinutes !== 240}
        onFilters={() => setFiltersOpen(value => !value)} />

      {status === "ready" && (!boardLive || verificationStatus === "different") && <p className="board-quality-notice" role="status">{!boardLive ? "Echtzeitdaten veraltet · Fahrplanzeiten angezeigt" : "Quellenabweichung"} · Details unter Quelle & Aktualisierung</p>}

      {filtersOpen && <div className="board-filter-panel" id="board-filters" onKeyDown={event=>{if(event.key==="Escape"){event.stopPropagation();setFiltersOpen(false);event.currentTarget.closest(".live-board")?.querySelector<HTMLButtonElement>(".board-filter-toggle")?.focus();}}}>
        <div className="board-filter-heading"><div><b>{mode==="arrivals"?"Ankünfte filtern":"Abfahrten filtern"}</b><small>{visibleEntries.length} von {entries.length} Fahrten · {mode==="arrivals"?"Ankunft":"Abfahrt"}</small></div><button type="button" className="board-filter-close" onClick={()=>{setFiltersOpen(false);document.querySelector<HTMLButtonElement>(".board-filter-toggle")?.focus();}} aria-label="Filter schließen"><UiIcon name="close"/></button></div>
        <div className="board-search-row"><label className="board-search"><UiIcon name="search"/><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Zug, Ziel oder Gleis suchen" aria-label="Innerhalb der Bahnhofstafel suchen"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="Suche leeren"><UiIcon name="close"/></button>}</label></div>
        <div className="board-filter-block"><div className="board-filter-section-title">Verkehrsmittel</div><div className="board-product-tabs" aria-label="Verkehrsmittel">
          {([["all","Alle",entries.length],["fern","Fernverkehr",productCounts.fern],["regional","Regional",productCounts.regional],["sbahn","S-Bahn",productCounts.sbahn],["ubahn","U-Bahn",productCounts.ubahn],["tram","Tram",productCounts.tram]] as const).map(([id,label,count])=><button type="button" key={id} aria-pressed={productFilter===id} className={productFilter===id?"active":""} onClick={()=>setProductFilter(id)}>{label}<small>{count}</small></button>)}
        </div></div>
        <div className="board-filter-block"><div className="board-filter-section-title">Betriebslage</div><div className="board-status-pills" aria-label="Betriebslage">
          {([["all","Alle"],["ontime","Pünktlich"],["delayed","+5 Min."],["canceled","Ausfälle"]] as const).map(([id,label])=><button key={id} type="button" aria-pressed={delayFilter===id} className={delayFilter===id?"active":""} onClick={()=>setDelayFilter(id)}>{label}</button>)}
        </div></div>
        <div className="board-filter-fields">
          <label>Gleis<select value={platformFilter} onChange={event=>setPlatformFilter(event.target.value)}><option value="all">Alle Gleise</option>{platformOptions.map(platform=><option key={platform} value={platform}>{platform}</option>)}</select></label>
          <label>Zeitraum<select value={windowMinutes} onChange={event=>setWindowMinutes(Number(event.target.value) as BoardWindow)}><option value="60">1 Stunde</option><option value="120">2 Stunden</option><option value="180">3 Stunden</option><option value="240">4 Stunden</option><option value="500">Bis zu 8 Std. 20 Min.</option></select></label>
          <label>Sortierung<select value={sortMode} onChange={event=>setSortMode(event.target.value as SortMode)}><option value="time">{mode==="arrivals"?"Ankunftszeit":"Abfahrtszeit"}</option><option value="delay">Größte Verspätung</option><option value="platform">Gleis</option><option value="product">Zuggattung</option></select></label>
        </div>
        <div className="board-filter-bottom"><button type="button" className="board-filter-reset" onClick={()=>{setProductFilter("all");setQuery("");setDelayFilter("all");setPlatformFilter("all");setSortMode("time");setWindowMinutes(240);}}>Zurücksetzen</button><button type="button" className="board-filter-apply" onClick={()=>{setFiltersOpen(false);document.querySelector<HTMLButtonElement>(".board-filter-toggle")?.focus();}}>{visibleEntries.length} Ergebnisse ansehen</button></div>
        <details className="board-filter-extra"><summary>Weitere Tafeloptionen</summary><div className="board-filter-utilities"><button type="button" aria-pressed={!compact} onClick={()=>setCompact(value=>!value)}>{compact?"Mehr Zeilendetails":"Kompakte Zeilen"}</button><button type="button" onClick={openBoardWindow}>Tafel in eigenem Fenster</button></div></details>
      </div>}

      <div className="board-table">
        <div className="board-table-head"><span /><span>Zug / Linie</span><span>Zeit</span><span>Über</span><span>{mode === "arrivals" ? "Von" : "Ziel"}</span><span>Gleis</span></div>
        {status === "loading" && <div className="board-skeleton" aria-label="Live-Daten werden geladen">{[1,2,3,4,5].map((item) => <div key={item}><i /><span><i /><i /></span><span><i /><i /></span></div>)}</div>}
        {status === "error" && <div className="board-state error"><b>Live-Tafel gerade nicht erreichbar.</b><span>{statusMessage.startsWith("Keine eindeutige Haltestellen-ID") ? statusMessage : "Live-Daten derzeit unvollständig. Karte und Fahrplanmodell bleiben verfügbar."}</span><button onClick={() => setRefreshToken((value) => value + 1)}>Erneut laden</button></div>}
        {status === "ready" && (
          <div className="board-list">
            {displayedEntries.map((entry, index) => {
              const presentation = deriveRealtimePresentation({ scheduled:entry.plannedWhen, actual:boardDisplayActual(entry,boardLive), realtime:boardLive&&entry.realtime, cancelled:entry.canceled });
              const key = entryKey(entry);
              const rowOpen = expandedRows.includes(key);
              const brand = brandFor(entry);
              const forecast = occupancyForecast(boardDisplayActual(entry,boardLive) ?? entry.plannedWhen, entry.line?.name);
               const shownPlatform = boardDisplayPlatform(entry,boardLive);
              const detail = tripDetails[key];
              const detailState = tripDetailState[key];
              const severity = presentation.kind === "cancelled" ? "cancel" : presentation.severe ? "severe" : presentation.kind;
              const destination = entry.kind === "arrival" ? entry.provenance ?? entry.direction ?? "Ziel wird ermittelt …" : entry.direction ?? "Ziel wird ermittelt …";
              return (
                <article className={`board-row ${severity}${rowOpen ? " open" : ""}`} key={`${key}-${index}`}>
                  <button className="board-row-summary" onClick={() => void toggleRow(entry)} aria-expanded={rowOpen}>
                    <i className="row-status" aria-hidden="true" />
                    <span className="board-service"><span className={`service-logo ${brand.className}`} style={serviceBadgeStyle(brand.className === "ice" || brand.className === "ic" || brand.className === "ec" ? "fern" : brand.className === "sbahn" ? "sbahn" : brand.className === "ubahn" ? "ubahn" : brand.className === "tram" ? "tram" : "regional", entry.line?.color, entry.line?.textColor, entry.line?.name, `${station.state ?? ""} ${entry.provenance ?? ""} ${entry.direction ?? ""}`)}>{brand.label}</span>{brand.number ? <b>{brand.number}</b> : null}</span>
                    <span className="board-time"><RealtimeTime scheduled={entry.plannedWhen} actual={boardDisplayActual(entry,boardLive)} realtime={boardLive&&entry.realtime} cancelled={entry.canceled} cancellationLabel={entry.cancellationScope === "stop" ? "Halt entfällt" : "Fahrt entfällt"} compact /></span>
                    <span className="board-destination" title={destination}><b>{destination}</b>{!entry.canceled && entry.alerts?.length ? <small>Betriebshinweis</small> : null}</span>
                    <span className="board-platform">{/^\d/.test(shownPlatform ?? entry.plannedPlatform ?? "") && <span className="board-platform-label" aria-hidden="true">Gl. </span>}<RealtimePlatform scheduled={entry.plannedPlatform} actual={shownPlatform} compact /></span>
                  </button>
                  {rowOpen && <div className="board-row-detail">
                    <div className="trip-detail-summary"><div>{entry.canceled ? <b>Fahrt entfällt</b> : null}{entry.alerts?.slice(0,2).map((alert, alertIndex) => <small className="board-alert" key={`${alert}-${alertIndex}`}>{alert}</small>)}</div><div className={`occupancy-forecast level-${forecast.level}`}><b>Auslastung {forecast.label.toLocaleLowerCase("de")}</b><span className="occupancy-bars" aria-hidden="true">{[1,2,3].map((item) => <i className={item <= forecast.level ? "active" : ""} key={item} />)}</span></div><button className={pinned.includes(key) ? "pin active" : "pin"} onClick={() => togglePinned(entry)}>{pinned.includes(key) ? "★ Gemerkt" : "☆ Merken"}</button></div>
                    <div className="trip-stop-panel"><div className="trip-stop-heading"><b>Fahrtverlauf</b><span>{detail?.stops.length ? `${detail.stops.length} Halte` : ""}</span>{detail?.points.length ? <button onClick={() => onMapTrip?.(mapTrip(entry, detail))}>◎ Auf Karte</button> : null}</div>{detailState === "loading" && <p className="trip-stop-state">Halte und Zeiten werden live geladen …</p>}{detailState === "error" && <p className="trip-stop-state error">Der Live-Fahrtverlauf ist gerade nicht erreichbar. Die Tafelzeile bleibt verfügbar.</p>}{detailState === "ready" && detail?.stops.length ? <ol className="trip-stop-list">{detail.stops.map((stop, stopIndex) => { const actual=stop.departure ?? stop.arrival; const planned=stop.scheduledDeparture ?? stop.scheduledArrival; const stopName=compactStationLabel(stop.name) ?? stop.name; return <li className={stop.cancelled ? "cancelled" : ""} key={`${stop.name}-${stopIndex}`}><i aria-hidden="true" /><span className="stop-description"><b>{stopName}</b><small><RealtimePlatform scheduled={stop.scheduledTrack} actual={boardDisplayPlatform({platform:stop.track,plannedPlatform:stop.scheduledTrack,realtime:stop.realtime},boardLive)} /></small></span><RealtimeTime scheduled={planned} actual={actual} realtime={boardLive&&stop.realtime} cancelled={stop.cancelled} compact /></li>; })}</ol> : null}{detailState === "ready" && detail?.stops.length && !detail.points.length ? <p className="trip-stop-state geometry-missing">Die Halte sind verfügbar; die Quelle liefert für diese Fahrt gerade keine belastbare Streckengeometrie. Deshalb wird keine Luftlinie gezeichnet.</p> : null}{detailState === "ready" && !detail?.stops.length && <p className="trip-stop-state">Für diese Fahrt liefert die Quelle derzeit keine Haltefolge.</p>}{!entry.tripId && <p className="trip-stop-state">Für diese Fahrplanzeile ist keine abrufbare Fahrt-ID vorhanden.</p>}</div>
                  </div>}
                </article>
              );
            })}
            {!visibleEntries.length && <div className="board-state board-empty-state" role="status"><b>{entries.length ? "Keine Fahrten mit diesen Filtern" : "Keine Fahrten verfügbar"}</b><span>{entries.length ? "Ändere Filter oder Zeitraum, um weitere Verbindungen zu sehen." : "Für diese Station wurden momentan keine Fahrten geliefert."}</span>{entries.length ? <button type="button" onClick={() => {setProductFilter("all");setQuery("");setDelayFilter("all");setPlatformFilter("all");setSortMode("time");setWindowMinutes(240);}}>Alle Fahrten anzeigen</button> : <button type="button" onClick={() => setRefreshToken(value => value + 1)}>Erneut laden</button>}</div>}
            {displayedEntries.length < visibleEntries.length && <button className="board-more" onClick={() => setDisplayLimit((value) => value + 50)}>Weitere 50 Fahrten anzeigen <span>{displayedEntries.length}/{visibleEntries.length}</span></button>}
          </div>
        )}
      </div>
      <details className="board-data-details"><summary>Quelle & Aktualisierung{stale || verificationStatus === "different" || verificationStatus === "inconclusive" ? <span> · Datenhinweis</span> : null}</summary><footer className="board-footer"><a className={`verification-${verificationStatus}`} href="https://transitous.org/sources/" target="_blank" rel="noreferrer" title={verificationMessage || sourceWarnings.join(" · ")}><i /> {stale ? "Live-Daten unvollständig · letzter Stand" : verificationStatus === "matched" ? "Transitous · DB-geprüft" : verificationStatus === "different" ? "Transitous · Quellenabweichung" : verificationStatus === "inconclusive" ? "Transitous · DB-Prüfung nicht eindeutig" : entries.some((entry) => entry.realtime) ? `${sourceLabel} · DB-Prüfung offen` : "Nur Fahrplandaten verfügbar"}</a><button onClick={() => setRefreshToken((value) => value + 1)} aria-label="Live-Tafel aktualisieren">↻ {updatedAt ? berlinTimestamp(updatedAt) : "Aktualisieren"}</button></footer>{sourceWarnings.map((warning,index) => <p key={index}>{warning}</p>)}</details>
    </section>
  );
}
