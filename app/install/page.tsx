/* eslint-disable @next/next/no-html-link-for-pages -- native links work without client hydration. */
import {InstallClient} from "./install-client";
import {APP_VERSION_LABEL} from "../app-version";
export default function InstallPage(){
 return <main className="install-page install-v56 install-v56-compact"><section className="install-card install-v56-card">
  <nav className="install-v56-navigation"><a href="/">← Zur App</a><a href="/changelog">Änderungen ansehen ↗</a></nav>
  <header className="install-compact-header"><span className="install-v56-logo">B</span><div><h1>App & Updates</h1><p>BahnConnections {APP_VERSION_LABEL}</p></div></header>
  <InstallClient/>
  <details className="install-v56-faq"><summary>Installation & Aktualisierung</summary><p>Du kannst BahnConnections im Browser zum Startbildschirm hinzufügen. Updates werden von derselben Webadresse geladen. Eine Installation von einer anderen Adresse wird dadurch nicht aktualisiert. Aktuelle Zugdaten benötigen Internet.</p></details>
  <p className="install-v56-disclaimer">Unabhängige Fahrplanauskunft · Keine offizielle DB-App.</p>
 </section></main>;
}
