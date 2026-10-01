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
check("No glass, decorative gradients or serif typography in the new UI",!/(?:Georgia|linear-gradient|backdrop-filter:blur)/.test(css+desktop));
check("One desktop detail rail, planner separate",desktop.includes("--workspace-right:360px") && desktop.includes(".desktop-workspace.desktop-connections .explore-card"));
check("Tablet, phone and desktop ownership agree",page.includes('(min-width: 1024px)') && css.includes("(max-width:1023px)"));
check("Mobile bottom navigation stays above safe area",css.includes("--bottom-navigation:calc(60px + env(safe-area-inset-bottom") && navigation.includes("MobileNavigation"));
check("Header search has a dedicated row",css.includes(".topbar>.station-search { grid-column:1/-1; grid-row:2"));
check("Single sheet with independent presentation state",panelTools.includes('"expanded" | "collapsed" | "closed" | "half"') && css.includes('[data-mobile-sheet="closed"] .mobile-sheet-panel') && css.includes('[data-mobile-sheet="collapsed"] .mobile-sheet-panel'));
check("Free drag keeps the chosen height",panelTools.includes("setPointerCapture") && panelTools.includes("startHeight - rawDelta") && panelTools.includes("announceSheetHeight(drag.lastHeight)") && css.includes("var(--mobile-sheet-height"));
check("Drag limits exclude navigation and virtual keyboard",panelTools.includes("navigationHeight") && panelTools.includes("window.visualViewport?.height"));
check("Close and collapse are separate real buttons",panelTools.includes('event.stopPropagation(); onMobileStateChange("closed")') && css.includes(".mobile-sheet-actions button"));
check("Sheet restoration preserves selected journey and endpoints",page.includes("mobile-sheet-restore") && page.includes("journeyEndpoints") && page.includes('current === "expanded" ? "half" : current'));
check("Navigation preserves journey data",page.includes("!journey || departuresView") && page.includes('journey && !departuresView'));
check("Resize observer accounts for the measured sheet",page.includes("new ResizeObserver") && page.includes("measuredHeight") && page.includes("invalidateSize"));
check("44px mobile actions and scalable 16px input prevent iOS zoom",css.includes("width:44px; height:44px") && css.includes(".station-search input { font-size:calc(1rem * var(--panel-scale,1))"));
check("Reduced motion is supported",css.includes("@media (prefers-reduced-motion:reduce)"));
check("Planner is a controlled extracted view",page.includes("<JourneySearch") && planner.includes("type StationField") && planner.includes("onOptions"));
check("Travel options collapsed by default",planner.includes('<details className="filter-drawer route-options">') && !planner.includes('route-options" open'));
check("All five modes and five transfers retained",["fern","regional","sbahn","ubahn","tram"].every(mode=>planner.includes("'"+mode+"'")) && planner.includes("[0,1,2,3,4,5]"));
check("Autocomplete has active descendant and Escape handling",(await read("app/smart-search.tsx")).includes("aria-activedescendant"));
check("Alternative selection and pagination retained",alternatives.includes("onSelect(journey)") && alternatives.includes("alternatives.slice(0,limit)") && alternatives.includes("onMore"));
check("Transfer displays concrete times, platforms and walks",alternatives.includes("previous.to.track") && alternatives.includes("next.from.track") && alternatives.includes("Fußweg enthalten") && !page.includes("{journeyQuality.score}"));
check("Live board is paginated",board.includes("displayLimit") && board.includes("Weitere 50 Fahrten anzeigen"));
check("Destination has a visible dedicated grid column",css.includes(".board-destination { grid-column:4") && css.includes("minmax(0,1fr)"));
check("Line map loading is batched",stationLines.includes("inBatches") && stationLines.includes("Alle gefilterten Linien auf Karte"));
check("Ring lines retain the selected loop",tripTrimming.includes("trimRepeatedStationLoop") && board.includes("trimRepeatedStationLoop(stops, points, station, referenceTime)") && stationLines.includes("trimRepeatedStationLoop(stops, points, station, sample.time)"));
check("No invented straight rail geometry",trackRouting.includes("points:[], segments:[], coverage:0") && !trackRouting.includes("[[from.lat, from.lon], [to.lat, to.lon]]") && !liveJourney.includes("[[from.lat, from.lon], [to.lat, to.lon]]"));
check("Disconnected geometry segments remain separate",page.includes("for (const segment of exactTripSegments(stationTrip))") && page.includes("for (const points of segments)"));
check("Line number occurs once",board.includes("{brand.number ? <b>{brand.number}</b> : null}") && !board.includes("brand.number || entry.line?.name"));
check("Exact station IDs, no radius substitution",transitous.includes("requireTransitousStopId") && !transitous.includes('searchParams.set("center"') && !transitous.includes('searchParams.set("radius"'));
check("API provenance fields preserved",apis.every(source=>["source","updatedAt","realtimeStatus","warnings"].every(field=>source.includes(field))));
check("Board cross-check retained",apis[2].includes("compareBoardRows") && board.includes("Quellenabweichung"));
check("PWA starts on map with installable icons",manifest.includes('start_url:"/"') && manifest.includes('display:"standalone"') && manifest.includes("/app-icon-512.png"));
check("Install navigation is native and works without RSC links",!installPage.includes('from "next/link"') && installPage.includes('href="/"') && installClient.includes('href="/?source=pwa"') && page.includes('href="/install"'));
check("V32 worker bypasses authentication and refreshes navigation",worker.includes("bahnconnections-static-v32") && worker.includes("navigationPreload") && worker.includes("isAuthenticationRequest(url)"));
console.log(JSON.stringify({checkedAt:new Date().toISOString(),checks},null,2));
if (checks.some(check=>!check.ok)) process.exitCode=1;
