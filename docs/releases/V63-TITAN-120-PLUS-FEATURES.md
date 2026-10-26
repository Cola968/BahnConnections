# BahnConnections V63 — TITAN 31.10.2026 · vollständiger Feature-Backlog

**Stand:** 26.10.2026 · **Status:** geplant, keineswegs fertig · **18 Workstreams, 156 einzeln abnehmbare Kandidaten**.

## Leitprinzipien

1. **Nicht „noch mehr CSS“:** Der sichtbare neue Produktstand verlangt andere Informationsarchitektur und funktionsfähige neue Oberflächen: persönliche Startseite, Linien-Explorer, Stationsvergleich, Reisebegleitung, Operationscenter und intelligenteres Radar.
2. **Keine erfundenen Fakten oder Features:** Vor Implementierung jeden Eintrag klassifizieren als `NEW`, `UPGRADE`, `EXISTING`, `BLOCKED-DATA`, `DEFER`. Prüfe Quellcode und öffentliche V62.0.3. Ein bereits existierender Button zählt nicht als neue Funktion.
3. **Qualität ist nicht verhandelbar:** Tests zuerst bei Fehlern, funktionale E2E, visuelle Belege, Datenprovenienz, keine bekannten P0/P1. Alle Kernfunktionen müssen auf Mobile und Desktop funktionieren.
4. **Termin ist Ziel, keine Test-Bypass-Vollmacht:** 31.10.2026 nur GO bei vollständigem Freigabenachweis. Umfangreichere Kandidaten dürfen transparent in Folgeversionen verschoben werden; keinesfalls halbfertig im Prod-Menü sichtbar.
5. **Datenrechte:** Transitous OSS/noncommercial Policy strikt einhalten. #67, #77, #78, #80, #66, #87. Keine Lizenzumgehung, keine zahlungspflichtigen Features, keine erfundenen GPS-Positionen.

## Arbeitsvertrag für jede Checklist-Zeile

Jeder nummerierte Eintrag muss in `docs/releases/V63-TITAN-ACCEPTANCE.csv` oder äquivalentem maschinenlesbaren QA-Register geführt werden mit:
`ID, Status [todo/in-progress/blocked/implemented/tested/live-verified/deferred], NEW|UPGRADE|EXISTING, changed_paths, test_name, red/green evidence, screenshots, commit SHA, known-limitations`.

Checkbox nur bei bestandenem E2E/Testbeleg plus Review. `EXISTING` wird als Abgleich dokumentiert, nicht als neuer Fortschritt gezählt. `BLOCKED-DATA` und `DEFER` dürfen nicht im Release als fertig zählen.

## 18 Workstreams — 156 Funktions- und Qualitätseinträge


### E01 · UI / Railglass 3 · P0

- [ ] **BC63-01-01** Einheitliche App-Shell für Smartphone, Tablet und Desktop. **Abnahme:** Navigation, Map und Inhalt bleiben bei 320–1920 px bedienbar.
- [ ] **BC63-01-02** Neues Railglass-Designsystem mit Tokens. **Abnahme:** Alle Kernansichten verwenden dieselben geprüften Oberflächen-/Kontrastregeln.
- [ ] **BC63-01-03** Desktop-Dreispaltenmodus Karte/Details/Planung. **Abnahme:** Panels sind größenänderbar und überlappen sich nicht.
- [ ] **BC63-01-04** Mobile Bottom-Navigation samt Fokusverwaltung. **Abnahme:** Routenwechsel verliert keine Aktionen und verdeckt keine Daten.
- [ ] **BC63-01-05** Kontextabhängiges responsives Bottom-Sheet. **Abnahme:** Kollabiert, Halbansicht und Vollansicht per Tap erreichbar.
- [ ] **BC63-01-06** Einheitliches Such- und Aktionsmenü. **Abnahme:** Keine identischen Aktionen mit widersprüchlichen Dialogen.
- [ ] **BC63-01-07** Leere-, Lade-, Fehler- und Offline-Zustände je Screen. **Abnahme:** Keine leeren Kartenflächen ohne Erklärung.
- [ ] **BC63-01-08** Designvorher-nachher Beweispaket. **Abnahme:** Acht real gerenderte Screens in hell/dunkel vor/nach Update.

### E02 · Persönlicher Startbildschirm · P1

