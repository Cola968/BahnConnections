"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { journeyDistanceKm, readJourneyHistory, removeJourneyFromHistory, type StoredJourney } from "../travel-store";

function date(value?: string) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", { day:"2-digit", month:"short", year:"numeric" }).format(new Date(value));
}
function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { hour:"2-digit", minute:"2-digit", timeZone:"Europe/Berlin" }).format(new Date(value));
}
function serviceGroup(item: StoredJourney) {
  const categories = item.journey.transitLegs.map((leg) => (leg.category ?? "").toLowerCase()).join(" ");
  if (categories.includes("ice") || categories.includes("ic") || categories.includes("ec")) return "fern";
  if (categories.includes("s-bahn") || categories.includes("sbahn")) return "sbahn";
  return "regional";
}

export default function PassportPage() {
  const [journeys, setJourneys] = useState<StoredJourney[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "fern" | "regional" | "sbahn">("all");
  const [sort, setSort] = useState<"newest" | "oldest">("newest");

  useEffect(() => {
    const timer = window.setTimeout(() => setJourneys(readJourneyHistory()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  const stats = useMemo(() => {
    const km = journeys.reduce((sum, item) => sum + journeyDistanceKm(item.journey), 0);
    const minutes = journeys.reduce((sum, item) => sum + Math.round(item.journey.durationSeconds / 60), 0);
    const stationCounts = new Map<string, number>();
    const services = new Map<string, number>();
    journeys.forEach((item) => {
      item.journey.transitLegs.forEach((leg) => {
        services.set(leg.name, (services.get(leg.name) ?? 0) + 1);
        leg.stops.forEach((stop) => stationCounts.set(stop.name, (stationCounts.get(stop.name) ?? 0) + 1));
      });
    });
    const topStation = [...stationCounts.entries()].sort((a,b) => b[1] - a[1])[0]?.[0] ?? "–";
    const favoriteService = [...services.entries()].sort((a,b) => b[1] - a[1])[0]?.[0] ?? "–";
    const longest = [...journeys].sort((a,b) => b.journey.durationSeconds - a.journey.durationSeconds)[0] ?? null;
    return { km, minutes, stations:stationCounts.size, favoriteService, topStation, longest };
  }, [journeys]);

  const visibleJourneys = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return journeys
      .filter((item) => filter === "all" || serviceGroup(item) === filter)
      .filter((item) => {
        if (!normalized) return true;
        return item.journey.transitLegs.some((leg) =>
          [leg.name, leg.from.name, leg.to.name, leg.headsign].some((value) => value?.toLowerCase().includes(normalized))
        );
      })
      .sort((a,b) => {
        const left = new Date(a.completedAt ?? a.startedAt).getTime();
        const right = new Date(b.completedAt ?? b.startedAt).getTime();
        return sort === "newest" ? right - left : left - right;
      });
  }, [journeys, query, filter, sort]);

  function remove(id: string) {
    if (!window.confirm("Diese Fahrt wirklich aus dem Passport entfernen?")) return;
    removeJourneyFromHistory(id);
    setJourneys(readJourneyHistory());
  }

  function exportData() {
    const blob = new Blob([JSON.stringify({ exportedAt:new Date().toISOString(), journeys }, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "bahnconnections-passport.json";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const longestFrom = stats.longest?.journey.transitLegs[0]?.from.name;
  const longestTo = stats.longest?.journey.transitLegs.at(-1)?.to.name;

  return (
    <main className="passport-shell v33-surface">
      <header className="passport-topbar product-topbar">
        <Link href="/passport" className="passport-brand product-brand"><span>B</span><b>BahnConnections</b><em>Passport</em></Link>
        <nav><Link href="/">Atlas</Link><Link href="/pulse">Pulse</Link></nav>
      </header>

      <section className="passport-hero passport-hero-v33">
        <div className="passport-title-row">
          <div>
            <span className="passport-kicker">DEIN BAHNLEBEN</span>
            <h1>Passport</h1>
            <p>Deine Fahrten, dein Netz, deine Geschichte – lokal auf diesem Gerät.</p>
          </div>
          <button type="button" className="passport-export" onClick={exportData} disabled={!journeys.length}>Daten exportieren</button>
        </div>

        <div className="passport-stats passport-stats-v33">
          <article><span>Fahrten</span><strong>{journeys.length}</strong><small>abgeschlossen</small></article>
          <article><span>Strecke</span><strong>{stats.km.toLocaleString("de-DE")}<small> km</small></strong><small>näherungsweise</small></article>
          <article><span>Zeit unterwegs</span><strong>{Math.round(stats.minutes / 60)}<small> h</small></strong><small>im Zug</small></article>
          <article><span>Bahnhöfe</span><strong>{stats.stations}</strong><small>im Reiseverlauf</small></article>
        </div>
      </section>

      <section className="passport-content">
        <div className="passport-insights">
          <article><span>Top-Bahnhof</span><b>{stats.topStation}</b><small>am häufigsten in deinen Fahrten</small></article>
          <article><span>Meistgenutzter Zug</span><b>{stats.favoriteService}</b><small>nach gespeicherten Zugläufen</small></article>
          <article><span>Längste Reise</span><b>{stats.longest ? Math.round(stats.longest.journey.durationSeconds / 3600 * 10) / 10 + " Std." : "–"}</b><small>{longestFrom && longestTo ? longestFrom + " → " + longestTo : "noch keine Fahrt"}</small></article>
        </div>

        <div className="passport-list-head passport-list-head-v33">
          <div><span>REISEARCHIV</span><h2>Deine Fahrten</h2><p>{visibleJourneys.length} von {journeys.length} Fahrten</p></div>
          <Link href="/">Neue Reise planen</Link>
        </div>

        <div className="passport-controls">
          <label className="passport-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Bahnhof, Zug oder Ziel suchen" /></label>
          <div className="passport-filters" role="group" aria-label="Verkehrsart filtern">
            {([["all","Alle"],["fern","Fern"],["regional","Regio"],["sbahn","S-Bahn"]] as const).map(([value,label]) => (
              <button key={value} type="button" className={filter === value ? "active" : ""} onClick={() => setFilter(value)}>{label}</button>
            ))}
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value as "newest" | "oldest")} aria-label="Fahrten sortieren">
            <option value="newest">Neueste zuerst</option>
            <option value="oldest">Älteste zuerst</option>
          </select>
        </div>

        {visibleJourneys.length === 0 ? (
          <div className="passport-empty passport-empty-v33">
            <span>◎</span><b>{journeys.length ? "Keine passende Fahrt gefunden." : "Noch kein Stempel im Passport."}</b>
            <p>{journeys.length ? "Ändere Suche oder Filter." : "Öffne eine Verbindung in Pulse und beende die Fahrt anschließend."}</p>
          </div>
        ) : (
          <div className="passport-list passport-list-v33">{visibleJourneys.map((item) => {
            const first = item.journey.transitLegs[0];
            const last = item.journey.transitLegs.at(-1);
            const km = journeyDistanceKm(item.journey);
            const delay = Math.round((new Date(item.journey.endTime).getTime() - new Date(item.journey.scheduledEndTime).getTime()) / 60_000);
            return <article key={item.id} className="passport-trip passport-trip-v33">
              <div className="passport-trip-date"><span>{date(item.completedAt)}</span><b>{first?.name ?? "Bahnfahrt"}</b></div>
              <div className="passport-trip-main">
                <div className="passport-trip-route"><strong>{first?.from.name ?? "Start"}</strong><i>→</i><strong>{last?.to.name ?? "Ziel"}</strong></div>
                <div className="passport-trip-meta">
                  <span>{clock(item.journey.startTime)}–{clock(item.journey.endTime)}</span>
                  <span>{Math.round(item.journey.durationSeconds / 60)} Min.</span>
                  <span>{km} km*</span>
                  <span>{item.journey.transfers ? item.journey.transfers + "× umsteigen" : "direkt"}</span>
                  {delay > 0 && <span className="passport-delay">+{delay} Min.</span>}
                </div>
              </div>
              <button type="button" onClick={() => remove(item.id)} aria-label="Fahrt entfernen">Entfernen</button>
            </article>;
          })}</div>
        )}
      </section>
    </main>
  );
}
