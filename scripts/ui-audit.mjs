import { readFile } from "node:fs/promises";

const files = await Promise.all([
  readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/live-board.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/station-lines.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/manifest.ts", import.meta.url), "utf8"),
  readFile(new URL("../public/sw.js", import.meta.url), "utf8"),
  readFile(new URL("../app/trip-trimming.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/stations/search/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/stations/[id]/services/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/stations/[id]/board/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/trips/[source]/[id]/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/api/journeys/route.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/track-routing.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/live-journey.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/install/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/install/install-client.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/transitous.ts", import.meta.url), "utf8"),
  readFile(new URL("../app/panel-tools.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/pulse/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/passport/page.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/journey-assistant.tsx", import.meta.url), "utf8"),
  readFile(new URL("../app/api/ai/route.ts", import.meta.url), "utf8"),
]);
const [css, page, board, stationLines, manifest, worker, tripTrimming, ...remainder] = files;
const apiRoutes = remainder.slice(0, 5);
const [trackRouting, liveJourney] = remainder.slice(5);
const [installPage, installClient, transitous] = remainder.slice(7);
const panelTools = files[17];
const pulsePage = files[18];
const passportPage = files[19];
const journeyAssistant = files[20];
const aiRoute = files[21];
const checks = [];

function check(name, condition, detail) {
  checks.push({ name, ok:Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? `: ${detail}` : ""}`);
}

check("Feste rechte Detailspalte", css.includes("--detail-rail:min(470px,42vw)") && css.includes(".has-primary-panel .map-stage { padding-right:var(--detail-rail); }") && !page.includes("setSidebarSide"));
check("Alle Primärpanels teilen dieselbe Spalte", css.includes(".explore-card,.station-card,.journey-card,.live-trip-card,.network-lab,.stats-panel"));
check("Mobiles Bottom-Sheet", css.includes("border-radius:18px 18px 0 0!important") && css.includes("env(safe-area-inset-bottom)"));
check("Mobiler Planer bleibt sichtbar", css.includes(".filter-drawer,.route-options { display:block!important; }"));
check("Ansicht-Touchziel mindestens 44px", css.includes(".mobile-map-view-button { display:inline-flex; min-width:86px; min-height:44px") && page.includes("mobileViewTriggerRef"));
check("Ansicht-Menü über Kartenebenen", css.includes("z-index:2400!important") && css.includes("max-height:calc(100dvh - var(--app-header)"));
check("Mobile Installationsverlinkung bleibt sichtbar", page.includes("install-label-short") && css.includes(".install-app-link { display:inline-flex!important; min-height:44px"));
check("Reduzierte Bewegung unterstützt", css.includes("@media (prefers-reduced-motion:reduce)"));
check("Ruhige DB-nahe Kopfzeile", css.includes(".topbar { color:var(--ink); border-bottom:1px") && css.includes("background:color-mix(in srgb,var(--paper) 98%"));
check("Planer bis fünf Umstiege", page.includes('value="5">Automatisch bis 5') && page.includes("setMaxChanges") && page.includes("minTransferMinutes:transferMinutes"));
check("Alternativrouten sind benannt", ["Schnellste", "Wenig Umstiege", "Robuster Umstieg", "Spätere Abfahrt"].every((label) => page.includes(label)));
check("Alle vier Bahnarten im Planer", ["fern", "regional", "sbahn", "ubahn"].every((mode) => page.includes(`togglePlannerCategory("${mode}")`)));
check("Live-Tafel paginiert statt hart abzuschneiden", board.includes("displayLimit") && board.includes("Weitere 50 Fahrten anzeigen") && !board.includes("slice(0, 8)"));
check("Linien laden kontrolliert auf Karte", stationLines.includes("inBatches") && stationLines.includes("Alle gefilterten Linien auf Karte") && !stationLines.includes("slice(0, 12)"));
check("Ringlinien zeigen genau den gewählten Umlauf", tripTrimming.includes("trimRepeatedStationLoop") && board.includes("trimRepeatedStationLoop(stops, points, station, referenceTime)") && stationLines.includes("trimRepeatedStationLoop(stops, points, station, sample.time)"));
check("Keine erfundenen Luftlinien", trackRouting.includes("segments: [number, number][][]") && trackRouting.includes("points:[], segments:[], coverage:0") && !trackRouting.includes("[[from.lat, from.lon], [to.lat, to.lon]]") && !liveJourney.includes("[[from.lat, from.lon], [to.lat, to.lon]]"));
check("Getrennte Geometriesegmente werden getrennt gezeichnet", page.includes("for (const segment of exactTripSegments(stationTrip))") && page.includes("for (const points of segments)"));
check("Liniennummern erscheinen nur einmal", board.includes("{brand.number ? <b>{brand.number}</b> : null}") && !board.includes("brand.number || entry.line?.name"));
check("Nur exakte Haltestellen-IDs", transitous.includes("requireTransitousStopId") && !transitous.includes('searchParams.set("center"') && !transitous.includes('searchParams.set("radius"') && !board.includes("api.transitous.org/api/v6/stoptimes") && !stationLines.includes("api.transitous.org/api/v6/stoptimes"));
check("Normalisierte interne Fahrplan-APIs", apiRoutes.length === 5 && apiRoutes.every((source) => ["source", "updatedAt", "realtimeStatus", "warnings"].every((field) => source.includes(field))));
check("Installierte PWA startet in Pulse", manifest.includes('start_url:"/pulse?source=pwa"') && manifest.includes('id:"/pulse"') && manifest.includes('display:"standalone"'));
check("PWA nutzt installierbare PNG-Icons", manifest.includes("/app-icon-192.png") && manifest.includes("/app-icon-512.png") && manifest.includes("/app-icon-maskable-512.png"));
check("Native Mobile-Navigation umgeht RSC-Linkfehler", !installPage.includes('from "next/link"') && installPage.includes('href="/"') && installClient.includes('href="/?source=pwa"') && page.includes('href="/install"'));
check("Mobiler Kopf trennt Suche und Aktionen", css.includes(".topbar>.station-search { grid-column:1/-1; grid-row:2") && css.includes(".topbar>.header-actions { position:static"));
check("Mobile Kartenhilfen überdecken keine Panels", css.includes(".quick-map-actions,.map-legend { display:none!important;") && css.includes('[data-primary-panel="journey"] .quick-map-actions') && css.includes("bottom:calc(var(--mobile-sheet-visible-height) + 14px)"));
check("Mobile Tafelaktionen besitzen 44px Touchflächen", css.includes(".board-actions button { min-width:44px; }"));
check("Schmale Displays behalten den Schließen-Knopf", css.includes(".panel-drag-label { width:14px; flex:0 0 14px") && css.includes(".panel-tools>div { margin-left:auto; }"));
check("Mobiles Panel besitzt drei unabhängige Zustände", panelTools.includes('"expanded" | "collapsed" | "closed"') && page.includes("mobileSheetState") && css.includes('[data-mobile-sheet="collapsed"] .mobile-sheet-panel') && css.includes('[data-mobile-sheet="closed"] .mobile-sheet-panel'));
check("Minimieren bewahrt die Verbindung", page.includes('onMobileStateChange={setMobileSheetState}') && page.includes('mobileSheetState === "closed"') && page.includes("mobile-sheet-restore") && page.includes("Suche und Optionen ändern") && page.includes("Zur ausgewählten Verbindung"));
check("Ausgewählte Fahrt behält eigene Endpunkte", page.includes("journeyEndpoints") && page.includes("selectedJourneyStart") && page.includes("selectedJourneyTarget"));
check("Bottom-Sheet lässt sich stufenlos ziehen", panelTools.includes("setPointerCapture") && panelTools.includes("startHeight - rawDelta") && css.includes("var(--mobile-sheet-height"));
check("Schließen-Knopf ist von der Ziehfläche getrennt", panelTools.includes('event.stopPropagation(); onMobileStateChange("closed")') && css.includes(".mobile-sheet-actions button:last-child { position:relative; z-index:6"));
check("Kompakter mobiler Reiseüberblick", page.includes("journey-mobile-overview") && page.includes("journey-mobile-facts") && page.includes("journey-mobile-data"));
check("Mobile Halte sind alltagstauglich lesbar", css.includes(".model-stop-list.live-stop-list li>span b { font-size:14px") && css.includes(".model-stop-list.live-stop-list time { font-size:14px"));
check("Mobile Kopfaktionen sind kompakte Touchziele", page.includes("install-icon") && page.includes("view-button-icon") && css.includes("width:42px") && css.includes("min-height:42px!important"));
check("Mobile Hoch- und Querformatregeln", css.includes("(orientation:landscape) and (max-height:520px)") && css.includes("100dvh") && css.includes("env(safe-area-inset-bottom)"));
check("Lange Namen bleiben im Sheet stabil", css.includes(".mobile-sheet-summary b,.mobile-sheet-summary small") && css.includes("text-overflow:ellipsis") && css.includes("-webkit-line-clamp:2"));
check("Bahnhofstafel wird unabhängig gegengeprüft", apiRoutes[2].includes("DB transport.rest") && apiRoutes[2].includes("compareBoardRows") && board.includes("Transitous · DB-geprüft") && board.includes("Quellenabweichung"));
check("Service Worker aktualisiert Navigation", worker.includes("navigationPreload") && worker.includes("cache.put(event.request") && worker.includes("bahnconnections-static-v32"));
check("Anmeldung wird nie als offline abgefangen", worker.includes('"/signin-with-chatgpt"') && worker.includes("isAuthenticationRequest(url)") && !worker.includes('redirect:"follow"'));
check("Atlas übergibt Reisen an Pulse", page.includes("<LiveRideMode journey={journey} />") && page.includes("<JourneyAssistant journey={journey} />") && pulsePage.includes("readActiveJourney") && pulsePage.includes("LiveRideMode"));
check("Passport archiviert beendete Reisen", passportPage.includes("readJourneyHistory") && passportPage.includes("journeyDistanceKm") && passportPage.includes("Deine Fahrten"));
check("KI bleibt serverseitig und datenbegrenzt", journeyAssistant.includes("/api/ai/route") && aiRoute.includes("OPENAI_API_KEY") && aiRoute.includes("OPENAI_MODEL") && aiRoute.includes("Erfinde niemals"));

console.log(JSON.stringify({ checkedAt:new Date().toISOString(), checks }, null, 2));