- [ ] **BC63-02-01** Neue Startseite mit direkter Stationssuche. **Abnahme:** Bahnhof in höchstens zwei Interaktionen erreichbar.
- [ ] **BC63-02-02** Direkter Einstieg in die Verbindungsplanung. **Abnahme:** Abfahrt/Ziel ab Startseite ausfüllbar.
- [ ] **BC63-02-03** Heimatbahnhof als erstes Ergebnis. **Abnahme:** Benutzerwahl bleibt nach Reload erhalten.
- [ ] **BC63-02-04** Meine Pendelstrecken als Sofortsuche. **Abnahme:** Klick startet frische Providerabfrage statt Cache-Attrappe.
- [ ] **BC63-02-05** Letzte Bahnhöfe mit Datum. **Abnahme:** Nur tatsächlich besuchte Stationen erscheinen.
- [ ] **BC63-02-06** Aktuelles Reise-Cockpit auf Start. **Abnahme:** Nur existierende aktive Reise, sonst erklärter Leerzustand.
- [ ] **BC63-02-07** Kompakter Hinweis auf Quellenverfügbarkeit. **Abnahme:** Offline/partial/stale klar mit Zeitstempel.
- [ ] **BC63-02-08** Konfigurierbare Startmodule. **Abnahme:** Anordnung/Lage bleibt lokal gespeichert.

### E03 · Suche und Navigation · P1

- [ ] **BC63-03-01** Stationssuche mit verifizierten IDs. **Abnahme:** Doppelte/mehrdeutige Namen eindeutig kennzeichnen.
- [ ] **BC63-03-02** Tolerante Eingabe mit Umlauten und Synonymen. **Abnahme:** Treffer nach dokumentierter Normalisierung reproduzierbar.
- [ ] **BC63-03-03** Inline-Vorschläge mit Tastatursteuerung. **Abnahme:** Pfeiltasten/Enter/Escape und Screenreader funktionieren.
- [ ] **BC63-03-04** Route und Bahnhof über Deeplinks öffnen. **Abnahme:** Back/Forward und reload erhalten korrekten State.
- [ ] **BC63-03-05** Eigener Suchverlauf mit Löschen. **Abnahme:** Einträge können vollständig entfernt werden.
- [ ] **BC63-03-06** Schnellsuche nach Linie oder Zugnummer. **Abnahme:** Öffnet belegte Ergebnisse, ansonsten keine Treffer.
- [ ] **BC63-03-07** Doppelte Klicks/Response-Races unterdrücken. **Abnahme:** Nur aktuellste Suche überschreibt UI.

### E04 · Bahnhofstafel 3.0 · P0

- [ ] **BC63-04-01** Flache neue Live-Abfahrtsliste. **Abnahme:** Zeit, Linie, Ziel, Gleis in einer scanbaren Zeile.
- [ ] **BC63-04-02** Abfahrten/Ankünfte ohne Zustandsverlust umschalten. **Abnahme:** Tabwechsel zeigt korrekte Datenrichtung.
- [ ] **BC63-04-03** Zeitfenster 15/30/60/120 Minuten. **Abnahme:** Fenstergrenzen samt DST reproduzierbar.
- [ ] **BC63-04-04** Filter für Liniengattungen. **Abnahme:** Fern/Regional/S/U/Tram/Bus entsprechend vorhandenen Quellen.
- [ ] **BC63-04-05** Filter Verspätung/Ausfall/Gleiswechsel. **Abnahme:** Prognose nur bei frischer Providerantwort.
- [ ] **BC63-04-06** Suche innerhalb der Tafel. **Abnahme:** Linie, Ziel oder Zwischenhalt auf gelieferten Daten.
- [ ] **BC63-04-07** Gleiswechsel mit altem und neuem Gleis. **Abnahme:** Nur wenn beide Werte gelieferten Daten entsprechen.
- [ ] **BC63-04-08** Verifizierte Zugdetails aus jeder Tafelzeile. **Abnahme:** Richtiger Fahrtverlauf öffnet sich.
- [ ] **BC63-04-09** Datenfrische- und Abdeckungsanzeige. **Abnahme:** Zeitpunkt, Quelle, partial/stale statt blindem Grün.
- [ ] **BC63-04-10** Virtualisierte große Tafel mit Pagination. **Abnahme:** 300+ Zeilen ohne erhebliche Verzögerung/Scrollsprung.

