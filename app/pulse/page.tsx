"use client";

import { useEffect, useMemo, useState } from "react";
import { LiveRideMode } from "../live-ride-mode";
import { completeActiveJourney, readActiveJourney, type StoredJourney } from "../travel-store";

function clock(value: string) {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export default function PulsePage() {
  const [record, setRecord] = useState<StoredJourney | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRecord(readActiveJourney());
    setReady(true);
  }, []);

  const primary = record?.journey.transitLegs[0] ?? null;
  const destination = record?.journey.transitLegs.at(-1)?.to.name ?? "Ziel";
  const delay = useMemo(() => {
    if (!record) return 0;
    return Math.round((new Date(record.journey.endTime).getTime() - new Date(record.journey.scheduledEndTime).getTime()) / 60000);
  }, [record]);

  function finishJourney() {
    completeActiveJourney();
    setRecord(null);
  }

  return (
    <main className="pulse-shell">
      <header className="pulse-topbar">
        <a className="pulse-brand" href="/pulse"><span>B</span><b>BahnConnections</b><em>Pulse</em></a>
        <nav><a href="/">Atlas</a><a href="/passport">Passport</a></nav>
      </header>
      {!ready ? <section className="pulse-empty"><p>Fahrt wird geladen …</p></section> : !record ? (
        <section className="pulse-empty">
          <span className="pulse-kicker">PULSE</span>
          <h1>Bereit für deine nächste Fahrt.</h1>
          <p>Plane deine Verbindung in Atlas und öffne sie anschließend in Pulse. Hier bleibt während der Fahrt nur das sichtbar, was gerade wichtig ist.</p>
          <div className="pulse-empty-actions"><a className="pulse-primary" href="/">Reise in Atlas planen</a><a href="/passport">Passport öffnen</a></div>
          <div className="pulse-feature-grid">
            <article><b>Live-Fahrt</b><span>Geschwindigkeit, nächster Halt und Ankunft.</span></article>
            <article><b>Anschlusswächter</b><span>Knapp werdende Umstiege sofort erkennen.</span></article>
            <article><b>Offline-Grunddaten</b><span>Gestartete Fahrt bleibt lokal gespeichert.</span></article>
          </div>
        </section>
      ) : (
        <section className="pulse-journey">
          <div className="pulse-hero">
            <span className="pulse-kicker">AKTIVE REISE</span>
            <div className="pulse-service"><b>{primary?.name ?? "Verbindung"}</b><span>{primary?.headsign ?? destination}</span></div>
            <div className="pulse-route"><strong>{primary?.from.name ?? "Start"}</strong><i>→</i><strong>{destination}</strong></div>
            <div className="pulse-times"><b>{clock(record.journey.startTime)}</b><span>{record.journey.transfers ? record.journey.transfers + " Umstieg" + (record.journey.transfers > 1 ? "e" : "") : "direkt"}</span><b>{clock(record.journey.endTime)}{delay > 0 ? " +" + delay : ""}</b></div>
          </div>
          <LiveRideMode journey={record.journey} appMode />
          <div className="pulse-bottom-actions">
            <button type="button" onClick={finishJourney}>Fahrt beenden & im Passport speichern</button>
            <a href="/">In Atlas öffnen</a>
          </div>
        </section>
      )}
    </main>
  );
}
