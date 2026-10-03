import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { realtimeScenarios, journeyFixture, boardFixture } from "./realtime-fixtures.mjs";

const argumentsWithoutSeparator = process.argv.slice(2).filter((value) => value !== "--");
const url = argumentsWithoutSeparator[0] ?? "http://127.0.0.1:3102/?station=berlin";
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
const serviceFixture = { routes:Array.from({length:18},(_,i)=>({routeShortName:i<9?`S${i+1}`:i<13?`U${i-8}`:`RE ${i-12}`,mode:i<9?"SUBURBAN":i<13?"SUBWAY":"REGIONAL_RAIL",agencyName:"BVG Berlin",routeColor:"888888"})),stopTimes:Array.from({length:18},(_,i)=>({tripId:`qa-line-${i}`,routeShortName:i<9?`S${i+1}`:i<13?`U${i-8}`:`RE ${i-12}`,mode:i<9?"SUBURBAN":i<13?"SUBWAY":"REGIONAL_RAIL",headsign:"Berlin Friedrichstraße und sehr lange Zielbezeichnung",place:{departure:new Date().toISOString()}}))};
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
      console.log("Fixture: "+requestUrl.pathname);
      const tripIndex=Number(requestUrl.pathname.match(/qa-board-(\d+)/)?.[1] ?? 0);
      const trip=journeyFixture(fixtureJourney,realtimeScenarios[tripIndex] ?? realtimeScenarios[0]).legs[0];
      const payload = requestUrl.pathname.endsWith('/services') ? serviceFixture : requestUrl.pathname.endsWith('/board') ? boardFixture()
        : requestUrl.pathname.includes('/geocode') ? fixtureStops.map(stop => ({type:'STOP',id:stop.id,name:stop.name,lat:stop.lat,lon:stop.lon,country:'DE'}))
        : requestUrl.pathname.endsWith('/map/trips') ? []
        : requestUrl.pathname.endsWith('/stations/search') ? {stations:[]}
        : requestUrl.pathname.includes('/api/trips/') ? {trip:{legs:[{from:trip.from,to:trip.to,intermediateStops:trip.stops.slice(1,-1),realTime:trip.realtime,cancelled:trip.cancelled,legGeometry:{points:'_p~iF~ps|U_ulLnnqC_mqNvxq`@',precision:5}}]}}
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
      const timer = setTimeout(() => { pending.delete(id); rejectCommand(new Error(`DevTools-Timeout: ${method} ${params.type ?? ''}`)); },60000);
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
    await evaluate(`window.dispatchEvent(new Event("resize"))`);
    await pause(260);
  }

  async function screenshot(name) {
    const result = await command("Page.captureScreenshot", { format:"png", fromSurface:true, captureBeyondViewport:false });
    await writeFile(join(outputDirectory, `${name}.png`), Buffer.from(result.data, "base64"));
  }

  async function tap(selector) {
    const point = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error("Fehlender Button: " + ${JSON.stringify(selector)});
      element.scrollIntoView({block:"nearest"});
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(element === hit || element.contains(hit))) throw new Error("Verdeckter Button: " + ${JSON.stringify(selector)} + ' '+JSON.stringify({x,y,innerWidth,innerHeight,panel:document.querySelector(".floating-panel")?.getBoundingClientRect().toJSON(),hit:hit?.outerHTML?.slice(0,220)}));
      return {x,y};
    })()`);
    // Edge's headless touch gesture emits pointer/touch events but no compatibility click.
    // Verify click activation separately; free sheet movement is tested with genuine touch gestures.
    await command("Input.dispatchMouseEvent", {type:"mousePressed", ...point, button:"left", clickCount:1});
    await command("Input.dispatchMouseEvent", {type:"mouseReleased", ...point, button:"left", clickCount:1});
    await pause(280);
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
  if (useJourneyFixture) await command("Fetch.enable", { patterns:[{urlPattern:"*://*/api/stations/*/services*",requestStage:"Request"},{ urlPattern:"*://*/api/journeys*", requestStage:"Request" },{ urlPattern:"*://*/api/stations/*/board*", requestStage:"Request" },{urlPattern:"*://*/api/trips/*",requestStage:"Request"},{urlPattern:"*://*/api/stations/search*",requestStage:"Request"},{urlPattern:"https://api.transitous.org/api/v1/geocode*",requestStage:"Request"},{urlPattern:"https://api.transitous.org/api/v6/map/trips*",requestStage:"Request"}] });
  const checks=[];
  await setViewport(390,844);
  await command('Page.navigate',{url});
  await waitFor(`document.querySelectorAll('.board-row-summary').length > 0`, 'Station fixture missing');
  await waitFor(`document.querySelectorAll('.station-line-row').length===18`, 'All 18 lines must load without filtering');
  await waitFor(`document.querySelectorAll('path.station-trip-preview').length>0`, 'Lines must appear on the map automatically');
  async function inspect(label) {
    const result=await evaluate(`(() => {
      const panel=document.querySelector('.floating-panel'),head=panel?.querySelector('.panel-tools'),body=panel?.querySelector('.panel-body');
      const hr=head?.getBoundingClientRect(),br=body?.getBoundingClientRect();
      const visible=el=>Boolean(el.getClientRects().length)&&getComputedStyle(el).visibility!=='hidden';
      const overflow=[...document.querySelectorAll('.panel-body,.board-row-summary,.realtime-time,.station-line-row,.live-stop-list li,.journey-time-range')].filter(visible).filter(el=>el.scrollWidth>el.clientWidth+1).map(el=>el.className);
      const overlaps=[];
      for(const row of document.querySelectorAll('.board-row-summary,.station-line-row,.live-stop-list li')) {
        if(!visible(row))continue;
        const children=[...row.children].filter(visible);
        for(let i=0;i<children.length;i++)for(let j=i+1;j<children.length;j++) {
          const a=children[i].getBoundingClientRect(),b=children[j].getBoundingClientRect();
          if(Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1)overlaps.push(row.className);
        }
      }
      return {overflow,overlaps,headerSeparate:!hr||!br||br.top>=hr.bottom-1,horizontal:document.documentElement.scrollWidth>innerWidth+1,bodyScroll:body?.scrollTop};
    })()`);
    if(result.overflow.length||result.overlaps.length||!result.headerSeparate||result.horizontal)throw new Error(label+': '+JSON.stringify(result));
    checks.push({label,...result});
  }
  for(const [width,height] of [[320,568],[360,640],[390,844],[768,1024],[844,390],[568,320],[1024,400],[1024,600],[1440,900],[2560,1440]]) {
    await setViewport(width,height);
    for(const theme of ['light','dark'])for(const font of ['normal','large']) {
      await evaluate(`document.documentElement.dataset.theme=${JSON.stringify(theme)};document.documentElement.dataset.font=${JSON.stringify(font)}`);
      await pause(150);
      console.log("Checking "+width+"x"+height+" "+theme+" "+font);
      const label=width+'x'+height+' '+theme+' '+font;
      await inspect(label+' board');
      await evaluate(`document.querySelector('.panel-body').scrollTop=160`);
      await inspect(label+' scrolled');
      await evaluate(`document.querySelector('.panel-body').scrollTop=0`);
      await tap('.station-section-tabs button:nth-child(2)');
      await inspect(label+' lines');
      
      await tap('.station-section-tabs button:first-child');
    }
  }
  await setViewport(390,844);
  await tap('.mobile-sheet-actions button:last-child');
  await pause(1200);
  if(await evaluate(`Boolean(document.querySelector('.station-card,.mobile-sheet-restore,path.station-trip-preview'))`))throw new Error('Close left station state or map geometry behind');
  // Exercise the planner, journey inspector and delayed response after closing.
  await tap('.mobile-navigation button:nth-child(2)');
  await tap('.plan-button');
  await waitFor(`Boolean(document.querySelector('.journey-card'))`,'Journey missing');
  for(const [width,height] of [[320,568],[390,844],[844,390],[768,1024],[1024,600],[1440,900]]) {
    await setViewport(width,height);
    for(const font of ['normal','large']) {
      await evaluate(`document.documentElement.dataset.font=${JSON.stringify(font)}`);
      await inspect(width+' '+font+' journey');
      await evaluate(`document.querySelector('.panel-body').scrollTop=180`);
      await inspect(width+' '+font+' journey scrolled');
      
      await evaluate(`document.querySelector('.panel-body').scrollTop=0`);
    }
  }
  await setViewport(390,844);
  await tap('.mobile-sheet-actions button:last-child');
  if(await evaluate(`Boolean(document.querySelector('.journey-card,.mobile-sheet-restore,path.live-journey-stop'))`))throw new Error('Journey close left state behind');
  await tap('.mobile-navigation button:nth-child(2)');
  await tap('.plan-button');
  await tap('.mobile-sheet-actions button:last-child');
  await pause(1400);
  if(await evaluate(`Boolean(document.querySelector('.journey-card,.explore-card,.mobile-sheet-restore'))`))throw new Error('Late planner response resurrected the closed view');
  await writeFile(join(outputDirectory,'content-layout-report.json'),JSON.stringify({fixture:true,realDevice:false,checks,closeResets:true,automaticLines:18},null,2));
  console.log(JSON.stringify({passed:checks.length,closeResets:true,automaticLines:18,outputDirectory}));
} finally {
  shuttingDown=true;
  for(const timer of fixtureTimers)clearTimeout(timer);
  for(const request of pending.values())clearTimeout(request.timer);
  pending.clear();socket?.close();edge.kill();
}




