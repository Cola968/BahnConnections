/* eslint-disable @next/next/no-html-link-for-pages -- vinext's client Link currently throws during mobile navigation; native links stay usable without hydration. */
import { InstallClient } from "./install-client";

export default function InstallPage() {
  return (
    <main className="install-page">
      <section className="install-card">
        <a href="/" className="install-back">← Zur Karte</a>
        <div className="install-brand"><span>B</span><b>BahnConnections</b></div>
        <p className="install-kicker">MOBILE APP</p>
        <h1>Pulse direkt auf deinem Startbildschirm.</h1>
        <p className="install-intro">Die installierte App startet bewusst in Pulse: aktive Fahrt, Geschwindigkeit, nächster Halt und Anschlusswächter. Atlas bleibt die Website für Planung und Analyse. Live-Daten benötigen weiterhin eine Internetverbindung.</p>
        <InstallClient />
        <div className="install-features"><article><b>Pulse</b><span>Aktive Fahrt mit Geschwindigkeit, ETA, Gleisen und Anschlusswächter.</span></article><article><b>Passport</b><span>Abgeschlossene Fahrten werden zu deiner persönlichen Reisehistorie.</span></article><article><b>Atlas + Pulse</b><span>Planung und Analyse im Web, Reisebegleitung in der installierten App.</span></article></div>
        <p className="install-note">Hinweis: BahnConnections ist ein unabhängiges Informationsangebot und keine offizielle App der Deutschen Bahn.</p>
      </section>
    </main>
  );
}
