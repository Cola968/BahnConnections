"use client";

import { useMemo, useState } from "react";
import { estimateMinutes, routePath, ROUTES, type Station } from "./network-data";
import type { LiveTrip } from "./live-trains";
import { PanelTools, usePanelControls, type MobileSheetState } from "./panel-tools";

type StatsTab = "overview" | "network" | "quality";

const REPORT_YEAR = 2025;
const SCHEDULE_YEAR = 2026;

function distanceKm(a: Station, b: Station) {
  const radius = 6371;
  const rad = (value: number) => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(value));
}

function percent(value: number) {
  return `${value.toLocaleString("de-DE", { maximumFractionDigits: 1 })} %`;
}

function buildNetworkModel(stations: Station[]) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const direct = new Map<string, Set<string>>();
  const dailyStops = new Map<string, number>();
  const routeCount = new Map<string, number>();

  for (const route of ROUTES) {
    const validStops = route.stops.filter((id) => stationById.has(id));
    for (const id of validStops) {
      const targets = direct.get(id) ?? new Set<string>();
      for (const target of validStops) if (target !== id) targets.add(target);
      direct.set(id, targets);
      dailyStops.set(id, (dailyStops.get(id) ?? 0) + route.frequency * 2);
      routeCount.set(id, (routeCount.get(id) ?? 0) + 1);
    }
  }

  const profiles = [...direct.entries()].map(([id, targets]) => ({
    station: stationById.get(id)!,
    direct: targets.size,
    domesticDirect: [...targets].filter((target) => stationById.get(target)?.country === "DE").length,
    dailyStops: dailyStops.get(id) ?? 0,
    routes: routeCount.get(id) ?? 0,
  }));
  const germanProfiles = profiles.filter((profile) => profile.station.country === "DE");
  const germanIds = germanProfiles.map((profile) => profile.station.id);
  let directPairs = 0;
  let oneChangePairs = 0;
  for (let left = 0; left < germanIds.length; left += 1) {
    for (let right = left + 1; right < germanIds.length; right += 1) {
      const from = germanIds[left];
      const to = germanIds[right];
      const fromTargets = direct.get(from) ?? new Set<string>();
      if (fromTargets.has(to)) directPairs += 1;
      else if ([...fromTargets].some((transfer) => direct.get(transfer)?.has(to))) oneChangePairs += 1;
    }
  }
  const evaluatedPairs = directPairs + oneChangePairs;
  const hubs = germanProfiles.filter((profile) => profile.station.hub || profile.domesticDirect >= 35);

  const corridors = new Map<string, { from: Station; to: Station; movements: number; types: Set<string> }>();
  for (const route of ROUTES) {
    for (let index = 1; index < route.stops.length; index += 1) {
      const from = stationById.get(route.stops[index - 1]);
      const to = stationById.get(route.stops[index]);
      if (!from || !to || from.country !== "DE" || to.country !== "DE") continue;
      const ids = [from.id, to.id].sort();
      const key = ids.join("|");
      const current = corridors.get(key) ?? { from: ids[0] === from.id ? from : to, to: ids[0] === from.id ? to : from, movements:0, types:new Set<string>() };
      current.movements += route.frequency * 2;
      current.types.add(route.type);
      corridors.set(key, current);
    }
  }

  const stateGroups = new Map<string, typeof germanProfiles>();
  for (const profile of germanProfiles) {
    if (!profile.station.state) continue;
    stateGroups.set(profile.station.state, [...(stateGroups.get(profile.station.state) ?? []), profile]);
  }
  const states = [...stateGroups.entries()].map(([state, values]) => ({
    state,
    stations: values.length,
    averageDirect: values.reduce((sum, value) => sum + value.domesticDirect, 0) / values.length,
    dailyStops: values.reduce((sum, value) => sum + value.dailyStops, 0),
  })).sort((a, b) => b.averageDirect - a.averageDirect || b.dailyStops - a.dailyStops);

  let weightedDistance = 0;
  let weightedHours = 0;
  for (const route of ROUTES) {
    const path = routePath(route, route.stops[0], route.stops.at(-1) ?? route.stops[0]);
    let routeDistance = 0;
    for (let index = 1; index < path.length; index += 1) routeDistance += distanceKm(path[index - 1], path[index]);
    weightedDistance += routeDistance * route.frequency;
    weightedHours += estimateMinutes(route, route.stops[0], route.stops.at(-1) ?? route.stops[0]) / 60 * route.frequency;
  }

  const foreignDestinations = new Set(ROUTES.flatMap((route) => route.stops).filter((id) => {
    const station = stationById.get(id);
    return station && station.country !== "DE";
  }));
  return {
    stationProfiles: new Map(profiles.map((profile) => [profile.station.id, profile])),
    fernStations: germanProfiles.length,
    dailyMovements: ROUTES.reduce((sum, route) => sum + route.frequency * 2, 0),
    directShare: evaluatedPairs ? directPairs / evaluatedPairs * 100 : 0,
    transferShare: evaluatedPairs ? oneChangePairs / evaluatedPairs * 100 : 0,
    hubs: hubs.length,
    odStations: germanProfiles.length - hubs.length,
    internationalDestinations: foreignDestinations.size,
    averageSpeed: weightedHours ? Math.round(weightedDistance / weightedHours) : 0,
    topStations: germanProfiles.sort((a, b) => b.domesticDirect - a.domesticDirect || b.dailyStops - a.dailyStops).slice(0, 6),
    topCorridors: [...corridors.values()].sort((a, b) => b.movements - a.movements).slice(0, 6),
    states: states.slice(0, 6),
  };
}

