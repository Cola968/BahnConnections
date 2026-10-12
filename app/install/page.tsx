/* eslint-disable @next/next/no-html-link-for-pages -- native links remain usable before hydration. */
import {InstallClient} from "./install-client";
import {APP_VERSION_LABEL} from "../app-version";
export default function InstallPage(){
 return <main className="install-page install-v56"><section className="install-card install-v56-card">
  <nav className="install-v56-navigation"><a href="/">← Zur Bahnkarte</a><a href="/changelog">Was ist neu? ↗</a></nav>
  <div className="install-v56-identity"><span className="install-v56-logo">B</span><div><strong>BahnConnections</strong><small>App & Aktualisierungen</small></div><span className="install-v56-version">{APP_VERSION_LABEL}</span></div>
  <h1>Immer dabei.<br/><span>Ganz ohne App Store.</span></h1>
  <p className="install-v56-description">BahnConnections lässt sich direkt zum Startbildschirm hinzufügen. Die Web-App aktualisiert sich über dieselbe Website.</p>
  <InstallClient/>
  <details className="install-v56-faq"><summary>Wie funktionieren Updates und Offline-Nutzung?</summary><p>Installierte Web-Apps beziehen Updates automatisch von ihrer ursprünglichen Webadresse. Eine unter einer anderen Adresse installierte App aktualisiert sich dadurch nicht. Live-Züge und aktuelle Abfahrten benötigen Internet; gespeicherte Seiten sind keine Live-Daten.</p></details>
  <small className="install-v56-disclaimer">Unabhängiges Projekt · Keine offizielle App der Deutschen Bahn.</small>
 </section></main>;
}