### E05 · Bahnhofskomplexe und Halte · P0

- [ ] **BC63-05-01** Mehrteilige Stationskomplexe auflösen. **Abnahme:** Berlin Hbf/Hermannstraße: Roh- und UI-Zeilen nachvollziehbar.
- [ ] **BC63-05-02** Explizite Teil-Stop-/Bahnsteig-Auswahl. **Abnahme:** Gültige IDs werden nicht falsch zugeordnet.
- [ ] **BC63-05-03** Deduplizierung gleicher Fahrten. **Abnahme:** Keine verlorenen unterschiedlichen Züge.
- [ ] **BC63-05-04** Ankunft und Abfahrt separat abdecken. **Abnahme:** Nicht nur eine Datenrichtung als vollständig melden.
- [ ] **BC63-05-05** Halte-Liste unabhängig von Radar-Kartenausschnitt. **Abnahme:** Alle gelieferten gültigen Halte bleiben erreichbar.
- [ ] **BC63-05-06** Unbekannte oder widersprüchliche Stops fail-closed. **Abnahme:** Fehlerhinweis statt Fake-Zug oder -Gleis.
- [ ] **BC63-05-07** Haltestellenalias-/Fixture-Sammlung erweitern. **Abnahme:** Berlin, Potsdam, Dresden, ländlich, Teilbahnhöfe.
- [ ] **BC63-05-08** Abgleich mit unabhängigen Quellen, soweit verfügbar. **Abnahme:** Abweichungen/Unavailable separat dokumentiert.

### E06 · Zuginspektor / Fahrtverlauf · P1

- [ ] **BC63-06-01** Neues einheitliches Zugdetail-Fenster. **Abnahme:** Nur ein aktiver Inspector und keine verdeckte Navigation.
- [ ] **BC63-06-02** Alle gelieferten Stopps als Zeitachse. **Abnahme:** Chronologie und Zeitzonen korrekt.
- [ ] **BC63-06-03** Soll-/Ist-Abfahrten und Ankünfte getrennt. **Abnahme:** Fehlende Prognosen als Fahrplan gekennzeichnet.
- [ ] **BC63-06-04** Gleis und Gleisänderung pro Halt. **Abnahme:** Nicht vorhandene Werte als unbekannt.
- [ ] **BC63-06-05** Verspätungsentwicklung innerhalb einer Fahrt. **Abnahme:** Nur vorhandene Stopzeit-Prognosen; kein erfundener Verlauf.
- [ ] **BC63-06-06** Ausfälle und entfallene Halte kennzeichnen. **Abnahme:** Warnhinweise bleiben beim Teilen erhalten.
- [ ] **BC63-06-07** Zur Station oder Verbindung springen. **Abnahme:** Rücknavigation stellt ursprünglichen Kontext wieder her.
- [ ] **BC63-06-08** Kartenfokus auf Fahrt mit echter Geometrie. **Abnahme:** Ohne Geometrie keine Luftlinie.
- [ ] **BC63-06-09** Quelle und Aktualisierungszeit pro Fahrt. **Abnahme:** Echtzeitstatus nach Ablauf herabstufen.

### E07 · Netzkarte / Rail Atlas · P1

- [ ] **BC63-07-01** Neues einheitliches Kartenthema hell/dunkel. **Abnahme:** Strecken/Stationen bleiben bei verschiedenen Zooms lesbar.
- [ ] **BC63-07-02** Filter nach Zugtyp und Linie. **Abnahme:** Karte und Zählliste verwenden dieselbe Filtermenge.
- [ ] **BC63-07-03** Netzwerk-Layer für Linien und Bahnhöfe. **Abnahme:** Nur zulässige echte Daten und geprüfte Linien.
- [ ] **BC63-07-04** Störungen als Layer aus belegten Hinweisen. **Abnahme:** Gültigkeitszeit und betroffene Gebiete nachvollziehbar.
- [ ] **BC63-07-05** Kartenlegende für GPS/modelliert/ohne Position. **Abnahme:** Nichts wird als Live-GPS ausgegeben ohne Quelle.
- [ ] **BC63-07-06** Zoomabhängige Markergruppierung. **Abnahme:** 180+ Marker ohne DOM-Instabilität.
- [ ] **BC63-07-07** Fahrtverlauf aus Kartenmarker öffnen. **Abnahme:** State-Wechsel reproduzierbar auch am Desktop.
- [ ] **BC63-07-08** Kartenzustand speichern und wiederherstellen. **Abnahme:** Map viewport optional lokal, keine fremde Standortverfolgung.
- [ ] **BC63-07-09** Suche entlang der sichtbaren Karte. **Abnahme:** Nur real zurückgelieferte Bahnhöfe anzeigen.

