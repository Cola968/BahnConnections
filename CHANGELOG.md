# V44.0 · Simpler More & Cleaner Board

- Mobiles „Mehr“ vom Karten-Ansicht-Menü getrennt.
- „Mehr“ auf drei Kernaktionen reduziert: Darstellung, App & Updates sowie Hilfe & Daten.
- Netzreport, Netzlabor, Kontrast-/Schrift-Schalter und technische Kartenoptionen aus dem allgemeinen Mehr-Menü entfernt.
- Kartenoptionen bleiben unter „Ansicht“ verfügbar; seltene Optionen liegen hinter „Weitere Kartenoptionen“.
- Technische Haltestellenzusätze wie „Zugang über den …“ werden in der Tafel entfernt.
- „Hauptbahnhof“ wird in kompakten Tafelzielen als „Hbf“ dargestellt.
- Doppelte Ausfalltexte unter dem Fahrziel entfernt; „Entfällt“ bleibt als eindeutiger Status bestehen.
- Abfahrtszeilen leicht verdichtet, ohne Zeit, Ziel, Zugnummer oder Gleis zu verlieren.
- QA ergänzt: exakt drei Mehr-Aktionen, keine technischen Zugangszusätze im Board und kompakte Bahnhofsnamen.
- PWA-Version und Cache auf V44.0 angehoben.

# V43.0 · Dark Material & Realtime Polish

- Dark Mode nach aktuellen Materialprinzipien neu kalibriert: neutrale Base-/Elevated-Flächen statt blau getönter Karten, klarere Tiefenstaffelung und höherer Textkontrast.
- Liquid Glass im Dark Mode luminanzorientiert abgestimmt: weniger Farbstich, weniger Sättigung, subtilere Lichtkanten und stärker vom Karteninhalt beeinflusste Glasflächen.
- Dark-Map deutlich ruhiger: geringere Helligkeit und Sättigung, neutralerer Hintergrund und zurückhaltendere Stationsmarker.
- Expanded Sheets nutzen im Dark Mode ein dichteres neutrales Elevated-Material; schwebende Controls, Suche und Navigation bleiben transparenter.
- Frühere bestätigte Abfahrt/Ankunft ist jetzt semantisch success und wird explizit grün dargestellt; Realtime-, Board- und Screenshot-Fixtures sichern das Verhalten ab.
- Live-Zugmarker und Trails übernehmen für frühe Züge ebenfalls den grünen Status statt des bisherigen Warnzustands.
- Mobile Querformat korrigiert: Header-Aktionen bleiben auf 44 px begrenzt und können die Suche nicht mehr überdecken.
- Responsive-QA enthält einen Regressionstest gegen die Header-Überlappung im 844×390-Querformat.
- Mehrere alte Light-Only-Hintergründe in Linien-, Warn- und Statuskomponenten erhalten Dark-Mode-sichere Materialwerte.
- Accessibility-Fallbacks für Reduced Transparency, High Contrast, Forced Colors und Browser ohne backdrop-filter bleiben erhalten.
- PWA-Version und Cache auf V43.0 angehoben.

# V42.0 · Deep Liquid Glass

- Optische Materialschicht komplett verstärkt: deutlich mehr Transparenz, Backdrop-Blur, Sättigung, innere Lichtkanten und räumliche Schatten statt flacher halbtransparenter Flächen.
- Mobile Suche, Brand, Kartenoptionen, Standort, Bottom-Navigation, Bottom-Sheets und Popover wirken als getrennte schwebende Glaslinsen über der realen Karte.
- Aktiver Navigationstab erhält eine eigene transluzente Innenfläche mit Lichtkante statt nur einer Farbmarkierung.
- Halb geöffnete und minimierte Sheets bekommen stärkere Refraction-/Highlight-Wirkung; Expanded Sheets werden für lange Fahrplandaten bewusst etwas dichter.
- Desktop-Chrome überarbeitet: Topbar, Navigation, Suche, Inspector und Kartenrahmen bilden ein zusammenhängendes, tiefes Glass-System.
- Formularfelder und wichtige Micro-Controls sind keine grauen Boxen mehr, sondern klare Glass-Aperturen mit Fokuslicht und kontrollierter Elevation.
- Dark Mode erhält hellere Glaskanten und stärkere Tiefentrennung, damit die Oberfläche nicht zu schwarzen Karten zusammenfällt.
- Reduced Transparency, High Contrast, Forced Colors und Browser ohne backdrop-filter fallen weiterhin auf solide, gut lesbare Oberflächen zurück.
- PWA-Version und Cache auf V42.0 angehoben.

