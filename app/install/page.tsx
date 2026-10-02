/* eslint-disable @next/next/no-html-link-for-pages -- vinext's client Link currently throws during mobile navigation; native links stay usable without hydration. */
import { InstallClient } from "./install-client";

export default function InstallPage() {
  return (
    <main className="install-page">
      <section className="install-card">
        <a href="/" className="install-back">← Zur Karte</a>
        <div className="install-brand"><span>B</span><b>BahnConnections</b></div>
        <p className="install-kicker">MOBILE APP</p>
        <h1>Fahrplan und Karte direkt auf deinem Startbildschirm.</h1>
        <p className="install-intro">Die Web-App wird ohne App-Store installiert und öffnet sich anschließend wie eine eigenständige App. Neue Versionen können später direkt über den Update-Hinweis in BahnConnections geladen werden. Live-Daten benötigen weiterhin eine Internetverbindung.</p>
        <InstallClient />
        <div className="install-features"><article><b>Live-Tafel</b><span>Abfahrten, Ankünfte, Gleise, Verspätungen und Ausfälle.</span></article><article><b>Ganze Fahrt</b><span>Alle Halte mit Zeiten und exaktem Verlauf direkt in der Karte.</span></article><article><b>Alle Bahnarten</b><span>Fernverkehr, Regio, S-Bahn und U-Bahn in einer Oberfläche.</span></article></div>
        <p className="install-note">Hinweis: BahnConnections ist ein unabhängiges Informationsangebot und keine offizielle App der Deutschen Bahn.</p>
      </section>
    </main>
  );
}