### E08 · Live Radar 3.0 · P0

- [ ] **BC63-08-01** Radar-HUD mit Linien-/Routenidentität. **Abnahme:** Ausgewählte Fahrt und Quelle stimmen überein.
- [ ] **BC63-08-02** Liste aller im Gebiet sichtbaren bestätigten Fahrten. **Abnahme:** Kein unsichtbarer Providerhalt durch Kartenfilter verloren.
- [ ] **BC63-08-03** Datenstatus je Marker / Zug. **Abnahme:** Liveposition, modellierte Position und Fahrplandaten getrennt.
- [ ] **BC63-08-04** Markerfokus ohne Tooltip-Race. **Abnahme:** Repeated click und schnelle Auswahl bleiben stabil.
- [ ] **BC63-08-05** Stale-Marker automatisch kennzeichnen. **Abnahme:** Zeitablauf entfernt Live-Behauptung.
- [ ] **BC63-08-06** Performanceoptimiertes Polling. **Abnahme:** Nur sichtbare/aktive Daten, Abbruch bei Wechsel.
- [ ] **BC63-08-07** Netzwerklast-Budget und Rate-Limits. **Abnahme:** Anfragen in Logs gezählt und gedeckelt.
- [ ] **BC63-08-08** Radar auch bei API-Teilfehler bedienbar. **Abnahme:** Vorhandene gültige Trips bleiben sichtbar mit Warnung.
- [ ] **BC63-08-09** Spezifischer Radar-Zeitslider (nur belegbare Snapshots). **Abnahme:** Kein historischer Replay ohne gespeicherte und rechtmäßig nutzbare Daten.

### E09 · Train Following 3.0 · P0

- [ ] **BC63-09-01** Großes neues Follow-Fenster wie Transport-Live-HUD. **Abnahme:** Zug, Ziel, ETA, Stopliste, Stopp-Aktion tatsächlich nutzbar.
- [ ] **BC63-09-02** Follow starten aus Zugdetail und Radar. **Abnahme:** Gleiche ausgewählte ID und ein Zustandsmodell.
- [ ] **BC63-09-03** Follow beenden vollständig und idempotent. **Abnahme:** Kamera, Timer, Notification-Hinweise entfernt.
- [ ] **BC63-09-04** Planer-/Suchwechsel ohne Geisterpanel. **Abnahme:** Regression Radar → Follow → Planen → neu.
- [ ] **BC63-09-05** Geschätzter Zeitfortschritt korrekt beschriften. **Abnahme:** Ohne frische Daten: keine aktuelle ETA.
- [ ] **BC63-09-06** Follow trotz kurzzeitigem Datenfehler stabil. **Abnahme:** Zeigt Pause/Stale, erfindet keine Daten.
- [ ] **BC63-09-07** Aktive Fahrt nach Seitenreload wiederherstellen. **Abnahme:** Nur wenn ID/Quellen gültig und Zustand local erlaubt.
- [ ] **BC63-09-08** Web- vs.-Android-Lebenszyklus differenzieren. **Abnahme:** Browser-Schließen beendet Web-Livegarantie.
- [ ] **BC63-09-09** Native Android-Foreground-Service prüfen. **Abnahme:** Persistenz nur nach Hardware-/OS-Abnahme behaupten.
- [ ] **BC63-09-10** Stop-from-notification und Permission-Verhalten. **Abnahme:** Reale Tests API 26/33/35 und zwei physische Geräteversionen.

### E10 · Reiseplaner 3.0 · P1