# V40.0 · Liquid Hierarchy

- Liquid Glass neu kalibriert: deutlich transparentere Navigation/Controls, stärkerer Backdrop-Blur und echte Trennung zwischen Karteninhalt und Funktionsschicht.
- Halb geöffnete und minimierte Mobile-Sheets schweben mit Abstand zum Rand über der Karte; voll geöffnete Sheets werden für Lesbarkeit bewusst deckender.
- Bottom-Navigation nutzt Glass als gemeinsame Fläche; aktive Tabs werden nur über Farbe markiert statt über zusätzliche Pill-Karten.
- Bahnhofsmarker erhalten eine klare Größenhierarchie aus DB-Reisendenklassen: kleine Stationen bleiben kleine Punkte, mittlere werden deutlich größer, große Bahnhöfe erhalten starke Marker und sehr große Knoten zusätzlich einen äußeren Halo.
- Kleine Stationen werden bei Deutschland-Zoom reduziert, damit die Karte nicht mit gleichwertigen Punkten überladen wird.
- Journey-Sheet stark entschlackt: keine doppelte Zug-/Routenüberschrift, keine prominente Live-Daten-Zeile, keine Top-Level-Auslastungs-/Barrierefreiheitsprosa und weniger Statuswiederholungen in Fahrtabschnitten.
- Bahnhof Mobile entschlackt: Stationsname steht direkt im Sheet-Kopf; die fünf Linien-KPIs, technische Details und der doppelte Bahnhofskopf sind nicht mehr in der ersten Ebene.
- Live-Tafel zeigt keine Gesamtzahl/Echtzeitquote mehr, solange nichts auffällig ist; Verspätungen und Ausfälle bleiben sichtbar. Verkehrsmittel-Zähler und das separate 500-Minuten-Kommando wurden aus der Hauptzeile entfernt.
- Expanded Journey/Board-Inhalte bleiben flach; Glass wird nicht in Inhaltskarten verschachtelt.
- Accessibility-Fallbacks für Reduced Transparency, Forced Colors und Browser ohne backdrop-filter bleiben erhalten.
- PWA-Version und Cache auf V40.0 angehoben.

# V39.0 · Liquid Map Polish

- Stationsmarker skalieren jetzt vorrangig nach den vorhandenen DB-Reisendenklassen; kuratierte Hauptbahnhöfe übernehmen dafür ihre DB-Aliasdaten statt nur nach Hub-Status dargestellt zu werden.
- Größere Bahnhöfe erhalten sichtbar größere Marker, kleinere Stationen bleiben zurückhaltend; innerhalb großer Klassen differenziert die vorhandene Netzbedeutung zusätzlich.
- Grau als Standardmarkerfarbe entfernt: Light und Dark Mode nutzen ein konsistentes blau/teal Stationssystem.
- Dark Mode behält die echte OpenStreetMap-Geometrie, verwendet aber eine kontrastreiche Nacht-Transformation mit invertierten Beschriftungen statt der bisherigen matschigen Abdunklung.
- Mobile Kopfzeile korrigiert: Kartenoptionen oben rechts sind fest auf 46×46 px begrenzt und können nicht mehr als vertikale weiße Fläche ausbrechen.
- Brand, Suche, Kartenoptionen, Standort, Zoom, Sheet und Bottom-Bar verwenden stärkeres, aber zusammenhängendes Liquid Glass; lange Inhaltslisten bleiben flach.
- Dark Journey/Station-Inhalte verzichten weiter auf verschachtelte Glas-Karten; Alternativverbindungen zeigen weniger redundante Statusprosa.
- PWA-Version und Cache auf V39.0 angehoben.