export function NetworkStats({ open, onClose, stations, liveTrips, selectedStation, liveUpdatedAt, mobileSheetState, onMobileSheetState }: {
  open: boolean;
  onClose: () => void;
  stations: Station[];
  liveTrips: LiveTrip[];
  selectedStation: Station | null;
  liveUpdatedAt: Date | null;
  mobileSheetState: MobileSheetState;
  onMobileSheetState: (state: MobileSheetState) => void;
}) {
  const [tab, setTab] = useState<StatsTab>("overview");
  const controls = usePanelControls("network-report");
  const model = useMemo(() => buildNetworkModel(stations), [stations]);
  const live = useMemo(() => {
    const trips = liveTrips.filter((trip) => trip.category === "fern");
    const averageDelay = trips.length ? trips.reduce((sum, trip) => sum + trip.delay, 0) / trips.length : 0;
    const share = (minutes: number) => trips.length ? trips.filter((trip) => trip.delay >= minutes).length / trips.length * 100 : 0;
    return { count:trips.length, averageDelay, over6:share(6), over15:share(15), over30:share(30), realtime:trips.length ? trips.filter((trip) => trip.realTime).length / trips.length * 100 : 0 };
  }, [liveTrips]);
  if (!open) return null;

  return (
    <aside className="stats-panel floating-panel mobile-sheet-panel" style={controls.style} aria-label="Netz- und Qualitätsstatistiken">
      <PanelTools controls={controls} label="Netzreport" onClose={onClose} mobileState={mobileSheetState} onMobileStateChange={onMobileSheetState} mobileSummary={`Datenstand ${REPORT_YEAR}`} />
      <header className="stats-head">
        <div><span className="eyebrow plain">BAHNCONNECTIONS NETZREPORT</span><h2>Netz & Qualität</h2><p>Datenstand: {REPORT_YEAR} · Fahrplan {SCHEDULE_YEAR} · jährliche Aktualisierung</p></div>
      </header>
      <div className="stats-tabs" role="tablist" aria-label="Statistikbereiche">
        {(["overview","network","quality"] as StatsTab[]).map((value) => <button key={value} role="tab" aria-selected={tab === value} className={tab === value ? "active" : ""} onClick={() => setTab(value)}>{value === "overview" ? "Überblick" : value === "network" ? "Netz" : "Qualität"}</button>)}
      </div>

      {tab === "overview" && <div className="stats-body">
        <section className="annual-kpis">
          <article><small>Pünktlichkeit Fernverkehr</small><strong>60,1 %</strong><span className="negative">−2,4 Pp. zu 2024</span></article>
          <article><small>Reisendenpünktlichkeit</small><strong>65,5 %</strong><span className="negative">−1,9 Pp. zu 2024</span></article>
          <article><small>Auslastung</small><strong>47,9 %</strong><span className="positive">+0,9 Pp. zu 2024</span></article>
          <article><small>Betriebsleistung</small><strong>161,2 Mio.</strong><span className="positive">Zug-km · +0,7 %</span></article>
        </section>
        <section className="stats-section"><div className="stats-section-title"><span>Fahrplanmodell {SCHEDULE_YEAR}</span><small>live berechnet</small></div><div className="metric-list">
          <span><b>{model.fernStations}</b><small>deutsche Fernbahnhöfe im Modell</small></span>
          <span><b>≈ {model.dailyMovements}</b><small>modellierte ICE/IC/EC-Fahrten je Betriebstag</small></span>
          <span><b>{model.internationalDestinations}</b><small>internationale Direktziele im Modell</small></span>
          <span><b>{model.averageSpeed}</b><small>km/h mittlere Modell-Reisegeschwindigkeit</small></span>
        </div></section>
        <section className="stats-callout"><b>Was ist offiziell, was ist Modell?</b><p>Geschäftszahlen stammen aus dem DB-Bericht {REPORT_YEAR}. Direktziele, Umsteigeanteile und Rankings werden aus den {ROUTES.length} gepflegten Linienvarianten berechnet; sie sind keine Fahrgaststromstatistik.</p></section>
      </div>}

      {tab === "network" && <div className="stats-body">
        <section className="split-card"><div><small>Direkt erreichbar</small><strong>{percent(model.directShare)}</strong><span>der mit höchstens einem Umstieg erreichbaren Bahnhofspaare</span></div><div><small>Ein Umstieg nötig</small><strong>{percent(model.transferShare)}</strong><span>im Kartenmodell</span></div><i><span style={{ width:`${model.directShare}%` }} /></i></section>
        <section className="od-card"><div><b>{model.odStations}</b><span>O&D-geprägte Fernbahnhöfe</span></div><div><b>{model.hubs}</b><span>Netzknoten / Hubs</span></div><p>Hub = als Knoten markiert oder mindestens 35 direkte Inlandsziele. Das Modell enthält damit deutlich mehr Start-/Zielbahnhöfe als große Umsteigeknoten.</p></section>
        <section className="stats-section"><div className="stats-section-title"><span>Top-Bahnhöfe</span><small>direkte Inlandsziele</small></div><ol className="rank-list">{model.topStations.map((profile, index) => <li key={profile.station.id}><i>{index + 1}</i><span><b>{profile.station.name}</b><small>{profile.dailyStops} modellierte Fernzughalte/Tag</small></span><strong>{profile.domesticDirect}</strong></li>)}</ol></section>
        <section className="stats-section"><div className="stats-section-title"><span>Stärkste Korridore</span><small>modellierte Fahrten/Tag</small></div><ol className="rank-list corridors">{model.topCorridors.map((corridor, index) => <li key={`${corridor.from.id}-${corridor.to.id}`}><i>{index + 1}</i><span><b>{corridor.from.name} – {corridor.to.name}</b><small>{[...corridor.types].join(" · ")}</small></span><strong>{corridor.movements}</strong></li>)}</ol></section>
        <section className="stats-section"><div className="stats-section-title"><span>Bundesländer</span><small>Ø Direktziele je Fernbahnhof</small></div><ol className="rank-list states">{model.states.map((state, index) => <li key={state.state}><i>{index + 1}</i><span><b>{state.state}</b><small>{state.stations} Fernbahnhöfe im Modell</small></span><strong>{state.averageDirect.toLocaleString("de-DE", { maximumFractionDigits:1 })}</strong></li>)}</ol><p className="method-note">Zuordnung: amtliche BKG-Verwaltungsgrenzen, Stand 2025.</p></section>
      </div>}

      {tab === "quality" && <div className="stats-body">
        <section className="live-quality"><div className="stats-section-title"><span><i /> Live im Kartenausschnitt</span><small>{liveUpdatedAt ? `aktualisiert ${liveUpdatedAt.toLocaleTimeString("de-DE", { timeZone:"Europe/Berlin", hour:"2-digit", minute:"2-digit" })}` : "wartet auf Bahnhof"}</small></div>{live.count ? <><div className="live-quality-grid"><span><b>{live.count}</b><small>Fernzugsegmente</small></span><span><b>{live.averageDelay.toLocaleString("de-DE", { maximumFractionDigits:1 })}</b><small>Ø Verspätung, Min.</small></span><span><b>{percent(live.realtime)}</b><small>mit Echtzeit</small></span></div><div className="delay-bars">{[["ab 6 Min.",live.over6],["ab 15 Min.",live.over15],["ab 30 Min.",live.over30]].map(([label,value]) => <div key={String(label)}><span>{label}</span><i><b style={{ width:`${value}%` }} /></i><strong>{percent(Number(value))}</strong></div>)}</div></> : <p className="live-empty">Wähle einen Bahnhof aus. Dann werden die Fernzugsegmente in seiner Umgebung live ausgewertet.</p>}<small className="live-scope">Momentaufnahme rund um {selectedStation?.name ?? "den gewählten Bahnhof"}; nicht als bundesweiter Jahreswert zu lesen.</small></section>
        <section className="annual-kpis quality-kpis"><article><small>DB-Fernzüge &lt; 6 Min.</small><strong>60,1 %</strong><span>betriebliche Pünktlichkeit {REPORT_YEAR}</span></article><article><small>Reiseketten &lt; 15 Min.</small><strong>65,5 %</strong><span>inkl. Anschlüsse und Ausfälle</span></article><article><small>Stufenfrei erreichbar</small><strong>&gt; 88 %</strong><span>aller DB-Bahnsteige · 30.11.{REPORT_YEAR}</span></article><article><small>WLAN</small><strong>100 % ICE</strong><span>IC-Abdeckung wird weiter ausgebaut</span></article></section>
        <section className="stats-callout"><b>Nicht seriös pauschalisierbar</b><p>Eine belastbare Jahresquote für Verspätungen über 15/30 Minuten, Bordrestaurant-Abdeckung aller Fernzüge oder vollständig barrierefreie Fernbahnhöfe veröffentlicht die DB in dieser Form nicht. Deshalb zeigt BahnConnections hier Live-Snapshots oder klar abgegrenzte Ersatzkennzahlen.</p></section>
      </div>}

      <footer className="stats-footer"><span>Geprüft am 30.08.2026</span><div><a href="https://ibir.deutschebahn.com/2025/de/zusammengefasster-lagebericht/entwicklung-der-geschaeftsfelder/geschaeftsfeld-db-fernverkehr/entwicklung-im-berichtsjahr/" target="_blank" rel="noreferrer">DB-Bericht ↗</a><a href="https://www.deutschebahn.com/de/konzern/konzernprofil/zahlen_fakten/puenktlichkeitswerte-6878476" target="_blank" rel="noreferrer">Monatswerte ↗</a><a href="https://www.bkg.bund.de/SharedDocs/Produktinformationen/BKG/DE/P-2025/251027_VG250.html" target="_blank" rel="noreferrer">BKG ↗</a></div></footer>
    </aside>
  );
}

export function buildStationImportance(stations: Station[]) {
  return buildNetworkModel(stations).stationProfiles;
}
