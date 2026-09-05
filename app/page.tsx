"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { LiveBoard, type BoardMapTrip, type BoardSummary } from "./live-board";
import { delayMinutes, fetchLiveJourneys, journeyPoints, transferWaitMinutes, type LiveJourney, type PlannerCategory } from "./live-journey";
import { fetchLiveTrips, liveTripProgress, pointOnTrip, trailForTrip, type LiveTrainCategory, type LiveTrip } from "./live-trains";
import { NetworkLab } from "./network-lab";
import { calculateReachability } from "./network-intelligence";
import { SmartSearch } from "./smart-search";
import { buildStationImportance, NetworkStats } from "./network-stats";
import { MOBILE_SHEET_HEIGHT_EVENT, PanelTools, usePanelControls, type MobileSheetState } from "./panel-tools";
import { occupancyForecast } from "./occupancy";
import { StationStats } from "./station-stats";
import { StationLines, type StationLineSummary } from "./station-lines";
import { serviceBadgeStyle, serviceColors } from "./transit-style";
import {
  estimateMinutes,
  formatDuration,
  ROUTES,
  routePath,
  STATIONS,
  type Route,
  type Station,
  type TrainType,
} from "./network-data";
import { TrackRouter, type RailNetwork } from "./track-routing";

type ExtraStationsPayload = { source: string; retrievedAt: string; totalOfficialPoints: number; curatedStates?: Record<string, string>; curatedAliases?: Record<string, Pick<Station, "mergedCodes" | "mergedCount" | "passengerBand">>; stations: Station[] };
type LiveStatusFilter = "all" | "delayed" | "ontime";
type LiveView = "stress" | "trains";

const MAJOR_HUB_IDS = new Set(["berlin", "muenchen", "frankfurt", "hamburg", "koeln"]);

function routeElement(label: string, detail?: string) {
  const node = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = label;
  node.appendChild(title);
  if (detail) {
    const meta = document.createElement("div");
    meta.textContent = detail;
    meta.style.fontSize = "10px";
    meta.style.opacity = ".75";
    meta.style.marginTop = "2px";
    node.appendChild(meta);
  }
  return node;
}

function routeBadgeElement(route: Route) {
  const node = document.createElement("span");
  node.className = "route-label-content";
  const glyph = document.createElement("i");
  glyph.textContent = "▭";
  const title = document.createElement("b");
  title.textContent = route.id;
  node.append(glyph, title);
  return node;
}

function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" }).format(new Date(value));
}

function dateTime(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", weekday:"short", day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" }).format(new Date(value));
}

function localDateTimeValue(date: Date) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone:"Europe/Berlin", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23",
  }).formatToParts(date).filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

function berlinLocalToIso(value: string) {
  const [year, month, day, hour, minute] = value.split(/[-T:]/).map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);
  let instant = desired;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone:"Europe/Berlin", year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", second:"2-digit", hourCycle:"h23",
  });
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).filter((part) => part.type !== "literal").map((part) => [part.type, Number(part.value)]));
    const rendered = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
    instant -= rendered - desired;
  }
  return new Date(instant).toISOString();
}

function serviceClass(category: PlannerCategory | "walk") {
  return category === "fern" ? "ice" : category === "sbahn" ? "sbahn" : category === "ubahn" ? "ubahn" : category === "regional" ? "regional" : "walk";
}

function serviceBadgeLabel(category: PlannerCategory | "walk", name: string) {
  if (category === "sbahn" || category === "ubahn") return name.replace(/\s+/g, "");
  if (category === "regional") return name.match(/^(RE|RB|IRE|MEX)/i)?.[0]?.toUpperCase() ?? "R";
  return name.match(/^(ICE|IC|EC|RJX?|TGV|NJ|EN|FLX)/i)?.[0]?.toUpperCase() ?? "ICE";
}

function liveJourneyQuality(journey: LiveJourney) {
  if (!journey.transfers) return { score:98, label:"Direkt", tone:"good", explanation:"Kein Fahrzeugwechsel nötig." };
  const waits = journey.transitLegs.slice(0, -1).map((_, index) => transferWaitMinutes(journey, index) ?? 0);
  const shortest = Math.min(...waits);
  const realtimePenalty = journey.realtime ? 0 : 5;
  const score = Math.max(35, Math.min(96, 84 - Math.max(0, 10 - shortest) * 4 - Math.max(0, shortest - 35) - (journey.transfers - 1) * 8 - realtimePenalty));
  const tone = shortest < 7 ? "risk" : shortest < 12 ? "medium" : "good";
  return { score, label:tone === "risk" ? "knapp" : tone === "medium" ? "machbar" : "komfortabel", tone, explanation:`Kürzeste Umsteigezeit ${shortest} Min. · ${journey.realtime ? "aktuelle Echtzeitlage berücksichtigt" : "derzeit ohne Echtzeitbestätigung"}.` };
}

function journeyOptionLabel(option: LiveJourney, fastest?: LiveJourney) {
  if (!fastest || option.id === fastest.id) return "Schnellste";
  if (option.transfers < fastest.transfers) return "Wenig Umstiege";
  const waits = option.transitLegs.slice(0, -1).map((_, index) => transferWaitMinutes(option, index) ?? 0);
  if (waits.length && Math.min(...waits) >= 10) return "Robuster Umstieg";
  return "Spätere Abfahrt";
}

function exactTripSegments(trip: BoardMapTrip) {
  return trip.segments.filter((segment) => segment.length > 1);
}