- [ ] **BC63-10-01** Kompletter neues Verbindungs-Layout. **Abnahme:** Alternativen vergleichen ohne überfüllte Karten.
- [ ] **BC63-10-02** Abfahrt jetzt / später / Ankunft bis. **Abnahme:** Uhrzeit-DST und Datumswechsel korrekt.
- [ ] **BC63-10-03** Direkt/Umstiege/Modus filtern. **Abnahme:** Filter nur über belegten Ergebnissen.
- [ ] **BC63-10-04** Alternativen nach ETA/Dauer/Umstiegen sortieren. **Abnahme:** Sortierlogik deterministisch.
- [ ] **BC63-10-05** Route mit Stop-Timeline öffnen. **Abnahme:** Alle Legs/Stops stimmen zur angefragten Reise.
- [ ] **BC63-10-06** Reale Umsteigezeiten pro Station sichtbar. **Abnahme:** Negative/missing Buffer korrekt.
- [ ] **BC63-10-07** Gleis- und Wegestatus beim Umstieg. **Abnahme:** Unbekannte Plattform/Wegzeit klar offen.
- [ ] **BC63-10-08** Alternativen bei Ausfällen suchen. **Abnahme:** Nur tatsächliche Providerantworten.
- [ ] **BC63-10-09** Reisevergleich 2–3 Kandidaten. **Abnahme:** Zeiten/Umstiege/Frische ohne Datenmischung.
- [ ] **BC63-10-10** Reise in Favoriten speichern und neu abrufen. **Abnahme:** Kein eingefrorener alter Abfahrtswert.

### E11 · Anschluss- und Reiseintelligenz · P1

- [ ] **BC63-11-01** Individueller Anschluss-Risikostatus. **Abnahme:** Regelbasiert aus Puffer, Datenfrische und Provenienz.
- [ ] **BC63-11-02** Risikoänderung nach aktualisierter ETA. **Abnahme:** Vorher/nachher nachvollziehbar und konservativ.
- [ ] **BC63-11-03** Anschluss verloren? Alternativroute anbieten. **Abnahme:** Nur reale Provideralternative, sonst Fehlanzeige.
- [ ] **BC63-11-04** Reise-Abschnitts-Cockpit. **Abnahme:** Vergangen/aktuell/nächster Halt aus tatsächlichen StopTimes.
- [ ] **BC63-11-05** Nächste Handlung am Umstieg anzeigen. **Abnahme:** Nur belegtes Gleis/Anschlussdaten, sonst prüfen.
- [ ] **BC63-11-06** Kritische Anschlüsse priorisieren. **Abnahme:** Sortierung nach belegtem Puffer/Unsicherheit.
- [ ] **BC63-11-07** Reiseplan-Änderungen seit letzter Aktualisierung. **Abnahme:** Ereignis-Diff nur mit gespeicherter Basis.
- [ ] **BC63-11-08** Keine Garantie von Anschlusssicherheit. **Abnahme:** Unbekannte Daten bleiben unbekannt.

### E12 · Störungszentrale / Operations · P1

- [ ] **BC63-12-01** Neue Störungsübersicht nach Region/Bahnhof/Linie. **Abnahme:** Nur gelieferte, aktive Hinweise und Quellengültigkeit.
- [ ] **BC63-12-02** Störungen priorisieren und gruppieren. **Abnahme:** Duplikate zusammenführen ohne Inhaltsverlust.
- [ ] **BC63-12-03** Betriebsunterbrechungen in Fahrtverlauf spiegeln. **Abnahme:** Gemeinsame Policy statt UI-Sonderregel.
- [ ] **BC63-12-04** Baustellen und Umleitungen mit Gültigkeitsfenster. **Abnahme:** Dresden Linie 1 + Gegenrichtung/DST Tests.
- [ ] **BC63-12-05** Betroffene Fahrten/Stopps verlinken. **Abnahme:** Echte IDs statt fiktiver Auswirkungen.
- [ ] **BC63-12-06** Störungs-Suche und Filter. **Abnahme:** Line/Mode/Severity/Status nachvollziehbar.
- [ ] **BC63-12-07** Störungs-Updatezeit und Herkunft. **Abnahme:** Keine netzweiten Vollständigkeitsgarantien.
- [ ] **BC63-12-08** Abgelaufene/Zurückgezogene Meldungen entfernen. **Abnahme:** Stale/validity Gate konsistent in allen Ansichten.

### E13 · Linien-Explorer 1.0 · P1