# V38.0 · Native Minimal UI

- Heller Mobile-Look näher an der bevorzugten Referenz: Karte übernimmt die Fläche, Suche/Navigation/Sheet bleiben die wenigen bewussten Glass-Schichten.
- Sichtbare „Live-Ebene“-Status-Pille entfernt; Live-Funktionen bleiben im Ansicht-Menü und für Screenreader erhalten.
- Kartenmarker komplett neu abgestimmt: keine grauen Standardkreise mehr, sondern ruhige blau/teal umrandete Stationsmarker mit klarer Hub-Hierarchie und dezenter Tiefe.
- Dark Mode nicht mehr als generisches Card-/Shadcn-Theme behandelt: weniger Borders, weniger verschachtelte Kacheln, neutralere Statusfarben und flachere Inhaltsbereiche.
- Journey-Sheet deutlich kompakter: kürzere Texte, weniger redundante Metadaten, reduzierte Sekundärinformationen und flachere Alternativen.
- Bahnhof/Live-Tafel aufgeräumt: KPI-Zahlen als zusammenhängende Informationszeile statt fünf Cards; Tabs, Produktfilter und Suchzeile deutlich weniger „Pill“-lastig.
- Mobile Header liegt map-first über der Karte; Suchfeld, Bottom-Bar und Sheet nutzen zusammenhängendes Liquid Glass statt Glassmorphism auf jeder Komponente.
- Reduced Motion/Transparency, Forced Colors und 44px-Touchziele bleiben erhalten.
- PWA-Version und Cache auf V38.0 angehoben.

# V37.0 · Liquid Glass Minimal

- Neues Materialsystem mit klarer Trennung zwischen Content-, Functional-Glass- und Status-Layer.
- Liquid Glass wird gezielt für schwebende Suche, Kartencontrols, Popover, Mobile-Navigation, Sheet-Kopf und Desktop-Chrome eingesetzt; Fahrplan- und Journey-Inhalte bleiben lesbar und weitgehend opak.
- Drei Glasstufen (`clear`, `regular`, `strong`) mit Dark-Mode-Anpassung, subtilen Innenlichtern und kontrollierter Elevation statt flächigem Glassmorphism.
- Mobile Bottom-Navigation als kompakte schwebende Fläche neu komponiert und auf Tablets in der Breite begrenzt.
- Journey-Datenstatus und Sekundärinformationen weiter entkartet; Hierarchie entsteht stärker durch Typografie und Abstand.
- Desktop-Navigation, Suche und Sidebars erhalten eine zurückhaltende Materialtiefe, während die Karte visuell dominant bleibt.
- Accessibility-Fallbacks für High Contrast, Forced Colors, Reduced Motion und Reduced Transparency ergänzt; Browser ohne `backdrop-filter` erhalten solide Oberflächen.
- Keine Gradients, kein Neon und keine Glasflächen in langen Transit-Datenlisten.
- PWA-Version und Cache auf V37.0 angehoben.

# V36.0 · Minimal Map-first UI

- Mobile Kopfbereich auf eine kompakte Zeile reduziert; die Bahnhofssuche schwebt nun direkt über der Karte statt eine zweite Header-Zeile zu belegen.
- Dadurch gewinnt die Karte sichtbar an Höhe, ohne Suche oder Live-Zugriff zu verstecken.
- Im mobilen Verbindungssheet entfällt die doppelte Planer-Überschrift; Start/Ziel beginnen sofort nach dem Sheet-Kopf.
- Bottom-Navigation, Sheet-Griff und Panel-Abstände weiter beruhigt; aktive Navigation nutzt nur noch Farbe statt zusätzlicher Flächen.
- Journey-Abschnitte, Umstiege und Qualitätsblöcke verwenden weniger verschachtelte Karten und sichtbare Rahmen.
- Desktop-Seitenleisten wurden schmaler, sodass die Karte stärker das visuelle Zentrum bleibt.
- Karten-, Status- und Aktionsfarben bleiben semantisch getrennt; Reduced Motion, Touch-Ziele und Echtzeitdarstellung bleiben erhalten.
- PWA-Version und Cache auf V36.0 angehoben.

