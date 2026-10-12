/* eslint-disable @next/next/no-html-link-for-pages -- Vinext native links work before hydration. */
import {APP_VERSION_LABEL} from "../app-version";
const releases=[
 {version:"V56.0",date:"12. Oktober 2026 · Beta",current:true,lead:"Weniger Reibung, mehr Verlässlichkeit.",tags:["Bedienung","Daten","Reiseplanung"],changes:[
  ["Reise im Kalender","Google Kalender und Outlook mit vorausgefüllter Reise öffnen oder in andere Kalender importieren. Im Kalender mit Speichern bestätigen."],
  ["Besser vergleichen","Nach Ankunft, Dauer, Umstiegen und Fußweg sortieren. Bei Nachtfahrten bleibt der Folgetag erkennbar."],
  ["Störungen & Baustellen","Bahnhofsbezogene Meldungen direkt in einem eigenen Reiter. Meldungen und Quellenstatus werden getrennt ausgewiesen."],
  ["Tafelfilter neu gedacht","Verkehrsmittel und Status als klare Chips, kompakte Gleis- und Zeitfilter und ein sofort sichtbarer Ergebniszähler."],
  ["Reisen teilen","Start, Ziel, Abfahrtszeit und persönliche Filter über einen Link auf anderen Geräten wieder öffnen."],
  ["Korrekte Ankunftsprognosen","Abgelaufene Zeiten bestätigen keine Ankunft mehr. Die Geschwindigkeitsanzeige bleibt als Modellwert gekennzeichnet."],
  ["Anpassbarkeit","Verbesserte Darstellung, Einstellungen und Releasenotizen mit Rücksicht auf kleinere Bildschirme."]
 ]},
 {version:"V55.0",date:"12. Oktober 2026 · veröffentlichte Basis",current:false,lead:"Zugradar und Echtzeit im Mittelpunkt.",tags:["Zugradar","Prognose"],changes:[
  ["Zugverfolgung","Einzelne Züge auf der Karte verfolgen, mit geschätztem Fortschritt und Herkunftskennzeichnung."],
  ["Ankunft im Vergleich","Fahrplanzeit und prognostizierte Zeit mit Verspätung, Zugdetails und Halten."],
  ["Mobile Oberfläche","Kompakter Zug-Inspector, kleinere Standardtypografie und Optionen für die Schriftgröße."],
 ]},
 {version:"V51.0",date:"Vorherige Beta",current:false,lead:"Stabilere Bahnhofstafeln und ein ruhigerer Radar.",tags:["Performance"],changes:[
  ["Schnellerer Radar","Zugmarker werden aktualisiert statt laufend neu aufgebaut."],
  ["Teilantworten","Bahnhofstafeln können erste Daten vor der späteren Gegenprüfung darstellen."]
 ]},
 {version:"V50.2",date:"Vorherige Beta",current:false,lead:"Besseres Karten- und Linienverhalten.",tags:["Linien","Mobile"],changes:[
  ["Linienübersicht","Kompakte Ziele und nächste Abfahrten mit nachladbaren Streckengeometrien."],
  ["Darstellung","Überarbeitete Bahnhofspanels und responsives Layout."]
 ]}
];
export default function ChangelogPage(){
 return <main className="release-page"><div className="release-shell">
  <nav className="release-top" aria-label="Zurück zur App"><a href="/">← BahnConnections</a><span>Produktupdates</span></nav>
  <header className="release-hero"><div className="release-mark">B</div><p className="release-kicker">BAHNCONNECTIONS · CHANGELOG</p><h1>Was ist neu?</h1><p>Alle wichtigen Änderungen auf einen Blick. Übersichtlich, nachvollziehbar und ohne technische Überraschungen.</p><div className="release-version-meta"><span>Aktuelle Version: {APP_VERSION_LABEL}</span><span>Beta</span></div></header>
  <div className="release-timeline">{releases.map(item=><section className="release-entry" key={item.version} aria-labelledby={item.version.replace(".","-")}><div className="release-entry-rail"><i/></div><div className="release-entry-content"><div className="release-entry-title"><div><p className="release-date">{item.date}</p><h2 id={item.version.replace(".","-")}>{item.version}</h2></div>{item.current&&<span className="release-preview">Beta</span>}</div><p className="release-lead">{item.lead}</p><div className="release-tags">{item.tags.map(tag=><span key={tag}>{tag}</span>)}</div><div className="release-changes">{item.changes.map(([title,desc])=><article key={title}><span className="release-change-check" aria-hidden="true">✓</span><div><h3>{title}</h3><p>{desc}</p></div></article>)}</div></div></section>)}</div>
  <footer className="release-foot"><p>Kalendertermine im jeweiligen Kalender speichern. Prognosen und gespeicherte Reiseinformationen können sich ändern.</p><a href="/">Zur Bahnkarte ↗</a></footer>
 </div></main>;
}