- [ ] **BC63-13-01** Neue eigenständige Linienansicht. **Abnahme:** Aus Stations-Linienliste erreichbar.
- [ ] **BC63-13-02** Alle gelieferten Halte einer Linie. **Abnahme:** Nur bei belegter aktueller Linienidentität.
- [ ] **BC63-13-03** Linienvarianten und Richtungen unterscheiden. **Abnahme:** Keine Vermischung von Gegenrichtung oder Kurzlaufen.
- [ ] **BC63-13-04** Abfahrten einer Linie am gewählten Bahnhof. **Abnahme:** Tafel gefiltert und Quelle sichtbar.
- [ ] **BC63-13-05** Kartenansicht der tatsächlichen Liniengeometrie. **Abnahme:** Fehlende Abschnitte transparent markieren.
- [ ] **BC63-13-06** Aktuelle Linien-Meldungen. **Abnahme:** Nur wenn Störung einem belegten Linienreferenzschlüssel zugeordnet.
- [ ] **BC63-13-07** Meine Linien speichern. **Abnahme:** Persistenz lokal und widerrufbar.
- [ ] **BC63-13-08** Linienvergleich nach Takt der verfügbaren Daten. **Abnahme:** Anzahl/Abstand klar als Zeitraumstichprobe.

### E14 · Stationsvergleich / Netzwerk-Analyse · P1

- [ ] **BC63-14-01** Zwei Bahnhöfe direkt vergleichen. **Abnahme:** Gleiche Zeitspanne, Quellenstatus und Kategorien.
- [ ] **BC63-14-02** Abfahrten pro Stunde. **Abnahme:** Zähler und Nenner nachvollziehbar.
- [ ] **BC63-14-03** Verkehrsmittel-Verteilung. **Abnahme:** Nur beobachtete Züge im Stichprobenfenster.
- [ ] **BC63-14-04** Pünktlichkeit im geladenen Fenster. **Abnahme:** Sample size, Quelle, Zeitfenster statt Netzbehauptung.
- [ ] **BC63-14-05** Gleiswechsel- und Ausfallübersicht. **Abnahme:** Unbekannt nicht als 0 zählen.
- [ ] **BC63-14-06** Betriebsaktivität als Tagesgrafik aus vorhandenen Daten. **Abnahme:** Keine behauptete vollständige Historie.
- [ ] **BC63-14-07** Häufigste Linien und Ziele. **Abnahme:** Gleiche deduplizierte Stop-Grundlage.
- [ ] **BC63-14-08** Netzwerk-Dichtekarte aus belegten Fahrten. **Abnahme:** Ohne unfreigegebene Daten/verdoppelte Züge.
- [ ] **BC63-14-09** Abfahrtslücken-Finder. **Abnahme:** Rein deskriptiv mit korrektem Zeitfenster.

### E15 · Persönlicher Bereich / Teilen · P1

- [ ] **BC63-15-01** Favoriten Bahnhof/Linie/Route getrennt verwalten. **Abnahme:** Hinzufügen, Aufrufen, Entfernen mit Tests.
- [ ] **BC63-15-02** Pendelstrecken-Widget innerhalb der App. **Abnahme:** Frische Suche, keine Fake-Push-Daueranzeige.
- [ ] **BC63-15-03** Zuletzt angesehene Fahrten. **Abnahme:** Explizit lokal mit Entfernungsfunktion.
- [ ] **BC63-15-04** Gespeicherte Reise wieder öffnen. **Abnahme:** ID-Verfall/Unavailable sicher behandeln.
- [ ] **BC63-15-05** Verbindung als Deep-Link teilen. **Abnahme:** Route und Datum mit sicheren Parametern.
- [ ] **BC63-15-06** Reiseplan als strukturierte Textzusammenfassung kopieren. **Abnahme:** Zeitstatus und Quelle erhalten.
- [ ] **BC63-15-07** Kalenderexport der tatsächlichen Verbindung. **Abnahme:** iCalendar Zeiten korrekt und escaped.
- [ ] **BC63-15-08** Lokale Daten löschen / Reset. **Abnahme:** Konsistente Löschung ohne Rehydration alter Daten.

### E16 · PWA/Android / Sicherheit · P0