# V35.0 · Premium UI polish

- UI-Hierarchie aus einem visuellen UX-Review weiter verdichtet: Karte bleibt Hauptfläche, Journey und Bahnhof zeigen zuerst die entscheidenden Reiseinformationen.
- Mobile Bottom-Navigation vereinfacht: kein Dashboard-artiger Aktiv-Hintergrund mehr, stattdessen ruhiger Farbzustand und dezentes Press-Feedback.
- Bottom-Sheet erhält ein nativeres 240-ms-Bewegungsprofil, größere Griff-Fläche und reduzierte Trennlinien.
- Desktop-Panels, Kartencontrols und Popover verwenden weniger sichtbare Rahmen und eine konsistentere Elevation.
- Journey-Alternativen von verschachtelten Karten zu einer ruhigeren gruppierten Liste reduziert.
- Bahnhof-KPIs, Board-Filter, Transfer- und Detailflächen visuell vereinheitlicht.
- Fokus- und Accessibility-Verhalten sowie bestehende Reduced-Motion-Regeln bleiben erhalten.
- PWA-Version und Cache auf V35.0 angehoben.

# V34.0 · Interface overhaul

- Visuelles System neu kalibriert: native Systemtypografie, ruhigere Flächen, weniger gleich starke Rahmen, größere Radien und eine klarere Hierarchie.
- Desktop-Workspace überarbeitet: Karte bleibt Hauptfläche, Suche sitzt als eigenständige linke Sidebar, Journey/Bahnhof als fokussierter rechter Inspector.
- Hauptnavigation als kompakte Segment-Navigation mit eindeutigem aktiven Zustand gestaltet.
- Reiseplaner vereinfacht: Abfahrt/Ankunft und Datum/Zeit stehen direkt im Hauptfluss; Detailfilter bleiben eingeklappt.
- Primäre Aktion nutzt BahnConnections-Rot, Auswahl- und Informationszustände bleiben blau; Echtzeitstatusfarben bleiben davon getrennt.
- Bahnhof, Live-Tafel, Journey, Alternativen und Umstiege verwenden neue ruhige Karten- und Gruppierungsflächen.
- Mobile Bottom-Navigation und das frei ziehbare Sheet wurden stärker wie eine native App strukturiert, inklusive klarer aktiver Zustände und größerer Touch-Ziele.
- PWA-Version und Cache auf V34.0 angehoben.

# V33.3 · Ringlinien-Hardening

- Ringlinien-Logik stellt die erkannten Wiederholungen des Referenzbahnhofs explizit für Diagnostik und Tests bereit.
- Der API-Smoke-Test prüft das Kürzen einer wiederholten Ringfahrt jetzt mit einem deterministischen Regressionsfall.
- Live-S42-Prüfungen unterscheiden zwischen einer mehrfach enthaltenen Ringrunde und einem von Transitous bereits begrenzten Fahrtabschnitt. Ein bereits begrenzter Abschnitt wird nicht künstlich verlängert oder als Fehler gewertet.
- PWA-Version und Cache auf V33.3 angehoben.

# V33.2 · In-App Updates

- Installierte BahnConnections-PWAs prüfen regelmäßig, ob eine neuere veröffentlichte Version verfügbar ist.
- Bei einem Update erscheint eine kompakte In-App-Benachrichtigung mit „Jetzt aktualisieren“ und einem Link zu „Download / Installation“.
- `/version.json` stellt die veröffentlichte Versionsnummer und den Installationspfad bereit.
- Service-Worker-Updates warten auf die Entscheidung des Nutzers statt sofort ungefragt per `skipWaiting()` zu übernehmen.
- Die Installationsseite kann gezielt über `/install?update=V…` geöffnet werden und versucht, einen wartenden Service Worker zu laden und zu aktivieren.
- PWA-Cache auf V33.2 angehoben.

# V33.1 · Polish & Accessibility

