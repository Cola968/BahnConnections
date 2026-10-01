"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { journeyDistanceKm, readJourneyHistory, removeJourneyFromHistory, type StoredJourney } from "../travel-store";

function date(value?: string) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}
function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(value));
}

export default function PassportPage() {
  const [journeys, setJourneys] = useState<StoredJourney[]>([]);
  useEffect(() => {
    const timer = window.setTimeout(() => setJourneys(readJourneyHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);
  const stats = useMemo(() => {
    const km = journeys.reduce((sum, item) => sum + journeyDistanceKm(item.journey), 0);
    const minutes = journeys.reduce((sum, item) => sum + Math.round(item.journey.durationSeconds / 60), 0);
    const stations = new Set(journeys.flatMap((item) => item.journey.transitLegs.flatMap((leg) => leg.stops.map((stop) => stop.name))));
    const services = new Map<string, number>();
    journeys.flatMap((item) => item.journey.transitLegs).forEach((leg) => services.set(leg.name, (services.get(leg.name) ?? 0) + 1));
    const favoriteService = [...services.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "–";
    return { km, minutes, stations: stations.size, favoriteService };
  }, [journeys]);
  function remove(id: string) {
    removeJourneyFromHistory(id);
    setJourneys(readJourneyHistory());
  }
  return (
    <main className="passport-shell">
      <header className="passport-topbar">
        <Link href="/" className="passport-brand"><span>B</span><b>BahnConnections</b><em>Passport</em></Link>
        <nav><Link href="/">Atlas</Link><Link href="/pulse">Pulse</Link></nav>
      </header>
      <section className="passport-hero">
        <span className="passport-kicker">DEIN BAHNLEBEN</span>
        <h1>Passport</h1>
        <p>Jede in Pulse beendete Fahrt wird hier zu deiner persönlichen Reisehistorie.</p>
        <div className="passport-stats">
          <article><strong>{journeys.length}</strong><span>Fahrten</span></article>
          <article><strong>{stats.km.toLocaleString("de-DE")}</strong><span>Kilometer*</span></article>
          <article><strong>{Math.round(stats.minutes / 60)}</strong><span>Stunden</span></article>
          <article><strong>{stats.stations}</strong><span>Bahnhöfe</span></article>
        </div>
        <small>* aus verfügbaren Halte-Koordinaten näherungsweise berechnet</small>
      </section>
      <section className="passport-content">
        <div className="passport-summary">
          <div><span>Meistgenutzter Zug</span><b>{stats.favoriteService}</b></div>
          <div><span>Letzte Reise</span><b>{journeys[0] ? date(journeys[0].completedAt) : "Noch keine Fahrt"}</b></div>
        </div>
        <div className="passport-list-head"><div><span>REISEARCHIV</span><h2>Deine Fahrten</h2></div><Link href="/">Neue Reise planen</Link></div>
        {journeys.length === 0 ? (
          <div className="passport-empty"><b>Noch kein Stempel im Passport.</b><p>Öffne eine Verbindung in Pulse und beende die Fahrt anschließend.</p></div>
        ) : (
          <div className="passport-list">{journeys.map((item) => {
            const first = item.journey.transitLegs[0];
            const last = item.journey.transitLegs.at(-1);
            return <article key={item.id} className="passport-trip">
              <div className="passport-trip-date"><span>{date(item.completedAt)}</span><b>{first?.name ?? "Bahnfahrt"}</b></div>
              <div className="passport-trip-route"><strong>{first?.from.name ?? "Start"}</strong><i>→</i><strong>{last?.to.name ?? "Ziel"}</strong></div>
              <div className="passport-trip-meta"><span>{clock(item.journey.startTime)}–{clock(item.journey.endTime)}</span><span>{Math.round(item.journey.durationSeconds / 60)} Min.</span><span>{journeyDistanceKm(item.journey)} km*</span></div>
              <button type="button" onClick={() => remove(item.id)}>Entfernen</button>
            </article>;
          })}</div>
        )}
      </section>
    </main>
  );
}
