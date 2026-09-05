import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const argumentsWithoutSeparator = process.argv.slice(2).filter((value) => value !== "--");
const url = argumentsWithoutSeparator[0] ?? "http://127.0.0.1:3102/?qa=mobile-visual";
const outputDirectory = resolve(argumentsWithoutSeparator[1] ?? join(tmpdir(), "bahnconnections-mobile-qa"));
const edgePath = process.env.EDGE_PATH ?? "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const debugPort = 9300 + Math.floor(Math.random() * 500);
const profileDirectory = join(tmpdir(), `bahnconnections-edge-${process.pid}-${Date.now()}`);
const useJourneyFixture = process.env.BAHNCONNECTIONS_MOBILE_QA_LIVE !== "1";

const fixtureStops = [
  ["Berlin Hbf", 52.5251, 13.3694, "2026-09-07T12:43:00+02:00", "7"],
  ["Berlin Südkreuz", 52.4750, 13.3653, "2026-09-07T12:51:00+02:00", "3"],
  ["Halle (Saale) Hbf", 51.4770, 11.9868, "2026-09-07T14:01:00+02:00", "8"],
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

await mkdir(outputDirectory, { recursive:true });
const edge = spawn(edgePath, [
  "--headless=old",
  "--disable-gpu",
  "--disable-gpu-compositing",
  "--disable-gpu-sandbox",
  "--disable-software-rasterizer",
  "--disable-features=VizDisplayCompositor",
  "--no-sandbox",
  "--no-first-run",
  "--disable-default-apps",
  `--remote-debugging-port=${debugPort}`,
  `--user-data-dir=${profileDirectory}`,
  "about:blank",
], { stdio:"ignore", windowsHide:true });

const pause = (milliseconds) => new Promise((resolvePause) => setTimeout(resolvePause, milliseconds));

async function pollJson(pathname, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debugPort}${pathname}`);
      if (response.ok) return response.json();
    } catch { /* Edge is still starting. */ }
    await pause(200);
  }
  throw new Error(`Edge DevTools antwortet nicht auf ${pathname}`);
}

let socket;
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
  const pending = new Map();
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data));
    if (message.method === "Fetch.requestPaused" && useJourneyFixture) {
      const body = Buffer.from(JSON.stringify({ journeys:[fixtureJourney], source:"Mobile-QA-Fixture", updatedAt:fixtureJourney.updatedAt, realtimeStatus:"live", warnings:[] })).toString("base64");
      void command("Fetch.fulfillRequest", { requestId:message.params.requestId, responseCode:200, responseHeaders:[{ name:"Content-Type", value:"application/json" }], body });
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
      pending.set(id, { resolveCommand, rejectCommand });
      socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const response = await command("Runtime.evaluate", { expression, awaitPromise:true, returnByValue:true });
    if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text ?? "Browser-Auswertung fehlgeschlagen");
    return response.result?.value;
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
    const point = await evaluate(`(() => {
      const rect = document.querySelector(".mobile-sheet-summary")?.getBoundingClientRect();
      return rect ? { x:Math.round(rect.left + Math.min(rect.width / 2, 120)), y:Math.round(rect.top + 20) } : null;
    })()`);
    if (!point) throw new Error("Mobile Ziehfläche nicht gefunden");
    await command("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{ x:point.x, y:point.y }] });
    for (let step = 1; step <= 5; step += 1) {
      await command("Input.dispatchTouchEvent", { type:"touchMove", touchPoints:[{ x:point.x, y:point.y + deltaY * step / 5 }] });
      await pause(35);
    }
    await command("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
    await pause(280);
  }

  async function tap(selector, mouse = false) {
    const point = await evaluate(`(() => {
      const element = document.querySelector(${JSON.stringify(selector)});
      if (!element) throw new Error("Fehlender Button: " + ${JSON.stringify(selector)});
      element.scrollIntoView({block:"nearest"});
      const rect = element.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      const hit = document.elementFromPoint(x, y);
      if (!hit || !(element === hit || element.contains(hit))) throw new Error("Verdeckter Button: " + ${JSON.stringify(selector)});
      return {x,y};
    })()`);
    if (mouse) {
      await command("Input.dispatchMouseEvent", {type:"mousePressed", ...point, button:"left", clickCount:1});
      await command("Input.dispatchMouseEvent", {type:"mouseReleased", ...point, button:"left", clickCount:1});
    } else {
      await command("Input.dispatchTouchEvent", {type:"touchStart", touchPoints:[point]});
      await command("Input.dispatchTouchEvent", {type:"touchEnd", touchPoints:[]});
    }
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
  if (useJourneyFixture) await command("Fetch.enable", { patterns:[{ urlPattern:"*://*/api/journeys*", requestStage:"Request" }] });
  await setViewport(390, 844);
  await command("Page.navigate", { url });
  await pause(6500);
  const snapshots = [await layoutSnapshot("390x844 initial")];
  await screenshot("390-initial");

  await tap(".mobile-map-view-button");
  await pause(250);
  await tap(".map-menu-actions button:first-child");
  await pause(700);
  snapshots.push(await layoutSnapshot("390x844 planner"));
  await screenshot("390-planner");
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
    for (let attempt = 0; attempt < 60; attempt += 1) {
      const finished = await evaluate(`Boolean(document.querySelector(".journey-card") || document.querySelector(".planner-message.error"))`);
      if (finished) break;
      await pause(500);
    }
  }
  const journeyLoaded = await evaluate(`Boolean(document.querySelector(".journey-card"))`);
  if (!journeyLoaded) throw new Error('Testverbindung wurde nicht geladen');
  await pause(900);
  snapshots.push(await layoutSnapshot(journeyLoaded ? "390x844 journey" : "390x844 planner result"));
  await screenshot(journeyLoaded ? "390-journey" : "390-planner-result");

  if (journeyLoaded) {
    const beforeFreeDrag = await layoutSnapshot("390x844 before free drag");
    await dragSheet(-92);
    const afterFreeDrag = await layoutSnapshot("390x844 freely resized");
    if ((afterFreeDrag.elements[".mobile-sheet-panel"]?.height ?? 0) <= (beforeFreeDrag.elements[".mobile-sheet-panel"]?.height ?? 0) + 40) {
      throw new Error("Bottom-Sheet behält die frei gezogene Höhe nicht bei");
    }
    snapshots.push(afterFreeDrag);
    await dragSheet(55);
    const lowered = await layoutSnapshot('390x844 freely lowered');
    if (Math.abs(lowered.elements['.mobile-sheet-panel'].height - (afterFreeDrag.elements['.mobile-sheet-panel'].height - 55)) > 3) throw new Error('Sheet rastet beim Absenken ein');
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
  for (const width of [375,430,768]) {
    await setViewport(width,844);
    await tap('.mobile-sheet-actions button:last-child');
    if (await evaluate(`getComputedStyle(document.querySelector('.mobile-sheet-panel')).display !== 'none'`)) throw new Error(`X bei ${width}px reagiert nicht`);
    await tap('.mobile-sheet-restore');
    snapshots.push(await layoutSnapshot(`${width} restored`));
  }
  await setViewport(844, 390);
  snapshots.push(await layoutSnapshot("844x390 landscape"));
  await screenshot("844-landscape");

  await tap(".mobile-sheet-actions button:last-child");
  if (await evaluate(`getComputedStyle(document.querySelector(".mobile-sheet-panel")).display !== "none"`)) throw new Error("Sheet bleibt im Querformat trotz X sichtbar");
  await tap(".mobile-sheet-restore");
  await setViewport(1440, 900);
  if (await evaluate(`getComputedStyle(document.querySelector(".mobile-sheet-actions")).display !== "none"`)) throw new Error("Mobile Buttons werden am PC angezeigt");
  await tap(".desktop-panel-actions button:last-child", true);
  if (await evaluate(`Boolean(document.querySelector(".journey-card"))`)) throw new Error("Desktop-X schließt die Verbindung nicht");
  snapshots.push(await layoutSnapshot("1440 desktop closed"));
  // Regression: a hidden via cell used to auto-place the destination in a zero-width column.
  const boardDestinations = await evaluate(`Array.from(document.querySelectorAll('.board-destination')).map(el => ({text:el.textContent.trim(),width:el.getBoundingClientRect().width}))`);
  if (boardDestinations.some(row => !row.text || row.width < 40)) throw new Error('Fahrplanziel fehlt oder ist unsichtbar');
  await screenshot('1440-board-destinations');
  await tap('.desktop-panel-actions button:last-child', true);
  if (await evaluate(`Boolean(document.querySelector('.mobile-sheet-panel'))`)) throw new Error('Desktop-Bahnhof-X reagiert nicht');
  await setViewport(390,844);
  await tap('.mobile-map-view-button');
  await tap('.map-display-toggles button:nth-child(3)');
  await tap('.quick-map-actions button:nth-child(2)');
  if (await evaluate(`document.querySelector('.app-shell').classList.contains('focus-mode')`)) throw new Error('Fokusmodus lässt sich nicht verlassen');
  for (const index of [2,3,1]) {
    await tap('.mobile-map-view-button');
    await tap(`.map-menu-actions button:nth-child(${index})`);
    await tap('.mobile-sheet-actions button:last-child');
    if (await evaluate(`getComputedStyle(document.querySelector('.mobile-sheet-panel')).display !== 'none'`)) throw new Error('X eines weiteren Panels reagiert nicht');
    await tap('.mobile-sheet-restore');
  }
  if (snapshots.some((item) => item.horizontalOverflow)) throw new Error("Horizontaler Überlauf");

  const report = { checkedAt:new Date().toISOString(), url, journeyLoaded, plannerReady, journeyFixture:useJourneyFixture, snapshots };
  await writeFile(join(outputDirectory, "report.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
} finally {
  socket?.close();
  edge.kill();
}