- Bahnhofsfahrtverläufe unterscheiden jetzt „Echtzeit an allen Halten“, „Echtzeit teilweise verfügbar“ und reine Fahrplandaten.
- Zeit- und Gleisänderungen verwenden Screenreader-Text statt einer künstlichen Bildrolle; die sichtbare kompakte Darstellung bleibt unverändert.
- UI-Audit prüft die konservative Realtime-Zusammenfassung und die neue Accessibility-Semantik.
- PWA-Cache auf V33.1 angehoben, damit installierte Apps die neue Oberfläche zuverlässig übernehmen.

# V33 · Realtime & Reiseinformation

Gemeinsame Soll-/Ist-Zeiten und Gleisänderungen in Journey, Tafel, Alternativen und Tooltips. Konservative Echtzeitsemantik, verständliche Ausfälle, Desktop-Suche und Journey als getrennte Modi, zurückhaltende allgemeine Kartenmarker. Responsive Status-Fixtures und Qualitätsworkflow ergänzt. Siehe `docs/V33-QA.md` für tatsächlich ausgeführte und ausstehende Prüfungen.

# Updates

## V31 · Polaris

### PC
- Standort und Fußweg als eigenständige Kartenebenen, ohne die bestehende Dreispalten-Ansicht umzubauen.

### Mobile
- Explizit aktivierbarer Live-Standort mit Genauigkeitskreis, Zentrieren und Ausschalten; keine Speicherung der Position.
- Fußweg vom aktuellen Standort zum gewählten Bahnhof oder zum nächstgelegenen Personenbahnhof. Das Bottom-Sheet wird für die Wegkarte minimiert, Such- und Fahrtdaten bleiben erhalten.
- Kompakte, touchgerechte Standortaktionen und eine aufklappbare Wegbeschreibung; Fehler bei fehlender Freigabe oder nicht verfügbarer Route werden sichtbar.

### Daten & Grenzen
- Fußwege kommen als echte Straßengeometrie mit Dauer, Strecke und – wenn geliefert – Abbiegehinweisen aus Transitous/MOTIS und OpenStreetMap. Ohne Geometrie wird keine gerade Ersatzlinie gezeichnet.
- Für die Fußwegabfrage werden Start- und Zielkoordinaten an Transitous übermittelt. Die Standortfreigabe erfolgt nur nach Antippen und wird nicht lokal gespeichert.
- Die Fußwegroute ist eine Planung, keine Live-Baustellen- oder Sicherheitsprüfung. Bei Bewegung kann sie manuell neu berechnet werden.
- PWA-Cache auf V31 erhöht.

## V30 · Asteria

### PC
- Eigene Dreispalten-Ansicht ab 1100 px: dauerhafter Planer, Karte und Ergebnisse/Bahnhof.
- Blau-weiße Navigation, getrennte PC-Komponenten und Styles.
- Direkte Kartenansicht und Deutschland-Ausschnitt.

### Mobile
- Bestehendes Bottom-Sheet beibehalten; Datum und Suchaktion früher erreichbar.
- Straßenbahnfilter in Planer, Tafel und Linienübersicht.

### Fahrplandaten
- Straßenbahnen werden als eigene Kategorie verarbeitet: Transitous `TRAM` und DB `tram`.
- Anbieterfarben, Ziele, Echtzeitstatus, Halte und Geometrien werden über die bestehenden Fahrtquellen übernommen.
- Keine Garantie vollständiger Echtzeitabdeckung: Datenlücken bleiben gekennzeichnet.
- Modus-Schnittstelle: https://github.com/motis-project/motis/blob/master/openapi.yaml

### Prüfungen
- `node scripts/tram-regression.cjs`: ausgeführte Normalisierung, Farben, Ziele und Linien ohne nächste Fahrt.
- `node scripts/track-gap-test.mjs`: getrennte Gleisgeometrien.
- `pnpm audit:mobile -- <URL> <Ausgabeordner>`: Touch-Flows und Desktop-Spalten; Reise-Fixture, kein Nachweis aktueller Fahrplanrichtigkeit.

## V29
- Zielspalte der kompakten Tafel korrigiert.
- Künstliche Gleis-Connectoren nicht mehr gezeichnet.
- Doppelte Kartenanpassungen beim mobilen Ziehen reduziert.

