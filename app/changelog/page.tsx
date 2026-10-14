/* eslint-disable @next/next/no-html-link-for-pages -- Vinext native links work before hydration. */
import {APP_VERSION_LABEL} from "../app-version";
const releases=[
 {version:"V57.1",date:"13. Oktober 2026 · Beta",current:true,lead:"Störungsmeldungen werden zuverlässig eingelesen und um weitere Bahnhofshinweise ergänzt.",tags:["Störungen","Fehlerkorrekturen"],changes:[
  ["Meldungen wieder sichtbar","Aktuelles Transitous-Datenformat und Hinweise am Bahnhofshalt korrekt verarbeitet."],
  ["Weitere Datenquellen","Deutsche Bahnhofsmeldungen werden durch VBB beziehungsweise DB transport.rest ergänzt. Unvollständige Quellen bleiben erkennbar."],
  ["Korrekte Zuordnung","Teilausfälle erscheinen unter Ausfälle; allgemeine Aufzugshinweise markieren nicht alle Linien als gestört."],
  ["Hinweise in allen Ansichten","Tafel und Reiseplanung zeigen zuvor verworfene Meldungen. Updatekennung und Cache sind auf V57.1 abgestimmt."]
 ]},
 {version:"V57.0",date:"13. Oktober 2026 · Beta",current:false,lead:"Dein Bahnhof, der ganze Zugverlauf und eine ruhigere mobile Ansicht.",tags:["Bahnhofsradar","Störungen","Mobile"],changes:[
  ["Nur passende Züge","Der Radar zeigt bestätigte Bahnhofshalte. Alle, Ankommend oder Abgehend direkt auswählen."],
  ["Vom Start bis zum Ziel","Vollständige Fahrt mit allen gemeldeten Halten, nächstem Halt und Zielankunft."],
  ["Klarere Kartenmarker","Kleine Bahnsymbole, passende Verkehrsmittelfarben und genau ein Richtungspfeil vor dem Zug."],
  ["Störungen übersichtlich","Nur betroffene Linien, kompakte Meldungen und längere Details zum Aufklappen. Suche und Kategorien bleiben direkt erreichbar."],
  ["Sauber schließen","X beendet Zugauswahl, Verfolgung und Kartenstrecke. Verbesserte Bahnhofserkennung und getrennte Planerfelder."]
 ]},
 {version:"V56.2",date:"12. Oktober 2026 · Beta",current:false,lead:"Bessere Störungsmeldungen und belastbarere Live-Tafeln.",tags:["Störungen","Echtzeit","Mobile"],changes:[
  ["Störungszentrale","Meldungen aus Ankünften und Abfahrten gemeinsam ansehen, nach Kategorie filtern oder nach Zuglinie und Ziel durchsuchen."],
  ["Automatisch aktuell","Bei geöffneter Ansicht werden Hinweise regelmäßig aktualisiert; bei Problemen bleibt der letzte erfolgreiche Stand sichtbar."],
  ["Zuverlässigere Bahnhofstafel","Echtzeit und Verspätungen ab +1 Minute korrekt einordnen, Fahrtverläufe sofort anzeigen und ungültige Quelldaten abfangen."],
  ["Weniger Wartezeiten","Fahrtdetails werden kontrolliert geladen und ausbleibende Netzantworten zeitlich begrenzt."],
  ["Mobile Bedienung","Überarbeitete englische Navigation und verbesserte Tastaturbedienung der Tafelfilter."]
 ]},
 {version:"V56.1",date:"12. Oktober 2026 · Beta",current:false,lead:"Züge leichter antippen, Meldungen klarer lesen.",tags:["Zugradar","Karte","Mobile"],changes:[
  ["Zugmarker öffnen","Größere Touchbereiche und einzelne Zuggruppen öffnen die Fahrt direkt. Mobile Zugdetails sind sofort ausgeklappt."],
  ["Kartenfilter","Zugarten und Status direkt filtern, Trefferzahl sehen und die Auswahl zurücksetzen."],
  ["Klarere Störungsmeldungen","Gemeldete Linie, Fahrtrichtung und verfügbare Fahrtstrecke bei Störungen anzeigen."],
  ["Mobile Reiseplanung","Standortauswahl am Startbahnhof und Wegdaten direkt am Bahnhof statt in einer überlagernden Karte."],
  ["Sprache und Bewegung","Deutsch oder Englisch für Hauptnavigation und Planer wählen. Dezente Animationen berücksichtigen reduzierte Bewegung."]
 ]},
 {version:"V56.0",date:"12. Oktober 2026 · Beta",current:false,lead:"Weniger Reibung, mehr Verlässlichkeit.",tags:["Bedienung","Daten","Reiseplanung"],changes:[
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
