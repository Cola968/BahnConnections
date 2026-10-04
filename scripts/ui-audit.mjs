import assert from "node:assert/strict";
import { stationMarkerHierarchy } from "../app/station-marker.ts";
import { readFile } from "node:fs/promises";

const read = name => readFile(new URL("../"+name,import.meta.url),"utf8");
const [page,board,stationLines,manifest,worker,tripTrimming,trackRouting,liveJourney,transitous,panelTools,planner,navigation,alternatives,installPage,installClient,desktop,...styles] = await Promise.all([
  "app/page.tsx","app/live-board.tsx","app/station-lines.tsx","app/manifest.ts","public/sw.js","app/trip-trimming.ts","app/track-routing.ts","app/live-journey.ts","app/transitous.ts","app/panel-tools.tsx","app/journey-search.tsx","app/desktop-navigation.tsx","app/journey-alternatives.tsx","app/install/page.tsx","app/install/install-client.tsx","app/desktop-workspace.css",
  "app/styles/tokens.css","app/styles/controls.css","app/styles/workspace.css","app/styles/transport.css","app/styles/liquid-glass.css",
].map(read));
const website = await read("app/website/page.tsx");
const websiteCss = await read("app/website/website.module.css");
const css = styles.join("\n");
const apis = await Promise.all(["stations/search","stations/[id]/services","stations/[id]/board","trips/[source]/[id]","journeys"].map(route=>read("app/api/"+route+"/route.ts")));
const checks = [];
function check(name,condition) { checks.push({name,ok:Boolean(condition)}); }

