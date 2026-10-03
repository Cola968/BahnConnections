import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { realtimeScenarios, journeyFixture, boardFixture } from "./realtime-fixtures.mjs";

const argumentsWithoutSeparator = process.argv.slice(2).filter((value) => value !== "--");
const url = argumentsWithoutSeparator[0] ?? "http://127.0.0.1:3102/?qa=mobile-visual";
const outputDirectory = resolve(argumentsWithoutSeparator[1] ?? join(tmpdir(), "bahnconnections-mobile-qa"));
const edgePath = process.env.EDGE_PATH ?? (process.platform === "linux" ? "/usr/bin/chromium" : "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe");
const debugPort = 9300 + Math.floor(Math.random() * 500);
const profileDirectory = join(tmpdir(), `bahnconnections-edge-${process.pid}-${Date.now()}`);
const useJourneyFixture = process.env.BAHNCONNECTIONS_MOBILE_QA_LIVE !== "1";

const fixtureStops = [
  ["Berlin Hbf", 52.5251, 13.3694, "2026-09-07T12:43:00+02:00", "7"],
  ["Berlin Südkreuz", 52.4750, 13.3653, "2026-09-07T12:51:00+02:00", "3"],
  ["Halle (Saale) Hauptbahnhof – Zugang über den Bahnhofsvorplatz", 51.4770, 11.9868, "2026-09-07T14:01:00+02:00", "8"],
  ["Erfurt Hbf", 50.9727, 11.0384, "2026-09-07T14:34:00+02:00", "1"],
  ["Nürnberg Hbf", 49.4456, 11.0820, "2026-09-07T15:48:00+02:00", "9"],
  ["München Hbf", 48.1402, 11.5586, "2026-09-07T16:45:00+02:00", "18"],
].map(([name, lat, lon, time, track], index, items) => ({
  id:`qa-${index}`, name, lat, lon, arrival:index ? time : undefined, departure:index < items.length - 1 ? time : undefined,
  scheduledArrival:index ? time : undefined, scheduledDeparture:index < items.length - 1 ? time : undefined, track, scheduledTrack:track, cancelled:false,
}));
const fixtureLeg = {
  mode:"HIGHSPEED_RAIL", category:"fern", name:"ICE 1205", operator:"DB Fernverkehr AG", headsign:"München Hbf", routeColor:"EC0016", routeTextColor:"FFFFFF", tripId:"qa-ice-1205",
  from:fixtureStops[0], to:fixtureStops.at(-1), stops:fixtureStops,
  points:fixtureStops.map((stop) => [stop.lat, stop.lon]), startTime:fixtureStops[0].departure, endTime:fixtureStops.at(-1).arrival,
  scheduledStartTime:fixtureStops[0].departure, scheduledEndTime:fixtureStops.at(-1).arrival, durationSeconds:14_520,
  realtime:true, cancelled:false, bikesAllowed:true, wheelchairAccessible:"ACCESSIBLE", alerts:[],
};
const fixtureJourney = {
  id:"qa-berlin-muenchen", durationSeconds:14_520, transfers:0, startTime:fixtureLeg.startTime, endTime:fixtureLeg.endTime,
  scheduledStartTime:fixtureLeg.startTime, scheduledEndTime:fixtureLeg.endTime, realtime:true, cancelled:false,
  legs:[fixtureLeg], transitLegs:[fixtureLeg], source:"cross-checked", sourceLabel:"Transitous · DB-geprüft", updatedAt:"2026-09-07T12:40:00+02:00", realtimeStatus:"live", warnings:[],
};
const laterTime = time => time ? new Date(new Date(time).getTime() + 30 * 60_000).toISOString() : undefined;
const alternativeLeg = { ...fixtureLeg,name:'ICE 1207',tripId:'qa-ice-1207',startTime:laterTime(fixtureLeg.startTime),endTime:laterTime(fixtureLeg.endTime),stops:fixtureStops.map(stop => ({...stop,arrival:laterTime(stop.arrival),departure:laterTime(stop.departure)})) };
const alternativeJourney = { ...fixtureJourney,id:'qa-alternative',startTime:alternativeLeg.startTime,endTime:alternativeLeg.endTime,legs:[alternativeLeg],transitLegs:[alternativeLeg] };

let activeJourneys = [fixtureJourney,alternativeJourney];
await mkdir(outputDirectory, { recursive:true });
const edge = spawn(edgePath, [
  "--headless=new",
  ...(process.env.BAHNCONNECTIONS_QA_NO_SANDBOX === "1" ? ["--no-sandbox"] : []),
  "--no-first-run",
  "--disable-default-apps",
  "--lang=de-DE",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDirectory}`,
  "about:blank",
], { stdio:["ignore", "ignore", "pipe"], windowsHide:true });
let browserStderr = "";
let browserSpawnError;
let browserExit;
edge.stderr.on("data", (chunk) => { browserStderr = (browserStderr + chunk.toString()).slice(-8000); });
edge.on("error", (error) => { browserSpawnError = error; });
edge.on("exit", (code, signal) => { browserExit = { code, signal }; });

function browserStartError(reason) {
  return new Error(`${reason} (${edgePath}).${browserStderr ? `\nBrowser stderr:\n${browserStderr}` : " Kein Browser-stderr verfügbar."}`);
}

const pause = (milliseconds) => new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));

async function pollJson(pathname) {
  const deadline = Date.now() + 40_000;
  while (Date.now() < deadline) {
    if (browserSpawnError) throw browserStartError(`Browser konnte nicht gestartet werden: ${browserSpawnError.message}`);
    if (browserExit) throw browserStartError(`Browser vor DevTools-Bereitschaft beendet: Exit ${browserExit.code}, Signal ${browserExit.signal ?? "keines"}`);
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}${pathname}`, { signal:AbortSignal.timeout(1000) });
      if (response.ok) return response.json();
    } catch { /* Edge is still starting. */ }
    await pause(200);
  }
  throw browserStartError(`Chrome/Edge DevTools antwortet nach 40 Sekunden nicht auf ${pathname}`);
}