export default function Home() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [startId, setStartId] = useState("berlin");
  const [targetId, setTargetId] = useState("muenchen");
  const [startSearch, setStartSearch] = useState("Berlin Hbf");
  const [targetSearch, setTargetSearch] = useState("München Hbf");
  const [journey, setJourney] = useState<LiveJourney | null>(null);
  const [journeyEndpoints, setJourneyEndpoints] = useState<{ start: Station; target: Station } | null>(null);
  const [journeyOptions, setJourneyOptions] = useState<LiveJourney[]>([]);
  const [maxChanges, setMaxChanges] = useState<0 | 1 | 2 | 3 | 4 | 5>(5);
  const [transferMinutes, setTransferMinutes] = useState(0);
  const [plannerCategories, setPlannerCategories] = useState<PlannerCategory[]>(["fern", "regional", "sbahn", "ubahn"]);
  const [plannerState, setPlannerState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [arriveBy, setArriveBy] = useState(false);
  const [wheelchairRouting, setWheelchairRouting] = useState(false);
  const [bikeRequired, setBikeRequired] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [routeInfo, setRouteInfo] = useState<string | null>(null);
  const [stationPanel, setStationPanel] = useState<"live" | "destinations" | "stats">("live");
  const [helpOpen, setHelpOpen] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [railState, setRailState] = useState<"loading" | "ready" | "error">("loading");
  const [extraStations, setExtraStations] = useState<Station[]>([]);
  const [liveSearchStations, setLiveSearchStations] = useState<Station[]>([]);
  const [curatedStates, setCuratedStates] = useState<Record<string, string>>({});
  const [curatedAliases, setCuratedAliases] = useState<Record<string, Pick<Station, "mergedCodes" | "mergedCount" | "passengerBand">>>({});
  const [mapZoom, setMapZoom] = useState(6);
  const [mapViewportToken, setMapViewportToken] = useState(0);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [boardOnly, setBoardOnly] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<"normal" | "large">("normal");
  const [liveVisible, setLiveVisible] = useState(false);
  const [liveTrips, setLiveTrips] = useState<LiveTrip[]>([]);
  const [liveState, setLiveState] = useState<"loading" | "ready" | "error">("loading");
  const [liveUpdatedAt, setLiveUpdatedAt] = useState<Date | null>(null);
  const [liveCategories, setLiveCategories] = useState<LiveTrainCategory[]>(["fern","regional","sbahn","ubahn"]);
  const [liveStatusFilter, setLiveStatusFilter] = useState<LiveStatusFilter>("all");
  const [liveView, setLiveView] = useState<LiveView>("trains");
  const [showTrails, setShowTrails] = useState(false);
  const [selectedLiveTrip, setSelectedLiveTrip] = useState<LiveTrip | null>(null);
  const [trackedTripId, setTrackedTripId] = useState<string | null>(null);
  const [liveTick, setLiveTick] = useState(0);
  const [statsOpen, setStatsOpen] = useState(false);
  const [liveFiltersOpen, setLiveFiltersOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [viewMenuOpen, setViewMenuOpen] = useState(false);
  const [boardSummary, setBoardSummary] = useState<BoardSummary | null>(null);
  const [stationLineSummary, setStationLineSummary] = useState<StationLineSummary | null>(null);
  const [stationTrip, setStationTrip] = useState<BoardMapTrip | null>(null);
  const [stationTrips, setStationTrips] = useState<BoardMapTrip[]>([]);
  const [labOpen, setLabOpen] = useState(false);
  const [minimalMode, setMinimalMode] = useState(false);
  const [showRouteLabels, setShowRouteLabels] = useState(false);
  const [overviewRoutesVisible, setOverviewRoutesVisible] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reachabilityMinutes, setReachabilityMinutes] = useState(120);
  const [reachabilityVisible, setReachabilityVisible] = useState(false);
  const [blockedRouteIds, setBlockedRouteIds] = useState<Set<string>>(new Set());
  const [blockedStationIds, setBlockedStationIds] = useState<Set<string>>(new Set());
  const [journeyDeparture, setJourneyDeparture] = useState("");
  const [journeyOptionLimit, setJourneyOptionLimit] = useState(8);
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("expanded");
  const [mobileSheetHeight, setMobileSheetHeight] = useState<number | null>(null);

  const exploreControls = usePanelControls("explore-v3");
  const stationControls = usePanelControls("station-v2");
  const journeyControls = usePanelControls("journey-v3");
  const tripControls = usePanelControls("live-trip-v2");
  const handleBoardSummary = useCallback((summary: BoardSummary) => setBoardSummary(summary), []);
  const handleStationLineSummary = useCallback((summary: StationLineSummary) => setStationLineSummary(summary), []);
  const handleStationTrips = useCallback((trips: BoardMapTrip[]) => setStationTrips(trips), []);

  const mapElementRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("leaflet").Map | null>(null);
  const overlayRef = useRef<import("leaflet").LayerGroup | null>(null);
  const liveLayerRef = useRef<import("leaflet").LayerGroup | null>(null);
  const tileRef = useRef<import("leaflet").TileLayer | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const trackRouterRef = useRef<TrackRouter | null>(null);
  const plannerRequestRef = useRef<AbortController | null>(null);
  const liveToolbarRef = useRef<HTMLDivElement>(null);
  const mapMenuRef = useRef<HTMLDivElement>(null);
  const mobileViewTriggerRef = useRef<HTMLButtonElement>(null);

  const allStations = useMemo(() => {
    const byId = new Map<string, Station>();
    for (const station of [...STATIONS.map((item) => ({ ...item, ...curatedAliases[item.id], state:curatedStates[item.id] ?? item.state })), ...extraStations, ...liveSearchStations]) byId.set(station.id, station);
    return [...byId.values()];
  }, [curatedAliases, curatedStates, extraStations, liveSearchStations]);
  const stationById = useMemo(() => new Map(allStations.map((station) => [station.id, station])), [allStations]);
  const plannerStations = useMemo(() => allStations.filter((station) => station.source !== "db" || Boolean(station.passengerBand) || station.id.startsWith("motis:")), [allStations]);
  const stationImportance = useMemo(() => buildStationImportance(allStations), [allStations]);

  const filteredRoutes = useMemo(() => ROUTES.filter((route) => {
    if (blockedRouteIds.has(route.id) || route.stops.some((stationId) => blockedStationIds.has(stationId))) return false;
    return true;
  }), [blockedRouteIds, blockedStationIds]);

  const selected = selectedId ? stationById.get(selectedId) ?? null : null;
  const connections = useMemo(() => {
    if (!selectedId) return [];
    const found = new Map<string, { station: Station; routes: Route[]; best: Route }>();
    for (const route of filteredRoutes.filter((candidate) => candidate.stops.includes(selectedId))) {
      for (const targetId of route.stops) {
        if (targetId === selectedId) continue;
        const station = stationById.get(targetId);
        if (!station) continue;
        const current = found.get(targetId);
        if (current) {
          current.routes.push(route);
          if (route.frequency > current.best.frequency) current.best = route;
        } else found.set(targetId, { station, routes: [route], best: route });
      }
    }
    return [...found.values()].sort((a, b) => b.best.frequency - a.best.frequency || a.station.name.localeCompare(b.station.name, "de"));
  }, [filteredRoutes, selectedId, stationById]);

  const activeStationRoutes = useMemo(() => selectedId ? filteredRoutes.filter((route) => route.stops.includes(selectedId)) : [], [filteredRoutes, selectedId]);
  const highlightedStopIds = useMemo(() => {
    const ids = new Set<string>();
    const focusedRoute = routeInfo ? activeStationRoutes.find((route) => route.id === routeInfo) : null;
    const routes = focusedRoute
      ? [{ route:focusedRoute, from:focusedRoute.stops[0], to:focusedRoute.stops.at(-1) ?? focusedRoute.stops[0] }]
      : activeStationRoutes.map((route) => ({ route, from:route.stops[0], to:route.stops.at(-1) ?? route.stops[0] }));
    for (const item of routes) for (const station of routePath(item.route, item.from, item.to)) ids.add(station.id);
    return ids;
  }, [activeStationRoutes, routeInfo]);
  const visibleLiveTrips = useMemo(() => liveTrips.filter((trip) => {
    if (!liveCategories.includes(trip.category)) return false;
    if (liveStatusFilter === "delayed" && trip.delay < 5) return false;
    if (liveStatusFilter === "ontime" && trip.delay >= 5) return false;
    return true;
  }), [liveCategories, liveStatusFilter, liveTrips]);
  const reachableStations = useMemo(() => selectedId ? calculateReachability(filteredRoutes, allStations, selectedId, { maxChanges:2, transferMinutes, blockedRouteIds, blockedStationIds }) : [], [allStations, blockedRouteIds, blockedStationIds, filteredRoutes, selectedId, transferMinutes]);
  const reachableById = useMemo(() => new Map(reachableStations.map((item) => [item.station.id, item])), [reachableStations]);

  useEffect(() => {
    if (journeyDeparture) return;
    const departure = new Date(Date.now() + 15 * 60_000);
    departure.setSeconds(0, 0);
    departure.setMinutes(Math.ceil(departure.getMinutes() / 5) * 5);
    const timer = window.setTimeout(() => setJourneyDeparture(localDateTimeValue(departure)), 0);
    return () => window.clearTimeout(timer);
  }, [journeyDeparture]);

  useEffect(() => {
    if (!liveFiltersOpen) return;
    const keydown = (event: KeyboardEvent) => { if (event.key === "Escape") setLiveFiltersOpen(false); };
    const pointerdown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!liveToolbarRef.current?.contains(target) && !mapMenuRef.current?.contains(target) && !mobileViewTriggerRef.current?.contains(target)) setLiveFiltersOpen(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", pointerdown); };
  }, [liveFiltersOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setFavoriteIds(JSON.parse(localStorage.getItem("bahnconnections-favorite-stations") ?? "[]"));
        setTheme(localStorage.getItem("bahnconnections-theme") === "dark" ? "dark" : "light");
        setHighContrast(localStorage.getItem("bahnconnections-contrast") === "high");
        setFontScale(localStorage.getItem("bahnconnections-font") === "large" ? "large" : "normal");
        setMinimalMode(localStorage.getItem("bahnconnections-minimal") === "1");
      } catch { /* Local preferences are optional. */ }
      const params = new URLSearchParams(window.location.search);
      setBoardOnly(params.get("board") === "1");
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
    document.documentElement.dataset.font = fontScale;
    localStorage.setItem("bahnconnections-theme", theme);
    localStorage.setItem("bahnconnections-contrast", highContrast ? "high" : "normal");
    localStorage.setItem("bahnconnections-font", fontScale);
    localStorage.setItem("bahnconnections-minimal", minimalMode ? "1" : "0");
  }, [fontScale, highContrast, minimalMode, preferencesReady, theme]);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/db-stations.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Betriebsstellen ${response.status}`);
        return response.json() as Promise<ExtraStationsPayload>;
      })
      .then((payload) => { setExtraStations(payload.stations); setCuratedStates(payload.curatedStates ?? {}); setCuratedAliases(payload.curatedAliases ?? {}); })
      .catch((error) => { if ((error as Error).name !== "AbortError") setExtraStations([]); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("station");
    const station = requested ? stationById.get(requested) : null;
    if (!station) return;
    const timer = window.setTimeout(() => { setSelectedId(station.id); setSearch(station.name); setStationPanel("live"); }, 0);
    return () => window.clearTimeout(timer);
  }, [stationById]);

  useEffect(() => {
    const firstTick = window.setTimeout(() => setLiveTick(Date.now()), 0);
    const timer = window.setInterval(() => setLiveTick(Date.now()), 4_000);
    return () => { window.clearTimeout(firstTick); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (["INPUT","SELECT","TEXTAREA"].includes(target.tagName) && event.key !== "Escape") return;
      if (event.key.toLocaleLowerCase() === "l") setLiveVisible((value) => !value);
      if (event.key.toLocaleLowerCase() === "s") { event.preventDefault(); document.querySelector<HTMLInputElement>(".station-search input")?.focus(); }
      if (event.key.toLocaleLowerCase() === "f") { const drawer = document.querySelector<HTMLDetailsElement>(".filter-drawer"); if (drawer) drawer.open = !drawer.open; }
      if (event.key === "Escape") { setHelpOpen(false); setStatsOpen(false); setExploreOpen(false); setViewMenuOpen(false); setLiveFiltersOpen(false); setSelectedLiveTrip(null); setTrackedTripId(null); }
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/db-rail-network.json", { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Streckennetz ${response.status}`);
        return response.json() as Promise<RailNetwork>;
      })
      .then((network) => { trackRouterRef.current = new TrackRouter(network); setRailState("ready"); })
      .catch((error) => { if ((error as Error).name !== "AbortError") setRailState("error"); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let active = true;
    async function initialiseMap() {
      if (!mapElementRef.current || mapRef.current) return;
      const L = await import("leaflet");
      if (!active || !mapElementRef.current) return;
      leafletRef.current = L;
      const map = L.map(mapElementRef.current, { zoomControl: false, minZoom: 4, maxBoundsViscosity: 0.35 }).setView([51.15, 10.35], 6);
      L.control.zoom({ position: "bottomright" }).addTo(map);
      tileRef.current = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 18, attribution: "© OpenStreetMap contributors",
      }).addTo(map);
      overlayRef.current = L.layerGroup().addTo(map);
      liveLayerRef.current = L.layerGroup().addTo(map);
      const syncViewport = () => {
        setMapZoom(map.getZoom());
        setMapViewportToken((value) => value + 1);
      };
      map.on("zoomend", syncViewport);
      map.on("moveend", syncViewport);
      mapRef.current = map;
      setMapReady(true);
    }
    initialiseMap();
    return () => { active = false; mapRef.current?.remove(); mapRef.current = null; };
  }, []);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !L || !map) return;
    tileRef.current?.remove();
    tileRef.current = L.tileLayer(
      "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 18, attribution: "© OpenStreetMap contributors" },
    ).addTo(map);
    tileRef.current.bringToBack();
  }, [mapReady, theme]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = overlayRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers();

    const drawRoute = (route: Route, from: string, to: string, featured = false, muted = false) => {
      const path = routePath(route, from, to);
      if (path.length < 2) return;
      const trackGeometry = trackRouterRef.current?.geometry(path);
      const segments = trackGeometry?.segments ?? [];
      if (!segments.length) return;
      const coverage = Math.round((trackGeometry?.coverage ?? 0) * 100);
      const palette: Record<TrainType, string> = minimalMode ? { ICE:"#64777c", IC:"#78898d", EC:"#8d999c" } : { ICE:"#df4050", IC:"#208a92", EC:"#7256c9" };
      for (const points of segments) {
        L.polyline(points, { color: theme === "dark" ? "#0c222a" : "#fffdf9", weight: featured ? 6.4 : muted ? 3 : 4.6, opacity: featured ? .82 : muted ? .1 : .72, lineCap: "round" }).addTo(layer);
        const line = L.polyline(points, {
          color: palette[route.type], weight: featured ? 4.4 : muted ? 2.1 : Math.min(4, 2.15 + route.frequency / 10),
          opacity: featured ? .96 : muted ? .14 : minimalMode ? .28 : .84, lineCap: "round", lineJoin: "round",
        }).addTo(layer);
        line.bindTooltip(routeElement(route.id, `${route.operator} · ${coverage >= 90 ? "DB-Streckengeometrie" : `${coverage}% DB-Streckengeometrie`} · etwa ${route.frequency} Zugpaare/Tag`), { sticky: true });
        line.on("click", () => { setRouteInfo(route.id); setStationPanel("destinations"); setExploreOpen(false); setStatsOpen(false); setMobileSheetState("expanded"); });
      }
      const labelPoints = [...segments].sort((left, right) => right.length - left.length)[0];
      if (showRouteLabels && !minimalMode && !muted && mapZoom >= 6 && labelPoints.length > 1) {
        const hash = [...route.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
        const ratio = .27 + (hash % 47) / 100;
        const anchor = labelPoints[Math.min(labelPoints.length - 1, Math.max(0, Math.round((labelPoints.length - 1) * ratio)))];
        const label = L.tooltip({ permanent:true, direction:"center", className:`route-line-label ${route.type.toLowerCase()}`, opacity:1, interactive:true })
          .setLatLng(anchor)
          .setContent(routeBadgeElement(route))
          .addTo(layer);
        label.on("click", () => { setRouteInfo(route.id); setStationPanel("destinations"); setExploreOpen(false); setStatsOpen(false); setMobileSheetState("expanded"); });
      }
    };

    if (journey) {
      const livePalette: Record<PlannerCategory, string> = minimalMode ? { fern:"#65757b", regional:"#76878d", sbahn:"#6f8177", ubahn:"#746f82" } : { fern:"#ec0016", regional:"#1455a0", sbahn:"#2f8f57", ubahn:"#6f3fa0" };
      for (const leg of journey.transitLegs) {
        if (leg.points.length < 2) continue;
        L.polyline(leg.points, { color:theme === "dark" ? "#071d26" : "#fff", weight:7, opacity:.86, lineCap:"round", lineJoin:"round" }).addTo(layer);
        const legColor = minimalMode ? livePalette[leg.category as PlannerCategory] : serviceColors(leg.category as PlannerCategory, leg.routeColor, leg.routeTextColor).background;
        const line = L.polyline(leg.points, { color:legColor, weight:4.6, opacity:.98, lineCap:"round", lineJoin:"round" }).addTo(layer);
        const delay = delayMinutes(leg.startTime, leg.scheduledStartTime);
        line.bindTooltip(routeElement(leg.name, `${leg.operator ?? "Fahrplandienst"} · ${leg.realtime ? delay ? `Echtzeit ${delay > 0 ? "+" : ""}${delay} Min.` : "Echtzeit pünktlich" : "Fahrplanlage"} · exakte Fahrtgeometrie`), { sticky:true });
      }
      const liveStops = journey.transitLegs.flatMap((leg) => leg.stops).filter((stop, index, items) => items.findIndex((item) => (item.id && stop.id ? item.id === stop.id : item.name === stop.name)) === index);
      const transferNames = new Set(journey.transitLegs.slice(1).map((leg) => leg.from.name));
      liveStops.forEach((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === liveStops.length - 1;
        const isTransfer = transferNames.has(stop.name);
        const point = L.circleMarker([stop.lat, stop.lon], {
          radius:isStart || isEnd ? 7 : isTransfer ? 6.3 : 4.4,
          color:"#fff",
          weight:isStart || isEnd ? 3 : 2,
          fillColor:isEnd ? "#ec0016" : isTransfer ? "#f0a61b" : "#1455a0",
          fillOpacity:1,
          className:"live-journey-stop",
        }).addTo(layer);
        const actual = stop.departure ?? stop.arrival;
        const planned = stop.scheduledDeparture ?? stop.scheduledArrival;
        const stopDelay = delayMinutes(actual, planned);
        const detail = `${actual ? clock(actual) : "ohne Zeit"}${stop.track ? ` · Gleis ${stop.track}` : ""}${stop.cancelled ? " · Halt entfällt" : stopDelay ? ` · ${stopDelay > 0 ? "+" : ""}${stopDelay} Min.` : ""}`;
        const showPermanentStopLabel = mapZoom >= 11;
        point.bindTooltip(showPermanentStopLabel ? `${stop.name} · ${actual ? clock(actual) : ""}` : routeElement(stop.name, detail), { direction:"top", offset:[0,-6], permanent:showPermanentStopLabel, className:showPermanentStopLabel ? "station-route-label live" : "" });
      });
    } else if (stationTrip && exactTripSegments(stationTrip).length) {
      const color = minimalMode ? "#65757b" : serviceColors(stationTrip.category, stationTrip.color, stationTrip.textColor).background;
      for (const segment of exactTripSegments(stationTrip)) {
        L.polyline(segment, { color:theme === "dark" ? "#071d26" : "#fff", weight:8, opacity:.9, lineCap:"round", lineJoin:"round" }).addTo(layer);
        const exactLine = L.polyline(segment, { color, weight:4.8, opacity:.98, lineCap:"round", lineJoin:"round", className:"station-trip-exact" }).addTo(layer);
        exactLine.bindTooltip(routeElement(stationTrip.name, `${stationTrip.realtime ? "Echtzeitfahrt" : "Fahrplanfahrt"} · gelieferte Fahrtgeometrie · ${stationTrip.stops.length} Halte`), { sticky:true });
      }
      stationTrip.stops.forEach((stop, index) => {
        if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return;
        const isEnd = index === 0 || index === stationTrip.stops.length - 1;
        const point = L.circleMarker([stop.lat, stop.lon], { radius:isEnd ? 6.8 : 4.2, color:"#fff", weight:isEnd ? 3 : 2, fillColor:color, fillOpacity:1, className:"live-journey-stop" }).addTo(layer);
        const actual = stop.departure ?? stop.arrival;
        const planned = stop.scheduledDeparture ?? stop.scheduledArrival;
        const stopDelay = delayMinutes(actual, planned);
        const detail = `${actual ? clock(actual) : "ohne Zeit"}${stop.track ? ` · Gleis ${stop.track}` : ""}${stop.cancelled ? " · Halt entfällt" : stopDelay ? ` · ${stopDelay > 0 ? "+" : ""}${stopDelay} Min.` : ""}`;
        const permanent = mapZoom >= 11;
        point.bindTooltip(permanent ? `${stop.name} · ${actual ? clock(actual) : ""}` : routeElement(stop.name, detail), { direction:"top", offset:[0,-6], permanent, className:permanent ? "station-route-label live" : "" });
      });
    } else if (stationTrips.length) {
      for (const trip of stationTrips) {
        const tripSegments = exactTripSegments(trip);
        if (!tripSegments.length) continue;
        const color = minimalMode ? "#65757b" : serviceColors(trip.category, trip.color, trip.textColor).background;
        for (const segment of tripSegments) {
          L.polyline(segment, { color:theme === "dark" ? "#071d26" : "#fff", weight:4.6, opacity:.62, lineCap:"round", lineJoin:"round" }).addTo(layer);
          const previewLine = L.polyline(segment, { color, weight:2.4, opacity:.72, lineCap:"round", lineJoin:"round", className:"station-trip-preview" }).addTo(layer);
          previewLine.bindTooltip(routeElement(trip.name, `${trip.realtime ? "aktuelle Fahrt" : "Fahrplanfahrt"} · klicken für ${trip.stops.length} Halte`), { sticky:true });
          previewLine.on("click", () => setStationTrip(trip));
        }
      }
    } else if (overviewRoutesVisible) {
      const orderedRoutes = routeInfo ? [...filteredRoutes].sort((a, b) => Number(a.id === routeInfo) - Number(b.id === routeInfo)) : filteredRoutes;
      for (const route of orderedRoutes) {
        const first = route.stops[0];
        const last = route.stops[route.stops.length - 1];
        const focused = route.id === routeInfo;
        drawRoute(route, first, last, focused, Boolean(routeInfo && !focused));
      }
    }

    const connectedIds = overviewRoutesVisible ? new Set(connections.map((connection) => connection.station.id)) : new Set<string>();
    const filteredStationIds = new Set(filteredRoutes.flatMap((route) => route.stops));
    const bounds = map.getBounds().pad(.08);
    const contextualStations = mapZoom >= 11 ? extraStations.filter((station) => bounds.contains([station.lat, station.lon])).slice(0, 500) : [];
    const selectedExtra = selected?.source === "db" && !contextualStations.some((station) => station.id === selected.id) ? [selected] : [];
    for (const station of [...STATIONS, ...contextualStations, ...selectedExtra]) {
      if (station.country !== "DE" && !filteredStationIds.has(station.id)) continue;
      if (mapZoom <= 6 && station.source !== "db" && !station.hub && !MAJOR_HUB_IDS.has(station.id) && station.id !== selectedId) continue;
      const isSelected = station.id === selectedId;
      const isDestination = false;
      const isTransfer = false;
      const isConnected = connectedIds.has(station.id);
      const profile = stationImportance.get(station.id);
      const isMajorHub = MAJOR_HUB_IDS.has(station.id);
      const extraRadius = station.passengerBand === "> 1.000" ? 4 : station.passengerBand === "100 - 1.000" ? 3.2 : station.kind === "Bf" ? 2.9 : 2.4;
      const importanceRadius = isMajorHub ? 9.5 : station.hub ? 7.6 : Math.min(7, 3.8 + (profile?.domesticDirect ?? 0) / 15);
      const connected = overviewRoutesVisible ? connections.find((connection) => connection.station.id === station.id) : undefined;
      const reachability = reachableById.get(station.id);
      const reachabilityColor = !reachability ? "#c9d2d1" : reachability.minutes <= 60 ? "#2d8c79" : reachability.minutes <= 120 ? "#6aa27a" : reachability.minutes <= 180 ? "#d2a24f" : "#c97765";
      const marker = L.circleMarker([station.lat, station.lon], {
        radius: isSelected || isDestination ? 10 : isTransfer ? 8.5 : reachabilityVisible && reachability && reachability.minutes <= reachabilityMinutes ? 5.4 : station.source === "db" ? extraRadius : importanceRadius,
        color: isSelected || isDestination ? "#fff" : isTransfer ? "#ffbd4a" : station.source === "db" ? "#59727a" : isMajorHub ? "#fff" : "#0b3442",
        weight: isSelected || isDestination ? 3.5 : isTransfer ? 3 : isMajorHub ? 2.5 : station.hub ? 2 : 1.4,
        fillColor: isSelected ? "#d45f5f" : isDestination ? "#7775a7" : isTransfer ? "#d7a653" : reachabilityVisible ? reachabilityColor : minimalMode ? "#75878b" : isConnected ? "#4f8f91" : isMajorHub || station.hub ? "#d45f5f" : station.source === "db" ? station.passengerBand === "> 1.000" ? "#f9fffd" : "#d5e1df" : "#fffdf8",
        fillOpacity: reachabilityVisible && (!reachability || reachability.minutes > reachabilityMinutes) ? .16 : station.source === "db" && !isSelected ? .76 : 1,
        className: isMajorHub ? "station-point major-hub" : station.hub ? "station-point hub" : "station-point",
      }).addTo(layer);
      const reachabilityDetail = reachabilityVisible && reachability ? ` · ${formatDuration(reachability.minutes)} · ${reachability.changes ? `${reachability.changes} Umstieg${reachability.changes > 1 ? "e" : ""}` : "direkt"}` : "";
      const curatedDetail = connected ? `${profile?.domesticDirect ?? 0} direkte Inlandsziele · ab ${selected?.name}: ca. ${formatDuration(estimateMinutes(connected.best, selected!.id, station.id))}${reachabilityDetail}` : `${profile?.domesticDirect ?? 0} direkte Inlandsziele · etwa ${profile?.dailyStops ?? 0} Fernzughalte/Tag${reachabilityDetail}`;
      const dbDetail = `${station.kind ?? "DB-Betriebsstelle"}${station.state ? ` · ${station.state}` : ""}${station.mergedCount ? ` · ${station.mergedCount} Betriebsstellen gebündelt` : ""}${station.passengerBand ? ` · Reisende/Tag ${station.passengerBand}` : ""}`;
      const permanentLabel = mapZoom >= (routeInfo ? 7 : 10) && highlightedStopIds.has(station.id);
      marker.bindTooltip(permanentLabel ? station.name : routeElement(station.name, station.source === "db" ? dbDetail : curatedDetail), { direction:"top", offset:[0,-7], permanent:permanentLabel, className:permanentLabel ? "station-route-label" : "" });
      if (isMajorHub || station.hub || isSelected) marker.bringToFront();
      marker.on("click", () => {
        setSelectedId(station.id); setSearch(station.name); setJourney(null); setJourneyMessage(""); setRouteInfo(null); setStationPanel("live");
        setSelectedLiveTrip(null); setTrackedTripId(null); setExploreOpen(false); setStatsOpen(false); setBoardSummary(null); setStationTrip(null); setStationTrips([]); setStationLineSummary(null);
        setMobileSheetState("expanded");
      });
      const element = marker.getElement();
      if (element) {
        element.setAttribute("tabindex", "0"); element.setAttribute("role", "button"); element.setAttribute("aria-label", `${station.name} auswählen`);
        element.addEventListener("keydown", (event) => {
          const key = (event as KeyboardEvent).key;
          if (key === "Enter" || key === " ") marker.fire("click");
        });
      }
    }
  }, [connections, extraStations, filteredRoutes, highlightedStopIds, journey, mapReady, mapViewportToken, mapZoom, minimalMode, overviewRoutesVisible, railState, reachabilityMinutes, reachabilityVisible, reachableById, routeInfo, selected, selectedId, showRouteLabels, stationImportance, stationTrip, stationTrips, theme]);

  useEffect(() => {
    if (!selected || !liveVisible) {
      const timer = window.setTimeout(() => setLiveTrips([]), 0);
      return () => window.clearTimeout(timer);
    }
    const liveStation = selected;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    async function load() {
      if (!liveTrips.length) setLiveState("loading");
      try {
        const trips = await fetchLiveTrips(liveStation, controller.signal);
        setLiveTrips(trips);
        setLiveUpdatedAt(new Date());
        setLiveState("ready");
        setSelectedLiveTrip((current) => current ? trips.find((trip) => trip.tripId === current.tripId) ?? null : null);
      } catch (error) {
        if ((error as Error).name !== "AbortError") setLiveState(liveTrips.length ? "ready" : "error");
      }
      timer = setTimeout(load, 45_000);
    }
    load();
    return () => { controller.abort(); if (timer) clearTimeout(timer); };
    // Existing rows intentionally remain available as a short-lived fallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveVisible, selected]);

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = liveLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers();
    if (!liveVisible || liveState === "error") return;

    const grouped = new Map<string, LiveTrip[]>();
    for (const trip of visibleLiveTrips) {
      const [lat, lon] = pointOnTrip(trip, liveTripProgress(trip, liveTick));
      const key = `${(Math.round(lat * 18) / 18).toFixed(3)}|${(Math.round(lon * 18) / 18).toFixed(3)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), trip]);
    }

    for (const trips of grouped.values()) {
      if (mapZoom < 10 || liveView === "stress") {
        const positions = trips.map((trip) => pointOnTrip(trip, liveTripProgress(trip, liveTick)));
        const position: [number, number] = [positions.reduce((sum, point) => sum + point[0], 0) / positions.length, positions.reduce((sum, point) => sum + point[1], 0) / positions.length];
        const average = trips.reduce((sum, trip) => sum + trip.delay, 0) / trips.length;
        const tone = average >= 15 ? "severe" : average >= 6 ? "late" : "calm";
        L.marker(position, { icon:L.divIcon({ className:"live-cluster-wrap", html:`<div class="live-cluster ${tone}">${trips.length}<small>Züge</small></div>`, iconSize:[42,42], iconAnchor:[21,21] }) }).bindTooltip(`${trips.length} Live-Züge · Ø ${average.toLocaleString("de-DE", { maximumFractionDigits:1 })} Min. · ab Zoom 10 einzeln`).addTo(layer);
        continue;
      }
      for (const trip of trips) {
        const progress = liveTripProgress(trip, liveTick);
        const position = pointOnTrip(trip, progress);
        if (showTrails) L.polyline(trailForTrip(trip, progress), { color:trip.delay >= 15 ? "#c8675e" : trip.delay >= 6 ? "#c99b45" : trip.category === "sbahn" ? "#4b8b69" : "#4f8f91", weight:1.6, opacity:.24, dashArray:"2 7", lineCap:"round" }).addTo(layer);
        const className = `live-train-marker glyph ${trip.category}${trip.delay >= 15 ? " severe" : trip.delay >= 6 ? " delayed" : ""}${trackedTripId === trip.tripId ? " tracked" : ""}`;
        const marker = L.marker(position, { zIndexOffset:900, icon:L.divIcon({ className:"live-train-wrap", html:`<div class="${className}"><i></i></div>`, iconSize:[22,22], iconAnchor:[11,11] }) }).addTo(layer);
        marker.bindTooltip(routeElement(trip.name, `${trip.from.name} → ${trip.to.name} · ${trip.delay ? `+${trip.delay} Min.` : "pünktlich"} · nächster Halt ${clock(trip.arrival)}`), { direction:"top", offset:[0,-11] });
        marker.on("click", () => { setSelectedLiveTrip(trip); setExploreOpen(false); setStatsOpen(false); setJourney(null); setMobileSheetState("expanded"); });
      }
    }
  }, [liveState, liveTick, liveView, liveVisible, mapReady, mapZoom, showTrails, trackedTripId, visibleLiveTrips]);

  useEffect(() => {
    if (!trackedTripId || !mapRef.current) return;
    const trip = liveTrips.find((candidate) => candidate.tripId === trackedTripId);
    if (trip) mapRef.current.panTo(pointOnTrip(trip, liveTripProgress(trip, liveTick)), { animate:true, duration:.8 });
  }, [liveTick, liveTrips, trackedTripId]);

  function selectStation(match: Station) {
    if (match.id.startsWith("motis:")) setLiveSearchStations((current) => current.some((station) => station.id === match.id) ? current : [...current, match]);
    setSelectedId(match.id); setSearch(match.name); setJourney(null); setRouteInfo(null); setStationPanel("live");
    setSelectedLiveTrip(null); setTrackedTripId(null); setExploreOpen(false); setStatsOpen(false); setBoardSummary(null); setStationTrip(null); setStationTrips([]); setStationLineSummary(null); setSidebarCollapsed(false);
    setMobileSheetState("expanded");
    mapRef.current?.flyTo([match.lat, match.lon], match.source === "db" ? 10 : match.country === "DE" ? 8 : 6, { duration:.7 });
  }

  function showBoardTripOnMap(trip: BoardMapTrip) {
    setStationTrip(trip);
    setJourney(null);
    setSelectedLiveTrip(null);
    setTrackedTripId(null);
    if (mapRef.current && leafletRef.current && trip.points.length) {
      mapRef.current.fitBounds(leafletRef.current.latLngBounds(trip.points), { padding:[80,80], maxZoom:12 });
    }
  }

  function showStationTripsOnMap(trips: BoardMapTrip[]) {
    setStationTrip(null);
    setStationTrips(trips);
    setJourney(null);
    setSelectedLiveTrip(null);
    const points = trips.flatMap((trip) => trip.points);
    if (mapRef.current && leafletRef.current && points.length) mapRef.current.fitBounds(leafletRef.current.latLngBounds(points), { padding:[70,70], maxZoom:11 });
  }

  function toggleFavorite(station: Station) {
    setFavoriteIds((current) => {
      const next = current.includes(station.id) ? current.filter((id) => id !== station.id) : [station.id, ...current].slice(0, 30);
      localStorage.setItem("bahnconnections-favorite-stations", JSON.stringify(next));
      return next;
    });
  }

  function toggleLiveCategory(category: LiveTrainCategory) {
    setLiveCategories((current) => current.includes(category) ? (current.length === 1 ? current : current.filter((item) => item !== category)) : [...current, category]);
  }

  function togglePlannerCategory(category: PlannerCategory) {
    setPlannerCategories((current) => current.includes(category) ? (current.length === 1 ? current : current.filter((item) => item !== category)) : [...current, category]);
    setJourney(null);
    setJourneyMessage("");
  }

  async function runPlanner() {
    const start = stationById.get(startId);
    const target = stationById.get(targetId);
    if (!startId || !targetId) {
      setJourney(null);
      setJourneyMessage("Bitte Start und Ziel aus der Trefferliste auswählen.");
      return;
    }
    if (startId === targetId) {
      setJourney(null);
      setJourneyMessage("Start und Ziel sind identisch. Bitte ein anderes Ziel auswählen.");
      return;
    }
    if (!start || !target || !journeyDeparture) {
      setJourney(null);
      setJourneyMessage("Bahnhof oder Abfahrtszeit fehlen. Bitte die Auswahl noch einmal prüfen.");
      return;
    }
    plannerRequestRef.current?.abort();
    const controller = new AbortController();
    plannerRequestRef.current = controller;
    setPlannerState("loading");
    setJourney(null);
    setStationTrip(null);
    setStationTrips([]);
    setJourneyOptions([]);
    setJourneyOptionLimit(8);
    setJourneyMessage("Aktueller Fahrplan und Echtzeitlage werden geprüft …");
    try {
      const results = await fetchLiveJourneys({
        from:start,
        to:target,
        departure:berlinLocalToIso(journeyDeparture),
        arriveBy,
        maxTransfers:maxChanges,
        minTransferMinutes:transferMinutes,
        categories:plannerCategories,
        wheelchair:wheelchairRouting,
        bike:bikeRequired,
        signal:controller.signal,
      });
      const result = results[0] ?? null;
      setJourneyOptions(results);
      setJourney(result);
      setJourneyEndpoints(result ? { start, target } : null);
      setSelectedId(start.id);
      setSearch(start.name);
      setRouteInfo(null);
      setExploreOpen(!result);
      setPlannerState(result ? "ready" : "error");
      setJourneyMessage(result ? "" : "Für diese Uhrzeit und die gewählten Verkehrsmittel wurde keine Verbindung gefunden. Aktiviere ggf. Regio, S- oder U-Bahn oder erhöhe die Zahl der Umstiege.");
      if (result) { setMobileSheetHeight(null); setMobileSheetState("half"); }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setPlannerState("error");
      setJourneyMessage("Die Live-Verbindungssuche ist gerade nicht erreichbar. Es werden bewusst keine erfundenen Fahrten angezeigt. Bitte erneut versuchen.");
    }
  }

  function chooseJourney(option: LiveJourney) {
    setJourney(option);
    setStationTrip(null);
    setMobileSheetHeight(null);
    setMobileSheetState("half");
  }

  function fitJourneyOnMap(option: LiveJourney, sheetState: MobileSheetState = mobileSheetState) {
    if (!mapRef.current || !leafletRef.current) return;
    const points = journeyPoints(option);
    if (!points.length) return;
    const mobile = window.matchMedia("(max-width: 780px), (max-width: 900px) and (orientation: landscape) and (max-height: 520px)").matches;
    const mapHeight = mapElementRef.current?.clientHeight ?? window.innerHeight;
    const sheet = document.querySelector<HTMLElement>('.mobile-sheet-panel');
    const measuredHeight = sheet?.getBoundingClientRect().height ?? 0;
    const bottomPadding = !mobile ? 80 : Math.min(Math.max(0, mapHeight - 100), (sheetState === "closed" ? 82 : measuredHeight || 100) + 16);
    mapRef.current.fitBounds(leafletRef.current.latLngBounds(points), mobile ? {
      paddingTopLeft:[28,28],
      animate:false,
      paddingBottomRight:[28,bottomPadding],
      maxZoom:12,
    } : { padding:[80,80], maxZoom:12, animate:false });
  }

  function toggleBlockedRoute(id: string) {
    setBlockedRouteIds((current) => { const next=new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setJourney(null);
  }

  function toggleBlockedStation(id: string) {
    setBlockedStationIds((current) => { const next=new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
    setJourney(null);
  }

  function showReachability() {
    setReachabilityVisible(true); setLiveVisible(false); setLabOpen(true); setJourney(null); setExploreOpen(false); setStatsOpen(false);
  }

  function resetMap() {
    setSelectedId(null); setSearch(""); setJourney(null); setJourneyOptions([]); setJourneyMessage(""); setRouteInfo(null); setReachabilityVisible(false);
    setSelectedLiveTrip(null); setTrackedTripId(null); setExploreOpen(false); setStatsOpen(false); setBoardSummary(null); setStationTrip(null); setStationTrips([]); setStationLineSummary(null);
    setMobileSheetState("closed");
    mapRef.current?.setView([51.15, 10.35], 6, { animate:true });
  }

  function surpriseMe() {
    const pool = connections.length ? connections.map((connection) => connection.station) : STATIONS.filter((station) => station.country === "DE" && !station.hub);
    const station = pool[Math.floor(Math.random() * pool.length)];
    if (station) selectStation(station);
  }

  const planStart = stationById.get(startId);
  const planTarget = stationById.get(targetId);
  const selectedJourneyStart = journeyEndpoints?.start ?? planStart;
  const selectedJourneyTarget = journeyEndpoints?.target ?? planTarget;
  const journeyQuality = journey ? liveJourneyQuality(journey) : null;
  const primaryJourneyLeg = journey?.transitLegs[0] ?? null;
  const journeyForecast = journey?.transitLegs.reduce<ReturnType<typeof occupancyForecast> | null>((highest, leg) => {
    const current = occupancyForecast(leg.startTime, leg.name);
    return !highest || current.level > highest.level ? current : highest;
  }, null) ?? null;
  const journeyAccessibilityConfirmed = Boolean(journey?.transitLegs.length && journey.transitLegs.every((leg) => leg.wheelchairAccessible === "ACCESSIBLE"));
  const primaryJourneyDelay = primaryJourneyLeg ? delayMinutes(primaryJourneyLeg.startTime, primaryJourneyLeg.scheduledStartTime) : 0;
  const selectedTripProgress = selectedLiveTrip ? liveTripProgress(selectedLiveTrip, liveTick) : 0;
  const selectedTripDurationHours = selectedLiveTrip ? Math.max(1 / 60, (new Date(selectedLiveTrip.arrival).getTime() - new Date(selectedLiveTrip.departure).getTime()) / 3_600_000) : 1;
  const selectedTripSpeed = selectedLiveTrip ? Math.round(selectedLiveTrip.distance / 1000 / selectedTripDurationHours) : 0;
  const activePrimaryPanel = exploreOpen ? "planner" : statsOpen ? "stats" : labOpen ? "lab" : journey ? "journey" : selectedLiveTrip ? "trip" : selected && !sidebarCollapsed ? "station" : null;
  const primaryPanelOpen = Boolean(activePrimaryPanel);
  const mobileSheetTitle = activePrimaryPanel === "planner" ? "Verbindung planen" : activePrimaryPanel === "journey" ? "Verbindung" : activePrimaryPanel === "station" ? selected?.name ?? "Bahnhof" : activePrimaryPanel === "trip" ? selectedLiveTrip?.name ?? "Zugdetails" : activePrimaryPanel === "stats" ? "Netzreport" : "Netzlabor";
  const mobileSheetSummary = journey && activePrimaryPanel === "journey"
    ? `${clock(journey.startTime)}–${clock(journey.endTime)} · ${journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "direkt"}`
    : activePrimaryPanel === "planner" ? `${startSearch || "Start"} → ${targetSearch || "Ziel"}`
    : activePrimaryPanel === "station" ? "Live-Tafel, Linien und Statistik"
    : activePrimaryPanel === "trip" ? `${selectedLiveTrip?.from.name ?? ""} → ${selectedLiveTrip?.to.name ?? ""}`
    : activePrimaryPanel === "stats" ? "Netz und Qualität" : "Live-Lage und Simulation";

  useEffect(() => {
    const rememberHeight = (event: Event) => {
      const height = (event as CustomEvent<{ height?: number }>).detail?.height;
      setMobileSheetHeight(typeof height === "number" && Number.isFinite(height) ? Math.round(height) : null);
    };
    window.addEventListener(MOBILE_SHEET_HEIGHT_EVENT, rememberHeight);
    return () => window.removeEventListener(MOBILE_SHEET_HEIGHT_EVENT, rememberHeight);
  }, []);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const update = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        mapRef.current?.invalidateSize({ animate:false });
        if (journey && !exploreOpen) fitJourneyOnMap(journey, mobileSheetState);
      }, 240);
    };
    const observer = new ResizeObserver(update);
    const sheet = document.querySelector('.mobile-sheet-panel');
    if (sheet) observer.observe(sheet);
    if (mapElementRef.current) observer.observe(mapElementRef.current);
    window.visualViewport?.addEventListener('resize', update);
    update();
    return () => { clearTimeout(timer); observer.disconnect(); window.visualViewport?.removeEventListener('resize', update); };
    // The observer measures the committed DOM after panel and viewport resizing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journey, exploreOpen, activePrimaryPanel, mobileSheetState]);

  return (
    <main className={`app-shell${boardOnly ? " board-only" : ""}${focusMode ? " focus-mode" : ""}${minimalMode ? " minimal-mode" : ""}${primaryPanelOpen ? " has-primary-panel" : ""}`} data-mobile-sheet={mobileSheetState} data-primary-panel={activePrimaryPanel ?? "none"} style={mobileSheetHeight ? { "--mobile-sheet-height":`${mobileSheetHeight}px` } as CSSProperties : undefined}>
      <header className="topbar">
        <button type="button" className="brand" onClick={resetMap} aria-label="BahnConnections Startansicht">
          <span className="brand-mark">B</span><span className="brand-name">BahnConnections</span><span className="beta">BETA</span>
        </button>
        <SmartSearch stations={allStations} value={search} onChange={setSearch} onSelect={selectStation} favoriteIds={favoriteIds} liveTransit />
        <div className="header-actions">
          <a className="install-app-link" href="/install" aria-label="BahnConnections als App installieren"><span className="install-icon" aria-hidden="true">↓</span><span className="install-label-long">App installieren</span><span className="install-label-short">App</span></a>
          <button ref={mobileViewTriggerRef} type="button" className={liveFiltersOpen ? "mobile-map-view-button active" : "mobile-map-view-button"} onClick={() => { setLiveFiltersOpen((value) => !value); setViewMenuOpen(false); }} aria-expanded={liveFiltersOpen} aria-controls="map-view-menu" aria-label="Ansicht und Kartenoptionen"><span className="view-button-icon" aria-hidden="true">☷</span><span className="view-button-label">Ansicht</span></button>
          <button className="round-button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Dunkles Kartenthema" : "Helles Kartenthema"}>{theme === "light" ? "☾" : "☀"}</button>
          <div className="view-options">
            <button className={viewMenuOpen ? "round-button active" : "round-button"} onClick={() => setViewMenuOpen((value) => !value)} aria-expanded={viewMenuOpen} aria-label="Darstellung und Hilfe">•••</button>
            {viewMenuOpen && <div className="view-menu-popover"><span>Darstellung</span><button className={highContrast ? "active" : ""} onClick={() => setHighContrast((value) => !value)}>◐ Hoher Kontrast</button><button className={fontScale === "large" ? "active" : ""} onClick={() => setFontScale((value) => value === "large" ? "normal" : "large")}>A Globale Schrift</button><button onClick={() => { setHelpOpen(true); setViewMenuOpen(false); }}>? Daten & Methodik</button></div>}
          </div>
        </div>
      </header>

      <section className="map-stage" aria-label="Interaktive Bahnkarte für Fernverkehr, Regio, S- und U-Bahn">
        <div ref={mapElementRef} className="map-canvas" />

        {!focusMode && <>
          <div ref={liveToolbarRef} className="live-map-toolbar compact-toolbar" aria-label="Kartenwerkzeuge">
            <button type="button" className={liveFiltersOpen ? "map-menu-trigger active" : "map-menu-trigger"} onClick={() => { setLiveFiltersOpen((value) => !value); setViewMenuOpen(false); }} aria-expanded={liveFiltersOpen} aria-controls="map-view-menu">☰ Ansicht</button>
            <span className={`map-live-state ${liveState}`}>{liveVisible ? `${visibleLiveTrips.length} live` : "Live aus"}</span>
          </div>
          {liveFiltersOpen && <button type="button" className="map-menu-backdrop" aria-label="Ansicht-Menü schließen" onClick={() => setLiveFiltersOpen(false)} />}
          {liveFiltersOpen && <div ref={mapMenuRef} className="live-filter-popover map-menu-popover detached" id="map-view-menu" role="dialog" aria-label="Kartenansicht einstellen">
            <div className="map-menu-actions"><button onClick={() => { setExploreOpen(true); setJourney(null); setSelectedLiveTrip(null); setStatsOpen(false); setLabOpen(false); setLiveFiltersOpen(false); setMobileSheetState("expanded"); }}>⌕ Verbindung entdecken</button><button onClick={() => { setStatsOpen(true); setJourney(null); setSelectedLiveTrip(null); setExploreOpen(false); setLabOpen(false); setLiveFiltersOpen(false); setMobileSheetState("expanded"); }}>▥ Netzreport 2025</button><button onClick={() => { setLabOpen(true); setJourney(null); setSelectedLiveTrip(null); setStatsOpen(false); setExploreOpen(false); setLiveFiltersOpen(false); setMobileSheetState("expanded"); }}>◉ Netzlabor</button></div>
            <span>Oberfläche</span><div className="popover-buttons surface-buttons"><button onClick={() => setTheme((current) => current === "light" ? "dark" : "light")}>{theme === "light" ? "Dunkel" : "Hell"}</button><button className={highContrast ? "active" : ""} onClick={() => setHighContrast((value) => !value)}>Kontrast</button><button className={fontScale === "large" ? "active" : ""} onClick={() => setFontScale((value) => value === "large" ? "normal" : "large")}>Schrift</button><button onClick={() => { setHelpOpen(true); setLiveFiltersOpen(false); }}>Hilfe</button></div>
            <span>Kartenlage</span><div className="popover-buttons"><button className={liveVisible && liveView === "stress" ? "active" : ""} onClick={() => { setLiveVisible(true); setLiveView("stress"); }}>Kompakte Live-Lage</button><button className={liveVisible && liveView === "trains" ? "active" : ""} onClick={() => { setLiveVisible(true); setLiveView("trains"); }}>Züge ab Zoom 10</button><button className={!liveVisible ? "active" : ""} onClick={() => setLiveVisible(false)}>Aus</button></div>
            <span>Zugarten</span><div className="popover-buttons"><button className={liveCategories.includes("fern") ? "active fern" : ""} onClick={() => toggleLiveCategory("fern")}>ICE/IC</button><button className={liveCategories.includes("regional") ? "active regional" : ""} onClick={() => toggleLiveCategory("regional")}>RE/RB</button><button className={liveCategories.includes("sbahn") ? "active sbahn" : ""} onClick={() => toggleLiveCategory("sbahn")}>S-Bahn</button><button className={liveCategories.includes("ubahn") ? "active ubahn" : ""} onClick={() => toggleLiveCategory("ubahn")}>U-Bahn</button></div>
            <label>Status<select aria-label="Pünktlichkeitsfilter" value={liveStatusFilter} onChange={(event) => setLiveStatusFilter(event.target.value as LiveStatusFilter)}><option value="all">Alle Status</option><option value="delayed">Nur verspätet</option><option value="ontime">Nur pünktlich</option></select></label>
            <span>Netzebenen</span><button className={overviewRoutesVisible ? "overview-route-toggle active" : "overview-route-toggle"} onClick={() => { setOverviewRoutesVisible((value) => !value); setStationTrip(null); setStationTrips([]); }}><b>Kuratiertes Fernnetz</b><small>{overviewRoutesVisible ? "sichtbar · nicht vollständig" : `aus · ${ROUTES.length} Referenzlinien`}</small></button>
            <div className="map-display-toggles"><button className={showRouteLabels ? "active" : ""} onClick={() => setShowRouteLabels((value) => !value)} disabled={!overviewRoutesVisible}>Liniennamen</button><button className={minimalMode ? "active" : ""} onClick={() => setMinimalMode((value) => !value)}>Minimalmodus</button><button className={focusMode ? "active" : ""} onClick={() => setFocusMode((value) => !value)}>Fokusmodus</button><button className={showTrails ? "active" : ""} onClick={() => setShowTrails((value) => !value)}>Zugschweif</button></div>
          </div>}
        </>}

        {exploreOpen && <aside className={`explore-card floating-panel mobile-sheet-panel${selected ? " condensed" : ""}`} style={exploreControls.style}>
          <PanelTools controls={exploreControls} label="Verbindung planen" onClose={() => setExploreOpen(false)} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileSummary={`${startSearch || "Start"} → ${targetSearch || "Ziel"}`} />
          {journey && <button type="button" className="planner-return" onClick={() => setExploreOpen(false)}>← Zur ausgewählten Verbindung <span>{clock(journey.startTime)}–{clock(journey.endTime)}</span></button>}
          <div className="route-discovery-head"><div className="eyebrow"><span /> LIVE-VERBINDUNG</div><h1>Von wo nach <em>wo?</em></h1><p>Aktueller Fahrplan mit Fernverkehr, Regionalzug, S- und U-Bahn – einschließlich Echtzeit, Gleisen und allen Halten.</p></div>
          <div className="planner-live-proof"><i /><span><b>Live statt Modell</b><small>Route, Halte und Zeiten stammen aus derselben aktuellen Fahrt.</small></span></div>
          <div className="route-search-pair">
            <div><span>STARTBAHNHOF</span><SmartSearch stations={plannerStations} value={startSearch} onChange={(value) => { setStartSearch(value); setStartId(""); setJourneyMessage(""); setPlannerState("idle"); }} onSelect={(station) => { if (station.id.startsWith("motis:")) setLiveSearchStations((current) => current.some((item) => item.id === station.id) ? current : [...current, station]); setStartId(station.id); setStartSearch(station.name); setJourneyMessage(""); setPlannerState("idle"); }} favoriteIds={favoriteIds} variant="route" placeholder="Start suchen …" submitLabel="Wählen" ariaLabel="Startbahnhof suchen" liveTransit /></div>
            <button className="swap-button" onClick={() => { const currentId=startId; const currentSearch=startSearch; setStartId(targetId); setStartSearch(targetSearch); setTargetId(currentId); setTargetSearch(currentSearch); setJourneyMessage(""); setPlannerState("idle"); }} aria-label="Start und Ziel tauschen">⇅</button>
            <div><span>ZIELBAHNHOF</span><SmartSearch stations={plannerStations} value={targetSearch} onChange={(value) => { setTargetSearch(value); setTargetId(""); setJourneyMessage(""); setPlannerState("idle"); }} onSelect={(station) => { if (station.id.startsWith("motis:")) setLiveSearchStations((current) => current.some((item) => item.id === station.id) ? current : [...current, station]); setTargetId(station.id); setTargetSearch(station.name); setJourneyMessage(""); setPlannerState("idle"); }} favoriteIds={favoriteIds} variant="route" placeholder="Ziel suchen …" submitLabel="Wählen" ariaLabel="Zielbahnhof suchen" liveTransit /></div>
          </div>
          <div className="type-filters planner-types" aria-label="Verkehrsmittel filtern">
            <button className={plannerCategories.includes("fern") ? "active fern" : ""} onClick={() => togglePlannerCategory("fern")} aria-pressed={plannerCategories.includes("fern")}><i />ICE / IC / EC</button>
            <button className={plannerCategories.includes("regional") ? "active regional" : ""} onClick={() => togglePlannerCategory("regional")} aria-pressed={plannerCategories.includes("regional")}><i />RE / RB</button>
            <button className={plannerCategories.includes("sbahn") ? "active sbahn" : ""} onClick={() => togglePlannerCategory("sbahn")} aria-pressed={plannerCategories.includes("sbahn")}><i />S-Bahn</button>
            <button className={plannerCategories.includes("ubahn") ? "active ubahn" : ""} onClick={() => togglePlannerCategory("ubahn")} aria-pressed={plannerCategories.includes("ubahn")}><i />U-Bahn</button>
          </div>
          <details className="filter-drawer route-options" open>
            <summary>Reiseoptionen <span>Echtzeit aktiv</span></summary>
            <div className="filter-grid">
              <div className="wide planner-time-mode" role="group" aria-label="Abfahrts- oder Ankunftszeit"><button className={!arriveBy ? "active" : ""} onClick={() => setArriveBy(false)}>Abfahrt</button><button className={arriveBy ? "active" : ""} onClick={() => setArriveBy(true)}>Ankunft</button></div>
              <label className="wide">{arriveBy ? "Ankommen bis" : "Abfahren ab"}<input type="datetime-local" step="300" value={journeyDeparture} onInput={(event) => { setJourneyDeparture(event.currentTarget.value); setJourney(null); setPlannerState("idle"); }} /></label>
              <label>Max. Umstiege<select value={maxChanges} onChange={(event) => setMaxChanges(Number(event.target.value) as 0 | 1 | 2 | 3 | 4 | 5)}><option value="0">Nur direkt</option><option value="1">Bis 1 Umstieg</option><option value="2">Bis 2 Umstiege</option><option value="3">Bis 3 Umstiege</option><option value="4">Bis 4 Umstiege</option><option value="5">Automatisch bis 5</option></select></label>
              <label>Zusätzlicher Umstiegspuffer<select value={transferMinutes} onChange={(event) => setTransferMinutes(Number(event.target.value))}><option value="0">Kein Extra-Puffer (schnellste)</option><option value="3">3 Minuten</option><option value="5">5 Minuten</option><option value="8">8 Minuten</option><option value="12">12 Minuten</option></select></label>
              <label className="planner-check wide"><input type="checkbox" checked={wheelchairRouting} onChange={(event) => setWheelchairRouting(event.target.checked)} /><span><b>Barrierearme Wege</b><small>Aufzüge und stufenarme Umstiege bevorzugen</small></span></label>
              <label className="planner-check wide"><input type="checkbox" checked={bikeRequired} onChange={(event) => setBikeRequired(event.target.checked)} /><span><b>Fahrradmitnahme erforderlich</b><small>Nur Fahrten mit entsprechender Freigabe</small></span></label>
            </div>
          </details>
          <button className="plan-button" onClick={() => void runPlanner()} disabled={plannerState === "loading" || !startId || !targetId || startId === targetId || !journeyDeparture}>{plannerState === "loading" ? "Live-Fahrplan wird geprüft …" : "Aktuelle Verbindungen anzeigen"} <span>{plannerState === "loading" ? "●" : "→"}</span></button>
          <div className="explore-actions"><button className="surprise-button" onClick={surpriseMe}>✦ Versteckte Perle</button><button className="reset-button" onClick={resetMap}>↺ Karte leeren</button></div>
          {journeyMessage && <p className={`planner-message ${plannerState}`} role="status">{journeyMessage}</p>}
        </aside>}

        {!statsOpen && !exploreOpen && !labOpen && !journey && !selectedLiveTrip && selected && !sidebarCollapsed ? (
          <aside className={`station-card floating-panel mobile-sheet-panel station-right${stationPanel !== "live" ? " detail-width" : ""}`} style={stationControls.style}>
            <PanelTools controls={stationControls} label="Bahnhof" onClose={() => { setSelectedId(null); setBoardSummary(null); setStationLineSummary(null); setStationTrip(null); setStationTrips([]); }} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileSummary={selected.name} />
            <div className="station-context-bar"><button onClick={() => { setSelectedId(null); setBoardSummary(null); setStationLineSummary(null); setStationTrip(null); setStationTrips([]); }}>← Übersicht</button><span /><button onClick={() => { if (window.matchMedia("(max-width: 780px)").matches) setMobileSheetState("collapsed"); else setSidebarCollapsed(true); }}>Einklappen →</button></div>
            <div className="station-card-head"><div><span className="eyebrow plain">AUSGEWÄHLTER BAHNHOF</span><h2>{selected.name}</h2><p>{selected.country === "DE" ? selected.state ?? "Deutschland" : selected.country}{selected.mergedCount ? ` · ${selected.mergedCount} Betriebsstellen gebündelt` : ""}</p></div><div className="station-card-actions"><span className={`station-health ${!boardSummary ? "unknown" : boardSummary.canceled > 0 || boardSummary.delayed15 / Math.max(1,boardSummary.total) > .2 ? "risk" : boardSummary.delayed6 / Math.max(1,boardSummary.total) > .2 ? "medium" : "good"}`}><i />{!boardSummary ? "lädt" : boardSummary.canceled > 0 || boardSummary.delayed15 / Math.max(1,boardSummary.total) > .2 ? "angespannt" : boardSummary.delayed6 / Math.max(1,boardSummary.total) > .2 ? "beobachten" : "stabil"}</span><button className={favoriteIds.includes(selected.id) ? "favorite active" : "favorite"} onClick={() => toggleFavorite(selected)} aria-label={favoriteIds.includes(selected.id) ? "Bahnhof aus Favoriten entfernen" : "Bahnhof als Favorit speichern"}>★</button></div></div>
            <details className="station-technical"><summary>Bahnhofsdetails</summary><p>{selected.code ? `DS100 ${selected.code}` : "Kein DS100-Code"}{selected.eva ? ` · EVA ${selected.eva}` : ""}{selected.kind ? ` · ${selected.kind}` : ""}{selected.passengerBand ? ` · Reisende/Tag ${selected.passengerBand}` : ""}</p></details>
            <div className="stat-row station-line-kpis"><div><strong>{stationLineSummary?.fern ?? "–"}</strong><span>Fern</span></div><div><strong>{stationLineSummary?.regional ?? "–"}</strong><span>Regio</span></div><div><strong>{stationLineSummary?.sbahn ?? "–"}</strong><span>S-Bahn</span></div><div><strong>{stationLineSummary?.ubahn ?? "–"}</strong><span>U-Bahn</span></div></div>
            <div className="station-section-tabs" role="tablist" aria-label="Bahnhofsinformationen">
              <button role="tab" aria-selected={stationPanel === "live"} className={stationPanel === "live" ? "active" : ""} onClick={() => setStationPanel("live")}><i /> Live-Tafel</button>
              <button role="tab" aria-selected={stationPanel === "destinations"} className={stationPanel === "destinations" ? "active" : ""} onClick={() => setStationPanel("destinations")}>Linien <span>{stationLineSummary?.total ?? "…"}</span></button>
              <button role="tab" aria-selected={stationPanel === "stats"} className={stationPanel === "stats" ? "active" : ""} onClick={() => setStationPanel("stats")}>Statistik</button>
            </div>
            <div hidden={stationPanel !== "live"}><LiveBoard station={selected} onSummary={handleBoardSummary} onMapTrip={showBoardTripOnMap} onStationTrips={handleStationTrips} /></div>
            <div hidden={stationPanel !== "destinations"}><StationLines station={selected} onSummary={handleStationLineSummary} onMapTrip={showBoardTripOnMap} onMapTrips={showStationTripsOnMap} /></div>
            {stationPanel === "stats" && <StationStats station={selected} boardSummary={boardSummary} lineSummary={stationLineSummary} />}
          </aside>
        ) : null}
        {!statsOpen && !exploreOpen && !labOpen && !journey && !selectedLiveTrip && selected && sidebarCollapsed && <button className="sidebar-restore right" onClick={() => setSidebarCollapsed(false)}><span>{selected.name}</span><b>Live-Tafel öffnen</b></button>}

        <NetworkStats open={statsOpen} onClose={() => setStatsOpen(false)} stations={allStations} liveTrips={liveTrips} selectedStation={selected} liveUpdatedAt={liveUpdatedAt} mobileSheetState={mobileSheetState} onMobileSheetState={setMobileSheetState} />
        <NetworkLab open={labOpen} onClose={() => setLabOpen(false)} selected={selected} routes={ROUTES} stations={allStations} liveTrips={liveTrips} boardSummary={boardSummary} blockedRouteIds={blockedRouteIds} blockedStationIds={blockedStationIds} onToggleRoute={toggleBlockedRoute} onToggleStation={toggleBlockedStation} onResetBlocks={() => { setBlockedRouteIds(new Set()); setBlockedStationIds(new Set()); setJourney(null); }} reachabilityMinutes={reachabilityMinutes} onReachabilityMinutes={setReachabilityMinutes} onShowReachability={showReachability} mobileSheetState={mobileSheetState} onMobileSheetState={setMobileSheetState} />

        {journey && !statsOpen && !exploreOpen && !labOpen && selectedJourneyStart && selectedJourneyTarget && (
          <section className="journey-card floating-panel mobile-sheet-panel" style={journeyControls.style}>
            <PanelTools controls={journeyControls} label="Verbindung" onClose={() => setJourney(null)} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileTitle={primaryJourneyLeg ? `${primaryJourneyLeg.name} · ${selectedJourneyStart.name} → ${selectedJourneyTarget.name}` : `${selectedJourneyStart.name} → ${selectedJourneyTarget.name}`} mobileSummary={`${clock(journey.startTime)}–${clock(journey.endTime)} · ${formatDuration(Math.round(journey.durationSeconds / 60))} · ${journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "direkt"}`} />
            <div className="journey-mobile-overview">
              {primaryJourneyLeg && <span className={`service-logo ${serviceClass(primaryJourneyLeg.category)}`} style={serviceBadgeStyle(primaryJourneyLeg.category, primaryJourneyLeg.routeColor, primaryJourneyLeg.routeTextColor, primaryJourneyLeg.name, `${primaryJourneyLeg.operator ?? ""} ${primaryJourneyLeg.from.name} ${primaryJourneyLeg.to.name}`)}>{serviceBadgeLabel(primaryJourneyLeg.category, primaryJourneyLeg.name)}</span>}
              <span className="journey-mobile-route"><b>{primaryJourneyLeg?.name ?? "Verbindung"}</b><strong>{selectedJourneyStart.name} <i aria-hidden="true">→</i> {selectedJourneyTarget.name}</strong><small>{clock(journey.startTime)}–{clock(journey.endTime)} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "direkt"} · {journey.cancelled ? "Ausfall" : journey.realtime ? primaryJourneyDelay ? `${primaryJourneyDelay > 0 ? "+" : ""}${primaryJourneyDelay} Min.` : "pünktlich" : "Fahrplan"}</small></span>
              <button type="button" onClick={() => { setExploreOpen(true); setMobileSheetState("expanded"); }} aria-label="Suche und Reiseoptionen ändern">Ändern</button>
            </div>
            <div className="journey-mobile-facts" aria-label="Verbindungsmerkmale">
              <span><small>Dauer</small><b>{formatDuration(Math.round(journey.durationSeconds / 60))}</b></span>
              <span><small>Auslastung</small><b>{journeyForecast ? `${journeyForecast.label} · vsl.` : "Keine Prognose"}</b></span>
              <span><small>Barrierefreiheit</small><b>{journeyAccessibilityConfirmed ? "Bestätigt" : "Bitte prüfen"}</b></span>
            </div>
            <details className="journey-mobile-data"><summary><i />{journey.cancelled ? "Ausfall enthalten" : journey.realtime ? "Live-Daten aktiv" : "Nur Fahrplandaten"}<span>Datenstatus</span></summary><p>{journey.sourceLabel} · geprüft {new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" }).format(new Date(journey.updatedAt))}</p></details>
            <button type="button" className="journey-edit-search" onClick={() => { setExploreOpen(true); setMobileSheetState("expanded"); }}>← Suche und Optionen ändern</button>
            <div className={`journey-status ${journey.realtimeStatus === "live" ? "live" : journey.realtimeStatus === "partial" ? "partial" : "schedule"}`} aria-live="polite"><i /> {journeyOptionLabel(journey, journeyOptions[0])} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "direkt"} · {journey.realtime ? "Echtzeit berücksichtigt" : "aktuelle Fahrplanlage"}</div>
            <div className="journey-source-row"><span><i />{journey.sourceLabel}</span><time>geprüft {new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" }).format(new Date(journey.updatedAt))}</time></div>
            <div className="journey-head"><strong>{selectedJourneyStart.name}</strong><span>→</span><strong>{selectedJourneyTarget.name}</strong><b>{formatDuration(Math.round(journey.durationSeconds / 60))}</b></div>
            <div className="journey-time-summary"><span><small>Abfahrt</small><b>{clock(journey.startTime)}</b><em>{dateTime(journey.startTime).split(",")[0]}</em></span><i>→</i><span><small>Ankunft</small><b>{clock(journey.endTime)}</b><em>{dateTime(journey.endTime).split(",")[0]}</em></span><span className={journey.cancelled ? "journey-live-badge cancel" : journey.realtime ? "journey-live-badge live" : "journey-live-badge"}>{journey.cancelled ? "Ausfall enthalten" : journey.realtime ? "● Live" : "Fahrplan"}</span></div>
            <div className="journey-legs live-legs">
              {journey.transitLegs.map((leg, index) => {
                const forecast=occupancyForecast(leg.startTime, leg.name);
                const departureDelay=delayMinutes(leg.startTime, leg.scheduledStartTime);
                const wait=transferWaitMinutes(journey,index);
                return <article className={`live-journey-leg ${serviceClass(leg.category)}`} key={`${leg.tripId ?? leg.name}-${index}`}>
                  <header><span className={`service-logo ${serviceClass(leg.category)}`} style={leg.category === "walk" ? undefined : serviceBadgeStyle(leg.category, leg.routeColor, leg.routeTextColor, leg.name, `${leg.operator ?? ""} ${leg.from.name} ${leg.to.name}`)}>{serviceBadgeLabel(leg.category, leg.name)}</span><span><b>{leg.name}</b><small>{leg.operator ?? "Betreiber nicht gemeldet"}{leg.headsign ? ` · Richtung ${leg.headsign}` : ""}</small></span><span className={leg.cancelled ? "leg-live-state cancel" : leg.realtime ? "leg-live-state live" : "leg-live-state"}>{leg.cancelled ? "Fällt aus" : leg.realtime ? departureDelay ? `${departureDelay > 0 ? "+" : ""}${departureDelay} Min.` : "pünktlich" : "Fahrplan"}</span></header>
                  <div className="leg-route-line"><span><b>{leg.from.name}</b><small>{clock(leg.startTime)}{leg.from.track ? ` · Gleis ${leg.from.track}` : ""}</small></span><i>→</i><span><b>{leg.to.name}</b><small>{clock(leg.endTime)}{leg.to.track ? ` · Gleis ${leg.to.track}` : ""}</small></span></div>
                  <div className="leg-facts"><span>{leg.stops.length} Halte</span><span>{formatDuration(Math.round(leg.durationSeconds / 60))}</span><span>{leg.bikesAllowed ? "Fahrrad möglich" : "Fahrrad nicht bestätigt"}</span><span>{leg.wheelchairAccessible === "ACCESSIBLE" ? "Rollstuhl geeignet" : "Barrierefreiheit nicht bestätigt"}</span></div>
                  <div className={`occupancy-forecast compact level-${forecast.level}`}><b>Auslastung voraussichtlich {forecast.label.toLocaleLowerCase("de")}</b><span className="occupancy-bars" aria-hidden="true">{[1,2,3].map((item) => <i className={item <= forecast.level ? "active" : ""} key={item} />)}</span><small>Prognose, keine Live-Belegungsmessung</small></div>
                  {leg.alerts.length > 0 && <div className="journey-alerts">{leg.alerts.slice(0,2).map((alert,alertIndex) => <p key={`${alert.header}-${alertIndex}`}><b>Hinweis:</b> {alert.header}</p>)}</div>}
                  <ol className="model-stop-list live-stop-list">{leg.stops.map((stop,stopIndex) => { const actual=stop.departure ?? stop.arrival; const planned=stop.scheduledDeparture ?? stop.scheduledArrival; const stopDelay=delayMinutes(actual,planned); const platformChanged=Boolean(stop.track && stop.scheduledTrack && stop.track !== stop.scheduledTrack); return <li className={stop.cancelled ? "cancelled" : ""} key={`${stop.id ?? stop.name}-${stopIndex}`}><i /><span><b>{stop.name}</b><small>{stop.cancelled ? "Halt entfällt" : platformChanged ? `Gleis ${stop.track} statt ${stop.scheduledTrack}` : stop.track ? `Gleis ${stop.track}` : stopIndex === 0 ? "Einstieg" : stopIndex === leg.stops.length - 1 ? "Ausstieg" : "Zwischenhalt"}</small></span><time>{actual ? clock(actual) : "–"}{stopDelay !== 0 && <small>{stopDelay > 0 ? "+" : ""}{stopDelay} Min.</small>}</time>{planned && stopDelay !== 0 && <small className="planned-time">Soll {clock(planned)}</small>}</li>; })}</ol>
                  {wait !== null && <div className={`transfer-step ${wait < 7 ? "risk" : wait < 12 ? "medium" : "good"}`}><i /><span><b>Umstieg in {leg.to.name}</b><small>{wait} Minuten bis {journey.transitLegs[index + 1]?.name}</small></span></div>}
                </article>;
              })}
            </div>
            {journey.legs.some((leg) => leg.category === "walk") && <p className="journey-walk-note">Fußwege am Start, Ziel oder beim Umstieg sind in der Gesamtdauer enthalten.</p>}
            {journeyQuality && <div className={`transfer-quality ${journeyQuality.tone}`}><strong>{journeyQuality.score}</strong><span><b>Umsteige-Qualität: {journeyQuality.label}</b><small>{journeyQuality.explanation}</small></span></div>}
            {journey.warnings.length > 0 && <div className="journey-source-warnings">{journey.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div>}
            {journeyOptions.length > 1 && <div className="journey-alternatives"><span>Weitere aktuelle Verbindungen</span>{journeyOptions.filter((option) => option.id !== journey.id).slice(0,journeyOptionLimit).map((option) => <button key={option.id} onClick={() => chooseJourney(option)}><em>{journeyOptionLabel(option, journeyOptions[0])}</em><b>{clock(option.startTime)} → {clock(option.endTime)}</b><small>{formatDuration(Math.round(option.durationSeconds / 60))} · {option.transfers ? `${option.transfers} Umstieg${option.transfers > 1 ? "e" : ""}` : "direkt"} · {option.transitLegs.map((item) => item.name).join(" + ")}</small><small>{option.sourceLabel}</small></button>)}{journeyOptions.filter((option) => option.id !== journey.id).length > journeyOptionLimit && <button className="journey-more" onClick={() => setJourneyOptionLimit((value) => value + 8)}>Weitere Verbindungen anzeigen</button>}</div>}
            <div className="journey-data-note"><i /> Route, Halte, Soll-/Ist-Zeiten, Gleise und Ausfälle stammen aus der jeweils ausgewiesenen Fahrplanquelle. Die Linie folgt der Geometrie dieser Fahrt; Auslastung bleibt eine gekennzeichnete Prognose.</div>
          </section>
        )}

        {selectedLiveTrip && !statsOpen && !exploreOpen && !labOpen && (
          <section className="live-trip-card floating-panel mobile-sheet-panel" style={tripControls.style} aria-live="polite">
            <PanelTools controls={tripControls} label="Zugdetails" onClose={() => { setSelectedLiveTrip(null); setTrackedTripId(null); }} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileSummary={`${selectedLiveTrip.from.name} → ${selectedLiveTrip.to.name}`} />
            <div className="live-trip-title"><span className={`service-pill ${selectedLiveTrip.category === "fern" ? "ice" : selectedLiveTrip.category === "sbahn" ? "sbahn" : selectedLiveTrip.category === "ubahn" ? "ubahn" : "regional"}`}>{selectedLiveTrip.name}</span><div><b>{selectedLiveTrip.from.name} → {selectedLiveTrip.to.name}</b><small>{selectedLiveTrip.realTime ? "Echtzeitposition" : "Fahrplanposition"} · {selectedLiveTrip.delay ? `+${selectedLiveTrip.delay} Min.` : "pünktlich"}</small></div></div>
            <div className="trip-progress"><i style={{ width:`${Math.round(selectedTripProgress * 100)}%` }} /><span style={{ left:`${Math.round(selectedTripProgress * 100)}%` }} /></div>
            <div className="live-trip-stops"><span><small>Letzter Halt</small><b>{selectedLiveTrip.from.name}</b><em>{clock(selectedLiveTrip.departure)}</em></span><span><small>Nächster Halt</small><b>{selectedLiveTrip.to.name}</b><em>{clock(selectedLiveTrip.arrival)}</em></span></div>
            <div className="live-trip-stats"><span><b>{selectedTripSpeed}</b> km/h Ø Segment</span><span><b>{Math.round(selectedTripProgress * 100)}%</b> des Abschnitts</span><span><b>{selectedLiveTrip.delay || 0}</b> Min. Abweichung</span></div>
            <button className={trackedTripId === selectedLiveTrip.tripId ? "track-button active" : "track-button"} onClick={() => setTrackedTripId((current) => current === selectedLiveTrip.tripId ? null : selectedLiveTrip.tripId)}>{trackedTripId === selectedLiveTrip.tripId ? "Kamerafolge beenden" : "Zug auf Karte verfolgen"}</button>
          </section>
        )}

        {!boardOnly && <details className="map-legend"><summary>Legende</summary><div><span><i className="legend-route ice" />ICE</span><span><i className="legend-route ic" />IC</span><span><i className="legend-route ec" />EC</span><span><i className="legend-dot hub" />großer Hub</span><span><i className="legend-dot station" />Fernbahnhof</span>{reachabilityVisible && <><span><i className="legend-dot hour1" />≤ 1 h</span><span><i className="legend-dot hour2" />≤ 2 h</span><span><i className="legend-dot hour3" />≤ 3 h</span><span><i className="legend-dot hour4" />≤ 4 h</span></>}</div></details>}
        {!boardOnly && <div className="quick-map-actions"><button className={minimalMode ? "active" : ""} onClick={() => setMinimalMode((value) => !value)}>◐ Minimal</button><button onClick={() => { setFocusMode((value) => !value); setLiveFiltersOpen(false); }}>{focusMode ? "Fokus beenden" : "◎ Fokus"}</button><button className={labOpen ? "active" : ""} onClick={() => { setLabOpen((value) => !value); setJourney(null); setSelectedLiveTrip(null); setExploreOpen(false); setStatsOpen(false); setMobileSheetState("expanded"); }}>◉ Netzlabor</button></div>}
        {primaryPanelOpen && mobileSheetState === "closed" && <button type="button" className="mobile-sheet-restore" onClick={() => setMobileSheetState("expanded")}><span><b>{mobileSheetTitle}</b><small>{mobileSheetSummary}</small></span><strong>Öffnen ↑</strong></button>}

      </section>

      {helpOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}>
          <section className="source-modal" role="dialog" aria-modal="true" aria-labelledby="sources-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Schließen">×</button>
            <span className="eyebrow plain">DATEN & METHODIK</span>
            <h2 id="sources-title">So liest du die Karte</h2>
            <p>BahnConnections verbindet ein kuratiertes Fernverkehrsnetz für die Übersicht mit mehr als 5.000 Personenbahnhöfen, echter aktueller Verbindungssuche, Live-Bahnhofstafeln und einer gebündelten Live-Lage.</p>
            <ul><li><b>Entdecken</b> nutzt keinen Modellfahrplan mehr. Fernverkehr, Regionalzug und S-Bahn werden gemeinsam im aktuellen Transitous/MOTIS-Fahrplan gesucht. Halte, Gleise, Soll-/Ist-Zeiten, Ausfälle und die auf der Karte gezeigte Fahrtgeometrie stammen aus derselben Verbindung.</li><li><b>Streckenübersicht</b> zeigt weiterhin das kuratierte Fernliniennetz 2026. Zwischen deutschen Halten folgt es dem DB-Infrastrukturverlauf; im Ausland kann eine vereinfachte Fortsetzung erscheinen. Ein Klick auf eine Linienbezeichnung öffnet die modellierte Linienübersicht. Eine konkret geplante Fahrt ersetzt diese Darstellung durch ihre aktuelle Fahrtgeometrie.</li><li><b>Bahnhofs-Bündelung</b> fasst nahe Betriebsstellen mit Zusätzen wie Ringbahn, Vorortbahn, S-Bahn, tief oder oben zu einem Bahnhof zusammen. In der Routen-Suche erscheinen nur als Personenbahnhof gekennzeichnete DB-Stationen; die allgemeine Kartensuche darf weiterhin betriebliche Punkte finden.</li><li><b>Punktgrößen</b> ergeben sich bei Fernbahnhöfen aus Direktzielen, Linien und modellierten Zughalten. Weitere DB-Punkte werden nach der veröffentlichten Klasse des Reisendenaufkommens abgestuft.</li><li><b>Netzreport</b> trennt DB-Jahreswerte 2025, live ausgewertete Zugsegmente und Kennzahlen aus dem Fahrplanmodell 2026. Umsteigeanteile beschreiben Bahnhofspaare, nicht tatsächliche Fahrgastströme.</li><li><b>Live-Lage</b> zeigt kleine Zug-Cluster statt großflächiger Abweichungskreise. Einzelne Zugnummern erscheinen erst ab Zoom 10 und dann nur im Tooltip; die Position ist interpoliert und kein Fahrzeug-GPS.</li><li><b>Live-Tafel</b> startet ruhig mit Fernverkehr und 240 Minuten. Sie zeigt bis zu 500 Minuten Soll-/Ist-Zeit, Verspätung, Ausfall und Gleis. Beim Aufklappen lädt sie den vollständigen Fahrtverlauf direkt in der App.</li><li><b>Echtzeit</b> wird pro Fahrt und Zugabschnitt sichtbar gekennzeichnet. Wo ein Verkehrsverbund keine Echtzeit liefert, zeigt die App ausdrücklich „Fahrplan“ statt eine vermeintlich genaue Live-Angabe.</li><li><b>Auslastung</b> ist als Prognose aus Uhrzeit, Wochentag und Zugart gekennzeichnet; die Live-Quelle liefert keine Belegungsmessung.</li><li><b>Netzlabor</b> simuliert Sperren, Reisezeitradien und Umsteigequalität auf dem kuratierten Übersichtsnetz. Diese Simulation beeinflusst nicht die aktuelle Fahrplanauskunft.</li><li><b>Tastatur</b>: S öffnet die Suche, L schaltet Live-Züge, F öffnet Filter und Esc schließt Details.</li></ul>
            <div className="source-links">
              <a href="https://www.bahn.de/service/fahrplaene/streckennetz" target="_blank" rel="noreferrer"><b>DB Fernverkehr</b><span>ICE/IC-Liniennetz 2026 ↗</span></a>
              <a href="https://developers.deutschebahn.com/db-api-marketplace/apis/product/stada/api/173477" target="_blank" rel="noreferrer"><b>DB InfraGO StaDa</b><span>Bahnhofs-Stammdaten ↗</span></a>
              <a href="https://geoviewer.deutschebahn.com/geoviewer-geoserver/web/" target="_blank" rel="noreferrer"><b>DB InfraGO GeoViewer</b><span>Offizielle Streckengeometrie ↗</span></a>
              <a href="https://transitous.org/sources/" target="_blank" rel="noreferrer"><b>Transitous</b><span>Fahrplan- & Echtzeitquellen ↗</span></a>
              <a href="https://www.bahnhof.de/berlin-hauptbahnhof" target="_blank" rel="noreferrer"><b>bahnhof.de</b><span>Referenz Live-Abfahrt / Ankunft ↗</span></a>
              <a href="https://github.com/motis-project/motis/blob/master/openapi.yaml" target="_blank" rel="noreferrer"><b>MOTIS API</b><span>Live-Segmente & Schienen-Polylinien ↗</span></a>
              <a href="https://ibir.deutschebahn.com/2025/de/zusammengefasster-lagebericht/entwicklung-der-geschaeftsfelder/geschaeftsfeld-db-fernverkehr/entwicklung-im-berichtsjahr/" target="_blank" rel="noreferrer"><b>DB-Bericht 2025</b><span>Qualität & Auslastung ↗</span></a>
              <a href="https://www.bkg.bund.de/SharedDocs/Produktinformationen/BKG/DE/P-2025/251027_VG250.html" target="_blank" rel="noreferrer"><b>GeoBasis-DE / BKG</b><span>Bundesländergrenzen ↗</span></a>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer"><b>OpenStreetMap</b><span>Karte & Lizenz ↗</span></a>
            </div>
            <small>Aktuelle Fahrplanauskunft und Echtzeit via Transitous/MOTIS · kuratiertes Fernverkehrs-Übersichtsnetz 2026 · kurzfristige Quell- und Betriebsabweichungen bleiben möglich.</small>
          </section>
        </div>
      )}
    </main>
  );
}