- [ ] **BC63-16-01** PWA Upgrade 62.0.3 → 63.0.0. **Abnahme:** SW/Asset/Version gleich und keine alte UI nach Reload.
- [ ] **BC63-16-02** Klarer Offline-Modus. **Abnahme:** Letzte Daten als alt, keine Liveanzeigen.
- [ ] **BC63-16-03** Installierbarkeit Android/Windows. **Abnahme:** Manifest, Icons, Scope und Startweg getestet.
- [ ] **BC63-16-04** Android native Follow getrennt testen. **Abnahme:** Build/Emulator grün ersetzt keine Hardwareabnahme.
- [ ] **BC63-16-05** Push/Notification Permission ehrlich behandeln. **Abnahme:** Browser-/Native-Unterschied sichtbar.
- [ ] **BC63-16-06** Datenquarantäne erzwingen. **Abnahme:** Unfreigegebene Exporte nicht in Build/URL.
- [ ] **BC63-16-07** Stripe Checkout/Portal deaktiviert lassen. **Abnahme:** Keine Test- oder Echtgeldzahlung ausgelöst.
- [ ] **BC63-16-08** API Input-Ratenlimit und Fehlermeldungen härten. **Abnahme:** Keine Regressionsschwächung.
- [ ] **BC63-16-09** Telemetry nur minimal und datensparsam. **Abnahme:** Keine unnötigen Standort-/Personendaten.

### E17 · Architektur, Qualität, Release · P0

- [ ] **BC63-17-01** V62.0.3 Branch-Reconciliation vor Featuremerge. **Abnahme:** Follow Regressionen und alte Releasefeatures erhalten.
- [ ] **BC63-17-02** Typed Provider Adapters und Provenienzmodell. **Abnahme:** Einheitlicher Schedule/Realtime/GPS-Unbekannt Status.
- [ ] **BC63-17-03** Race-free Caching / AbortController. **Abnahme:** Keine Antwort alten Stationswechsels überschreibt neu.
- [ ] **BC63-17-04** Leistungstest Radar und lange Tafeln. **Abnahme:** Keine Regression gegen V62 Baseline.
- [ ] **BC63-17-05** Testmatrix realer Providerfälle. **Abnahme:** Berlin/Potsdam/Dresden/Regional + temporäre Fehler.
- [ ] **BC63-17-06** Browser E2E Happy- und Negativpfade. **Abnahme:** Keine reine statische CSS-Stringprüfung.
- [ ] **BC63-17-07** Automatisierte visuelle Regressionen. **Abnahme:** Screenshots für 320–1920 hell/dunkel; Unterschiede geprüft.
- [ ] **BC63-17-08** Barrierefreiheit WCAG 2.2 AA. **Abnahme:** Axe/Tastatur/Screenreader/Focus/Zoom/Touch.
- [ ] **BC63-17-09** Verpflichtende CI-Jobs am gleichen Git SHA. **Abnahme:** Kein Überspringen eines roten Pflichtjobs.
- [ ] **BC63-17-10** Live-Sites-Smoke mit Rollback-Plan. **Abnahme:** Release-SHA, deployed URL und PWA nachprüfbar.

### E18 · Quellengeprüfte optionale Erweiterungen · P2

- [ ] **BC63-18-01** Wagenreihung nur bei lizenzierter Providerquelle. **Abnahme:** Sonst explizit unbekannt, kein generisches Fantasie-Bild.
- [ ] **BC63-18-02** Zugauslastung nur bei zugelassenen Prognosen. **Abnahme:** Ohne Daten keine Ampel.
- [ ] **BC63-18-03** Bahnhofs-Barrierefreiheit nur bei verifizierten Daten. **Abnahme:** Keine erfundenen Aufzugzustände.
- [ ] **BC63-18-04** Streckenverlauf als historische Wiedergabe nur mit Snapshots. **Abnahme:** Kein rückwirkend ausgedachter Zugpfad.
- [ ] **BC63-18-05** Proaktive Alarmierung nur mit rechtmäßigen Triggern. **Abnahme:** Browser-/Native-Lebenszyklus und Einwilligung belegt.
- [ ] **BC63-18-06** OS-Widgets nur mit nativer geprüfter Oberfläche. **Abnahme:** Keine Webfunktion als Home-Screen Widget ausgeben.
- [ ] **BC63-18-07** Langzeit-Pünktlichkeitsanalysen nur mit erlaubtem Datenspeicher. **Abnahme:** Sample coverage und Nutzungsrechte dokumentieren.
- [ ] **BC63-18-08** Mehrsprachigkeit DE/EN mit vollständiger UI-Abdeckung. **Abnahme:** Kein teilweise übersetztes Mode-Chaos.

## Release-Abfolge (vom Codex-Agenten abzuhaken)

