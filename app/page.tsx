"use client";

import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState, type CSSProperties, type UIEvent } from "react";
import { stationMarkerHierarchy } from "./station-marker";
import { stationPassengerInfo } from "./station-passengers";
import { PlannerPanel } from "./planner-panel";
import { usePanelHistory } from "./use-panel-history";
import { parseSavedRoutes, saveRoute, SAVED_ROUTES_KEY, type SavedRoute } from "./saved-routes";
import {commuterDepartureTime} from "./commuter-departure";
import { buildPlannerLink, parsePlannerLink } from "./planner-deep-link";
import { SettingsDialog, parseLocalProfile, type LocalProfile } from "./settings-dialog";
import { APP_VERSION_LABEL } from "./app-version";
import { useAvailableAppUpdate } from "./pwa-update-state";
import { DesktopNavigation, MobileNavigation, type DesktopView } from "./desktop-navigation";
import { UiIcon } from "./ui-icon";
import { resolveV60Shortcut, type V60Shortcut } from "./v60-shortcuts";
import { V60ShortcutHelp } from "./v60-shortcut-help";
import { nextRecentStations,RECENT_STATIONS_KEY } from "./v60-recent-stations";
import {mapDataStatus} from "./map-data-status";
import { RealtimeTime } from "./realtime-time";
import { RealtimePlatform } from "./realtime-platform";
import { JourneyTimeRange } from "./journey-time-range";
import { JourneyExport } from "./journey-export";
import { journeyDateRange } from "./journey-tools";
import { NetworkNotice } from "./network-notice";
import { realtimeTooltip } from "./realtime-tooltip";
import { readPreference, readPreferenceJson, readPreferenceIds } from "./local-preferences";
import {stationCondition} from "./board-health";
import { useLeafletMap } from "./use-leaflet-map";
import { useLiveRadar } from "./use-live-radar";
import { useStationRadar } from "./use-station-radar";
import { StationCallsBrowser } from "./station-calls-browser";
import { matchesStationCall, type StationRadarDirection } from "./station-radar-data";
import { RadarStationCalls } from "./radar-station-calls";
import { useLiveMap } from "./use-live-map";
import { LiveTripInspector } from "./live-trip-inspector";
import { TrainRadarHud } from "./train-radar-hud";
import { syncAndroidFollow } from "./android-follow-bridge";
import { JourneyAlternatives, TransferNotice } from "./journey-alternatives";
import {ROUTE_INVALIDATED_EVENT} from './trip-response';
import { LiveBoard, type BoardMapTrip, type BoardSummary } from "./live-board";
import { fetchLiveJourneys, journeyPoints, type LiveJourney, type PlannerCategory } from "./live-journey";
import { activeEstimatedPosition, matchesLiveStatus, type LiveTrainCategory, type LiveTrip } from "./live-trains";
import { SmartSearch } from "./smart-search";
import { buildStationImportance, NetworkStats } from "./network-stats";
import { MOBILE_SHEET_HEIGHT_EVENT, PanelTools, usePanelControls, type MobileSheetState } from "./panel-tools";
import { DesktopPanelResizer } from "./desktop-panel-resizer";
import { assessJourneyTransfers } from "./v60-transfer-assessment.ts";
import { StationSubNavigation } from "./station-sub-navigation";
import { StationStats } from "./station-stats";
import { StationMapRenderer } from "./station-map-renderer";
import { StationLines, type StationLineSummary } from "./station-lines";
import { StationDisruptions } from "./station-disruptions";
import { compactStationLabel, serviceBadgeStyle, serviceColors } from "./transit-style";
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
import { WorkerTrackRouter } from "./track-worker-client";
import { railContinuityLinks, splitRailGeometry } from "./rail-geometry";
import { declutterStations } from "./map-density";
import { distanceMeters, type WalkingRoute } from "./walking-route";

type ExtraStationsPayload = { source: string; retrievedAt: string; totalOfficialPoints: number; curatedStates?: Record<string, string>; curatedAliases?: Record<string, Pick<Station, "mergedCodes" | "mergedCount" | "passengerBand">>; stations: Station[] };
type LiveStatusFilter = "all" | "delayed" | "ontime";
type LiveView = "stress" | "trains";
type GeoPosition = { lat: number; lon: number; accuracy: number; updatedAt: number };

function markPanelScroll(event:UIEvent<HTMLElement>) { event.currentTarget.dataset.scrolled = event.currentTarget.scrollTop > 8 ? "true" : "false"; }

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.motion === "reduced";
const stationDisplayName = (value?: string) => compactStationLabel(value) ?? value ?? "";

const MAJOR_HUB_IDS = new Set(["berlin", "muenchen", "frankfurt", "hamburg", "koeln"]);

function routeElement(label: string, detail?: string) {
  const node = document.createElement("div");
  const title = document.createElement("strong");
  title.textContent = label;
  node.appendChild(title);
  if (detail) {
    const meta = document.createElement("div");
    meta.textContent = detail;
    meta.style.fontSize = "12px";
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
  node.appendChild(glyph);
  node.appendChild(title);
  return node;
}

function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" }).format(new Date(value));
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
  return category === "fern" ? "ice" : category === "sbahn" ? "sbahn" : category === "ubahn" ? "ubahn" : category === "tram" ? "tram" : category === "regional" ? "regional" : "walk";
}

function serviceBadgeLabel(category: PlannerCategory | "walk", name: string) {
  if (category === "sbahn" || category === "ubahn" || category === "tram") return name.replace(/\s+/g, "");
  if (category === "regional") return name.match(/^(RE|RB|IRE|MEX)/i)?.[0]?.toUpperCase() ?? "R";
  return name.match(/^(ICE|IC|EC|RJX?|TGV|NJ|EN|FLX)/i)?.[0]?.toUpperCase() ?? "ICE";
}

function liveJourneyQuality(journey: LiveJourney) {
  const assessments=assessJourneyTransfers(journey);
  if(!assessments.length)return {tone:"medium",label:"ohne Umstieg",explanation:"Kein Fahrzeugwechsel nötig."};
  const cancelled=assessments.find(item=>item.status==="cancelled");
  const missed=assessments.find(item=>item.status==="missed");
  const unknown=assessments.find(item=>item.status==="unknown");
  const shortest=assessments.filter(item=>item.bufferMinutes!==null).sort((a,b)=>a.bufferMinutes!-b.bufferMinutes!)[0];
  if(cancelled)return {tone:"risk",label:"mit Ausfall",explanation:cancelled.detail};
  if(missed)return {tone:"risk",label:"zeitlich nicht erreichbar",explanation:missed.detail};
  if(unknown||!shortest)return {tone:"medium",label:"nicht bewertbar",explanation:"Mindestens ein Anschluss hat unvollständige Zeitangaben. Bitte prüfen."};
  return {tone:shortest.tone,label:!shortest.walkProvided?"Gleisweg unbekannt":shortest.status==="tight"?"sehr knapp":shortest.status==="caution"?"knapp":"mit Zeitpuffer",
    explanation:`${shortest.walkProvided?`Kleinster rechnerischer Puffer ${shortest.bufferMinutes} Min. einschließlich gemeldetem Fußweg.`:`${shortest.waitMinutes} Min. zwischen Ankunft und Abfahrt; Gleisweg nicht angegeben.`} ${shortest.source==="realtime"?"Echtzeitprognose":shortest.source==="partial"?"Teilweise Echtzeitdaten":"Fahrplanwerte"} – kein garantierter Anschluss.`};
}

function journeyOptionLabel(option: LiveJourney, fastest?: LiveJourney) {
  if (!fastest || option.id === fastest.id) return "Schnellste";
  if (option.transfers < fastest.transfers) return "Wenig Umstiege";
  const transfers=assessJourneyTransfers(option);
  if (transfers.length&&transfers.every(item=>item.walkProvided&&item.bufferMinutes!==null&&item.bufferMinutes>=10))return "Mehr Zeit zum Umsteigen";
  return "Spätere Abfahrt";
}

function exactTripSegments(trip: BoardMapTrip) {
  return trip.segments.flatMap((segment) => splitRailGeometry(segment));
}

function tripRealtimeLabel(trip: BoardMapTrip) {
  const knownStops = trip.stops.filter((stop) => typeof stop.realtime === "boolean");
  const confirmedStops = knownStops.filter((stop) => stop.realtime);
  if (knownStops.length && confirmedStops.length === knownStops.length) return "Echtzeit an allen Halten";
  if (confirmedStops.length || trip.realtime) return "Echtzeit teilweise verfügbar";
  return "Fahrplanfahrt";
}

function PassengerLegend() { return <div className="passenger-legend"><span><i className="passenger-sample low"/>unter 100/Tag</span><span><i className="passenger-sample medium"/>100–1.000/Tag</span><span><i className="passenger-sample high"/>über 1.000/Tag</span><span><i className="passenger-sample known"/>Tageszahl veröffentlicht</span><span><i className="passenger-sample unknown"/>Keine Daten</span><small>Größere Fläche = höheres Tagesaufkommen. Klassen sind keine exakten Zahlen. Verfügbare Werte, Bezugsjahr und Quelle stehen beim Bahnhof.</small></div>; }