check("Shared design tokens and native system font",css.includes("--space-4:16px") && css.includes("-apple-system") && css.includes('html[data-theme="dark"]'));
check("Deep Liquid Glass is optical, functional and accessible",css.includes("--glass-clear:") && css.includes("--glass-regular:") && css.includes("--glass-filter-ultra:") && css.includes("linear-gradient(") && css.includes("radial-gradient(") && css.includes("backdrop-filter:var(--glass-filter") && css.includes("@media (prefers-reduced-transparency:reduce)") && css.includes("@media (forced-colors:active)") && css.includes("@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px)))") && !/Georgia/.test(css+desktop));
check("Search mode: planner and map; journey mode: map and inspector",desktop.includes("padding-left:calc(var(--workspace-left) + 28px);") && desktop.includes("padding-right:12px;") && desktop.includes(".desktop-workspace.desktop-journey-mode .map-stage") && desktop.includes("padding-left:14px;") && page.includes('(!journey || exploreOpen)') && page.includes('Boolean(journey) && !exploreOpen'));
check("Planner and inspector have mutually exclusive render guards",page.includes('{plannerVisible && <aside') && page.includes('journey && !departuresView && !statsOpen && !plannerVisible') && !page.includes('<DesktopWelcome'));
check("Search editing preserves the selected journey",page.includes('{journey && <button type="button" className="planner-return"') && page.includes('setExploreOpen(false);'));
check("General station markers recede behind the selected journey",page.includes('const markerRadius = journey ? Math.min(3.2') && page.includes('fillOpacity: journey ? .15') && page.includes('routeLayer as import("leaflet").Path'));
check("Station-trip realtime summary stays conservative",page.includes('function tripRealtimeLabel') && page.includes('"Echtzeit teilweise verfügbar"') && !page.includes('stationTrip.realtime ? "Echtzeitfahrt"'));
const realtime = await read("app/realtime-presentation.ts");
const realtimeTime = await read("app/realtime-time.tsx");
const realtimePlatform = await read("app/realtime-platform.tsx");
const pwaRegister = await read("app/pwa-register.tsx");
const appVersion = await read("app/app-version.ts");
const versionMetadata = await read("public/version.json");
check("Pure shared realtime thresholds and unknown status",realtime.includes('delayMinutes <= 5') && realtime.includes('delayMinutes < 10') && realtime.includes('if (!scheduled || !actual) return base') && !realtime.includes('fetch('));
check("Journey and board use the same time and platform components",[page,board].every(source => source.includes('<RealtimeTime') && source.includes('<RealtimePlatform')));
check("Delay semantics include text, struck-through schedule and accessible labels",realtimeTime.includes('<del className="realtime-time__planned">') && realtimeTime.includes('realtimeStatusLabel(state)') && realtimeTime.includes('<span className="sr-only">{accessibleLabel}</span>') && !realtimeTime.includes('role="img"') && realtimePlatform.includes('<span className="sr-only">{state.label}</span>') && !realtimePlatform.includes('role="img"'));
check("No redundant Soll block in stop lists",!page.includes('className="planned-time"') && !board.includes('Soll {time(planned)}'));
check("Brand, route and disruption colours stay separate",css.includes('--route-focus:var(--accent)') && css.includes('--status-disruption:var(--danger)'));
// A transport hub must not acquire fictional passenger volume.
for(const band of [undefined,"< 100","100 - 1.000","> 1.000"]) {
  const ordinary=stationMarkerHierarchy({passengerBand:band});
  const hub=stationMarkerHierarchy({majorHub:true,hub:true,passengerBand:band,dailyStops:500,directConnections:100});
  assert.equal(ordinary.radius,hub.radius);
}
assert.equal(stationMarkerHierarchy({dailyStops:500,directConnections:100}).unknown,true);
assert.equal(stationMarkerHierarchy({dailyPassengers:NaN}).unknown,true);
assert.equal(stationMarkerHierarchy({dailyPassengers:-1}).unknown,true);
assert.equal(stationMarkerHierarchy({dailyPassengers:Infinity}).unknown,true);
const smaller=stationMarkerHierarchy({dailyPassengers:50_000});
const larger=stationMarkerHierarchy({dailyPassengers:200_000});
assert.ok(Math.abs(larger.radius/smaller.radius-2)<1e-9,"Four times the passengers must yield four times the circle area");
assert.ok(stationMarkerHierarchy({passengerBand:"> 1.000"}).radius>stationMarkerHierarchy({passengerBand:"100 - 1.000"}).radius);
check("Passenger volume controls size with explicit unknown data",page.includes('dailyPassengers:passengers.daily') && page.includes('hierarchy.unknown') && page.includes('passengers.detail') && !page.includes('<NetworkLab'));
check("Five distinct glass roles and sheet states keep flat content",["clear","regular","elevated","sheet-expanded","navigation"].every(role=>css.includes("--glass-"+role+":")) && css.includes('[data-mobile-sheet="half"] .mobile-sheet-panel') && css.includes('[data-mobile-sheet="expanded"] .mobile-sheet-panel') && css.includes("background:transparent") && css.includes("backdrop-filter:var(--glass-filter-strong)"));
check("High contrast overrides dark glass after theme calibration",css.lastIndexOf('html[data-contrast="high"],html[data-theme="dark"][data-contrast="high"]') > css.indexOf('html[data-theme="dark"] {'));
check("Journey has one identity and accessible secondary information",page.includes('single-leg') && css.includes('.live-journey-leg.single-leg>header,.live-journey-leg.single-leg>.leg-route-line { display:none; }') && page.includes('<details className="journey-secondary-info">') && page.includes('journey.sourceLabel'));
check("Normal board times are quiet; early arrivals are explicitly green",!board.includes('cancellationLabel={entry.cancellationScope === "stop" ? "Halt entfällt" : "Fahrt entfällt"} showStatus') && realtimeTime.includes('accessibleLabel') && css.includes('--status-on-time:var(--ink)') && css.includes('--status-early:var(--success)') && css.includes('.realtime-time--early'));
check("Live layer status is not exposed as mobile chrome",!page.includes('Live-Ebene aus') && page.includes('Live-Daten nicht aktiv') && page.includes('Keine Echtzeitdaten'));
check("Dark map keeps real OSM geometry with neutral low-luminance treatment",css.includes("invert(.90) hue-rotate(180deg) brightness(.70)") && css.includes("--paper:#141618") && page.includes("https://tile.openstreetmap.org/{z}/{x}/{y}.png"));
check("Alternative journeys avoid redundant realtime prose",!alternatives.includes('" · mit Echtzeit"') && !alternatives.includes('" · Fahrplan"'));
check("V40 primary journey removes duplicated mobile prose",!page.includes('journey-quick-facts') && !page.includes('<details className="journey-mobile-data"') && !page.includes('Betreiber nicht gemeldet') && !page.includes('journey-data-note'));
check("V40 mobile station first layer is reduced",(page.includes('mobileTitle={selected.name} mobileSummary=""') || page.includes('mobileTitle={stationDisplayName(selected.name)} mobileSummary=""')) && page.includes('> Tafel</button>') && page.includes('>Info</button>') && css.includes(".station-line-kpis") && css.includes("display:none!important"));
check("Live board hides aggregate and duplicate status noise",!board.includes('{visibleEntries.length} Fahrten') && !board.includes('{boardStats.realtime} mit Echtzeit') && !board.includes('Bis 500 Min.') && !board.includes("statusText(entry)") && board.includes('!entry.canceled && entry.alerts?.length ? <small>Betriebshinweis</small> : null'));
check("Tablet, phone and desktop ownership agree",page.includes('(min-width: 1024px)') && css.includes("(max-width:1023px)"));
check("Mobile bottom navigation stays above safe area",css.includes("--bottom-navigation:calc(60px + env(safe-area-inset-bottom") && navigation.includes("MobileNavigation"));
check("V49 mobile More stays limited to four core actions",page.includes('className="simple-more-popover map-menu-popover detached"') && ["Einstellungen","Netzreport","App & Updates","Hilfe & Daten"].every(label=>page.includes(label)) && !page.includes("map-menu-actions") && page.includes("Weitere Kartenoptionen"));
check("V45 board uses compact public station names without redundant via/status rows",board.includes("compactStationLabel") && !board.includes('<span className="board-via">') && !board.includes("statusText(entry)"));
check("Standalone website is professional, transparent and service-first",
  website.includes('APP_VERSION_LABEL') &&
  website.includes('Zum Inhalt springen') &&
  website.includes('application/ld+json') &&
  website.includes('Aktuell unabhängig') &&
  website.includes('keine offizielle Anwendung der Deutschen Bahn AG') &&
  website.includes('https://transitous.org/') &&
  website.includes('https://transport.rest/') &&
  website.includes('https://www.openstreetmap.org/') &&
  websiteCss.includes('position:sticky') &&
  websiteCss.includes(':focus-visible') &&
  !/heroGlow|featureGrid|abstractMap|radial-gradient|linear-gradient|backdrop-filter/.test(website + websiteCss)
);
check("Mobile search floats above the map while landscape keeps inline search",css.includes(".topbar>.station-search {") && css.includes("position:absolute;") && css.includes("top:calc(100% + 8px)") && css.includes("@media (max-width:1023px) and (max-height:520px)"));
check("Single sheet with independent presentation state",panelTools.includes('"expanded" | "collapsed" | "closed" | "half"') && css.includes('[data-mobile-sheet="closed"] .mobile-sheet-panel') && css.includes('[data-mobile-sheet="collapsed"] .mobile-sheet-panel'));
check("Free drag keeps the chosen height",panelTools.includes("setPointerCapture") && panelTools.includes("startHeight - rawDelta") && panelTools.includes("announceSheetHeight(drag.lastHeight)") && css.includes("var(--mobile-sheet-height"));
check("Drag limits exclude navigation and virtual keyboard",panelTools.includes("navigationHeight") && panelTools.includes("window.visualViewport?.height"));
check("Close and collapse are separate real buttons",panelTools.includes('if (onClose) onClose(); else onMobileStateChange("closed")') && css.includes(".mobile-sheet-actions button"));
check("Close resets selections and pending work",page.includes("onClose={resetMap}") && page.includes("pendingWalkTargetRef.current = null") && page.includes("setJourneyEndpoints(null)") && page.includes("plannerRequestRef.current?.abort()"));
check("Navigation preserves journey data",page.includes("!journey || departuresView") && page.includes('journey && !departuresView'));
check("Resize observer accounts for the measured sheet",page.includes("new ResizeObserver") && page.includes("measuredHeight") && page.includes("invalidateSize"));
check("44px mobile actions and scalable 16px input prevent iOS zoom",css.includes("width:44px; height:44px") && css.includes(".station-search input { font-size:calc(1rem * var(--panel-scale,1))"));
check("Reduced motion is supported",css.includes("@media (prefers-reduced-motion:reduce)") && css.includes("--motion-native:cubic-bezier(.22,1,.36,1)"));
check("Planner is a controlled extracted view",page.includes("<JourneySearch") && planner.includes("type StationField") && planner.includes("onOptions"));
check("Travel options collapsed by default",planner.includes('<details className="filter-drawer route-options">') && !planner.includes('route-options" open') && planner.includes('className="planner-time-row"'));
check("All five modes and five transfers retained",["fern","regional","sbahn","ubahn","tram"].every(mode=>planner.includes("'"+mode+"'")) && planner.includes("[0,1,2,3,4,5]"));
check("Autocomplete has active descendant and Escape handling",(await read("app/smart-search.tsx")).includes("aria-activedescendant"));
check("Alternative selection and pagination retained",alternatives.includes("onSelect(journey)") && alternatives.includes("alternatives.slice(0,limit)") && alternatives.includes("onMore"));
check("Transfer displays concrete times, platforms and walks",alternatives.includes("previous.to.track") && alternatives.includes("next.from.track") && alternatives.includes("Fußweg enthalten") && !page.includes("{journeyQuality.score}"));
check("Live board is paginated",board.includes("displayLimit") && board.includes("Weitere 50 Fahrten anzeigen"));
check("Destination has a visible dedicated grid column",css.includes(".board-row-summary .board-destination { grid-column:3") && css.includes("minmax(0,1fr)"));
check("Line map loading is batched",stationLines.includes("inBatches") && stationLines.includes("void loadMapLines()") && !stationLines.includes("station-line-filters"));
check("Ring lines retain the selected loop",tripTrimming.includes("trimRepeatedStationLoop") && board.includes("trimRepeatedStationLoop(stops, points, station, referenceTime)") && stationLines.includes("trimRepeatedStationLoop(stops, points, station, sample.time)"));
check("No invented straight rail geometry",trackRouting.includes("points:[], segments:[], coverage:0") && !trackRouting.includes("[[from.lat, from.lon], [to.lat, to.lon]]") && !liveJourney.includes("[[from.lat, from.lon], [to.lat, to.lon]]"));
check("Disconnected geometry segments remain separate",page.includes("for (const segment of exactTripSegments(stationTrip))") && page.includes("for (const points of segments)"));
check("Line number occurs once",board.includes("{brand.number ? <b>{brand.number}</b> : null}") && !board.includes("brand.number || entry.line?.name"));
check("Exact station IDs, no radius substitution",transitous.includes("requireTransitousStopId") && !transitous.includes('searchParams.set("center"') && !transitous.includes('searchParams.set("radius"'));
check("API provenance fields preserved",apis.every(source=>["source","updatedAt","realtimeStatus","warnings"].every(field=>source.includes(field))));
check("Board cross-check retained",apis[2].includes("compareBoardRows") && board.includes("Quellenabweichung"));
check("PWA starts on map with installable icons",manifest.includes('start_url:"/"') && manifest.includes('display:"standalone"') && manifest.includes("/app-icon-512.png"));
check("PWA exposes an in-app update notice and update/download route",pwaRegister.includes('Neue BahnConnections-Version verfügbar') && pwaRegister.includes('/version.json?ts=') && pwaRegister.includes('Download / Installation') && appVersion.includes('APP_VERSION = "48.2"') && versionMetadata.includes('"version": "48.2"') && versionMetadata.includes('/install?update=V48.2'));
check("Install navigation is native and works without RSC links",!installPage.includes('from "next/link"') && installPage.includes('href="/"') && installClient.includes('href="/?source=pwa"') && page.includes('href="/install"'));
check("Mobile search controls cannot collapse into each other and zoom chrome is removed",css.includes('.topbar>.station-search .search-clear') && css.includes('flex:0 0 36px') && css.includes('.topbar>.station-search>button[type="submit"]') && css.includes('max-width:42%') && css.includes('.leaflet-control-zoom') && css.includes('display:none!important'));
check("V48.2 worker waits for explicit update activation",worker.includes("bahnconnections-static-v48-2") && worker.includes("navigationPreload") && worker.includes("isAuthenticationRequest(url)") && worker.includes('event.data?.type === "SKIP_WAITING"') && !worker.includes(".then(() => self.skipWaiting())"));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
if (checks.some(check=>!check.ok)) process.exitCode=1;
