import { readFile } from "node:fs/promises";

const read = name => readFile(new URL("../"+name,import.meta.url),"utf8");
const [page,board,stationLines,manifest,worker,tripTrimming,trackRouting,liveJourney,transitous,panelTools,planner,navigation,alternatives,installPage,installClient,desktop,...styles] = await Promise.all([
  "app/page.tsx","app/live-board.tsx","app/station-lines.tsx","app/manifest.ts","public/sw.js","app/trip-trimming.ts","app/track-routing.ts","app/live-journey.ts","app/transitous.ts","app/panel-tools.tsx","app/journey-search.tsx","app/desktop-navigation.tsx","app/journey-alternatives.tsx","app/install/page.tsx","app/install/install-client.tsx","app/desktop-workspace.css",
  "app/styles/tokens.css","app/styles/controls.css","app/styles/workspace.css","app/styles/transport.css",
].map(read));
const css = styles.join("\n");
const apis = await Promise.all(["stations/search","stations/[id]/services","stations/[id]/board","trips/[source]/[id]","journeys"].map(route=>read("app/api/"+route+"/route.ts")));
const checks = [];
function check(name,condition) { checks.push({name,ok:Boolean(condition)}); }

check("Shared design tokens and native system font",css.includes("--space-4:16px") && css.includes("-apple-system") && css.includes('html[data-theme="dark"]'));
check("Liquid Glass is functional, restrained and accessible",css.includes("--glass-clear:") && css.includes("--glass-regular:") && css.includes("backdrop-filter:var(--glass-filter") && css.includes("@media (prefers-reduced-transparency:reduce)") && css.includes("@media (forced-colors:active)") && css.includes("@supports not ((-webkit-backdrop-filter:blur(1px)) or (backdrop-filter:blur(1px)))") && !/(?:Georgia|linear-gradient)/.test(css+desktop));
check("Search mode: planner and map; journey mode: map and inspector",desktop.includes(".desktop-workspace.desktop-search-mode .map-stage { padding-left:calc(var(--workspace-left) + 24px); padding-right:12px;") && desktop.includes(".desktop-workspace.desktop-journey-mode .map-stage { padding-left:12px;") && page.includes('(!journey || exploreOpen)') && page.includes('Boolean(journey) && !exploreOpen'));
check("Planner and inspector have mutually exclusive render guards",page.includes('{plannerVisible && <aside') && page.includes('journey && !departuresView && !statsOpen && !plannerVisible') && !page.includes('<DesktopWelcome'));
check("Search editing preserves the selected journey",page.includes('{journey && <button type="button" className="planner-return"') && page.includes('setExploreOpen(false);'));
check("General station markers recede behind the selected journey",page.includes('radius: journey ? 2.2') && page.includes('fillOpacity: journey ? .12') && page.includes('routeLayer as import("leaflet").Path'));
check("Station-trip realtime summary stays conservative",page.includes('function tripRealtimeLabel') && page.includes('"Echtzeit teilweise verfügbar"') && !page.includes('stationTrip.realtime ? "Echtzeitfahrt"'));
const realtime = await read("app/realtime-presentation.ts");
const realtimeTime = await read("app/realtime-time.tsx");
const realtimePlatform = await read("app/realtime-platform.tsx");
const pwaRegister = await read("app/pwa-register.tsx");
const appVersion = await read("app/app-version.ts");
const versionMetadata = await read("public/version.json");
check("Pure shared realtime thresholds and unknown status",realtime.includes('delayMinutes <= 5') && realtime.includes('delayMinutes < 15') && realtime.includes('if (!scheduled || !actual) return base') && !realtime.includes('fetch('));
check("Journey and board use the same time and platform components",[page,board].every(source => source.includes('<RealtimeTime') && source.includes('<RealtimePlatform')));
check("Delay semantics include text, struck-through schedule and accessible labels",realtimeTime.includes('<del className="realtime-time__planned">') && realtimeTime.includes('realtimeStatusLabel(state)') && realtimeTime.includes('<span className="sr-only">{accessibleLabel}</span>') && !realtimeTime.includes('role="img"') && realtimePlatform.includes('<span className="sr-only">{state.label}</span>') && !realtimePlatform.includes('role="img"'));
check("No redundant Soll block in stop lists",!page.includes('className="planned-time"') && !board.includes('Soll {time(planned)}'));
check("Brand, route and disruption colours stay separate",css.includes('--route-focus:var(--accent)') && css.includes('--status-disruption:var(--danger)'));
check("V38 station markers avoid generic gray discs",page.includes('markerPalette = theme === "dark"') && page.includes('edge:"#0f7486"') && page.includes('"station-point"') && !page.includes('fillColor: isSelected ? "#d45f5f"'));
check("V38 mobile content is flatter than chrome",css.includes("content hierarchy replaces card-on-card UI") && css.includes(".station-line-kpis>div+div") && css.includes(".mobile-navigation") && css.includes("background:var(--glass-strong)"));
check("Live layer status is not exposed as mobile chrome",!page.includes('Live-Ebene aus') && page.includes('Live-Daten nicht aktiv') && page.includes('Keine Echtzeitdaten'));
check("Tablet, phone and desktop ownership agree",page.includes('(min-width: 1024px)') && css.includes("(max-width:1023px)"));
check("Mobile bottom navigation stays above safe area",css.includes("--bottom-navigation:calc(60px + env(safe-area-inset-bottom") && navigation.includes("MobileNavigation"));
check("Mobile search floats above the map while landscape keeps inline search",css.includes(".topbar>.station-search {") && css.includes("position:absolute;") && css.includes("top:calc(100% + 8px)") && css.includes("@media (max-width:1023px) and (max-height:520px)"));
check("Single sheet with independent presentation state",panelTools.includes('"expanded" | "collapsed" | "closed" | "half"') && css.includes('[data-mobile-sheet="closed"] .mobile-sheet-panel') && css.includes('[data-mobile-sheet="collapsed"] .mobile-sheet-panel'));
check("Free drag keeps the chosen height",panelTools.includes("setPointerCapture") && panelTools.includes("startHeight - rawDelta") && panelTools.includes("announceSheetHeight(drag.lastHeight)") && css.includes("var(--mobile-sheet-height"));
check("Drag limits exclude navigation and virtual keyboard",panelTools.includes("navigationHeight") && panelTools.includes("window.visualViewport?.height"));
check("Close and collapse are separate real buttons",panelTools.includes('event.stopPropagation(); onMobileStateChange("closed")') && css.includes(".mobile-sheet-actions button"));
check("Sheet restoration preserves selected journey and endpoints",page.includes("mobile-sheet-restore") && page.includes("journeyEndpoints") && page.includes('current === "expanded" ? "half" : current'));
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
check("Line map loading is batched",stationLines.includes("inBatches") && stationLines.includes("Alle gefilterten Linien auf Karte"));
check("Ring lines retain the selected loop",tripTrimming.includes("trimRepeatedStationLoop") && board.includes("trimRepeatedStationLoop(stops, points, station, referenceTime)") && stationLines.includes("trimRepeatedStationLoop(stops, points, station, sample.time)"));
check("No invented straight rail geometry",trackRouting.includes("points:[], segments:[], coverage:0") && !trackRouting.includes("[[from.lat, from.lon], [to.lat, to.lon]]") && !liveJourney.includes("[[from.lat, from.lon], [to.lat, to.lon]]"));
check("Disconnected geometry segments remain separate",page.includes("for (const segment of exactTripSegments(stationTrip))") && page.includes("for (const points of segments)"));
check("Line number occurs once",board.includes("{brand.number ? <b>{brand.number}</b> : null}") && !board.includes("brand.number || entry.line?.name"));
check("Exact station IDs, no radius substitution",transitous.includes("requireTransitousStopId") && !transitous.includes('searchParams.set("center"') && !transitous.includes('searchParams.set("radius"'));
check("API provenance fields preserved",apis.every(source=>["source","updatedAt","realtimeStatus","warnings"].every(field=>source.includes(field))));
check("Board cross-check retained",apis[2].includes("compareBoardRows") && board.includes("Quellenabweichung"));
check("PWA starts on map with installable icons",manifest.includes('start_url:"/"') && manifest.includes('display:"standalone"') && manifest.includes("/app-icon-512.png"));
check("PWA exposes an in-app update notice and update/download route",pwaRegister.includes('Neue BahnConnections-Version verfügbar') && pwaRegister.includes('/version.json?ts=') && pwaRegister.includes('Download / Installation') && appVersion.includes('APP_VERSION = "38.0"') && versionMetadata.includes('"version": "38.0"') && versionMetadata.includes('/install?update=V38.0'));
check("Install navigation is native and works without RSC links",!installPage.includes('from "next/link"') && installPage.includes('href="/"') && installClient.includes('href="/?source=pwa"') && page.includes('href="/install"'));
check("V38.0 worker waits for explicit update activation",worker.includes("bahnconnections-static-v38-0") && worker.includes("navigationPreload") && worker.includes("isAuthenticationRequest(url)") && worker.includes('event.data?.type === "SKIP_WAITING"') && !worker.includes(".then(() => self.skipWaiting())"));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
if (checks.some(check=>!check.ok)) process.exitCode=1;