export default function Home() {
  const appUpdate=useAvailableAppUpdate();
  const [desktopWorkspace, setDesktopWorkspace] = useState(false);
  const [activeView, setActiveView] = useState<DesktopView>("map");
  const desktopView = activeView, mobileView = activeView;
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktopWorkspace(query.matches);
    const timer = window.setTimeout(() => { if (query.matches) setActiveView("connections"); update(); },0);
    query.addEventListener("change", update);
    window.addEventListener("resize", update);
    return () => { window.clearTimeout(timer); query.removeEventListener("change", update); window.removeEventListener("resize", update); };
  }, []);
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
  const [plannerCategories, setPlannerCategories] = useState<PlannerCategory[]>(["fern", "regional", "sbahn", "ubahn", "tram"]);
  const [plannerState, setPlannerState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [arriveBy, setArriveBy] = useState(false);
  const [wheelchairRouting, setWheelchairRouting] = useState(false);
  const [bikeRequired, setBikeRequired] = useState(false);
  const [journeyMessage, setJourneyMessage] = useState("");
  const [routeInfo, setRouteInfo] = useState<string | null>(null);
  const [stationPanel, setStationPanel] = useState<"live" | "destinations" | "stats" | "disruptions">("live");
  const [helpOpen, setHelpOpen] = useState(false);
  const [railState, setRailState] = useState<"loading" | "ready" | "error">("loading");
  const [extraStations, setExtraStations] = useState<Station[]>([]);
  const [liveSearchStations, setLiveSearchStations] = useState<Station[]>([]);
  const [curatedStates, setCuratedStates] = useState<Record<string, string>>({});
  const [curatedAliases, setCuratedAliases] = useState<Record<string, Pick<Station, "mergedCodes" | "mergedCount" | "passengerBand">>>({});
  const [savedRoutes,setSavedRoutes]=useState<SavedRoute[]>([]);
  const [routeSaveMessage,setRouteSaveMessage]=useState("");
  const [shareMessage,setShareMessage]=useState("");
  const [stationShareStatus,setStationShareStatus]=useState<{id:string;message:string}|null>(null);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [boardOnly, setBoardOnly] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [fontScale, setFontScale] = useState<"compact" | "normal" | "large">("compact");
  const [language,setLanguage]=useState<"de"|"en">("de");
  const [pendingPlannerLocation,setPendingPlannerLocation]=useState(false);
  const [liveVisible, setLiveVisible] = useState(false);
  const [liveCategories, setLiveCategories] = useState<LiveTrainCategory[]>(["fern","regional","sbahn","ubahn","tram"]);
  const [liveStatusFilter, setLiveStatusFilter] = useState<LiveStatusFilter>("all");
  const [radarDirection,setRadarDirection] = useState<StationRadarDirection>("all");
  const [stationCallsOpen,setStationCallsOpen] = useState(false);
  const [liveView, setLiveView] = useState<LiveView>("trains");
  const [showTrails, setShowTrails] = useState(false);
  const [selectedLiveTrip, setSelectedLiveTrip] = useState<LiveTrip | null>(null);
  const [trackedTripId, setTrackedTripId] = useState<string | null>(null);
  const [trackedRadarAnchor,setTrackedRadarAnchor] = useState<Station | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);
  const [liveFiltersOpen, setLiveFiltersOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [, setViewMenuOpen] = useState(false);
  const [boardSummary, setBoardSummary] = useState<BoardSummary | null>(null);
  const [stationLineSummary, setStationLineSummary] = useState<StationLineSummary | null>(null);
  const [stationTrip, setStationTrip] = useState<BoardMapTrip | null>(null);
  const [stationTrips, setStationTrips] = useState<BoardMapTrip[]>([]);
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [shortcutsOpen,setShortcutsOpen]=useState(false);
  const [recentStationIds,setRecentStationIds]=useState<string[]>([]);
  const closeShortcuts=useCallback(()=>setShortcutsOpen(false),[]);
  const [settingsInitialTab,setSettingsInitialTab]=useState<"profile"|"settings"|"about"|"plans">("profile");
  const [profile,setProfile]=useState<LocalProfile>(parseLocalProfile(null));
  const [reducedMotion,setReducedMotion]=useState(false);
  const [autoLocation,setAutoLocation]=useState(true);
  const [minimalMode, setMinimalMode] = useState(false);
  const [showRouteLabels, setShowRouteLabels] = useState(false);
  const [overviewRoutesVisible, setOverviewRoutesVisible] = useState(false);
  const [focusMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [journeyDeparture, setJourneyDeparture] = useState("");
  const [journeyOptionLimit, setJourneyOptionLimit] = useState(8);
  const [mobileSheetState, setMobileSheetState] = useState<MobileSheetState>("half");
  const stationLinkAppliedRef = useRef(false);
  const plannerLinkAppliedRef = useRef(false);
  const [mobileSheetHeight, setMobileSheetHeight] = useState<number | null>(null);
  const revealStationContent=useCallback(()=>{
    if(window.matchMedia("(max-width: 1023px)").matches){
      setMobileSheetHeight(null);
      setMobileSheetState("expanded");
    }
  },[]);
  const [geoPosition, setGeoPosition] = useState<GeoPosition | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "locating" | "active" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [walkRoute, setWalkRoute] = useState<WalkingRoute | null>(null);
  const [walkTargetId, setWalkTargetId] = useState<string | null>(null);
  const [walkStatus, setWalkStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [walkMessage, setWalkMessage] = useState("");

  const exploreControls = usePanelControls("explore-v3");
  const stationControls = usePanelControls("station-v2");
  const journeyControls = usePanelControls("journey-v3");
  const tripControls = usePanelControls("live-trip-v2");
  const handleBoardSummary = useCallback((summary: BoardSummary) => setBoardSummary(summary), []);
  const handleStationLineSummary = useCallback((summary: StationLineSummary) => setStationLineSummary(summary), []);
  const handleStationTrips = useCallback((trips: BoardMapTrip[]) => setStationTrips(trips), []);
  const handleRadarRoute = useCallback((trip:BoardMapTrip)=>setStationTrip(trip),[]);
  useEffect(()=>{
    const invalidate=(event:Event)=>{
      const {id,reason}=(event as CustomEvent<{id:string;reason:string}>).detail;
      setStationTrip(current=>current?.tripId===id?null:current);
      setStationTrips(current=>current.filter(trip=>trip.tripId!==id));
      setSelectedLiveTrip(current=>current?.tripId===id?null:current);
      setTrackedTripId(current=>current===id?null:current);
      setJourney(current=>current?.transitLegs.some(leg=>leg.tripId===id)?null:current);
      setJourneyOptions(current=>current.filter(item=>!item.transitLegs.some(leg=>leg.tripId===id)));
      setJourneyMessage(reason);
    };
    window.addEventListener(ROUTE_INVALIDATED_EVENT,invalidate);
    return()=>window.removeEventListener(ROUTE_INVALIDATED_EVENT,invalidate);
  },[]);

  const {mapReady,mapZoom,mapViewportToken,mapElementRef,mapRef,overlayRef,stationLayerRef,routeRendererRef,liveLayerRef,locationLayerRef,walkingLayerRef,leafletRef} = useLeafletMap();
  const stationPreviewRef = useRef<StationMapRenderer | null>(null);
  const [railRevision, setRailRevision] = useState(0);
  const trackRouterRef = useRef<WorkerTrackRouter | null>(null);
  const plannerRequestRef = useRef<AbortController | null>(null);
  const plannerGenerationRef = useRef(0);
  const invalidatePlanner = useCallback(() => {
    plannerGenerationRef.current += 1;
    plannerRequestRef.current?.abort();
    setPlannerState("idle"); setJourneyMessage("");
  }, []);
  useEffect(() => () => { plannerRequestRef.current?.abort(); }, []);
  const walkRequestRef = useRef<AbortController | null>(null);
  const geoWatchRef = useRef<number | null>(null);
  const firstGeoFixRef = useRef(true);
  const pendingWalkTargetRef = useRef<Station | null>(null);
  const liveToolbarRef = useRef<HTMLDivElement>(null);
  const mapMenuRef = useRef<HTMLDivElement>(null);
  const mobileViewTriggerRef = useRef<HTMLButtonElement>(null);

  const selectStation = useCallback((match: Station) => {
    plannerRequestRef.current?.abort(); setPlannerState("idle");
    if (match.id.startsWith("motis:")) setLiveSearchStations((current) => current.some((station) => station.id === match.id) ? current : [...current, match]);
    setRecentStationIds(current=>nextRecentStations(current,match.id));
    setSelectedId(match.id); setSearch(match.name); setJourney(null); setRouteInfo(null); setStationPanel("live");
    setRadarDirection("all");setStationCallsOpen(false);setTrackedRadarAnchor(null);setJourneyMessage("");
    setSelectedLiveTrip(null); setTrackedTripId(null); setExploreOpen(false); setStatsOpen(false); setBoardSummary(null); setStationTrip(null); setStationTrips([]); setStationLineSummary(null); setSidebarCollapsed(false);
    setMobileSheetState("half");
    setActiveView("departures");
    mapRef.current?.flyTo([match.lat, match.lon], 12, { animate:!prefersReducedMotion(), duration:.7 });
  },[mapRef]);

  const allStations = useMemo(() => {
    const byId = new Map<string, Station>();
    for (const station of [...STATIONS.map((item) => ({ ...item, ...curatedAliases[item.id], state:curatedStates[item.id] ?? item.state })), ...extraStations, ...liveSearchStations]) byId.set(station.id, station);
    return [...byId.values()];
  }, [curatedAliases, curatedStates, extraStations, liveSearchStations]);
  const stationById = useMemo(() => new Map(allStations.map((station) => [station.id, station])), [allStations]);
  const plannerStations = useMemo(() => allStations.filter((station) => station.source !== "db" || Boolean(station.passengerBand) || station.id.startsWith("motis:")), [allStations]);
  const nearestStation = useMemo(() => {
    if (!geoPosition) return null;
    let nearest: { station: Station; distance: number } | null = null;
    for (const station of plannerStations) {
      const distance = distanceMeters(geoPosition, station);
      if (!nearest || distance < nearest.distance) nearest = { station, distance };
    }
    return nearest && nearest.distance <= 5_000 ? nearest : null;
  }, [geoPosition, plannerStations]);
  const stationImportance = useMemo(() => buildStationImportance(allStations), [allStations]);

  const filteredRoutes = ROUTES;

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
  // The old radar polled a fixed 4km box around the selected station. Fast
  // trains left it within minutes. Follow the current *estimated* train point
  // with bounded 20s anchor updates while tracking; never conflate this with GPS.
  useEffect(()=>{
    if(!trackedTripId||!selected||!selectedLiveTrip)return;
    const update=()=>{
      if(document.hidden)return;
      const point=activeEstimatedPosition(selectedLiveTrip);
      if(!point)return;
      setTrackedRadarAnchor(current=>{
        if(current&&current.id===selected.id&&Math.abs(current.lat-point[0])<.012&&Math.abs(current.lon-point[1])<.018)return current;
        return {...selected,lat:point[0],lon:point[1]};
      });
    };
    const begin=window.setTimeout(update,0);
    const interval=window.setInterval(update,20_000);
    return()=>{window.clearTimeout(begin);window.clearInterval(interval);};
  },[trackedTripId,selected,selectedLiveTrip]);
  const liveRadarCentre = trackedTripId && trackedRadarAnchor ? trackedRadarAnchor : selected;
  const { trips:liveTrips, state:liveState, updatedAt:liveUpdatedAt } = useLiveRadar(liveRadarCentre,liveVisible,trips => {
    // Keep a selected journey visible if it leaves this station-centred radar scan;
    // the inspector marks it as not currently verified rather than silently closing.
    setSelectedLiveTrip(current => current ? trips.find(trip => trip.tripId === current.tripId) ?? null : null);
  });
  useEffect(()=>{if(!preferencesReady)return;document.documentElement.lang=language;try{localStorage.setItem("bahnconnections-language",language);}catch{/* optional */}},[language,preferencesReady]);
  useEffect(()=>{
    if(!pendingPlannerLocation)return;
    if(geoStatus==="error"){const t=window.setTimeout(()=>setPendingPlannerLocation(false),0);return()=>window.clearTimeout(t);}
    if(!nearestStation)return;
    const t=window.setTimeout(()=>{invalidatePlanner();setStartId(nearestStation.station.id);setStartSearch(stationDisplayName(nearestStation.station.name));setPendingPlannerLocation(false);},0);
    return()=>window.clearTimeout(t);
  // nearestStation already tracks the actual resolved GPS location.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[pendingPlannerLocation,nearestStation,geoStatus]);
  const selectLiveTrip = useCallback((trip:LiveTrip) => {
    plannerRequestRef.current?.abort(); setPlannerState("idle");
    setSelectedLiveTrip(trip); setStationTrip(null);setStationTrips([]);setTrackedTripId(null); setTrackedRadarAnchor(null); setExploreOpen(false); setStatsOpen(false); setJourney(null);
    // Like a radar tracker, opening a train keeps most of the map visible on phones.
    setMobileSheetState("half");
  }, []);
  // Station timetables must work even when the optional map train layer is off.
  const stationRadar = useStationRadar(selected,liveVisible || stationCallsOpen);
  const stationLiveTrips = useMemo(() => liveTrips.filter(trip=>stationRadar.status==="ready"&&matchesStationCall(stationRadar.calls.get(trip.tripId),"all")),[liveTrips,stationRadar.calls,stationRadar.status]);
  const currentTrackedTrip = trackedTripId ? stationLiveTrips.find(trip=>trip.tripId===trackedTripId) : undefined;
  useEffect(()=>{
    const stopped=()=>setTrackedTripId(null);
    window.addEventListener("bahnconnections-native-follow-stopped",stopped);
    return ()=>window.removeEventListener("bahnconnections-native-follow-stopped",stopped);
  },[]);
  // Android notifications run only while the user explicitly follows this train.
  // Do not stop/restart the native service on every radar refresh.
  const nativeFollowId=trackedTripId && selectedLiveTrip?.tripId===trackedTripId ? trackedTripId : null;
  useEffect(()=>{
    // Do not stop an existing Android follow session just because the WebView
    // was reloaded or its React state was recreated.
    if (!nativeFollowId) {
      return;
    }
    const followed=selectedLiveTrip;
    if (followed?.tripId===nativeFollowId) {
      syncAndroidFollow(currentTrackedTrip??followed,liveUpdatedAt,liveState==='ready'&&Boolean(currentTrackedTrip));
    }
    // No cleanup on unmount: the native notification survives app closure.
  },[nativeFollowId,selectedLiveTrip,currentTrackedTrip,liveUpdatedAt,liveState]);
  const visibleLiveTrips = useMemo(() => stationLiveTrips.filter((trip) => {
    if(!matchesStationCall(stationRadar.calls.get(trip.tripId),radarDirection))return false;
    if (!liveCategories.includes(trip.category)) return false;
    return matchesLiveStatus(trip, liveStatusFilter);
  }), [liveCategories, liveStatusFilter, stationLiveTrips,stationRadar.calls,radarDirection]);

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
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setLiveFiltersOpen(false); mobileViewTriggerRef.current?.focus(); }
      if (event.key === "Tab") {
        const controls = Array.from(mapMenuRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input,select') ?? []).filter((element) => element.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (first && last && (event.shiftKey ? document.activeElement === first : document.activeElement === last)) { event.preventDefault(); (event.shiftKey ? last : first).focus(); }
      }
    };
    const pointerdown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!liveToolbarRef.current?.contains(target) && !mapMenuRef.current?.contains(target) && !mobileViewTriggerRef.current?.contains(target) && !(target instanceof Element && target.closest('[aria-controls="map-view-menu"]'))) setLiveFiltersOpen(false);
    };
    document.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", pointerdown);
    return () => { document.removeEventListener("keydown", keydown); document.removeEventListener("pointerdown", pointerdown); };
  }, [liveFiltersOpen]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        setFavoriteIds(readPreferenceIds(localStorage,"bahnconnections-favorite-stations"));
        setRecentStationIds(readPreferenceIds(localStorage,RECENT_STATIONS_KEY).slice(0,6));
        setTheme(readPreference(localStorage,"bahnconnections-theme") === "dark" ? "dark" : "light");
        setHighContrast(readPreference(localStorage,"bahnconnections-contrast") === "high");
        setFontScale((value=>value==="normal"||value==="large"?value:"compact")(readPreference(localStorage,"bahnconnections-font")));
        setLanguage(readPreference(localStorage,"bahnconnections-language")==="en"?"en":"de");
        setMinimalMode(readPreference(localStorage,"bahnconnections-minimal") === "1");
        setSavedRoutes(parseSavedRoutes(readPreferenceJson(localStorage,SAVED_ROUTES_KEY)));
        setProfile(parseLocalProfile(readPreferenceJson(localStorage,"bahnconnections-profile")));
        setAutoLocation(readPreference(localStorage,"bahnconnections-auto-location") !== "0");
        setReducedMotion(readPreference(localStorage,"bahnconnections-motion") === "reduced");
      } catch { /* Local preferences are optional. */ }
      const params = new URLSearchParams(window.location.search);
      setBoardOnly(params.get("board") === "1");
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(()=>{
    if(!preferencesReady)return;
    try{localStorage.setItem(RECENT_STATIONS_KEY,JSON.stringify(recentStationIds));}
    catch{/* Recent searches are optional and never block travel information. */}
  },[preferencesReady,recentStationIds]);

  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.dataset.theme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content",theme==="dark"?"#18232d":"#e7eff0");
    document.documentElement.dataset.contrast = highContrast ? "high" : "normal";
    document.documentElement.dataset.font = fontScale;
    document.documentElement.dataset.motion = reducedMotion ? "reduced" : "full";
    try {
      localStorage.setItem("bahnconnections-theme", theme);
      localStorage.setItem("bahnconnections-contrast", highContrast ? "high" : "normal");
      localStorage.setItem("bahnconnections-font", fontScale);
      localStorage.setItem("bahnconnections-minimal", minimalMode ? "1" : "0");
      localStorage.setItem("bahnconnections-auto-location", autoLocation ? "1" : "0");
      localStorage.setItem("bahnconnections-motion", reducedMotion ? "reduced" : "full");
    } catch { /* Preferences still work when private browsing denies storage. */ }
  }, [fontScale, highContrast, minimalMode, preferencesReady, theme,autoLocation,reducedMotion]);

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
    if(plannerLinkAppliedRef.current)return;
    const parsed=parsePlannerLink(window.location.href);
    if(!parsed)return;
    const from=stationById.get(parsed.from),to=stationById.get(parsed.to);
    if(!from||!to)return;
    const timer=window.setTimeout(()=>{
      plannerLinkAppliedRef.current=true;
      setStartId(from.id);setStartSearch(stationDisplayName(from.name));
      setTargetId(to.id);setTargetSearch(stationDisplayName(to.name));
      setJourneyDeparture(parsed.departure);setArriveBy(parsed.arriveBy);
      setMaxChanges(parsed.maxChanges);setTransferMinutes(parsed.transferMinutes);
      setWheelchairRouting(parsed.wheelchair);setBikeRequired(parsed.bike);setPlannerCategories(parsed.categories);
      setActiveView("connections");setExploreOpen(true);setMobileSheetState("half");
    },0);
    return()=>window.clearTimeout(timer);
  },[stationById]);

  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("station");
    const station = requested ? stationById.get(requested) : null;
    if (!station || stationLinkAppliedRef.current) return;
    const timer = window.setTimeout(() => {
      stationLinkAppliedRef.current = true;
      setSelectedId(station.id); setSearch(station.name); setStationPanel("live");
      setActiveView("departures"); setMobileSheetState("half");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [stationById]);

  const escapePanel = useEffectEvent(() => {
    if(shortcutsOpen){setShortcutsOpen(false);return;}
    if(settingsOpen)return;
    if(helpOpen){setHelpOpen(false);return;}
    if(liveFiltersOpen){setLiveFiltersOpen(false);mobileViewTriggerRef.current?.focus();return;}
    if(moreMenuOpen){setMoreMenuOpen(false);return;}
    resetMap();
  });
  const runV60Shortcut=useEffectEvent((action:V60Shortcut)=>{
    if(action==="escape"){escapePanel();return;}
    if(settingsOpen||shortcutsOpen||helpOpen)return;
    switch(action){
      case "search": {
        const inputs=Array.from(document.querySelectorAll<HTMLInputElement>(".mobile-search-dock .station-search input, .topbar .station-search input, .planner-panel .station-search input"));
        const visible=inputs.find(input=>input.getClientRects().length>0 && getComputedStyle(input).visibility!=="hidden" && !input.disabled);
        visible?.focus();
        break;
      }
      case "live":setLiveVisible(value=>!value);break;
      case "filters":setLiveFiltersOpen(value=>!value);setMoreMenuOpen(false);break;
      case "map":navigate("map");break;
      case "planner":navigate("connections");setExploreOpen(true);break;
      case "departures":navigate("departures");break;
      case "help":setShortcutsOpen(true);setMoreMenuOpen(false);setLiveFiltersOpen(false);break;
    }
  });
  useEffect(()=>{
    const shortcut=(event:KeyboardEvent)=>{
      if(event.defaultPrevented)return;
      const target=event.target instanceof HTMLElement ? event.target : null;
      const action=resolveV60Shortcut({key:event.key,ctrlKey:event.ctrlKey,metaKey:event.metaKey,
        altKey:event.altKey,repeat:event.repeat,targetTag:target?.tagName,
        isContentEditable:target?.isContentEditable,
        withinEditable:Boolean(target?.closest('[contenteditable],[role="textbox"]'))});
      if(!action)return;
      if(action!=="escape"&&target?.closest('[role="dialog"],[aria-modal="true"]'))return;
      if(action!=="escape"&&action!=="help"&&action!=="search"&&target?.closest("details[open]"))return;
      event.preventDefault();runV60Shortcut(action);
    };
    window.addEventListener("keydown",shortcut);
    return ()=>window.removeEventListener("keydown",shortcut);
  },[]);

  useEffect(() => {
    const router = new WorkerTrackRouter(() => setRailState("ready"), () => setRailRevision(value => value + 1), () => setRailState("error"));
    trackRouterRef.current = router;
    return () => { router.dispose(); trackRouterRef.current = null; };
  }, []);




  useEffect(() => {
    const L = leafletRef.current;
    const layer = locationLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    if (!geoPosition) return;
    L.circle([geoPosition.lat, geoPosition.lon], { radius:geoPosition.accuracy, color:"#1769bb", weight:1, fillColor:"#1769bb", fillOpacity:.08, interactive:false }).addTo(layer);
    L.circleMarker([geoPosition.lat, geoPosition.lon], { radius:7, color:"#fff", weight:3, fillColor:"#1769bb", fillOpacity:1, className:"my-location-point" })
      .bindTooltip(`Dein Standort · Genauigkeit etwa ${Math.round(geoPosition.accuracy)} m`)
      .addTo(layer);
  }, [geoPosition, mapReady, leafletRef, locationLayerRef]);

  useEffect(() => {
    const L = leafletRef.current;
    const layer = walkingLayerRef.current;
    if (!mapReady || !L || !layer) return;
    layer.clearLayers();
    if (!walkRoute) return;
    L.polyline(walkRoute.points, { color:"#fff", weight:8, opacity:.95, lineCap:"round", lineJoin:"round", interactive:false }).addTo(layer);
    L.polyline(walkRoute.points, { color:"#1769bb", weight:4.5, opacity:.98, lineCap:"round", lineJoin:"round" })
      .bindTooltip(`Fußweg · ${Math.ceil(walkRoute.durationSeconds / 60)} Min. · ${(walkRoute.distanceMeters / 1000).toLocaleString("de-DE", { maximumFractionDigits:1 })} km`)
      .addTo(layer);
  }, [mapReady, walkRoute, leafletRef, walkingLayerRef]);

  useEffect(() => () => {
    if (geoWatchRef.current !== null) navigator.geolocation?.clearWatch(geoWatchRef.current);
    walkRequestRef.current?.abort();
  }, []);

  const routeZoom = mapZoom >= 11 ? 11 : mapZoom >= 6 ? 6 : 0;

  useEffect(() => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layer = overlayRef.current;
    if (!mapReady || !L || !map || !layer) return;
    layer.clearLayers();
    const mapTokens = getComputedStyle(document.documentElement);
    // Dashed route links explain an unsurveyed gap; do not merge them into
    // actual rail geometry or present them as vehicle positioning.
    const drawUncertainLinks=(segments:[number,number][][],color:string,opacity=.66)=>{
      for(const join of railContinuityLinks(segments)){
        const inferred=L.polyline(join,{renderer:routeRendererRef.current!,color,
          weight:2.8,opacity,dashArray:'5 7',lineCap:'round',lineJoin:'round'});
        inferred.bindTooltip(routeElement('Verbindung geschätzt','Keine genaue Gleisgeometrie für diesen Abschnitt verfügbar'),{sticky:true});
        inferred.addTo(layer);
      }
    };

    const drawRoute = (route: Route, from: string, to: string, featured = false, muted = false) => {
      const path = routePath(route, from, to);
      if (path.length < 2) return;
      // Route badges describe a curated line, not the position of a specific train.
      // Open a real station panel instead of updating an invisible route selection.
      const openRouteAt=(at:[number,number])=>{
        const nearest=path.reduce((best,station)=>{
          const distance=(station.lat-at[0])**2+(station.lon-at[1])**2;
          return distance<best.distance?{station,distance}:best;
        },{station:path[0],distance:Number.POSITIVE_INFINITY}).station;
        if(!nearest)return;
        setSelectedId(nearest.id);setSearch(nearest.name);setJourney(null);setSelectedLiveTrip(null);
        setRouteInfo(route.id);setStationPanel("destinations");setSidebarCollapsed(false);
        setExploreOpen(false);setStatsOpen(false);setActiveView("departures");setMobileSheetState("expanded");
        map.flyTo([nearest.lat,nearest.lon],Math.max(map.getZoom(),9),{animate:!prefersReducedMotion(),duration:.4});
      };
      const trackGeometry = trackRouterRef.current?.geometry(path);
      const segments = trackGeometry?.segments ?? [];
      if (!segments.length) return;
      const coverage = Math.round((trackGeometry?.coverage ?? 0) * 100);
      const palette: Record<TrainType, string> = { ICE:"#df4050", IC:"#208a92", EC:"#7256c9" };
      if(!muted)drawUncertainLinks(segments,palette[route.type],featured ? .7 : .48);
      for (const points of segments) {
        L.polyline(points, { renderer:routeRendererRef.current!, smoothFactor:1.5, color: theme === "dark" ? "#0c222a" : "#fffdf9", weight: featured ? 6.4 : muted ? 3 : 4.6, opacity: featured ? .82 : muted ? .1 : .72, lineCap: "round" }).addTo(layer);
        const line = L.polyline(points, { renderer:routeRendererRef.current!, smoothFactor:1.5,
          color: palette[route.type], weight: featured ? 4.4 : muted ? 2.1 : Math.min(4, 2.15 + route.frequency / 10),
          opacity: featured ? .96 : muted ? .14 : minimalMode ? .28 : .84, lineCap: "round", lineJoin: "round",
        }).addTo(layer);
        line.bindTooltip(routeElement(route.id, `${route.operator} · ${coverage}% der Strecke mit DB-Geometrie belegt · etwa ${route.frequency} Zugpaare/Tag`), { sticky: true });
        line.on("click", event => openRouteAt([event.latlng.lat,event.latlng.lng]));
      }
      const labelPoints = [...segments].sort((left, right) => right.length - left.length)[0];
      if (showRouteLabels && !minimalMode && !muted && routeZoom >= 6 && labelPoints.length > 1) {
        const hash = [...route.id].reduce((sum, letter) => sum + letter.charCodeAt(0), 0);
        const ratio = .27 + (hash % 47) / 100;
        const anchor = labelPoints[Math.min(labelPoints.length - 1, Math.max(0, Math.round((labelPoints.length - 1) * ratio)))];
        const label = L.tooltip({ permanent:true, direction:"center", className:`route-line-label ${route.type.toLowerCase()}`, opacity:1, interactive:true })
          .setLatLng(anchor)
          .setContent(routeBadgeElement(route))
          .addTo(layer);
        label.on("click", () => openRouteAt(anchor));
      }
    };

    if (journey) {
      for (const leg of journey.transitLegs) {
        const legColor = serviceColors(leg.category as PlannerCategory, leg.routeColor, leg.routeTextColor, leg.name, `${leg.operator ?? ""} ${leg.from.name} ${leg.to.name}`).background;
        const legSegments=splitRailGeometry(leg.points);
        drawUncertainLinks(legSegments,legColor,.78);
        for (const points of legSegments) {
          L.polyline(points, { renderer:routeRendererRef.current!, smoothFactor:1.5, color:theme === "dark" ? "#071d26" : "#fff", weight:7, opacity:.86, lineCap:"round", lineJoin:"round" }).addTo(layer);
          const line = L.polyline(points, { renderer:routeRendererRef.current!, smoothFactor:1.5, color:legColor, weight:4.6, opacity:.98, lineCap:"round", lineJoin:"round" }).addTo(layer);
          line.bindTooltip(realtimeTooltip(leg.name, { scheduled:leg.scheduledStartTime, actual:leg.startTime, realtime:leg.realtime, cancelled:leg.cancelled }, undefined, "Fahrtabschnitt entfällt"), { sticky:true });
        }
      }
      const liveStops = journey.transitLegs.flatMap((leg) => leg.stops.map(stop => ({ ...stop, realtime:leg.realtime, cancelled:stop.cancelled || leg.cancelled }))).filter((stop, index, items) => items.findIndex((item) => (item.id && stop.id ? item.id === stop.id : item.name === stop.name)) === index);
      const transferNames = new Set(journey.transitLegs.slice(1).map((leg) => leg.from.name));
      liveStops.forEach((stop, index) => {
        const isStart = index === 0;
        const isEnd = index === liveStops.length - 1;
        const isTransfer = transferNames.has(stop.name);
        const point = L.circleMarker([stop.lat, stop.lon], {
          radius:isStart || isEnd ? 7 : isTransfer ? 6.3 : 4.4,
          color:"#fff",
          weight:isStart || isEnd ? 3 : 2,
          fillColor:isTransfer ? mapTokens.getPropertyValue("--route-transfer").trim() : mapTokens.getPropertyValue("--route-focus").trim(),
          fillOpacity:1,
          className:"live-journey-stop",
        }).addTo(layer);
        const actual = stop.departure ?? stop.arrival;
        const planned = stop.scheduledDeparture ?? stop.scheduledArrival;
        // Only the two ends and transfers get persistent map labels.
        // Dense tram routes must not blanket the map with overlapping boards.
        const showPermanentStopLabel = routeZoom >= 13 && (isStart || isEnd || isTransfer);
        point.bindTooltip(realtimeTooltip(stop.name, { scheduled:planned, actual, realtime:stop.realtime, cancelled:stop.cancelled }, { scheduled:stop.scheduledTrack, actual:stop.track }), { direction:"top", offset:[0,-6], permanent:showPermanentStopLabel, className:showPermanentStopLabel ? "station-route-label live" : "" });
      });
    } else if (stationTrip && exactTripSegments(stationTrip).length) {
      const color = serviceColors(stationTrip.category, stationTrip.color, stationTrip.textColor, stationTrip.name, `${selected?.state ?? ""} ${selected?.name ?? ""}`).background;
      drawUncertainLinks(exactTripSegments(stationTrip),color,.75);
      for (const segment of exactTripSegments(stationTrip)) {
        L.polyline(segment, { renderer:routeRendererRef.current!, smoothFactor:1.5, color:theme === "dark" ? "#071d26" : "#fff", weight:8, opacity:.9, lineCap:"round", lineJoin:"round" }).addTo(layer);
        const exactLine = L.polyline(segment, { renderer:routeRendererRef.current!, smoothFactor:1.5, color, weight:4.8, opacity:.98, lineCap:"round", lineJoin:"round", className:"station-trip-exact" }).addTo(layer);
        exactLine.bindTooltip(routeElement(stationTrip.name, `${tripRealtimeLabel(stationTrip)} · gelieferte Fahrtgeometrie · ${stationTrip.stops.length} Halte`), { sticky:true });
      }
      stationTrip.stops.forEach((stop, index) => {
        if (typeof stop.lat !== "number" || typeof stop.lon !== "number" || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return;
        const isEnd = index === 0 || index === stationTrip.stops.length - 1;
        const point = L.circleMarker([stop.lat, stop.lon], { radius:isEnd ? 6.8 : 4.2, color:"#fff", weight:isEnd ? 3 : 2, fillColor:color, fillOpacity:1, className:"live-journey-stop" }).addTo(layer);
        const actual = stop.departure ?? stop.arrival;
        const planned = stop.scheduledDeparture ?? stop.scheduledArrival;
        const permanent = routeZoom >= 13 && !selectedLiveTrip && isEnd;
        point.bindTooltip(realtimeTooltip(stop.name, { scheduled:planned, actual, realtime:stop.realtime, cancelled:stop.cancelled }, { scheduled:stop.scheduledTrack, actual:stop.track }), { direction:"top", offset:[0,-6], permanent:permanent, className:permanent ? "station-route-label live" : "" });
      });
    } else if (stationTrips.length) {
      // StationMapRenderer owns these layers and appends only new previews.
    } else if (overviewRoutesVisible) {
      const orderedRoutes = routeInfo ? [...filteredRoutes].sort((a, b) => Number(a.id === routeInfo) - Number(b.id === routeInfo)) : filteredRoutes;
      for (const route of orderedRoutes) {
        const first = route.stops[0];
        const last = route.stops[route.stops.length - 1];
        const focused = route.id === routeInfo;
        drawRoute(route, first, last, focused, Boolean(routeInfo && !focused));
      }
    }

    const canvas = map.getPane("rail-routes")?.querySelector("canvas");
    if (canvas) {
      canvas.dataset.routeCount = String(journey ? journey.transitLegs.length : stationTrip ? 1 : stationPreviewRef.current?.count ?? 0);
      canvas.dataset.routeRevision = String(Number(canvas.dataset.routeRevision ?? 0) + 1);
      canvas.dataset.workerPoints = String(trackRouterRef.current?.completedPoints ?? 0);
    }
  }, [filteredRoutes, journey, mapReady, minimalMode, overviewRoutesVisible, railState, railRevision, routeInfo, routeZoom, selected, selectedLiveTrip, showRouteLabels, stationTrip, stationTrips, theme, leafletRef, mapRef, overlayRef, routeRendererRef]);

  useEffect(() => {
    const L=leafletRef.current,map=mapRef.current,canvas=routeRendererRef.current;
    if(!mapReady||!L||!map||!canvas||!selected||journey||stationTrip)return;
    const renderer=new StationMapRenderer(L,map,canvas,`${selected.state??""} ${selected.name}`,setStationTrip);
    stationPreviewRef.current=renderer;
    return ()=>{renderer.dispose();stationPreviewRef.current=null;};
  },[mapReady,selected,theme,journey,stationTrip,leafletRef,mapRef,routeRendererRef]);

  useEffect(()=>{stationPreviewRef.current?.sync(stationTrips);},[stationTrips,mapReady,selected,theme,journey,stationTrip]);

  useEffect(() => {
    const L = leafletRef.current, map = mapRef.current, layer = stationLayerRef.current;
    if (!mapReady || !L || !map || !layer) return;
    let cancelled=false,frame:number|null=null;
    const begin=requestAnimationFrame(()=>{
      frame=requestAnimationFrame(draw);
    });
    const draw=()=>{
    if(cancelled)return;
    layer.clearLayers();
    const connectedIds = overviewRoutesVisible ? new Set(connections.map((connection) => connection.station.id)) : new Set<string>();
    const filteredStationIds = new Set(filteredRoutes.flatMap((route) => route.stops));
    const bounds = map.getBounds().pad(.08);
    // DB operating-point metadata is incomplete for some major stations
    // (for example Berlin-Gesundbrunnen has no passengerBand). Visibility must
    // therefore be derived from the hierarchy when possible and fall back to
    // station structure instead of silently dropping stations without counts.
    const contextualStations = extraStations
      .filter((station) => bounds.contains([station.lat, station.lon]))
      .filter((station) => {
        const passengers = stationPassengerInfo(station);
        const hierarchy = stationMarkerHierarchy({
          hub:station.hub,
          passengerBand:station.passengerBand,
          dailyPassengers:passengers.daily,
        });
        const mergedInterchange = station.kind === "Bf" && (station.mergedCount ?? 0) >= 2;
        const fallbackMinimumZoom = mergedInterchange ? 9 : station.kind === "Bf" ? 10 : 11;
        return mapZoom >= (hierarchy.unknown ? fallbackMinimumZoom : hierarchy.minimumZoom);
      })
;
    const curatedMapStations = STATIONS.map((item) => ({ ...item, ...curatedAliases[item.id], state:curatedStates[item.id] ?? item.state }));
    const selectedExtra = selected?.source === "db" && !contextualStations.some((station) => station.id === selected.id) ? [selected] : [];
    const candidates = [...curatedMapStations, ...contextualStations, ...selectedExtra].filter(station => {
      if (!bounds.contains([station.lat, station.lon])) return false;
      if (station.id === selectedId) return true;
      const hierarchy = stationMarkerHierarchy({ majorHub:MAJOR_HUB_IDS.has(station.id), hub:station.hub, passengerBand:station.passengerBand, dailyPassengers:stationPassengerInfo(station).daily });
      const minimum = hierarchy.unknown && station.source === "db" ? station.kind === "Bf" && (station.mergedCount ?? 0) >= 2 ? 9 : station.kind === "Bf" ? 10 : 11 : hierarchy.minimumZoom;
      return mapZoom >= minimum && (station.country === "DE" || filteredStationIds.has(station.id));
    });
    const visibleStations = declutterStations(candidates, station => map.latLngToContainerPoint([station.lat, station.lon]), selectedId, window.innerWidth < 1024 ? 120 : 280);
    let cursor=0;
    const drawBatch=()=>{
    if(cancelled)return;
    const started=performance.now();
    while(cursor<visibleStations.length){
      const station=visibleStations[cursor++];
      if (station.country !== "DE" && !filteredStationIds.has(station.id)) continue;
      const isSelected = station.id === selectedId;
      const isDestination = false;
      const isTransfer = false;
      const isConnected = connectedIds.has(station.id);
      const profile = stationImportance.get(station.id);
      const isMajorHub = MAJOR_HUB_IDS.has(station.id);
      const passengers=stationPassengerInfo(station);
      const hierarchy = stationMarkerHierarchy({ majorHub:isMajorHub, hub:station.hub, passengerBand:station.passengerBand,dailyPassengers:passengers.daily });
      const baseRadius = hierarchy.radius;
      const connected = overviewRoutesVisible ? connections.find((connection) => connection.station.id === station.id) : undefined;
      const markerPalette = theme === "dark"
        ? { edge:"#b8c7ce", low:"#202427", medium:"#4a565c", high:"#667881", active:"#6f99bd", halo:"#98aab2" }
        : { edge:"#0a7187", low:"#f8fdfe", medium:"#c5ebf0", high:"#3eafc0", active:"#2f7db8", halo:"#198da0" };
      const passengerFill = hierarchy.level >= 3 ? markerPalette.high : hierarchy.level === 2 ? markerPalette.medium : markerPalette.low;
      const passengerClass = station.passengerBand === "> 1.000" ? "passenger-high" : station.passengerBand === "100 - 1.000" ? "passenger-medium" : station.passengerBand === "< 100" ? "passenger-low" : "";
      const markerClasses = [
        "station-point",
        isMajorHub ? "major-hub" : "",
        station.hub ? "hub" : "",
        station.source === "db" ? "db-station" : "",
        passengerClass,
        isSelected ? "selected" : "",
      ].filter(Boolean).join(" ");
      const markerRadius = journey ? Math.min(3.2, Math.max(1.8, baseRadius * .27)) : isSelected || isDestination ? Math.max(6, baseRadius + 1) : isTransfer ? Math.max(7.8, baseRadius) : baseRadius;
      // Make every visible station reachable by touch even when its passenger-
      // proportional visual dot is tiny. The visual marker is added afterwards
      // so its name and existing keyboard semantics remain unchanged.
      L.circleMarker([station.lat,station.lon],{
        radius:24,weight:0,opacity:0,fill:true,fillOpacity:0,
        className:"station-tap-target",interactive:!Boolean(journey),
      }).on("click",()=>selectStation(station)).addTo(layer);
      const marker = L.circleMarker([station.lat, station.lon], {
        radius:markerRadius,
        color: isSelected || isDestination ? "#fff" : isTransfer ? (theme === "dark" ? "#d0b57e" : "#9a7233") : markerPalette.edge,
        opacity: journey ? .24 : .99,
        weight: journey ? 1 : isSelected || isDestination ? 2.2 : isTransfer ? 2.6 : baseRadius >= 9 ? 2.8 : baseRadius >= 5 ? 2.15 : 1.45,
        fillColor: isSelected || isDestination ? markerPalette.active : isTransfer ? (theme === "dark" ? "#725f3c" : "#e8d8b8") : minimalMode ? markerPalette.edge : isConnected ? (theme === "dark" ? "#2d6470" : "#bce4ea") : passengerFill,
        fillOpacity: journey ? .15 : hierarchy.unknown ? .08 : hierarchy.level === 1 ? .45 : .76,
        className: markerClasses,
      }).addTo(layer);
      const curatedDetail = connected ? `${profile?.domesticDirect ?? 0} direkte Inlandsziele · ab ${selected?.name}: ca. ${formatDuration(estimateMinutes(connected.best, selected!.id, station.id))}` : `${profile?.domesticDirect ?? 0} direkte Inlandsziele`;
      const dbDetail = `${station.kind ?? "DB-Betriebsstelle"}${station.state ? ` · ${station.state}` : ""}${station.mergedCount ? ` · ${station.mergedCount} Betriebsstellen gebündelt` : ""}`;
      const permanentLabel = !journey && mapZoom >= (routeInfo ? 7 : 10) && highlightedStopIds.has(station.id);
      marker.bindTooltip(permanentLabel ? station.name : routeElement(station.name, `${passengers.label} · ${passengers.detail} · ${station.source === "db" ? dbDetail : curatedDetail}`), { direction:"top", offset:[0,-7], permanent:permanentLabel, className:permanentLabel ? "station-route-label" : "" });
      if (isMajorHub || station.hub || isSelected) marker.bringToFront();
      marker.on("click", () => {
        selectStation(station);
      });
      const element = marker.getElement();
      if (element) {
        element.setAttribute("tabindex", "0"); element.setAttribute("role", "button"); element.setAttribute("aria-label", `${station.name}: ${passengers.label}. Auswählen`);
        element.addEventListener("keydown", (event) => {
          const key = (event as KeyboardEvent).key;
          if (key === "Enter" || key === " ") marker.fire("click");
        });
      }
      if(performance.now()-started>=4)break;
    }
    if(cursor<visibleStations.length)frame=requestAnimationFrame(drawBatch);
    };
    drawBatch();
    };
    return ()=>{cancelled=true;cancelAnimationFrame(begin);if(frame!==null)cancelAnimationFrame(frame);};
  }, [connections, curatedAliases, curatedStates, extraStations, filteredRoutes, highlightedStopIds, journey, mapReady, mapViewportToken, mapZoom, minimalMode, overviewRoutesVisible, routeInfo, selected, selectedId, stationImportance, theme, leafletRef, mapRef, stationLayerRef, selectStation]);

  useLiveMap(mapReady,leafletRef,mapRef,liveLayerRef,visibleLiveTrips,liveVisible,
    {zoom:mapZoom,view:liveView,trails:showTrails,trackedId:trackedTripId,selectedId:selectedLiveTrip?.tripId??null,radarStatus:liveState,radarUpdatedAtMs:liveUpdatedAt?.getTime()??null,appearance:`${theme}:${highContrast}`},selectLiveTrip);

  // Camera follow is deliberate: map dragging stops tracking. The point is always
  // interpolated from rail geometry, never treated as a reported GPS location.
  useEffect(() => {
    if(!trackedTripId||!mapReady)return;
    const map=mapRef.current;if(!map)return;
    const stopOnDrag=()=>setTrackedTripId(null);
    map.on("dragstart",stopOnDrag);
    let first=true;
    const update=()=>{
      if(document.hidden)return;
      if(liveState!=="ready"||!liveUpdatedAt||Date.now()-liveUpdatedAt.getTime()>90_000)return;
      const trip=stationLiveTrips.find(candidate=>candidate.tripId===trackedTripId);
      if(!trip)return;
      const position=activeEstimatedPosition(trip,Date.now());
      if(!position)return;
      const zoom=Math.max(map.getZoom(),12);
      const shift=window.matchMedia("(max-width:1023px)").matches?Math.min(170,Math.round(map.getSize().y*.16)):0;
      // Keep the train in the uncovered upper part of the screen on mobile.
      const centre=map.unproject(map.project(position,zoom).add([0,shift]),zoom);
      if(first){map.flyTo(centre,zoom,{animate:!prefersReducedMotion(),duration:.65});first=false;}
      else map.panTo(centre,{animate:!prefersReducedMotion(),duration:.5});
    };
    update();const interval=window.setInterval(update,4000);
    return()=>{window.clearInterval(interval);map.off("dragstart",stopOnDrag);};
  },[trackedTripId,mapReady,stationLiveTrips,liveState,liveUpdatedAt,mapRef]);


  function startLocation(recenter=true) {
    if (!navigator.geolocation) {
      setGeoStatus("error");
      setGeoMessage("Standort ist in diesem Browser nicht verfügbar.");
      return;
    }
    if (geoWatchRef.current !== null) {
      if (geoPosition) mapRef.current?.flyTo([geoPosition.lat, geoPosition.lon], Math.max(mapRef.current.getZoom(), 14), { animate:!prefersReducedMotion(), duration:.45 });
      return;
    }
    firstGeoFixRef.current = recenter;
    setAutoLocation(true);
    setGeoStatus("locating");
    setGeoMessage("Standort wird ermittelt …");
    try { geoWatchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (!Number.isFinite(position.coords.latitude) || !Number.isFinite(position.coords.longitude)) return;
        const next = { lat:position.coords.latitude, lon:position.coords.longitude, accuracy:Math.max(0, Number.isFinite(position.coords.accuracy) ? position.coords.accuracy : 50), updatedAt:position.timestamp };
        setGeoPosition((current) => current && distanceMeters(current, next) < 8 && next.updatedAt - current.updatedAt < 12_000 ? current : next);
        setGeoStatus("active");
        setGeoMessage("");
        if (firstGeoFixRef.current) {
          firstGeoFixRef.current = false;
          mapRef.current?.flyTo([next.lat, next.lon], Math.max(mapRef.current.getZoom(), 14), { animate:!prefersReducedMotion(), duration:.55 });
        }
        const pendingTarget = pendingWalkTargetRef.current;
        if (pendingTarget) { pendingWalkTargetRef.current = null; void requestWalk(pendingTarget, next); }
      },
      (error) => {
        pendingWalkTargetRef.current = null;
        setGeoStatus("error");
        setGeoMessage(error.code === 1 ? "Standortfreigabe abgelehnt. Du kannst sie in den Browser-Einstellungen erlauben." : error.code === 2 ? "Standort derzeit nicht bestimmbar." : "Standortabfrage hat zu lange gedauert. Erneut versuchen.");
        setWalkStatus((current) => current === "loading" ? "error" : current);
        setWalkMessage(error.code === 1 ? "Standortfreigabe erforderlich." : "Standort derzeit nicht verfügbar.");
        if (geoWatchRef.current !== null) navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      },
      { enableHighAccuracy:true, maximumAge:10_000, timeout:15_000 },
    ); } catch {
      pendingWalkTargetRef.current = null;
      setGeoStatus("error");
      setGeoMessage("Standort ist hier nicht verfügbar. Öffne die App über HTTPS oder localhost.");
      setWalkStatus("error");
      setWalkMessage("Standortfreigabe nicht verfügbar.");
    }
  }

  function stopLocation() {
    setAutoLocation(false);
    if (geoWatchRef.current !== null) navigator.geolocation?.clearWatch(geoWatchRef.current);
    geoWatchRef.current = null;
    pendingWalkTargetRef.current = null;
    walkRequestRef.current?.abort();
    setGeoPosition(null);
    setGeoStatus("idle");
    setGeoMessage("");
    setWalkRoute(null);
    setWalkTargetId(null);
    setWalkStatus("idle");
  }

  const startGrantedLocation=useEffectEvent(()=>{if(geoWatchRef.current === null) startLocation(!geoPosition && !journey && !selected);});
  const clearGrantedLocation=useEffectEvent(()=>{const wasTracking=geoWatchRef.current!==null;if(wasTracking)navigator.geolocation.clearWatch(geoWatchRef.current!);geoWatchRef.current=null;setGeoPosition(null);setGeoStatus("idle");setGeoMessage(wasTracking ? "Standortfreigabe wurde im Browser entzogen." : "");});
  useEffect(()=>{
    if(!mapReady || !preferencesReady || !autoLocation || !navigator.permissions || !navigator.geolocation) return;
    let disposed=false;
    let permission:PermissionStatus|null=null;
    const check=async()=>{
      try {
        const result=await navigator.permissions.query({name:"geolocation"});
        if(disposed) return;
        permission=result;
        const update=()=>{if(!disposed && result.state==="granted") startGrantedLocation();else if(!disposed && result.state==="denied") clearGrantedLocation();};
        result.onchange=update;update();
      } catch { /* Unsupported permission queries keep the manual button available. */ }
    };
    void check();
    const resume=()=>{if(document.visibilityState==="visible") void check();else if(geoWatchRef.current!==null){navigator.geolocation.clearWatch(geoWatchRef.current);geoWatchRef.current=null;}};
    document.addEventListener("visibilitychange",resume);
    return ()=>{disposed=true;if(permission) permission.onchange=null;document.removeEventListener("visibilitychange",resume);};
  },[mapReady,preferencesReady,autoLocation]);

  function saveProfile(next:LocalProfile) {
    setProfile(next);
    try {localStorage.setItem("bahnconnections-profile",JSON.stringify(next));return true;} catch {return false;}
  }

  async function requestWalk(station: Station, origin = geoPosition) {
    if (!origin) { pendingWalkTargetRef.current = station; setWalkStatus("loading"); setWalkTargetId(station.id); setWalkMessage("Standortfreigabe abwarten …"); startLocation(); return; }
    walkRequestRef.current?.abort();
    const controller = new AbortController();
    walkRequestRef.current = controller;
    setWalkTargetId(station.id);
    setWalkRoute(null);
    setWalkStatus("loading");
    setWalkMessage("Fußweg auf Wegen und Straßen wird berechnet …");
    try {
      const response = await fetch("/api/walk", { method:"POST", headers:{ "Content-Type":"application/json" }, body:JSON.stringify({ from:{ lat:origin.lat, lon:origin.lon }, to:{ lat:station.lat, lon:station.lon } }), signal:controller.signal, cache:"no-store" });
      const payload = await response.json() as { route?: WalkingRoute; error?: string };
      if (controller.signal.aborted) return;
      if (!response.ok || !payload.route) throw new Error(payload.error ?? "Fußweg nicht verfügbar.");
      setWalkRoute(payload.route);
      setWalkStatus("ready");
      setWalkMessage("");
      const map = mapRef.current;
      const L = leafletRef.current;
      if (map && L) {
        const mobile = window.matchMedia("(max-width: 1023px)").matches;
        map.fitBounds(L.latLngBounds(payload.route.points), { paddingTopLeft:[30,90], paddingBottomRight:mobile ? [30,Math.min(map.getSize().y * .55, 210)] : [40,40], maxZoom:16, animate:!prefersReducedMotion() });
      }
      if (window.matchMedia("(max-width: 1023px)").matches) setMobileSheetState("collapsed");
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      setWalkStatus("error");
      setWalkMessage((error as Error).message || "Fußweg nicht verfügbar.");
    }
  }

  useEffect(() => {
    if (!walkTargetId || walkTargetId === selectedId) return;
    walkRequestRef.current?.abort();
    const timer = window.setTimeout(() => { setWalkRoute(null); setWalkTargetId(null); setWalkStatus("idle"); }, 0);
    return () => window.clearTimeout(timer);
  }, [selectedId, walkTargetId]);

  function showBoardTripOnMap(trip: BoardMapTrip) {
    plannerRequestRef.current?.abort(); setPlannerState("idle");
    setStationTrip(trip);
    setJourney(null);
    setSelectedLiveTrip(null);
    setTrackedTripId(null);
    if (mapRef.current && leafletRef.current && trip.points.length) {
      mapRef.current.fitBounds(leafletRef.current.latLngBounds(trip.points), { padding:[80,80], maxZoom:12 });
    }
  }


  async function shareStation(station:Station){
    // Station IDs are recognized from the public deep-link router; dynamic provider
    // IDs may not be available to a recipient until a fresh search.
    if(station.id.startsWith("motis:")){
      setStationShareStatus({id:station.id,message:"Dieser dynamische Bahnhof hat noch keinen dauerhaft teilbaren Link."});return;
    }
    const url=new URL("/",window.location.origin);
    url.searchParams.set("station",station.id);
    try{
      if(navigator.share){
       try{await navigator.share({title:station.name+" – BahnConnections",url:url.toString()});setStationShareStatus({id:station.id,message:"Bahnhof-Link geteilt."});return;}
       catch(error){if((error as Error)?.name==="AbortError")return;}
      }
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url.toString());setStationShareStatus({id:station.id,message:"Bahnhof-Link kopiert."});return;}
      setStationShareStatus({id:station.id,message:"Teilen auf diesem Gerät nicht verfügbar."});
    }catch{setStationShareStatus({id:station.id,message:"Bahnhof-Link konnte nicht geteilt werden."});}
  }

  function toggleFavorite(station: Station) {
    setFavoriteIds((current) => {
      const next = current.includes(station.id) ? current.filter((id) => id !== station.id) : [station.id, ...current].slice(0, 30);
      try { localStorage.setItem("bahnconnections-favorite-stations", JSON.stringify(next)); } catch { /* Favourites still work for this session. */ }
      return next;
    });
  }

  function toggleLiveCategory(category: LiveTrainCategory) {
    setLiveVisible(true);setLiveView("trains");
    setLiveCategories((current) => current.includes(category) ? current.filter((item) => item !== category) : [...current, category]);
  }

  function togglePlannerCategory(category: PlannerCategory) {
    invalidatePlanner();
    setPlannerCategories((current) => current.includes(category) ? (current.length === 1 ? current : current.filter((item) => item !== category)) : [...current, category]);
    setJourney(null);
    setJourneyMessage("");
  }

  async function runPlanner(override?:{start:Station;target:Station;departureIso:string}) {
    const start = override?.start ?? stationById.get(startId);
    const target = override?.target ?? stationById.get(targetId);
    if ((!startId || !targetId) && !override) {
      setJourney(null);
      setJourneyMessage("Bitte Start und Ziel aus der Trefferliste auswählen.");
      return;
    }
    if (start && target && start.id === target.id) {
      setJourney(null);
      setJourneyMessage("Start und Ziel sind identisch. Bitte ein anderes Ziel auswählen.");
      return;
    }
    if (!start || !target || (!journeyDeparture && !override?.departureIso)) {
      setJourney(null);
      setJourneyMessage("Bahnhof oder Abfahrtszeit fehlen. Bitte die Auswahl noch einmal prüfen.");
      return;
    }
    plannerRequestRef.current?.abort();
    const controller = new AbortController();
    plannerRequestRef.current = controller;
    const generation = ++plannerGenerationRef.current;
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
        departure:override?.departureIso??berlinLocalToIso(journeyDeparture),
        arriveBy:override?.departureIso?false:arriveBy,
        maxTransfers:maxChanges,
        minTransferMinutes:transferMinutes,
        categories:plannerCategories,
        wheelchair:wheelchairRouting,
        bike:bikeRequired,
        signal:controller.signal,
      });
      if (controller.signal.aborted || generation !== plannerGenerationRef.current) return;
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
      if (result) { setActiveView("connections"); setMobileSheetState(current => current === "expanded" ? "half" : current); }
    } catch (error) {
      if (controller.signal.aborted || generation !== plannerGenerationRef.current || (error as Error).name === "AbortError") return;
      setPlannerState("error");
      setJourneyMessage(error instanceof Error && error.message.trim() ? `Verbindungssuche fehlgeschlagen: ${error.message.slice(0,240)}. Bitte erneut versuchen.` : "Verbindungssuche derzeit nicht erreichbar. Bitte erneut versuchen.");
    }
  }

  function storeRoutes(next:SavedRoute[]) {
    setSavedRoutes(next);
    try {localStorage.setItem(SAVED_ROUTES_KEY,JSON.stringify(next));setRouteSaveMessage("Pendelstrecken auf diesem Gerät gespeichert.");}
    catch {setRouteSaveMessage("Nur für diese Sitzung gespeichert. Browser-Speicherung ist nicht verfügbar.");}
  }
  function saveCurrentRoute() {
    const from=stationById.get(startId),to=stationById.get(targetId);
    if(!from||!to||from.id===to.id)return;
    const next=saveRoute(savedRoutes,from,to);
    if(!next){setRouteSaveMessage("Du hast bereits 20 Pendelstrecken gespeichert. Entferne zuerst eine Strecke.");return;}
    storeRoutes(next);
  }
  function openSavedRoute(route:SavedRoute,reverse:boolean,searchNow=false) {
    plannerRequestRef.current?.abort(); setPlannerState("idle");
    const from=reverse?route.to:route.from,to=reverse?route.from:route.to;
    setLiveSearchStations(current=>[...current.filter(s=>s.id!==from.id&&s.id!==to.id),from,to]);
    setStartId(from.id);setStartSearch(stationDisplayName(from.name));setTargetId(to.id);setTargetSearch(stationDisplayName(to.name));
    setJourney(null);setJourneyOptions([]);setJourneyEndpoints(null);setStationTrip(null);
    setJourneyMessage("");setPlannerState("idle");setExploreOpen(true);
    setActiveView("connections");setMobileSheetState("expanded");
    if(searchNow){
      const next=commuterDepartureTime(Date.now());
      setJourneyDeparture(next.local);
      setArriveBy(false);
      // Pass explicit saved endpoints: state updates are asynchronous and may
      // otherwise accidentally search the previously selected pair.
      void runPlanner({start:from,target:to,departureIso:next.iso});
    }
  }

  function chooseJourney(option: LiveJourney) {
    setJourney(option);
    setExploreOpen(false);
    setStationTrip(null);
    setMobileSheetHeight(null);
    setMobileSheetState("half");
  }

  function showGermany() {
    if (mapRef.current && leafletRef.current) mapRef.current.fitBounds([[47.2,5.8],[55.1,15.2]], {padding:[24,24],animate:false});
  }

  useEffect(() => {
    if (!desktopWorkspace || !mapReady || journey) return;
    const frame = requestAnimationFrame(() => { mapRef.current?.invalidateSize({animate:false}); showGermany(); });
    return () => cancelAnimationFrame(frame);
    // Fit once when entering the desktop layout, not on station selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desktopWorkspace, mapReady]);

  function fitJourneyOnMap(option: LiveJourney, sheetState: MobileSheetState = mobileSheetState) {
    if (!mapRef.current || !leafletRef.current) return;
    const points = journeyPoints(option);
    if (!points.length) return;
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const mapHeight = mapElementRef.current?.clientHeight ?? window.innerHeight;
    const sheet = document.querySelector<HTMLElement>('.mobile-sheet-panel');
    const sheetRect = sheet?.getBoundingClientRect();
    const measuredHeight = sheetRect?.height ?? 0;
    const sideSheet = mobile && window.matchMedia("(min-width:700px) and (max-width:1023px) and (max-height:520px) and (orientation:landscape)").matches && sheetState !== "closed";
    // Landscape reserves the right half in CSS, so Leaflet already sees the usable map.
    const rightPadding = 28;
    const bottomPadding = !mobile ? 64 : sideSheet ? 28 : Math.min(Math.max(0, mapHeight - 140), (sheetState === "closed" ? 82 : measuredHeight || 100) + 16);
    mapRef.current.fitBounds(leafletRef.current.latLngBounds(points), mobile ? {
      paddingTopLeft:[28,28],
      animate:false,
      paddingBottomRight:[rightPadding,bottomPadding],
      maxZoom:12,
    } : { padding:[80,80], maxZoom:12, animate:false });
  }

  async function shareCurrentPlanner() {
    try {
      const url=buildPlannerLink(window.location.origin,{from:startId,to:targetId,departure:journeyDeparture,
        arriveBy,maxChanges,transferMinutes,wheelchair:wheelchairRouting,bike:bikeRequired,categories:plannerCategories});
      if(navigator.share){
        try {await navigator.share({title:"BahnConnections – Reiseplanung",url});setShareMessage("Link geteilt.");return;}
        catch(error){if((error as Error)?.name==="AbortError")return;}
      }
      if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(url);setShareMessage("Reiseplanungs-Link kopiert.");return;}
      setShareMessage(`Link: ${url}`);
    } catch {setShareMessage("Teilen nicht möglich. Bitte Start, Ziel und Zeitpunkt prüfen.");}
  }

  function resetMap() {
    plannerRequestRef.current?.abort(); walkRequestRef.current?.abort(); pendingWalkTargetRef.current = null;
    setPlannerState("idle"); setJourneyEndpoints(null); setJourneyOptionLimit(8);
    setJourneyDeparture(""); setArriveBy(false); setMaxChanges(5); setTransferMinutes(0);
    setWheelchairRouting(false); setBikeRequired(false);
    setPlannerCategories(["fern", "regional", "sbahn", "ubahn", "tram"]);
    setStartId("berlin"); setStartSearch("Berlin Hbf");
    setTargetId("muenchen"); setTargetSearch("München Hbf");
    setRouteSaveMessage(""); setShareMessage("");
    setMobileSheetHeight(null); setStationPanel("live"); setSidebarCollapsed(false);
    setActiveView("map");
    setViewMenuOpen(false); setLiveFiltersOpen(false); setMoreMenuOpen(false);
    setWalkRoute(null); setWalkTargetId(null); setWalkStatus("idle"); setWalkMessage("");
    setSelectedId(null); setSearch(""); setJourney(null); setJourneyOptions([]); setJourneyMessage(""); setRouteInfo(null);
    setRadarDirection("all");setTrackedRadarAnchor(null);
    setSelectedLiveTrip(null); setTrackedTripId(null); setExploreOpen(false); setStatsOpen(false); setBoardSummary(null); setStationTrip(null); setStationTrips([]); setStationLineSummary(null);
    setMobileSheetState("closed");
    mapRef.current?.setView([51.15, 10.35], 6, { animate:!prefersReducedMotion() });
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
  const departuresView = desktopWorkspace ? desktopView === "departures" : mobileView === "departures";
  const desktopSearchMode = desktopWorkspace && desktopView === "connections" && (!journey || exploreOpen);
  const desktopJourneyMode = desktopWorkspace && desktopView === "connections" && Boolean(journey) && !exploreOpen;
  const plannerVisible = !statsOpen && (exploreOpen || desktopSearchMode);
  const radarInsight=mapDataStatus(liveVisible,liveState,visibleLiveTrips.length,visibleLiveTrips.filter(trip=>trip.realTime).length);
  const activePrimaryPanel = plannerVisible ? "planner" : statsOpen ? "stats" : journey && !departuresView ? "journey" : selectedLiveTrip ? "trip" : selected && !sidebarCollapsed ? "station" : null;
  const primaryPanelOpen = Boolean(activePrimaryPanel);
  usePanelHistory(primaryPanelOpen,resetMap,preferencesReady);
  const mobileSheetTitle = activePrimaryPanel === "planner" ? "Verbindung planen" : activePrimaryPanel === "journey" ? "Verbindung" : activePrimaryPanel === "station" ? stationDisplayName(selected?.name) || "Bahnhof" : activePrimaryPanel === "trip" ? selectedLiveTrip?.name ?? "Zugdetails" : activePrimaryPanel === "stats" ? "Netzreport" : "Bahnhof";
  const mobileSheetSummary = journey && activePrimaryPanel === "journey"
    ? `${clock(journey.startTime)}–${clock(journey.endTime)} · ${journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "direkt"}`
    : activePrimaryPanel === "planner" ? `${startSearch || "Start"} → ${targetSearch || "Ziel"}`
    : activePrimaryPanel === "station" ? "Live-Tafel, Linien und Statistik"
    : activePrimaryPanel === "trip" ? `${selectedLiveTrip?.from.name ?? ""} → ${selectedLiveTrip?.to.name ?? ""}`
    : activePrimaryPanel === "stats" ? "Netz und Qualität" : "Karte";

  function navigate(view: DesktopView) {
    plannerRequestRef.current?.abort(); setPlannerState("idle");
    if(view === "settings") {setSettingsOpen(true);setMoreMenuOpen(false);return;}
    setActiveView(view); setViewMenuOpen(false); setLiveFiltersOpen(false); setMoreMenuOpen(false);
    setStatsOpen(view === "stats");

    setExploreOpen(view === "connections" && !journey);
    if (view === "map" && !desktopWorkspace) { setMobileSheetState("collapsed"); return; }
    setMobileSheetHeight(null);
    setMobileSheetState(view === "connections" && !journey && !desktopWorkspace ? "half" : view === "connections" && !journey ? "expanded" : "half");
    if (view === "departures") {
      setSelectedLiveTrip(null); setStationPanel("live"); setSidebarCollapsed(false);
      if (!selected) selectStation(allStations.find(station => station.id === startId) ?? allStations[0]);
    }
  }

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
    const shell = document.querySelector<HTMLElement>(".app-shell");
    const update = () => {
      const keyboard = Math.max(0, window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) - (window.visualViewport?.offsetTop ?? 0));
      if (shell) shell.dataset.keyboard = keyboard > 100 && document.activeElement?.matches('input,textarea,select') ? "open" : "closed";
      shell?.style.setProperty("--viewport-height", `${window.visualViewport?.height ?? window.innerHeight}px`);
      shell?.style.setProperty("--keyboard-inset", `${Math.max(0,window.innerHeight - (window.visualViewport?.height ?? window.innerHeight) - (window.visualViewport?.offsetTop ?? 0))}px`);
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
    <main className={`app-shell${desktopWorkspace ? " desktop-workspace" : ""}${desktopWorkspace && desktopView === "connections" ? " desktop-connections" : ""}${desktopSearchMode ? " desktop-search-mode" : ""}${desktopJourneyMode ? " desktop-journey-mode" : ""}${journey ? " has-journey" : ""}${boardOnly ? " board-only" : ""}${focusMode ? " focus-mode" : ""}${minimalMode ? " minimal-mode" : ""}${primaryPanelOpen ? " has-primary-panel" : ""}`} data-preferences-ready={preferencesReady} data-desktop-view={desktopView} data-mobile-sheet={mobileSheetState} data-primary-panel={activePrimaryPanel ?? "none"} style={mobileSheetHeight ? { "--mobile-sheet-height":`${mobileSheetHeight}px` } as CSSProperties : undefined}>
      {desktopWorkspace && primaryPanelOpen && !desktopSearchMode && <DesktopPanelResizer />}
      <header className="topbar">
        <button type="button" className="brand" onClick={resetMap} aria-label="BahnConnections Startansicht">
          <span className="brand-mark">B</span><span className="brand-name">BahnConnections</span><span className="beta">{APP_VERSION_LABEL}</span>
        </button>
        <DesktopNavigation value={desktopView} onChange={navigate} language={language} />
        <SmartSearch stations={allStations} value={search} onChange={setSearch} onSelect={selectStation} favoriteIds={favoriteIds} liveTransit />
        <div className="header-actions">
          <a className="install-app-link" href="/install" aria-label="BahnConnections als App installieren"><span className="install-icon" aria-hidden="true">↓</span><span className="install-label-long">App installieren</span><span className="install-label-short">App</span></a>
          <button ref={mobileViewTriggerRef} type="button" className={liveFiltersOpen ? "mobile-map-view-button active" : "mobile-map-view-button"} onClick={() => { setLiveFiltersOpen((value) => !value); setMoreMenuOpen(false); setViewMenuOpen(false); }} aria-expanded={liveFiltersOpen} aria-controls="map-view-menu" aria-label="Ansicht und Kartenoptionen"><UiIcon name="layers" /><span className="view-button-label">Ansicht</span></button>
          <button className="round-button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={theme === "light" ? "Dunkles Kartenthema" : "Helles Kartenthema"}><UiIcon name={theme === "light" ? "moon" : "sun"} /></button>
          <button type="button" className="round-button v60-shortcuts-trigger" onClick={()=>setShortcutsOpen(true)} aria-haspopup="dialog" aria-label="Tastaturhilfe und Schnellaktionen öffnen" title="Tastaturhilfe (?)">?</button>
          <button className="round-button settings-trigger" onClick={()=>{setSettingsInitialTab("profile");setSettingsOpen(true);}} aria-label="Profil und Einstellungen öffnen">{profile.avatarDataUrl ? <img className="header-avatar" src={profile.avatarDataUrl} alt=""/> : profile.initials ? <span>{profile.initials}</span> : <UiIcon name="user"/>}</button>
        </div>
      </header>

      {!desktopWorkspace && !primaryPanelOpen && !liveFiltersOpen && !moreMenuOpen && !settingsOpen && !helpOpen && (
        <div className="mobile-search-dock" aria-label="Schnellsuche">
          <SmartSearch stations={allStations} value={search} onChange={setSearch} onSelect={selectStation} favoriteIds={favoriteIds} placeholder="Bahnhof, Ort oder Kürzel" submitLabel="Anzeigen" liveTransit />
        </div>
      )}

      <section className="map-stage" aria-label="Interaktive Bahnkarte für Fernverkehr, Regio, S-Bahn, U-Bahn und Straßenbahn">
        {liveVisible && !primaryPanelOpen && !focusMode && !liveFiltersOpen && !moreMenuOpen && !helpOpen && <button type="button" className="v58-map-source" data-quality={radarInsight.tone} onClick={()=>setHelpOpen(true)} aria-label={`${radarInsight.label}. ${radarInsight.detail}. Datenquellen und Methodik öffnen`}><span className="v58-map-source-pulse" aria-hidden="true"/><span><strong>{radarInsight.label}</strong><small>{radarInsight.detail}</small></span><UiIcon name="info"/></button>}
        <div ref={mapElementRef} className="map-canvas" />
        {/* GPS location and walking directions now live inside route search and station information. */}

        {!focusMode && <>
          <div ref={liveToolbarRef} className="live-map-toolbar compact-toolbar" aria-label="Kartenwerkzeuge">
            <button type="button" className={liveFiltersOpen ? "map-menu-trigger active" : "map-menu-trigger"} onClick={() => { setLiveFiltersOpen((value) => !value); setViewMenuOpen(false); }} aria-expanded={liveFiltersOpen} aria-controls="map-view-menu"><UiIcon name="layers" />Ansicht</button>
            {desktopWorkspace && <button type="button" onClick={showGermany}>Deutschland</button>}
            <span className="sr-only" aria-live="polite">{!liveVisible ? "Live-Daten nicht aktiv" : liveState === "loading" ? "Live-Daten werden geladen" : liveState === "error" ? "Live-Daten nicht erreichbar" : liveState === "stale" ? "Radardaten veraltet" : !visibleLiveTrips.some(trip => trip.realTime) ? "Keine Echtzeitdaten" : `Live-Daten · ${visibleLiveTrips.length} Züge`}</span>
          </div>
          {liveVisible && (liveState === "stale" || liveState === "error") && <p className="radar-data-notice" role="status">{liveState === "stale" ? "Radar-Datenstand veraltet – Zugpositionen ausgeblendet" : "Radar derzeit nicht erreichbar"}</p>}
          {liveVisible && selected && !selectedLiveTrip && !plannerVisible && !journey && !settingsOpen && !liveFiltersOpen && !moreMenuOpen && mobileSheetState!=="expanded" && <div className="station-radar-scope" aria-label="Bahnhofsradar">
            <div><b>{stationDisplayName(selected.name)}</b><small role="status">{stationRadar.status==="loading"?"Halte werden geprüft …":stationRadar.status==="error"?"Bahnhofshalte nicht erreichbar":stationRadar.status==="stale"?"Aktualisierung fehlgeschlagen · keine aktuellen Kartenmarker":`${visibleLiveTrips.length} Züge auf der Karte · ${stationRadar.calls.size} Fahrten mit Halt im Zeitfenster${stationRadar.coverage==="partial"?" · Daten teilweise verfügbar":""}`}</small></div>
            <div className="radar-direction-control" role="group" aria-label="Fahrtrichtung am Bahnhof">{([["all",language==="en"?"Show all":"Alle"],["inbound",language==="en"?"Inbound":"Ankommend"],["outbound",language==="en"?"Outbound":"Abgehend"]] as const).map(([id,label])=><button type="button" key={id} aria-pressed={radarDirection===id} onClick={()=>setRadarDirection(id)}>{label}</button>)}</div>
            <RadarStationCalls key={selected.id} calls={stationRadar.calls} direction={radarDirection}/>
          </div>}
          {liveFiltersOpen && <button type="button" className="map-menu-backdrop" aria-label="Ansicht-Menü schließen" onClick={() => setLiveFiltersOpen(false)} />}
          {liveFiltersOpen && <div ref={mapMenuRef} className="live-filter-popover map-menu-popover detached map-filters-v57" id="map-view-menu" role="dialog" aria-label="Kartenfilter">
            <div className="map-menu-dismiss"><div><strong>{language==="en"?"Map filters":"Kartenansicht"}</strong><small>{liveVisible ? visibleLiveTrips.length+(language==="en"?" trains selected":" Züge in der Auswahl") : language==="en"?"Train radar off":"Zugradar deaktiviert"}</small></div><button type="button" className="map-filter-close" onClick={()=>setLiveFiltersOpen(false)} aria-label="Kartenfilter schließen"><UiIcon name="close"/></button></div>
            <label className="map-filter-master"><span><b>{language==="en"?"Show live trains":"Live-Züge anzeigen"}</b><small>{language==="en"?"Estimated positions · preview":"Geschätzte Positionen · Vorschau"}</small></span><input type="checkbox" checked={liveVisible} onChange={event=>{setLiveVisible(event.target.checked);if(event.target.checked)setLiveView("trains");}}/></label>
            <div className="map-filter-section"><div className="map-filter-label">{selected?stationDisplayName(selected.name):language==="en"?"Select a station first":"Zuerst einen Bahnhof auswählen"}</div><div className="radar-direction-control" role="group" aria-label="Fahrtrichtung am Bahnhof">{([["all",language==="en"?"Show all":"Alle"],["inbound",language==="en"?"Inbound":"Ankommend"],["outbound",language==="en"?"Outbound":"Abgehend"]] as const).map(([id,label])=><button type="button" key={id} aria-pressed={radarDirection===id} onClick={()=>setRadarDirection(id)}>{label}</button>)}</div><small className="radar-filter-hint">{language==="en"?"Only trains calling at this station. Positions are estimates.":"Nur Züge mit Halt an diesem Bahnhof. Positionen sind geschätzt."}</small></div>
            <div className="map-filter-section"><div className="map-filter-label">{language==="en"?"Train types":"Zugarten"}</div><div className="map-filter-grid">
              {([["fern","ICE / IC"],["regional","RE / RB"],["sbahn","S-Bahn"],["ubahn","U-Bahn"],["tram","Tram"]] as const).map(([id,label])=><button type="button" key={id} className={liveCategories.includes(id)?"active":""} aria-pressed={liveCategories.includes(id)} onClick={()=>toggleLiveCategory(id)}>{label}{liveCategories.includes(id)&&<UiIcon name="check"/>}</button>)}
            </div></div>
            <div className="map-filter-section"><div className="map-filter-label">{language==="en"?"Punctuality":"Pünktlichkeit"}</div><div className="map-filter-status" role="group" aria-label="Pünktlichkeit">
              {([["all",language==="en"?"All":"Alle"],["delayed",language==="en"?"Delayed":"Verspätet"],["ontime",language==="en"?"On time":"Pünktlich"]] as const).map(([id,label])=><button type="button" key={id} className={liveStatusFilter===id?"active":""} aria-pressed={liveStatusFilter===id} onClick={()=>{setLiveVisible(true);setLiveView("trains");setLiveStatusFilter(id);}}>{label}</button>)}
            </div></div>
            <div className="map-filter-footer"><button type="button" onClick={()=>{setLiveVisible(true);setLiveView("trains");setLiveCategories(["fern","regional","sbahn","ubahn","tram"]);setLiveStatusFilter("all");setRadarDirection("all");}}>{language==="en"?"Reset":"Zurücksetzen"}</button><button type="button" onClick={()=>setLiveFiltersOpen(false)}>{language==="en"?"Show map":"Karte anzeigen"} <UiIcon name="arrow"/></button></div>
          </div>}
          {moreMenuOpen && <button type="button" className="map-menu-backdrop" aria-label="Mehr-Menü schließen" onClick={() => setMoreMenuOpen(false)} />}
          {moreMenuOpen && <div className="simple-more-popover map-menu-popover detached" id="more-menu" role="dialog" aria-label="Mehr">
            <div className="map-menu-dismiss"><strong>Mehr</strong><button type="button" onClick={() => setMoreMenuOpen(false)} aria-label="Mehr schließen"><UiIcon name="close" /></button></div>
            
            <div className="simple-more-list">
              <button type="button" onClick={() => {setSettingsInitialTab("profile");setSettingsOpen(true);setMoreMenuOpen(false);}}><UiIcon name="user"/><span><b>Profil & Einstellungen</b><small>Darstellung, Standort und persönliche Daten</small></span><UiIcon name="arrow"/></button>
              <button type="button" onClick={() => {setSettingsInitialTab("about");setSettingsOpen(true);setMoreMenuOpen(false);}}><UiIcon name="layers"/><span><b>App & Updates</b><small>{appUpdate?`${appUpdate.label} verfügbar`:"Version, Changelog und Installation in Einstellungen"}</small></span><UiIcon name="arrow"/></button>
              <button type="button" onClick={() => {const station=selected??allStations.find(item=>item.id===startId)??allStations[0];if(station)selectStation(station);setStationPanel("disruptions");setActiveView("departures");setExploreOpen(false);setMoreMenuOpen(false);setMobileSheetState("expanded");}}><UiIcon name="alert"/><span><b>Störungen & Baustellen</b><small>Meldungen zum ausgewählten Bahnhof</small></span><UiIcon name="arrow"/></button>

              {recentStationIds.length>0 && <div className="v60-recent-stations" aria-label="Zuletzt geöffnete Bahnhöfe">
                <div><strong>Zuletzt geöffnet</strong><button type="button" onClick={()=>setRecentStationIds([])}>Verlauf löschen</button></div>
                {recentStationIds.map(id=>allStations.find(station=>station.id===id)).filter((station):station is Station=>Boolean(station)).map(station=><button type="button" key={station.id} onClick={()=>{selectStation(station);setMoreMenuOpen(false);}}><UiIcon name="clock"/><span>{stationDisplayName(station.name)}</span><UiIcon name="arrow"/></button>)}
              </div>}
              <button type="button" onClick={() => {setShortcutsOpen(true);setMoreMenuOpen(false);}}><UiIcon name="info"/><span><b>Tastenkürzel</b><small>Navigation, Suche und Kartenansicht</small></span><UiIcon name="arrow"/></button>
              <button type="button" onClick={() => { setHelpOpen(true); setMoreMenuOpen(false); }}><UiIcon name="info"/><span><b>Hilfe & Daten</b><small>Quellen, Datenschutz und Methodik</small></span><UiIcon name="arrow"/></button>
            </div>
            <small className="more-version">{APP_VERSION_LABEL}</small>
          </div>}
        </>}

        {plannerVisible && <PlannerPanel controls={exploreControls} sheetState={mobileSheetState} onSheetState={setMobileSheetState} onClose={resetMap} onScroll={markPanelScroll}
          returnLabel={journey ? `${clock(journey.startTime)}–${clock(journey.endTime)}` : undefined} onReturn={() => setExploreOpen(false)}
          nearbyLabel={nearestStation?.station.name} onNearby={() => { if(nearestStation){invalidatePlanner();setStartId(nearestStation.station.id);setStartSearch(stationDisplayName(nearestStation.station.name));} }}
          routes={savedRoutes} onSave={saveCurrentRoute} onOpenRoute={openSavedRoute} onRemoveRoute={id=>storeRoutes(savedRoutes.filter(route=>route.id!==id))}
          saveMessage={routeSaveMessage} message={journeyMessage} state={plannerState}
          search={{
            stations:plannerStations, favoriteIds, language,
            onUseLocation:()=>{if(nearestStation){invalidatePlanner();setStartId(nearestStation.station.id);setStartSearch(stationDisplayName(nearestStation.station.name));setPendingPlannerLocation(false);}else{setPendingPlannerLocation(true);startLocation(false);}},
            locationLabel:nearestStation?.station.name,locationLoading:pendingPlannerLocation,
            start:{ value:startSearch, onChange:(value) => { invalidatePlanner(); setStartSearch(value); setStartId(""); setJourneyMessage(""); setPlannerState("idle"); }, onSelect:(station) => { invalidatePlanner(); if (station.id.startsWith("motis:")) setLiveSearchStations(current => current.some(item => item.id === station.id) ? current : [...current, station]); setStartId(station.id); setStartSearch(stationDisplayName(station.name)); setJourneyMessage(""); setPlannerState("idle"); } },
            target:{ value:targetSearch, onChange:(value) => { invalidatePlanner(); setTargetSearch(value); setTargetId(""); setJourneyMessage(""); setPlannerState("idle"); }, onSelect:(station) => { invalidatePlanner(); if (station.id.startsWith("motis:")) setLiveSearchStations(current => current.some(item => item.id === station.id) ? current : [...current, station]); setTargetId(station.id); setTargetSearch(stationDisplayName(station.name)); setJourneyMessage(""); setPlannerState("idle"); } },
            departure:journeyDeparture, onDeparture:(value) => { invalidatePlanner(); setJourneyDeparture(value); },
            onNow:() => { invalidatePlanner(); setArriveBy(false); setJourneyDeparture(localDateTimeValue(new Date())); },
            onShare:()=>{void shareCurrentPlanner();}, shareMessage,
            onSwap:() => { invalidatePlanner(); setStartId(targetId); setStartSearch(targetSearch); setTargetId(startId); setTargetSearch(startSearch); setJourneyMessage(""); setPlannerState("idle"); },
            categories:plannerCategories, onCategory:togglePlannerCategory,
            options:{ arriveBy, maxChanges, transferMinutes, wheelchair:wheelchairRouting, bike:bikeRequired },
            onResetOptions:()=>{invalidatePlanner();setMaxChanges(5);setTransferMinutes(0);setWheelchairRouting(false);setBikeRequired(false);setPlannerCategories(["fern","regional","sbahn","ubahn","tram"]);},
            onOptions:(options) => { invalidatePlanner(); if (options.arriveBy !== undefined) setArriveBy(options.arriveBy); if (options.maxChanges !== undefined) setMaxChanges(options.maxChanges); if (options.transferMinutes !== undefined) setTransferMinutes(options.transferMinutes); if (options.wheelchair !== undefined) setWheelchairRouting(options.wheelchair); if (options.bike !== undefined) setBikeRequired(options.bike); },
            loading:plannerState === "loading", canSearch:Boolean(startId && targetId && startId !== targetId && journeyDeparture), onSearch:() => void runPlanner(), onDiscover:surpriseMe, onReset:resetMap,
          }}/>}

        {!statsOpen && !plannerVisible && (!journey || departuresView) && !selectedLiveTrip && selected && !sidebarCollapsed ? (
          <aside className={`station-card floating-panel mobile-sheet-panel station-right${stationPanel !== "live" ? " detail-width" : ""}`} style={stationControls.style} onScroll={markPanelScroll}>
            <PanelTools controls={stationControls} label="Bahnhof" onClose={resetMap} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileTitle={stationDisplayName(selected.name)} mobileSummary="" fullTitle={selected.name} subNavigation={<StationSubNavigation value={stationPanel} onChange={setStationPanel} />} />
            <div className="panel-body">
            <div className="station-context-bar"><button onClick={() => { setSelectedId(null); setBoardSummary(null); setStationLineSummary(null); setStationTrip(null); setStationTrips([]); }}>← Übersicht</button><span /><button onClick={() => { if (window.matchMedia("(max-width: 1023px)").matches) setMobileSheetState("collapsed"); else setSidebarCollapsed(true); }}>Einklappen →</button></div>
            <div id="station-panel-live" role="tabpanel" aria-labelledby="station-tab-live" hidden={stationPanel !== "live"}>
              <LiveBoard key={selected.id} station={selected} onSummary={handleBoardSummary} onMapTrip={showBoardTripOnMap} onRevealContent={revealStationContent} />
              <StationCallsBrowser key={`calls-${selected.id}`} stationName={stationDisplayName(selected.name)} open={stationCallsOpen} onToggle={()=>{if(!stationCallsOpen)revealStationContent();setStationCallsOpen(value=>!value);}} snapshot={stationRadar} />
            </div>
            <div id="station-panel-destinations" role="tabpanel" aria-labelledby="station-tab-destinations" hidden={stationPanel !== "destinations"}><StationLines key={selected.id} station={selected} onSummary={handleStationLineSummary} onMapTrip={showBoardTripOnMap} onMapTrips={handleStationTrips} /></div>
            {stationPanel === "disruptions" && <div id="station-panel-disruptions" role="tabpanel" aria-labelledby="station-tab-disruptions"><StationDisruptions key={selected.id} station={selected}/></div>}
            {stationPanel === "stats" && <div className="station-info" id="station-panel-stats" role="tabpanel" aria-labelledby="station-tab-stats">            <div className="station-card-head"><div><span className="eyebrow plain">Bahnhof</span><h2>{stationDisplayName(selected.name)}</h2><p>{selected.country === "DE" ? selected.state ?? "Deutschland" : selected.country}{selected.mergedCount ? ` · ${selected.mergedCount} Betriebsstellen gebündelt` : ""}</p></div><div className="station-card-actions"><span className={`station-health ${stationCondition(boardSummary,selected.id).tone}`}><i />{stationCondition(boardSummary,selected.id).label}</span><button className={favoriteIds.includes(selected.id) ? "favorite active" : "favorite"} onClick={() => toggleFavorite(selected)} aria-label={favoriteIds.includes(selected.id) ? "Bahnhof aus Favoriten entfernen" : "Bahnhof als Favorit speichern"}>★</button><button type="button" className="station-share" onClick={()=>void shareStation(selected)} aria-label={"Bahnhof "+selected.name+" teilen"} disabled={selected.id.startsWith("motis:")} title={selected.id.startsWith("motis:")?"Link für diesen Bahnhof nicht verfügbar":"Bahnhof-Link teilen"}><UiIcon name="copy"/> Teilen</button></div></div>{stationShareStatus?.id===selected.id&&<p className="station-share-message" role="status">{stationShareStatus.message}</p>}
            <div className="station-walk-action"><button type="button" onClick={() => void requestWalk(selected)} disabled={walkStatus==="loading"}><UiIcon name="location"/> {walkStatus==="loading"?"Fußweg wird berechnet …":"Fußweg ab meinem Standort"}</button>{walkTargetId===selected.id&&walkStatus==="ready"&&walkRoute&&<div className="station-walk-result" role="status"><b>{Math.ceil(walkRoute.durationSeconds/60)} Min. zu Fuß · {(walkRoute.distanceMeters/1000).toLocaleString("de-DE",{maximumFractionDigits:1})} km</b><small>Route auf der Karte markiert</small><details><summary>Wegbeschreibung</summary><ol>{walkRoute.steps.map((step,i)=><li key={i}>{step.instruction} · {step.distanceMeters} m</li>)}</ol></details><button type="button" onClick={()=>{setWalkRoute(null);setWalkTargetId(null);setWalkStatus("idle");}}>Route schließen</button></div>}{walkStatus==="error"&&walkMessage&&<small role="status">{walkMessage}</small>}</div>
            <div className="station-passengers"><strong>{stationPassengerInfo(selected).label}</strong><small>{stationPassengerInfo(selected).detail}</small>{stationPassengerInfo(selected).source && <a href={stationPassengerInfo(selected).source} target="_blank" rel="noreferrer">Quelle zum Fahrgastaufkommen</a>}</div><details className="station-technical"><summary>Bahnhofsdetails</summary><p>{selected.code ? `DS100 ${selected.code}` : "Kein DS100-Code"}{selected.eva ? ` · EVA ${selected.eva}` : ""}{selected.kind ? ` · ${selected.kind}` : ""}{selected.passengerBand ? ` · Reisende/Tag ${selected.passengerBand}` : ""}</p></details>

<StationStats station={selected} boardSummary={boardSummary} lineSummary={stationLineSummary} /></div>}
          </div>
          </aside>
        ) : null}
        {!statsOpen && !plannerVisible && !journey && !selectedLiveTrip && selected && sidebarCollapsed && <button className="sidebar-restore right" onClick={() => setSidebarCollapsed(false)}><span>{selected.name}</span><b>Live-Tafel öffnen</b></button>}

        <NetworkStats open={statsOpen} onClose={resetMap} stations={allStations} liveTrips={stationLiveTrips} selectedStation={selected} liveUpdatedAt={liveUpdatedAt} mobileSheetState={mobileSheetState} onMobileSheetState={setMobileSheetState} />

        {journey && !departuresView && !statsOpen && !plannerVisible && selectedJourneyStart && selectedJourneyTarget && (
          <section className="journey-card floating-panel mobile-sheet-panel" style={journeyControls.style} onScroll={markPanelScroll}>
            <PanelTools controls={journeyControls} label="Verbindung" onClose={resetMap} mobileState={mobileSheetState} onMobileStateChange={setMobileSheetState} mobileTitle={primaryJourneyLeg?.name ?? "Verbindung"} mobileSummary={`${stationDisplayName(selectedJourneyStart.name)} → ${stationDisplayName(selectedJourneyTarget.name)}`} />
            <div className="panel-body">
            <div className="journey-desktop-identity"><b>{primaryJourneyLeg?.name ?? "Verbindung"}</b><span>{stationDisplayName(selectedJourneyStart.name)} → {stationDisplayName(selectedJourneyTarget.name)}</span></div>
            <NetworkNotice/>
            {journey.warnings.some(message=>/umleitung|fahrweg|haltefolge|streckenf.hrung|baustellen/i.test(message)) &&
              <div className="journey-source-warnings" role="alert"><p><b>Streckenführung prüfen:</b> {journey.warnings.find(message=>/umleitung|fahrweg|haltefolge|streckenf.hrung|baustellen/i.test(message))}</p></div>}
            <div className="journey-mobile-overview">
              <div className="journey-mobile-route">
                <p className="journey-date-range">{journeyDateRange(journey)}</p>
                <JourneyTimeRange journey={journey} />
                <small>{formatDuration(Math.round(journey.durationSeconds / 60))} · {journey.transfers ? `${journey.transfers} Umstieg${journey.transfers > 1 ? "e" : ""}` : "Direkt"}</small>
                {journey.cancelled && <small className="journey-disruption" role="status">Ausfall · Fahrtabschnitte prüfen</small>}
              </div>
              <button type="button" onClick={() => { setExploreOpen(true); setMobileSheetState("expanded"); }} aria-label="Suche und Reiseoptionen ändern">Ändern</button>
            </div>
            <JourneyAlternatives journeys={journeyOptions} selected={journey} limit={journeyOptionLimit} label={journeyOptionLabel} onSelect={chooseJourney} onMore={() => setJourneyOptionLimit(value => value + 8)} />
            <JourneyExport key={journey.id} journey={journey}/>
            <div className="journey-legs live-legs">
              {journey.transitLegs.map((leg, index) => {
                return <article className={`live-journey-leg ${serviceClass(leg.category)}${journey.transitLegs.length === 1 ? " single-leg" : ""}`} key={`${leg.tripId ?? leg.name}-${index}`}>
                  <header><span className={`service-logo ${serviceClass(leg.category)}`} style={leg.category === "walk" ? undefined : serviceBadgeStyle(leg.category as PlannerCategory, leg.routeColor, leg.routeTextColor, leg.name, `${leg.operator ?? ""} ${leg.from.name} ${leg.to.name}`)}>{serviceBadgeLabel(leg.category, leg.name)}</span><span><b>{leg.name}</b>{leg.headsign ? <small>Richtung {stationDisplayName(leg.headsign)}</small> : null}</span>{leg.cancelled ? <span className="leg-live-state cancel">Ausfall</span> : null}</header>
                  <div className="leg-route-line"><span><b>{stationDisplayName(leg.from.name)}</b><RealtimeTime scheduled={leg.scheduledStartTime} actual={leg.startTime} realtime={leg.realtime} cancelled={leg.cancelled || leg.from.cancelled} cancellationLabel={leg.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /><small><RealtimePlatform scheduled={leg.from.scheduledTrack} actual={leg.from.track} /></small></span><i aria-hidden="true">→</i><span><b>{stationDisplayName(leg.to.name)}</b><RealtimeTime scheduled={leg.scheduledEndTime} actual={leg.endTime} realtime={leg.realtime} cancelled={leg.cancelled || leg.to.cancelled} cancellationLabel={leg.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact /><small><RealtimePlatform scheduled={leg.to.scheduledTrack} actual={leg.to.track} /></small></span></div>
                  <div className="leg-facts"><span>{leg.stops.length} Halte</span><span>{formatDuration(Math.round(leg.durationSeconds / 60))}</span></div>
                  {leg.alerts.length > 0 && <div className="journey-alerts">{leg.alerts.slice(0,2).map((alert,alertIndex) => <p key={`${alert.header}-${alertIndex}`}><b>Hinweis:</b> {alert.header}</p>)}</div>}
                  <ol className="model-stop-list live-stop-list">{leg.stops.map((stop,stopIndex) => {
                    const actual=stop.departure ?? stop.arrival;
                    const planned=stop.scheduledDeparture ?? stop.scheduledArrival;
                    return <li className={stop.cancelled || leg.cancelled ? "cancelled" : ""} key={`${stop.id ?? stop.name}-${stopIndex}`}>
                      <i aria-hidden="true" /><span className="stop-description"><b>{stationDisplayName(stop.name)}</b><small><RealtimePlatform scheduled={stop.scheduledTrack} actual={stop.track} /></small></span>
                      <RealtimeTime scheduled={planned} actual={actual} realtime={leg.realtime} cancelled={stop.cancelled || leg.cancelled} cancellationLabel={leg.cancelled ? "Fahrtabschnitt entfällt" : "Halt entfällt"} compact />
                    </li>;
                  })}</ol>
                  {index<journey.transitLegs.length-1 && <TransferNotice journey={journey} index={index} />}
                </article>;
              })}
            </div>
            {journey.legs.some((leg) => leg.category === "walk") && <p className="journey-walk-note">Fußwege am Start, Ziel oder beim Umstieg sind in der Gesamtdauer enthalten.</p>}
            {journeyQuality && journey.transfers > 0 && <div className={`transfer-quality ${journeyQuality.tone}`}><span><b>Umstieg {journeyQuality.label}</b><small>{journeyQuality.explanation}</small></span></div>}
            <details className="journey-secondary-info"><summary>Reiseinformationen</summary><p>{journey.sourceLabel}{journey.updatedAt ? ` · Stand ${new Date(journey.updatedAt).toLocaleTimeString("de-DE", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" })}` : ""}</p>{journey.transitLegs.map((leg,index) => <div key={index}><b>{leg.name}</b>{leg.operator && <p>{leg.operator}</p>}<p>{leg.realtime ? "Echtzeit für diesen Fahrtabschnitt verfügbar" : "Fahrplandaten für diesen Fahrtabschnitt"}</p><p>Belegung nicht verfügbar – für diesen Zug liegen keine bestätigten Auslastungsdaten vor.</p>{leg.wheelchairAccessible && <p>Barrierefreiheit: {leg.wheelchairAccessible === "ACCESSIBLE" ? "als zugänglich gemeldet" : "Angabe des Verkehrsunternehmens: " + leg.wheelchairAccessible}</p>}</div>)}</details>
            {journey.warnings.length > 0 && <div className="journey-source-warnings">{journey.warnings.map((warning, index) => <p key={`${warning}-${index}`}>{warning}</p>)}</div>}
          </div>
          </section>
        )}

        {trackedTripId && selectedLiveTrip && <TrainRadarHud trip={currentTrackedTrip??selectedLiveTrip} radarStatus={liveState} radarUpdatedAt={liveUpdatedAt} inRadar={Boolean(currentTrackedTrip)} onEnd={()=>{syncAndroidFollow(null);setTrackedTripId(null);}}/>}
        {selectedLiveTrip && !statsOpen && !exploreOpen && (
          <LiveTripInspector trip={selectedLiveTrip} stationName={selected?.name} onRoute={handleRadarRoute} onShowRoute={()=>{if(stationTrip?.points.length){setTrackedTripId(null);setTrackedRadarAnchor(null);mapRef.current?.fitBounds(stationTrip.points,{paddingTopLeft:[30,30],paddingBottomRight:[30,desktopWorkspace?30:Math.min(window.innerHeight*.55,500)],maxZoom:12,animate:!prefersReducedMotion()});setMobileSheetState("half");}}} controls={tripControls} mobileState={mobileSheetState} onMobileState={setMobileSheetState} onClose={resetMap} tracked={trackedTripId===selectedLiveTrip.tripId} onTrack={() => {const next=trackedTripId===selectedLiveTrip.tripId?null:selectedLiveTrip.tripId;setTrackedTripId(next);if(!next)syncAndroidFollow(null);if(next){setTrackedRadarAnchor(null);setMobileSheetState("half");}}} radarUpdatedAt={liveUpdatedAt} radarStatus={liveState} inRadar={liveVisible && stationLiveTrips.some(candidate=>candidate.tripId===selectedLiveTrip.tripId)}/>
        )}

        {!boardOnly && <details className="map-legend"><summary>Fahrgastaufkommen</summary><PassengerLegend /></details>}
        {primaryPanelOpen && mobileSheetState === "closed" && <button type="button" className="mobile-sheet-restore" onClick={() => setMobileSheetState("expanded")}><span><b>{mobileSheetTitle}</b><small>{mobileSheetSummary}</small></span><strong>Öffnen ↑</strong></button>}

      </section>

      <V60ShortcutHelp open={shortcutsOpen} onClose={closeShortcuts}/>
       {settingsOpen && <SettingsDialog initialTab={settingsInitialTab} savedRoutes={savedRoutes} onOpenRoute={(route,reverse)=>{openSavedRoute(route,reverse);setSettingsOpen(false);}} onRemoveRoute={id=>storeRoutes(savedRoutes.filter(route=>route.id!==id))} onClose={()=>setSettingsOpen(false)} profile={profile} onProfile={saveProfile} stations={plannerStations.slice().sort((a,b)=>a.name.localeCompare(b.name,"de"))} onHomeStation={station=>{selectStation(station);setActiveView("departures");setExploreOpen(false);}} favoriteCount={favoriteIds.length} theme={theme} onTheme={setTheme} language={language} onLanguage={setLanguage} highContrast={highContrast} onContrast={setHighContrast} fontScale={fontScale} onFontScale={setFontScale} reducedMotion={reducedMotion} onReducedMotion={setReducedMotion} autoLocation={autoLocation} onAutoLocation={value=>{if(value) setAutoLocation(true);else stopLocation();}} onRequestLocation={()=>startLocation()} locationStatus={geoMessage || (geoStatus==="active" ? "Standort aktiv" : geoStatus==="locating" ? "Standort wird ermittelt" : "Standort noch nicht freigegeben")} locationAccuracy={geoPosition?.accuracy} showTrails={showTrails} onShowTrails={setShowTrails} overviewRoutesVisible={overviewRoutesVisible} onOverviewRoutesVisible={value=>{setOverviewRoutesVisible(value);setStationTrip(null);setStationTrips([]);}} showRouteLabels={showRouteLabels} onShowRouteLabels={setShowRouteLabels}/>}
      {!boardOnly && <MobileNavigation value={mobileView} onChange={navigate} language={language} onMore={() => { setMoreMenuOpen((value) => !value); setLiveFiltersOpen(false); setViewMenuOpen(false); }} moreOpen={moreMenuOpen} />}

      {helpOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={() => setHelpOpen(false)}>
          <section className="source-modal" role="dialog" aria-modal="true" aria-labelledby="sources-title" onMouseDown={(event) => event.stopPropagation()}>
            <button className="modal-close" onClick={() => setHelpOpen(false)} aria-label="Schließen">×</button>
            <span className="eyebrow plain">DATEN & METHODIK</span>
            <h2 id="sources-title">So liest du die Karte</h2>
            <p>BahnConnections verbindet ein kuratiertes Fernverkehrsnetz für die Übersicht mit mehr als 5.000 Personenbahnhöfen, echter aktueller Verbindungssuche, Live-Bahnhofstafeln und einer gebündelten Live-Lage.</p>
            <ul><li><b>Entdecken</b> nutzt keinen Modellfahrplan mehr. Fernverkehr, Regionalzug und S-Bahn werden gemeinsam im aktuellen Transitous/MOTIS-Fahrplan gesucht. Halte, Gleise, Soll-/Ist-Zeiten, Ausfälle und die auf der Karte gezeigte Fahrtgeometrie stammen aus derselben Verbindung.</li><li><b>Streckenübersicht</b> zeigt weiterhin das kuratierte Fernliniennetz 2026. Sichtbar sind nur Abschnitte mit vorhandenen DB-Streckenpunkten. Fehlt zwischen zwei Abschnitten desselben Linienverlaufs die genaue Geometrie, erscheint bei plausiblen Abständen eine gestrichelte, ausdrücklich geschätzte Verbindung. Sie ist kein bestätigter Gleisverlauf. Bei größeren oder nicht zuordenbaren Lücken bleibt die Strecke offen, auch im Ausland. Ein Klick auf eine Linienbezeichnung öffnet die modellierte Linienübersicht. Eine konkret geplante Fahrt ersetzt diese Darstellung durch die gelieferte Fahrtgeometrie.</li><li><b>Bahnhofs-Bündelung</b> fasst nahe Betriebsstellen mit Zusätzen wie Ringbahn, Vorortbahn, S-Bahn, tief oder oben zu einem Bahnhof zusammen. In der Routen-Suche erscheinen nur als Personenbahnhof gekennzeichnete DB-Stationen; die allgemeine Kartensuche darf weiterhin betriebliche Punkte finden.</li><li><b>Punktgrößen</b> zeigen veröffentlichte Tageszahlen oder DB-Größenklassen des Fahrgastaufkommens. Zughalte und Direktziele beeinflussen die Größe nicht. Konkrete Tageszahlen stammen aus der DB-Erhebung 2024, veröffentlicht in Bundestagsdrucksache 21/2573. Zeitraum und Quelle stehen beim Bahnhof. Fehlende Daten werden als hohler Punkt dargestellt.</li><li><b>Netzreport</b> trennt DB-Jahreswerte 2025, live ausgewertete Zugsegmente und Kennzahlen aus dem Fahrplanmodell 2026. Umsteigeanteile beschreiben Bahnhofspaare, nicht tatsächliche Fahrgastströme.</li><li><b>Live-Lage</b> zeigt kleine Zug-Cluster statt großflächiger Abweichungskreise. Einzelne Zugnummern erscheinen erst ab Zoom 10 und dann nur im Tooltip; die Position ist interpoliert und kein Fahrzeug-GPS.</li><li><b>Live-Tafel</b> startet ruhig mit Fernverkehr und 240 Minuten. Sie zeigt bis zu 500 Minuten Soll-/Ist-Zeit, Verspätung, Ausfall und Gleis. Beim Aufklappen lädt sie den vollständigen Fahrtverlauf direkt in der App.</li><li><b>Echtzeit</b> wird pro Fahrt und Zugabschnitt sichtbar gekennzeichnet. Wo ein Verkehrsverbund keine Echtzeit liefert, zeigt die App ausdrücklich „Fahrplan“ statt eine vermeintlich genaue Live-Angabe.</li><li><b>Auslastung:</b> Ohne gemeldete Belegungsdaten wird keine Zugauslastung behauptet. Tageszeit und Zugart reichen nicht für eine verlässliche Prognose.</li><li><b>Tastatur</b>: S oder / Suche, L Live-Züge, F Kartenfilter, M Karte, P Planer, D Abfahrten, ? Tastaturhilfe, Esc Schließen. Browser-Shortcuts und Texteingaben haben Vorrang.</li></ul>
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