let socket;
const pending = new Map();
const fixtureTimers = new Set();
let shuttingDown = false;
try {
  const targets = await pollJson("/json/list");
  const target = targets.find((item) => item.type === "page");
  if (!target?.webSocketDebuggerUrl) throw new Error("Kein Edge-Seitenziel gefunden");
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => {
    socket.addEventListener("open", resolveOpen, { once:true });
    socket.addEventListener("error", rejectOpen, { once:true });
  });

  let commandId = 0;
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Fetch.requestPaused" && useJourneyFixture) {
      const requestUrl = new URL(message.params.request.url);
      if (requestUrl.pathname.endsWith('/board')) console.log('Intercepted board fixture: '+requestUrl.pathname);
      const tripIndex=Number(requestUrl.pathname.match(/qa-board-(\d+)/)?.[1] ?? 0);
      const trip=journeyFixture(fixtureJourney,realtimeScenarios[tripIndex] ?? realtimeScenarios[0]).legs[0];
      const payload = requestUrl.pathname.endsWith('/board') ? boardFixture()
        : requestUrl.pathname.includes('/geocode') ? fixtureStops.map(stop => ({type:'STOP',id:stop.id,name:stop.name,lat:stop.lat,lon:stop.lon,country:'DE'}))
        : requestUrl.pathname.endsWith('/map/trips') ? []
        : requestUrl.pathname.endsWith('/stations/search') ? {stations:[]}
        : requestUrl.pathname.includes('/api/trips/') ? {trip:{legs:[{from:trip.from,to:trip.to,intermediateStops:trip.stops.slice(1,-1),realTime:trip.realtime,cancelled:trip.cancelled}]}}
        : { journeys:activeJourneys,source:"Mobile-QA-Fixture",updatedAt:fixtureJourney.updatedAt,realtimeStatus:"live",warnings:[] };
      const body = Buffer.from(JSON.stringify(payload)).toString("base64");
      const fixtureTimer = setTimeout(() => {
        fixtureTimers.delete(fixtureTimer);
        if (shuttingDown) return;
        void command("Fetch.fulfillRequest", { requestId:message.params.requestId, responseCode:200, responseHeaders:[{ name:"Content-Type", value:"application/json" },{name:"Access-Control-Allow-Origin",value:"*"}], body }).catch(error => {
          // Search and panel changes deliberately abort stale requests before this delayed fixture replies.
          if (!shuttingDown && !error.message.includes('Invalid InterceptionId')) throw error;
        });
      },800);
      fixtureTimers.add(fixtureTimer);
      return;
    }
    if (!message.id || !pending.has(message.id)) return;
    const { resolveCommand, rejectCommand } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) rejectCommand(new Error(message.error.message));
    else resolveCommand(message.result);
  });

  function command(method, params = {}) {
    const id = ++commandId;
    return new Promise((resolveCommand, rejectCommand) => {
      const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`DevTools-Timeout: ${method} ${params.type ?? ''}`)); },20000);
      pending.set(id, { timer, resolveCommand:(value) => { clearTimeout(timer); resolveCommand(value); }, rejectCommand:(error) => { clearTimeout(timer); rejectCommand(error); } });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const response = await command("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? "Browser-Auswertung fehlgeschlagen");
    return response.result?.value;
  }

  async function waitFor(expression, message) {
    for (let attempt=0;attempt<60;attempt++) {
      if (await evaluate(expression)) return;
      await pause(250);
    }
    await screenshot('failed-wait');
    const diagnostic = await evaluate(`({boardRows:document.querySelectorAll('.board-time .realtime-time').length,panel:document.querySelector('.station-card')?.innerText})`);
    throw new Error(message+': '+JSON.stringify(diagnostic));
  }

  async function setViewport(width, height) {
    await command("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor:1, mobile:true, screenWidth:width, screenHeight:height });
    await command("Emulation.setTouchEmulationEnabled", { enabled:true, maxTouchPoints:5 });
    await pause(260);
  }

  async function screenshot(name) {
    const result = await command("Page.captureScreenshot", { format:"png", fromSurface:true, captureBeyondViewport:false });
    await writeFile(join(outputDirectory, `${name}.png`), Buffer.from(result.data, "base64"));
  }

  async function dragSheet(deltaY) {
    await evaluate(`(() => {
      window.qaDrag = {start:null,last:null};
      document.querySelector('.mobile-sheet-summary').addEventListener('pointerdown', event => { window.qaDrag.start=event.clientY; },{once:true});
      document.querySelector('.mobile-sheet-summary').addEventListener('pointermove', event => { window.qaDrag.last=event.clientY; });
    })()`);
    const point = await evaluate(`(() => {
      const rect = document.querySelector(".mobile-sheet-summary")?.getBoundingClientRect();
      return rect ? { x:Math.round(rect.left + Math.min(rect.width / 2, 120)), y:Math.round(rect.top + 20) } : null;
    })()`);
    if (!point) throw new Error("Mobile Ziehfläche nicht gefunden");
    await command("Input.synthesizeScrollGesture", { ...point,yDistance:deltaY,gestureSourceType:"touch",preventFling:true,speed:500 });
    await pause(280);
    return evaluate(`window.qaDrag.last - window.qaDrag.start`);
  }

  async function tap(selector) {
    const point = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error("Fehlender Button: " + ${JSON.stringify(selector)});
      element.scrollIntoView({block:"nearest"});
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(element === hit || element.contains(hit))) throw new Error("Verdeckter Button: " + ${JSON.stringify(selector)} + ' '+JSON.stringify({x,y,hit:hit?.outerHTML?.slice(0,220)}));
      return {x,y};
    })()`);
    // Edge's headless touch gesture emits pointer/touch events but no compatibility click.
    // Verify click activation separately; free sheet movement is tested with genuine touch gestures.
    await command("Input.dispatchMouseEvent", {type:"mousePressed", ...point, button:"left", clickCount:1});
    await command("Input.dispatchMouseEvent", {type:"mouseReleased", ...point, button:"left", clickCount:1});
    await pause(280);
  }

  async function layoutSnapshot(label) {
    return evaluate(`(() => {
      const selectors = [".topbar", ".station-search", ".header-actions", ".mobile-sheet-panel", ".journey-mobile-overview", ".model-stop-list", ".mobile-sheet-restore"];
      const rect = (element) => element ? ({ x:Math.round(element.getBoundingClientRect().x), y:Math.round(element.getBoundingClientRect().y), width:Math.round(element.getBoundingClientRect().width), height:Math.round(element.getBoundingClientRect().height) }) : null;
      return {
        label:${JSON.stringify(label)},
        viewport:{ width:innerWidth, height:innerHeight },
        scrollWidth:document.documentElement.scrollWidth,
        horizontalOverflow:document.documentElement.scrollWidth > innerWidth + 1,
        sheetState:document.querySelector(".app-shell")?.dataset.mobileSheet ?? null,
        primaryPanel:document.querySelector(".app-shell")?.dataset.primaryPanel ?? null,
        elements:Object.fromEntries(selectors.map((selector) => [selector, rect(document.querySelector(selector))])),
      };
    })()`);
  }

  await command("Page.enable");
  await command("Runtime.enable");
  // Worker-forwarded requests belong to another CDP target and escape these fixtures.
  if (useJourneyFixture) {
    await command("Network.enable");
    await command("Network.setBypassServiceWorker", { bypass:true });
    // Fixture QA exercises the app, not offline caching or the worker's controller reload.
    await command("Page.addScriptToEvaluateOnNewDocument", { source:`if ('serviceWorker' in navigator) navigator.serviceWorker.register = () => Promise.reject(new Error('Worker disabled for deterministic UI fixtures'));` });
  }
  await command("Page.bringToFront");
  if (useJourneyFixture) await command("Fetch.enable", { patterns:[{ urlPattern:"*://*/api/journeys*", requestStage:"Request" },{ urlPattern:"*://*/api/stations/*/board*", requestStage:"Request" },{urlPattern:"*://*/api/trips/*",requestStage:"Request"},{urlPattern:"*://*/api/stations/search*",requestStage:"Request"},{urlPattern:"https://api.transitous.org/api/v1/geocode*",requestStage:"Request"},{urlPattern:"https://api.transitous.org/api/v6/map/trips*",requestStage:"Request"}] });
  await setViewport(390, 844);
  await command("Emulation.setLocaleOverride", { locale:"de-DE" });
  await command("Emulation.setTimezoneOverride", { timezoneId:"Europe/Berlin" });
  await command("Page.navigate", { url });
  await pause(6500);
  const snapshots = [await layoutSnapshot("390x844 initial")];
  await screenshot("390-initial");
  console.log('Responsive QA: initial layout loaded');

  await tap(".mobile-map-view-button");
  if (await evaluate(`document.querySelector('.mobile-map-view-button').getAttribute('aria-expanded')`) !== 'true') throw new Error('Ansicht-Knopf öffnet das Menü nicht');
  await screenshot('390-menu');
  await pause(250);
  await tap(".map-menu-dismiss button");
  await tap(".mobile-navigation button:nth-child(2)");
  await pause(700);
  snapshots.push(await layoutSnapshot("390x844 planner"));
  await screenshot("390-planner");
  console.log('Responsive QA: planner opened');
  await tap('.route-options summary');
  await tap('.planner-types button:nth-child(3)');
  await tap('.planner-types button:nth-child(3)');
  const originalStart = await evaluate(`document.querySelector('.route-search-pair input').value`);
  await tap('.swap-button');
  if (await evaluate(`document.querySelector('.route-search-pair input').value`) === originalStart) throw new Error('Start/Ziel tauschen reagiert nicht');
  await tap('.swap-button');
  await tap('.planner-time-mode button:last-child');
  if (!await evaluate(`document.querySelector('.planner-time-mode button:last-child').classList.contains('active')`)) throw new Error('Ankunft-Schalter reagiert nicht');
  await tap('.planner-time-mode button:first-child');

  const plannerReady = await evaluate(`!document.querySelector(".plan-button")?.disabled`);
  if (plannerReady) {
    await tap(".plan-button");
    await tap('.mobile-sheet-actions button:first-child');
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const finished = await evaluate(`Boolean(document.querySelector(".journey-card") || document.querySelector(".planner-message.error"))`);
      if (finished) break;
      await pause(500);
    }
  }
  const journeyLoaded = await evaluate(`Boolean(document.querySelector(".journey-card"))`);
  if (!journeyLoaded) throw new Error('Testverbindung wurde nicht geladen');
  if (await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) !== 'collapsed') throw new Error('Suchabschluss überschreibt minimierten Zustand');
  await tap('.mobile-sheet-summary');
  await pause(900);
  snapshots.push(await layoutSnapshot(journeyLoaded ? "390x844 journey" : "390x844 planner result"));
  await screenshot(journeyLoaded ? "390-journey" : "390-planner-result");
  if (useJourneyFixture) {
    await tap('.journey-alternatives summary');
    await tap('.journey-alternatives>div>button:first-child');
    if (!await evaluate(`[document.querySelector('.mobile-sheet-summary'),document.querySelector('.live-journey-leg header')].some(el=>el?.textContent.includes('ICE 1207'))`)) throw new Error('Alternative wird nicht gemeinsam ausgewählt');
    await tap('.journey-alternatives summary');
    await tap('.journey-alternatives>div>button:first-child');
    if (await evaluate(`Array.from(document.querySelectorAll('.live-journey-leg')).some(el=>el.scrollWidth>el.clientWidth+1)`)) throw new Error('Fahrtdetails werden horizontal abgeschnitten');
  }

  if (journeyLoaded) {
    const beforeFreeDrag = await layoutSnapshot("390x844 before free drag");
    await dragSheet(-92);
    const afterFreeDrag = await layoutSnapshot("390x844 freely resized");
    if ((afterFreeDrag.elements[".mobile-sheet-panel"]?.height ?? 0) <= (beforeFreeDrag.elements[".mobile-sheet-panel"]?.height ?? 0) + 40) {
      throw new Error("Bottom-Sheet behält die frei gezogene Höhe nicht bei");
    }
    snapshots.push(afterFreeDrag);
    const actualDragDelta = await dragSheet(55);
    const lowered = await layoutSnapshot('390x844 freely lowered');
    if (actualDragDelta < 30 || Math.abs(lowered.elements['.mobile-sheet-panel'].height - (afterFreeDrag.elements['.mobile-sheet-panel'].height - actualDragDelta)) > 3) throw new Error('Sheet rastet beim Absenken ein: '+JSON.stringify({actualDragDelta,before:afterFreeDrag.elements['.mobile-sheet-panel'],after:lowered.elements['.mobile-sheet-panel']}));
    snapshots.push(lowered);
    await screenshot("390-free-height");
  }

  await tap(".mobile-sheet-actions button:first-child");
  await pause(300);
  snapshots.push(await layoutSnapshot("390x844 collapsed"));
  if (await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) !== 'collapsed') throw new Error('Minimieren reagiert nicht');
  await screenshot("390-collapsed");
  await tap(".mobile-sheet-summary");
  await pause(300);

  if (journeyLoaded) {
    await tap(".mobile-sheet-actions button:last-child");
    await pause(250);
    const closed = await layoutSnapshot("390x844 closed by X");
    const journeyPreserved = await evaluate(`Boolean(document.querySelector(".journey-card"))`);
    if (closed.sheetState !== "closed" || !journeyPreserved || !closed.elements[".mobile-sheet-restore"]) throw new Error("X schließt das Sheet nicht zuverlässig oder verliert die Verbindung");
    snapshots.push(closed);
    await screenshot("390-closed");
    await tap(".mobile-sheet-restore");
    await pause(300);
  }

  await setViewport(320, 700);
  snapshots.push(await layoutSnapshot("320x700 expanded"));
  await screenshot("320-expanded");
  for (const width of [360,375,430,768]) {
    await setViewport(width,844);
    await tap('.mobile-sheet-actions button:last-child');
    if (await evaluate(`getComputedStyle(document.querySelector('.mobile-sheet-panel')).display !== 'none'`)) throw new Error(`X bei ${width}px reagiert nicht`);
    await tap('.mobile-sheet-restore');
    snapshots.push(await layoutSnapshot(`${width} restored`));
  }
  await setViewport(844, 390);
  const landscapeSnapshot = await layoutSnapshot("844x390 landscape");
  snapshots.push(landscapeSnapshot);
  await pause(350);
  const landscapeChrome = await evaluate(`(() => {
    const search=document.querySelector('.topbar>.station-search')?.getBoundingClientRect();
    const actions=document.querySelector('.header-actions')?.getBoundingClientRect();
    return { searchRight:search?.right ?? 0, actionsLeft:actions?.left ?? 0, actionsWidth:actions?.width ?? 0, overlap:Boolean(search&&actions&&search.right>actions.left-4) };
  })()`);
  if (landscapeChrome.actionsWidth > 52 || landscapeChrome.overlap) throw new Error('Header-Aktionen überdecken im Querformat die Suche: '+JSON.stringify(landscapeChrome));
  const landscapeStops = await evaluate(`(() => {const left=document.querySelector('.mobile-sheet-panel').getBoundingClientRect().left; return Array.from(document.querySelectorAll('path.live-journey-stop')).map(el=>({right:el.getBoundingClientRect().right,left}));})()`);
  if (landscapeStops.some(stop=>stop.right>stop.left+2)) throw new Error('Journey-Halte liegen im Querformat unter dem seitlichen Sheet');
  await screenshot("844-landscape");

  await tap(".mobile-sheet-actions button:last-child");
  if (await evaluate(`getComputedStyle(document.querySelector(".mobile-sheet-panel")).display !== "none"`)) throw new Error("Sheet bleibt im Querformat trotz X sichtbar");
  await tap(".mobile-sheet-restore");
  await setViewport(1440, 900);
  for (const width of [1024,1280,1440,1920]) {
    await setViewport(width,900);
    const mode = await evaluate(`(() => {
      const shell=document.querySelector('.app-shell'), map=document.querySelector('.map-canvas').getBoundingClientRect(), inspector=document.querySelector('.journey-card').getBoundingClientRect();
      return {journey:shell.classList.contains('desktop-journey-mode'),planner:Boolean(document.querySelector('.explore-card')),ok:map.right<=inspector.left+1,mapWidth:map.width,overflow:document.documentElement.scrollWidth>innerWidth+1};
    })()`);
    if (!mode.journey || mode.planner || !mode.ok || mode.overflow || mode.mapWidth < width * .5) throw new Error('Desktop-Journey-Modus bei '+width+': '+JSON.stringify(mode));
    snapshots.push(await layoutSnapshot(width+' desktop journey'));
  }
  await screenshot('1920-desktop-journey');
  await tap('.journey-mobile-overview>button');
  if (await evaluate(`Boolean(document.querySelector('.journey-card'))`)) throw new Error('Suche ändern lässt Inspector parallel stehen');
  await tap('.planner-return');
  if (!await evaluate(`Boolean(document.querySelector('.journey-card'))`)) throw new Error('Rückkehr verliert die Verbindung');
  await setViewport(1440,900);
  await screenshot('1440-before-close');
  if (await evaluate(`getComputedStyle(document.querySelector(".journey-card .mobile-sheet-actions")).display !== "none"`)) throw new Error("Mobile Buttons werden am PC angezeigt");
  await tap(".journey-card .desktop-panel-actions button:last-child", true);
  if (await evaluate(`Boolean(document.querySelector(".journey-card"))`)) throw new Error("Desktop-X schließt die Verbindung nicht");
  snapshots.push(await layoutSnapshot("1440 desktop closed"));
  await tap('.desktop-navigation button:nth-child(3)');
  if (useJourneyFixture) await waitFor(`document.querySelectorAll('.board-time .realtime-time').length >= ${realtimeScenarios.length}`, 'Board-Fixture wurde nicht geladen');
  // Regression: a hidden via cell used to auto-place the destination in a zero-width column.
  const boardDestinations = await evaluate(`Array.from(document.querySelectorAll('.board-destination')).map(el => ({text:el.textContent.trim(),width:el.getBoundingClientRect().width}))`);
  if (useJourneyFixture && !boardDestinations.length) throw new Error('Board-Fixture wurde nicht geladen');
  if (boardDestinations.some(row => !row.text || row.width < 40)) throw new Error('Fahrplanziel fehlt oder ist unsichtbar');
  if (useJourneyFixture && boardDestinations.some(row => /Zugang\\s+(?:über|via)/i.test(row.text))) throw new Error('Technischer Zugangszusatz ist noch in der Tafel sichtbar: '+JSON.stringify(boardDestinations));
  if (useJourneyFixture && !boardDestinations.some(row => row.text.includes('München Hbf'))) throw new Error('Hauptbahnhof wird in der Tafel nicht kompakt dargestellt: '+JSON.stringify(boardDestinations));
  await screenshot('1440-board-destinations');
  await evaluate(`document.querySelector('.board-row-summary')?.scrollIntoView({block:'center'})`);
  await screenshot('1440-board-realtime');
  await tap('.station-card .desktop-panel-actions button:last-child', true);
  if (await evaluate(`Boolean(document.querySelector('.station-card'))`)) throw new Error('Desktop-Bahnhof-X reagiert nicht');
  await tap('.desktop-navigation button:first-child');
  for (const width of [1024,1280,1440,1920]) {
    await setViewport(width,900);
    const columns = await evaluate(`(() => { const a=document.querySelector('.explore-card').getBoundingClientRect(), b=document.querySelector('.map-canvas').getBoundingClientRect(); return {ok:a.right<=b.left+1 && b.right>=innerWidth-13,search:document.querySelector('.app-shell').classList.contains('desktop-search-mode'),inspector:Boolean(document.querySelector('.journey-card')),width:document.documentElement.scrollWidth<=innerWidth+1}; })()`);
    if(!columns.ok || !columns.search || columns.inspector || !columns.width) throw new Error('PC-Suchmodus bei '+width+': '+JSON.stringify(columns));
    snapshots.push(await layoutSnapshot(width+' desktop search'));
  }
  await screenshot('1920-desktop-workspace');
  await tap('.desktop-navigation button:nth-child(2)',true);
  if(await evaluate(`getComputedStyle(document.querySelector('.explore-card') || document.createElement('div')).display !== 'none' && Boolean(document.querySelector('.explore-card'))`)) throw new Error('Kartenansicht zeigt Planer');
  await tap('.desktop-navigation button:first-child',true);
  await setViewport(390,844);
  await tap('.mobile-navigation button:last-child');
  const simpleMore = await evaluate(`(() => {
    const menu=document.querySelector('.simple-more-popover');
    if (!menu) return null;
    const controls=[...menu.querySelectorAll('.simple-more-list>a,.simple-more-list>button')];
    return {count:controls.length,text:menu.textContent.replace(/\\s+/g,' ').trim()};
  })()`);
  if (!simpleMore || simpleMore.count !== 3) throw new Error('Mehr-Menü ist nicht auf drei Kernaktionen reduziert: '+JSON.stringify(simpleMore));
  for (const forbidden of ['Netzreport','Netzlabor','Kontrast','Schrift','Zugarten','Minimalmodus','Fokusmodus']) {
    if (simpleMore.text.includes(forbidden)) throw new Error('Unnötiger Punkt im Mehr-Menü: '+forbidden);
  }
  for (const required of ['Darstellung','App & Updates','Hilfe & Daten']) {
    if (!simpleMore.text.includes(required)) throw new Error('Kernpunkt fehlt im Mehr-Menü: '+required);
  }
  await screenshot('390-more-simple');
  await tap('.mobile-navigation button:last-child');
  if (await evaluate(`Boolean(document.querySelector('.simple-more-popover'))`)) throw new Error('Mehr-Schalter lässt sich nicht schließen');
  const realtimeChecks = [];
  if (useJourneyFixture) {
    await setViewport(320,700);
    for (const theme of ['light','dark']) {
      await setViewport(1280,900);
      if (await evaluate(`document.documentElement.dataset.theme`) !== theme) {
        await tap(theme === 'dark' ? '[aria-label="Dunkles Kartenthema"]' : '[aria-label="Helles Kartenthema"]');
      }
      await setViewport(320,740);
      for (const scenario of realtimeScenarios) {
        activeJourneys = [journeyFixture(fixtureJourney,scenario),alternativeJourney];
        await tap('.mobile-navigation button:nth-child(2)');
        if (await evaluate(`Boolean(document.querySelector('.journey-card'))`)) {
          // The previous stop screenshot scrolled the header beneath the sticky sheet controls.
          await evaluate(`document.querySelector('.mobile-sheet-panel').scrollTop=0`);
          if (await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) === 'collapsed') await tap('.mobile-sheet-summary');
          await tap('.journey-mobile-overview>button');
        }
        await tap('.plan-button');
        await pause(1600);
        await tap('.mobile-sheet-summary');
        const state = await evaluate(`(() => {
          const row=document.querySelector('.live-stop-list li'), time=row?.querySelector('.realtime-time'), actual=time?.querySelector('.realtime-time__actual'), planned=time?.querySelector('del'), platform=row?.querySelector('.realtime-platform');
          if (!time) throw new Error('Kein Zeitfeld');
          const expectedColor=getComputedStyle(document.documentElement).getPropertyValue(${JSON.stringify(scenario.kind === 'early' ? '--status-early' : scenario.tone === 'success' ? '--status-on-time' : scenario.tone === 'warning' ? '--status-delay' : scenario.tone === 'danger' ? '--status-disruption' : '--ink')});
          const probe=document.createElement('span'); probe.style.color=expectedColor; document.body.append(probe); const color=getComputedStyle(probe).color; probe.remove();
          return {tone:time.dataset.tone,kind:time.className,planned:Boolean(planned),actual:Boolean(actual),delta:time.querySelector('.realtime-time__delta')?.textContent ?? '',aria:time.getAttribute('aria-label'),color:actual ? getComputedStyle(actual).color===color : true,platform:platform?.dataset.changed==='true',overflow:Array.from(document.querySelectorAll('.live-journey-leg,.mobile-sheet-panel,.realtime-time')).some(el=>el.scrollWidth>el.clientWidth+1)};
        })()`);
        const changed=scenario.delay!==0 || scenario.cancelled;
        if(state.tone!==scenario.tone || !state.kind.includes('realtime-time--'+scenario.kind) || state.planned!==Boolean(changed) || state.actual===Boolean(scenario.cancelled) || !state.color || state.overflow || (scenario.platform && !state.platform)) throw new Error(theme+' '+scenario.name+': '+JSON.stringify(state));
        realtimeChecks.push({theme,scenario:scenario.name,...state});
        await evaluate(`document.querySelector('.mobile-sheet-panel').scrollTop=0`);
        await screenshot('320-'+theme+'-'+scenario.name);
        await evaluate(`document.querySelector('.live-stop-list li').scrollIntoView({block:'center'})`);
        await screenshot('320-'+theme+'-'+scenario.name+'-stops');
        snapshots.push(await layoutSnapshot('320 '+theme+' '+scenario.name));
      }
    }
    activeJourneys=[fixtureJourney,alternativeJourney];
    await tap('.mobile-navigation button:nth-child(3)');
    await waitFor(`document.querySelectorAll('.board-time .realtime-time').length >= ${realtimeScenarios.length}`, 'Mobile Board-Fixture wurde nicht geladen');
    const boardTimes = await evaluate(`Array.from(document.querySelectorAll('.board-time .realtime-time')).map(time => ({tone:time.dataset.tone,kind:time.className,planned:Boolean(time.querySelector('del')),actual:Boolean(time.querySelector('.realtime-time__actual')),overflow:time.scrollWidth>time.clientWidth+1}))`);
    if(boardTimes.length < realtimeScenarios.length || boardTimes.some(time=>time.overflow)) throw new Error('Board-Echtzeit-Fixtures fehlen/überlaufen: '+JSON.stringify(boardTimes));
    for (const scenario of realtimeScenarios) if(!boardTimes.some(time=>time.kind.includes('realtime-time--'+scenario.kind)&&time.tone===scenario.tone)) throw new Error('Board-Zustand fehlt: '+scenario.name);
    if (await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) === 'half') await tap('.mobile-sheet-summary');
    await evaluate(`document.querySelector('.board-row-summary')?.scrollIntoView({block:'center'})`);
    await screenshot('320-dark-board-realtime');
    await evaluate(`document.querySelector('.board-row.cancel')?.scrollIntoView({block:'center'})`);
    await screenshot('320-dark-board-cancellation');
    // Accessibility modes must preserve text and geometry as well as semantic colour.
    await evaluate(`document.documentElement.dataset.contrast='high';document.documentElement.dataset.font='large'`);
    await command('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    snapshots.push(await layoutSnapshot('320 high contrast large type reduced motion'));
    await screenshot('320-accessibility-board');
  }
  const responsiveMatrix = [];
  if (useJourneyFixture) {
    // Full product matrix supplements (and does not replace) the interaction/realtime checks above.
    activeJourneys = [fixtureJourney,alternativeJourney];
    await command('Emulation.setEmulatedMedia',{features:[]});
    for (const [width,height] of [[320,740],[360,844],[390,844],[430,932],[768,1024],[1024,900],[1440,900],[1920,1080]]) {
      for (const theme of ['light','dark']) {
        await setViewport(1280,900);
        await command('Page.navigate',{url});
        await pause(2200);
        await waitFor(`Boolean(document.querySelector('.desktop-navigation'))`,'Matrix navigation missing');
        if (await evaluate(`document.documentElement.dataset.theme`) !== theme) await tap(theme === 'dark' ? '[aria-label="Dunkles Kartenthema"]' : '[aria-label="Helles Kartenthema"]');
        await evaluate(`delete document.documentElement.dataset.contrast;delete document.documentElement.dataset.font`);
        await setViewport(width,height);
        const mobile=width<1024;
        const nav = index => mobile ? '.mobile-navigation button:nth-child('+index+')' : '.desktop-navigation button:nth-child('+({1:2,2:1,3:3}[index])+')';
        async function matrixCapture(view) {
          await pause(300);
          const state=await evaluate(`(() => {
            const panel=document.querySelector('.mobile-sheet-panel'), controls=panel?.querySelector('.panel-tools'), nav=document.querySelector('.mobile-navigation');
            const time=document.querySelector('.journey-mobile-overview .realtime-time');
            return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
              panelOverflow:Boolean(panel && panel.scrollWidth>panel.clientWidth+1),
              overflowElements:panel ? Array.from(panel.querySelectorAll("*")).filter(e=>e.clientWidth>0 && e.scrollWidth>e.clientWidth+1).slice(0,8).map(e=>({className:e.className,width:e.clientWidth,scrollWidth:e.scrollWidth})) : [],
              sheetTop:panel?.getBoundingClientRect().top ?? null,headerBottom:controls?.getBoundingClientRect().bottom ?? null,
              navigationTop:nav?.getBoundingClientRect().top ?? null,
              activeTabs:document.querySelectorAll('.mobile-navigation button.active').length,
              headerOverlap:innerWidth>=1024 && document.querySelector('.desktop-navigation').getBoundingClientRect().right>document.querySelector('.topbar>.station-search').getBoundingClientRect().left+1,
              scrollEdge:controls ? getComputedStyle(controls).backgroundColor : null,
              scrolled:panel?.dataset.scrolled ?? null,
              loadedMapTiles:document.querySelectorAll('.leaflet-tile-loaded').length,
              contentBackground:panel ? getComputedStyle(panel).backgroundColor : null,
              blur:panel ? getComputedStyle(panel).backdropFilter : null,
              normalTimeColor:time?.querySelector('.realtime-time__actual') ? getComputedStyle(time.querySelector('.realtime-time__actual')).color : null,
              scrollHeight:panel?.scrollHeight ?? null};
          })()`);
          if(state.horizontalOverflow || state.panelOverflow || state.headerOverlap) throw new Error('Matrix overflow '+width+' '+theme+' '+view+': '+JSON.stringify(state));
          if(mobile && state.activeTabs!==1) throw new Error('Matrix active tab ownership '+JSON.stringify(state));
          const name=width+'-'+theme+'-'+view;
          await screenshot(name);
          responsiveMatrix.push({width,height,theme,view,...state});
          console.log('Matrix '+name);
        }
        await tap(nav(1));
        await matrixCapture('map');
        await tap(nav(3));
        await waitFor(`document.querySelectorAll('.board-time .realtime-time').length>0`,'Matrix board missing');
        if(mobile && await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) === 'half') await tap('.mobile-sheet-summary');
        await matrixCapture('board');
        await tap('.station-section-tabs button:nth-child(3)');
        await matrixCapture('station-info');
        await tap(nav(2));
        await matrixCapture('planner');
        await tap('.plan-button');
        await waitFor(`Boolean(document.querySelector('.journey-card'))`,'Matrix journey missing');
        if(mobile) {
          await matrixCapture('journey-half');
          if(await evaluate(`document.querySelector('.app-shell').dataset.mobileSheet`) !== 'expanded') await tap('.mobile-sheet-summary');
        }
        await matrixCapture('journey');
        // Sticky header must remain above the visible body after actual scrolling.
        await evaluate(`document.querySelector('.mobile-sheet-panel').scrollTop=180`);
        await matrixCapture('journey-scroll');
        if(width===1440) {
          await evaluate(`document.querySelector('.mobile-sheet-panel').scrollTop=0`);
          const before=await evaluate(`parseFloat(getComputedStyle(document.querySelector('.journey-time-range .realtime-time')).fontSize)`);
          await tap('.journey-card [aria-label="Verbindung: Schrift größer"]');
          const after=await evaluate(`parseFloat(getComputedStyle(document.querySelector('.journey-time-range .realtime-time')).fontSize)`);
          if(after<=before) throw new Error('Inspector text size control does not enlarge primary times');
          await matrixCapture('journey-large-type');
          await tap('.journey-card [aria-label="Verbindung: Schriftgröße zurücksetzen"]');
        }
      }
    }
  }
  if (snapshots.some((item) => item.horizontalOverflow)) throw new Error("Horizontaler Überlauf");

  // Standalone marketing website: separate route, separate visual ownership.
  const websiteChecks = [];
  const websiteUrl = new URL("/website", url).toString();
  for (const [width,height] of [[390,844],[1440,900]]) {
    for (const theme of ["light","dark"]) {
      await command("Emulation.setEmulatedMedia",{features:[{name:"prefers-color-scheme",value:theme}]});
      await setViewport(width,height);
      await command("Page.navigate",{url:websiteUrl});
      await waitFor(`Boolean(document.querySelector('[data-website="bahnconnections"]'))`,"Website route missing");
      await pause(700);
      const state=await evaluate(`(() => {
        const root=document.querySelector('[data-website="bahnconnections"]');
        const h1=root?.querySelector('h1');
        const appLinks=[...root.querySelectorAll('a[href="/"]')];
        const installLinks=[...root.querySelectorAll('a[href="/install"]')];
        const text=root?.textContent.replace(/\\s+/g,' ').trim() ?? '';
        return {
          title:h1?.textContent.replace(/\\s+/g,' ').trim() ?? '',
          horizontalOverflow:document.documentElement.scrollWidth>innerWidth+1,
          appLinks:appLinks.length,
          installLinks:installLinks.length,
          sections:root?.querySelectorAll('section').length ?? 0,
          independent:text.includes('keine offizielle Anwendung der Deutschen Bahn AG'),
          dbTarget:text.includes('Zielbild · nicht aktuell vereinbart'),
          departureExample:text.includes('Beispieldaten · keine aktuelle Bahnhofstafel'),
          width:root?.getBoundingClientRect().width ?? 0
        };
      })()`);
      if(state.horizontalOverflow || state.appLinks<2 || state.installLinks<1 || state.sections<6 || !state.title.includes("Bahnreise") || !state.independent || !state.dbTarget || !state.departureExample) throw new Error("Website QA "+width+" "+theme+": "+JSON.stringify(state));
      await screenshot(width+"-"+theme+"-website");
      websiteChecks.push({width,height,theme,...state});
    }
  }
  await command("Emulation.setEmulatedMedia",{features:[]});

  const report = { checkedAt:new Date().toISOString(), url, journeyLoaded, plannerReady, inputMode:"mouse-clicks + touch-drag", realDeviceTest:false, journeyFixture:useJourneyFixture, realtimeChecks, snapshots, responsiveMatrix, websiteChecks };
  await writeFile(join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  shuttingDown = true;
  for (const timer of fixtureTimers) clearTimeout(timer);
  for (const request of pending.values()) clearTimeout(request.timer);
  pending.clear();
  socket?.close();
  edge.kill();
}
