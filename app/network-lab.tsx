"use client";

import { useMemo, useState } from "react";
import type { BoardSummary } from "./live-board";
import type { LiveTrip } from "./live-trains";
import { calculateReachability, rankRoutes } from "./network-intelligence";
import type { Route, Station } from "./network-data";
import { PanelTools, usePanelControls, type MobileSheetState } from "./panel-tools";

type LabTab = "lage" | "reisezeit" | "simulation" | "vergleich";

export function NetworkLab({ open, onClose, selected, routes, stations, liveTrips, boardSummary, blockedRouteIds, blockedStationIds, onToggleRoute, onToggleStation, onResetBlocks, reachabilityMinutes, onReachabilityMinutes, onShowReachability, mobileSheetState, onMobileSheetState }: {
  open: boolean;
  onClose: () => void;
  selected: Station | null;
  routes: Route[];
  stations: Station[];
  liveTrips: LiveTrip[];
  boardSummary: BoardSummary | null;
  blockedRouteIds: Set<string>;
  blockedStationIds: Set<string>;
  onToggleRoute: (id: string) => void;
  onToggleStation: (id: string) => void;
  onResetBlocks: () => void;
  reachabilityMinutes: number;
  onReachabilityMinutes: (minutes: number) => void;
  onShowReachability: () => void;
  mobileSheetState: MobileSheetState;
  onMobileSheetState: (state: MobileSheetState) => void;
}) {
  const [tab, setTab] = useState<LabTab>("lage");
  const controls = usePanelControls("network-lab");
  const selectedRoutes = useMemo(() => selected ? routes.filter((route) => route.stops.includes(selected.id)) : [], [routes, selected]);
  const reachable = useMemo(() => selected ? calculateReachability(routes, stations, selected.id, { maxChanges:2, transferMinutes:18, blockedRouteIds, blockedStationIds }) : [], [blockedRouteIds, blockedStationIds, routes, selected, stations]);
  const baseline = useMemo(() => selected ? calculateReachability(routes, stations, selected.id, { maxChanges:2, transferMinutes:18 }) : [], [routes, selected, stations]);
  const within = reachable.filter((item) => item.minutes <= reachabilityMinutes);
  const lost = Math.max(0, baseline.filter((item) => item.minutes <= 240).length - reachable.filter((item) => item.minutes <= 240).length);
  const ranked = useMemo(() => rankRoutes(routes, liveTrips).slice(0, 8), [liveTrips, routes]);
  const gems = useMemo(() => reachable.filter((item) => item.minutes <= 240 && item.station.country === "DE" && !item.station.hub && item.station.source !== "db").sort((a, b) => a.changes - b.changes || a.minutes - b.minutes).slice(0, 6), [reachable]);
  const averageDelay = liveTrips.length ? liveTrips.reduce((sum, trip) => sum + trip.delay, 0) / liveTrips.length : 0;
  const lateShare = liveTrips.length ? liveTrips.filter((trip) => trip.delay >= 6).length / liveTrips.length * 100 : 0;
  const health = !boardSummary ? { label:"Daten laden", tone:"unknown" } : boardSummary.canceled > 0 || boardSummary.delayed15 / Math.max(1, boardSummary.total) > .2 ? { label:"Angespannt", tone:"risk" } : boardSummary.delayed6 / Math.max(1, boardSummary.total) > .2 ? { label:"Beobachten", tone:"medium" } : { label:"Stabil", tone:"good" };
  if (!open) return null;

  return (
    <aside className="network-lab floating-panel mobile-sheet-panel" style={controls.style} aria-label="Netzlabor">
      <PanelTools controls={controls} label="Netzlabor" onClose={onClose} mobileState={mobileSheetState} onMobileStateChange={onMobileSheetState} mobileSummary={selected ? `Ausgangspunkt ${selected.name}` : "Live-Lage und Simulation"} />
      <header className="lab-head"><span>LIVE-ANALYSE & SIMULATION</span><h2>Was passiert im Netz?</h2><p>{selected ? `Ausgangspunkt ${selected.name}` : "Wähle zuerst einen Bahnhof auf der Karte."}</p></header>
      <nav className="lab-tabs" aria-label="Netzlabor Bereiche">
        {(["lage","reisezeit","simulation","vergleich"] as LabTab[]).map((value) => <button key={value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "lage" ? "Lage" : value === "reisezeit" ? "Reisezeit" : value === "simulation" ? "Was wäre wenn" : "Vergleich"}</button>)}
      </nav>

      {tab === "lage" && <div className="lab-body">
        <section className={`health-card ${health.tone}`}><div><span>Bahnhofs-Gesundheitscheck</span><strong>{health.label}</strong></div><i /><p>{boardSummary ? `${boardSummary.total} Fahrten im 500-Min.-Fenster · ${boardSummary.delayed15} ab +15 Min. · ${boardSummary.canceled} Ausfälle.` : "Die Live-Tafel liefert gleich den lokalen Status."}</p></section>
        <section className="lab-kpis"><article><span>Live-Segmente</span><b>{liveTrips.length}</b><small>im Stationsumfeld</small></article><article><span>Ø Abweichung</span><b>{averageDelay.toLocaleString("de-DE", { maximumFractionDigits:1 })}</b><small>Minuten</small></article><article><span>ab +6 Min.</span><b>{lateShare.toLocaleString("de-DE", { maximumFractionDigits:0 })}%</b><small>Momentaufnahme</small></article></section>
        <section className="lab-section"><h3>Netzwerk-Stresskarte</h3><p>Die Karte bündelt die Live-Fahrten räumlich. Grün steht für eine ruhige Lage, Ocker für Verzögerungen und Koralle für starke Belastung. Keine Zugnummer verdeckt mehr die Übersicht.</p><button onClick={onShowReachability}>Stresskarte auf Karte fokussieren</button></section>
        <section className="lab-section infrastructure"><h3>Infrastrukturstatus</h3><dl><div><dt>Aufzüge</dt><dd>Keine verifizierte Live-Schnittstelle</dd></div><div><dt>Großbaustellen</dt><dd>Nicht im aktuellen Feed</dd></div><div><dt>Prognose</dt><dd>aus Live-Tafelsnapshot</dd></div></dl><p>Ungeprüfte Aufzugs- oder Baustellenmeldungen werden bewusst nicht erfunden.</p></section>
      </div>}

      {tab === "reisezeit" && <div className="lab-body">
        <section className="lab-section reachability-control"><h3>Persönlicher Erreichbarkeits-Radius</h3><p>Mit realistisch modellierten Fahrzeiten, bis zu zwei Umstiegen und 18 Minuten je Umstieg.</p><div>{[60,120,180,240].map((minutes) => <button key={minutes} className={reachabilityMinutes === minutes ? "active" : ""} onClick={() => onReachabilityMinutes(minutes)}>{minutes / 60} h</button>)}</div><button className="lab-primary" onClick={onShowReachability}>Reisezeit-Heatmap anzeigen</button></section>
        <section className="reachability-score"><strong>{within.length}</strong><span>Fernziele in höchstens {reachabilityMinutes / 60} Stunden</span><small>{within.filter((item) => item.changes === 0).length} davon direkt</small></section>
        <section className="lab-section"><h3>Am Rand des Radius</h3><ol className="lab-list">{within.slice(-6).reverse().map((item) => <li key={item.station.id}><span><b>{item.station.name}</b><small>{item.changes ? `${item.changes} Umstieg${item.changes > 1 ? "e" : ""}` : "direkt"}</small></span><strong>{item.minutes} Min.</strong></li>)}</ol></section>
        <section className="lab-section"><h3>Versteckte Perlen</h3><ol className="lab-list gems">{gems.map((item) => <li key={item.station.id}><span><b>{item.station.name}</b><small>{item.routes.join(" · ")}</small></span><strong>{item.minutes} Min.</strong></li>)}</ol><p>Ziele werden nach Erreichbarkeit und wenigen Umstiegen ausgewählt. Eine niedrige Auslastung wird mangels belastbarer Stationsdaten nicht behauptet.</p></section>
      </div>}

      {tab === "simulation" && <div className="lab-body">
        <section className="simulation-impact"><span>Erreichbarkeit in 4 h</span><strong>{reachable.filter((item) => item.minutes <= 240).length}</strong><small>{lost ? `−${lost} Ziele durch aktuelle Sperren` : "keine simulierten Verluste"}</small></section>
        <section className="lab-section"><div className="lab-title-row"><h3>Linien deaktivieren</h3>{blockedRouteIds.size > 0 && <button onClick={onResetBlocks}>Zurücksetzen</button>}</div><p>Schalte einen Korridor aus. Reisezeitkarte und Routenalternativen rechnen sofort neu.</p><div className="simulation-list">{selectedRoutes.slice(0, 12).map((route) => <label key={route.id}><input type="checkbox" checked={!blockedRouteIds.has(route.id)} onChange={() => onToggleRoute(route.id)} /><span><b>{route.id}</b><small>{route.operator} · {route.frequency} Zugpaare/Tag</small></span></label>)}</div></section>
        <section className="lab-section"><h3>Bahnhof deaktivieren</h3><select value="" onChange={(event) => { if (event.target.value) onToggleStation(event.target.value); }}><option value="">Bahnhof für Simulation wählen …</option>{stations.filter((station) => station.source !== "db" && station.id !== selected?.id).slice().sort((a,b) => a.name.localeCompare(b.name,"de")).map((station) => <option key={station.id} value={station.id}>{station.name}</option>)}</select>{blockedStationIds.size > 0 && <div className="blocked-chips">{[...blockedStationIds].map((id) => <button key={id} onClick={() => onToggleStation(id)}>{stations.find((station) => station.id === id)?.name ?? id} ×</button>)}</div>}</section>
      </div>}

      {tab === "vergleich" && <div className="lab-body">
        <section className="lab-section"><h3>Strecken-Ranking</h3><p>Score aus Takt, modellierter Reisezeit und der aktuellen lokalen Live-Stichprobe.</p><ol className="route-ranking">{ranked.map((item, index) => <li key={item.route.id}><i>{index + 1}</i><span><b>{item.route.id}</b><small>{item.route.operator} · ~{item.route.frequency} Zugpaare/Tag</small></span><strong>{item.score}</strong></li>)}</ol></section>
        <section className="trend-card"><div><span>Langzeit-Trend Fernverkehr</span><b>60,1 %</b><small>Pünktlichkeit 2025</small></div><div><span>Veränderung</span><b>−2,4 Pp.</b><small>gegenüber 2024</small></div><p>Offizieller DB-Netzwert. Eine belastbare mehrjährige Zeitreihe je Bahnhof liegt im genutzten Feed nicht vor und wird daher nicht vorgetäuscht.</p><a href="https://ibir.deutschebahn.com/2025/de/zusammengefasster-lagebericht/entwicklung-der-geschaeftsfelder/geschaeftsfeld-db-fernverkehr/entwicklung-im-berichtsjahr/" target="_blank" rel="noreferrer">DB-Geschäftsbericht 2025 ↗</a></section>
      </div>}
      <footer className="lab-footer">Live-Snapshot + Fahrplanmodell 2026 · Annahmen sind direkt an der Kennzahl benannt.</footer>
    </aside>
  );
}
