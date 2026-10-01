"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LiveRideMode } from "../live-ride-mode";
import { completeActiveJourney, readActiveJourney, readJourneyHistory, type StoredJourney } from "../travel-store";

function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function minutes(value: number) {
  if (value <= 0) return "angekommen";
  if (value < 60) return value + " Min.";
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? hours + " Std. " + rest + " Min." : hours + " Std.";
}

export default function PulsePage() {
  const [record, setRecord] = useState<StoredJourney | null>(null);
  const [lastTrip, setLastTrip] = useState<StoredJourney | null>(null);
  const [ready, setReady] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setRecord(readActiveJourney());
      setLastTrip(readJourneyHistory()[0] ?? null);
      setNow(Date.now());
      setReady(true);
    }, 0);
    const ticker = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(ticker);
    };
  }, []);

  const summary = useMemo(() => {
    if (!record) return null;
    const journey = record.journey;
    const start = new Date(journey.startTime).getTime();
    const end = new Date(journey.endTime).getTime();
    const current = now || new Date(journey.updatedAt).getTime();
    const total = Math.max(1, end - start);
    const progress = Math.max(0, Math.min(100, Math.round(((current - start) / total) * 100)));
    const remainingMinutes = Math.max(0, Math.round((end - current) / 60_000));
    const delay = Math.round((new Date(journey.endTime).getTime() - new Date(journey.scheduledEndTime).getTime()) / 60_000);
    const alerts = journey.transitLegs.reduce((sum, leg) => sum + leg.alerts.length, 0);
    const risk = journey.transitLegs.slice(0, -1).reduce<number | null>((smallest, leg, index) => {
      const next = journey.transitLegs[index + 1];
      if (!next) return smallest;
      const transfer = Math.round((new Date(next.startTime).getTime() - new Date(leg.endTime).getTime()) / 60_000);
      return smallest === null || transfer < smallest ? transfer : smallest;
    }, null);
    const status =
      journey.cancelled ? { label:"Fahrt fällt aus", tone:"danger" } :
      risk !== null && risk < 8 ? { label:"Anschluss knapp", tone:"danger" } :
      alerts > 0 || delay > 5 ? { label:"Fahrt beobachten", tone:"watch" } :
      { label:"Fahrt läuft ruhig", tone:"good" };
    return { progress, remainingMinutes, delay, alerts, risk, status };
  }, [record, now]);

  function finishJourney() {
    const finished = completeActiveJourney();
    setLastTrip(finished);
    setRecord(null);
  }

  const primary = record?.journey.transitLegs[0] ?? null;
  const finalLeg = record?.journey.transitLegs.at(-1) ?? null;
  const destination = finalLeg?.to.name ?? "Ziel";

  return (
    <main className="pulse-shell v33-surface">
      <header className="pulse-topbar product-topbar">
        <Link className="pulse-brand product-brand" href="/pulse"><span>B</span><b>BahnConnections</b><em>Pulse</em></Link>
        <nav><Link href="/">Atlas</Link><Link href="/passport">Passport</Link></nav>
      </header>

      {!ready ? (
        <section className="pulse-empty pulse-loading"><div className="pulse-loader" /><p>Deine Reise wird vorbereitet …</p></section>
      ) : !record ? (
        <section className="pulse-empty pulse-home">
          <div className="pulse-home-copy">
            <span className="pulse-kicker">PULSE · UNTERWEGS</span>
            <h1>Deine Reise.<br/>Nur das, was jetzt zählt.</h1>
            <p>Plane in Atlas. Pulse übernimmt unterwegs mit Live-Status, Geschwindigkeit, nächsten Halten und Anschlusswächter.</p>
            <div className="pulse-empty-actions">
              <Link className="pulse-primary" href="/">Reise in Atlas planen</Link>
              <Link href="/passport">Passport öffnen</Link>
            </div>
          </div>
          <div className="pulse-home-visual" aria-hidden="true">
            <div className="pulse-demo-card">
              <div className="pulse-demo-line"><span>ICE</span><b>Berlin → München</b><em>live</em></div>
              <strong>243 <small>km/h</small></strong>
              <p>Nächster Halt · Leipzig Hbf · 12:41</p>
              <div className="pulse-demo-progress"><i /></div>
            </div>
          </div>
          <div className="pulse-feature-grid">
            <article><span>01</span><b>Live-Fahrt</b><p>Geschwindigkeit, nächster Halt, Restzeit und GPS-Qualität auf einen Blick.</p></article>
            <article><span>02</span><b>Anschlusswächter</b><p>Pulse erkennt knappe Umstiege und hebt sie genau dann hervor, wenn es relevant wird.</p></article>
            <article><span>03</span><b>Passport</b><p>Abgeschlossene Fahrten werden lokal zu deiner persönlichen Bahn-Historie.</p></article>
          </div>
          {lastTrip && (
            <Link className="pulse-last-trip" href="/passport">
              <span>Letzte Reise</span>
              <b>{lastTrip.journey.transitLegs[0]?.from.name ?? "Start"} → {lastTrip.journey.transitLegs.at(-1)?.to.name ?? "Ziel"}</b>
              <em>Im Passport ansehen →</em>
            </Link>
          )}
        </section>
      ) : summary && (
        <section className="pulse-journey">
          <div className="pulse-hero pulse-hero-v33">
            <div className="pulse-hero-top">
              <div>
                <span className="pulse-kicker">AKTIVE REISE</span>
                <div className={"pulse-live-state " + summary.status.tone}><i />{summary.status.label}</div>
              </div>
              <span className="pulse-service-badge">{primary?.name ?? "Verbindung"}</span>
            </div>

            <div className="pulse-route pulse-route-v33">
              <div><small>Start</small><strong>{primary?.from.name ?? "Start"}</strong><span>{clock(record.journey.startTime)}</span></div>
              <div className="pulse-route-track"><i style={{ width: summary.progress + "%" }} /><span style={{ left: summary.progress + "%" }} /></div>
              <div><small>Ziel</small><strong>{destination}</strong><span>{clock(record.journey.endTime)}{summary.delay > 0 ? " · +" + summary.delay : ""}</span></div>
            </div>

            <div className="pulse-journey-glance">
              <article><span>Noch</span><b>{minutes(summary.remainingMinutes)}</b></article>
              <article><span>Fortschritt</span><b>{summary.progress}%</b></article>
              <article><span>Umstiege</span><b>{record.journey.transfers || "direkt"}</b></article>
              <article><span>Hinweise</span><b>{summary.alerts || "keine"}</b></article>
            </div>
          </div>

          <LiveRideMode journey={record.journey} appMode />

          <div className="pulse-bottom-actions">
            <button type="button" onClick={finishJourney}>Fahrt beenden & speichern</button>
            <Link href="/">Route in Atlas öffnen</Link>
          </div>
        </section>
      )}
    </main>
  );
}