- [ ] R0: öffentlichen V62.0.3-Stand + vorhandenen PR #88 + Main + V62.0.3-Fixes versöhnen, Baseline im echten Browser screenshotten.
- [ ] R1: alle sichtbaren Kernflächen in neues Designsystem überführen, keine Demo-/Dummy-Buttons.
- [ ] R2: Station, Halte, Train, Radar, Follow, Planner, Journey + Datenqualität implementieren und testgetrieben nachweisen.
- [ ] R3: die neuen unabhängigen Bereiche Linien-Explorer, Zweibahnhofsvergleich, Reise-Operations-Cockpit und Netzatlas end-to-end schließen.
- [ ] R4: PWA/Android- und Rechts-/Datenabnahme, UI-, API-, Performance-, Accessibility- und Regressionstests; Screenshots als prüfbare CI-Artefakte.
- [ ] R5: nur bei GO auf EXISTIERENDES Sites-Projekt veröffentlichen, Liveversion/Cache/Flows belegen, V62.0.3-Rollback bereit halten.

## Produkt-Demo („das ist wirklich ein anderes Update“)

1. Öffne V62.0.3 und V63 nebeneinander bei 390×844; Unterschiede an Start, Hauptnavigation, Tafel, Zugdetail sofort sichtbar.
2. Finde Berlin Hbf, filtere echte Abfahrten, öffne eine reale Fahrt, zeige Soll/Ist, Stopps, Quelle, Zugradar und Follow; Wechsel zum Planer lässt keinen Inspector zurück.
3. Öffne **Linien-Explorer** aus der Bahnhofstafel: mehrere Richtungen, reale Halte, aktuelle Meldungen, favorisieren, Karte nur mit belegter Geometrie.
4. Öffne **Bahnhofsvergleich** Berlin Hbf ↔ Gesundbrunnen: gleiches Abfragefenster, quellenbezogene, deduplizierte Fahrten und tatsächlich berechnete Zähler statt erdachter Marktanteile.
5. Speichere Reise und verfolge Anschlussstatus; wenn Prognosen fehlen, wird der Status ausdrücklich unbekannt und ein Refresh bietet nur echte Ergebnisse.
6. Netzwerkfehler simulieren: Quelle/Teilabdeckung/Stale sichtbar, keine alte Prognose als Live angezeigt.
7. Mindestens zwei mobile Viewports, Desktop und Darkmode aus echter CI; gleiche Funktionen und kein horizontales Scrollen.

## Adversarial Release-Abnahme

- Feature-ID nicht in Code nachweisbar? → nicht implementiert.
- UI-Button ohne verifizierbaren Effekt? → P1.
- Gefälschte Echtzeit, unbestätigte Route oder Geometrie? → P0.
- Status „success“ obwohl Live-Smoketest nicht ausgeführt/Provider unavailable? → falsch, NO-GO für davon abhängiges Kriterium.
- Native Android-Persistenz ohne echte Hardwareabnahme? → Android NO-GO, Web als separater Scope.
- Browser-E2E fehlt für neue Kernfunktion? → Kernfeature bleibt nicht releasefähig.
- Echte V63-Design-Differenz in Screenshots nicht belegbar? → kein „Mega-Update“-Claim.
- GitHub-CI nicht auf Release-SHA grün oder Sites-Version nicht mit SHA belegbar? → keine Veröffentlichung.

## Technische Quellen

- https://gtfs.org/documentation/realtime/realtime-best-practices/ — TripUpdate/VehiclePosition unterscheiden; Frische jeweils quellenabhängig prüfen, 90s Referenzempfehlung für GTFS-RT.
- https://gtfs.org/documentation/realtime/reference/ — Fahrzeugpositionen und Prognosen sind unabhängige Entitäten; Daten nicht vermischen.
- https://int.bahn.de/en/booking-information/db-navigator — reale Beispiele für Reisebegleitung, Merken und Coach Sequence (nicht automatisch als verfügbare API interpretieren).
- https://www.sbb.ch/en/travel-information/apps/sbb-mobile/functions.html — Reiseverlauf und proaktive Störungsinformationen als UX-Vergleich, keine Übernahme fremder Marken/UI.
- https://transitous.org/api/ — Open Source + nicht-kommerzielle Bedingungen und Last.
- https://www.w3.org/TR/WCAG22/ — Barrierefreiheit.
