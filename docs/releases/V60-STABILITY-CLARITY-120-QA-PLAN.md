# BahnConnections — Nächste Update-Welle: Stabilität, Klarheit, 120 QA-Fälle

**Stand:** Plan, **keine Behauptung 120 bereits gefundener Bugs**. Aktiver Entwicklungsstand: V60 PR #74 auf Branch `feat/v60-next-generation-20261014` (V60 noch nicht öffentlich freigegeben). Dieses Dokument beschreibt die nächste Release-Welle vor bzw. nach Freigabe; Versionsbezeichnung erst nach Release-Termin festlegen.

## Ausgangspunkt — durch Nutzer-Screenshots belegte UX-Defekte

- Berlin Hermannstraße zeigt eine nicht erreichbare Stations- und Live-Tafel.
- Berlin Hbf meldet 39 bestätigte Halte, zeigt im sichtbaren Ausschnitt aber nur eine S9-Zeile. Rohdaten, aktiven Zeitfilter, Scrollposition und dargestellte Zeilen vergleichen, bevor die genaue Ursache behauptet wird.
- Eine Filter-Schaltfläche ist rechts abgeschnitten; der Markerplan ist mit unbenannten blauen Punkten überladen.
- Obere und untere Stationskarte konkurrieren; der Routenplaner benötigt mobil übergroße Flächen.
- Plus-Preise/Ankündigungen ohne genügend unmittelbar nutzbare Vorteile; Ladekarte mit drei Punkten ohne Nutzerorientierung.
- Screenshot-Uhrzeit und Tafelzeit lassen Fragen zur Frische offen; explizite Status- und Sortierungsprüfung.

**Code-Indizien (noch keine bestätigten Root Causes):** Die API `app/api/stations/[id]/board/route.ts` fragt bereits per `stopId` ab, hat `n`-Limit (bis 5000), `RAIL_MODES`, `REALTIME`-Abfrage und optionalen DB-Quellenvergleich; bei Upstreamfehlern liefert sie 502 mit leerer Liste. `app/station-marker.ts` zeichnet 1.8–6px Punktradien, die durch größere interaktive Hitzonen ergänzt werden müssen. Mehrere Generationen Stylesheets können CSS-Kaskaden-Konflikte erzeugen. `app/subscription-plans.ts` listet Plus weiterhin als geplant; Stripe-Tests/Checkout-Schnittstellen im Branch sind kein Beleg für aktivierte Plus-Nutzung.

## Konkretes UI-Ziel

1. **Eine Station, ein Sheet:** Kein doppelt großer Stationsheader; kompaktes aufklappendes Bahnhofs-Pop-up mit Tafel / Route / Favorit.
2. **Hierarchie:** Suchfeld → Karte → ausgewählter Bahnhof → Abfahrt/Ankunft → Linie, Ziel, Ist/Soll, Gleis, Status. Eine Hauptaktion, keine Chip-Flut.
3. **Marker:** lesbare wichtige Halte; Zoom-abhängige Typkennzeichnung, mit mindestens 48x48px tatsächlichem Touch-Ziel, keine ungeprüften „Live“-Marker.
4. **Netzfehlermodell:** ein laufender Live-Abruf, danach ehrlicher Fahrplan-/Cache-Fallback mit Quellen- und Datenalter; sichtbare Wiederholen-Aktion; keine künstlich aufgefüllten Fahrten.
5. **Zugfenster:** beim Tippen Verlauf und nächsten Halt, Soll/Ist, Gleis, Quellzeit, modellierte Position korrekt auszeichnen.
6. **Animation:** kurze Geometrie-/Opacity-Transitions (180–260ms Richtwert), nur wenn Bewegung nicht reduziert ist; keine Dauerglows; statische Skeletons unter Reduce Motion.
7. **Plus:** weich wechselnder Rubin–Rosé–Violett-Verlauf auf einer einzigen Premium-Fläche; Grund-UI neutral. Nützliches Plus-Merkmal „Pendelmonitor“ zunächst lokal testbar, ehrliche Frischewerte. Bezahlpflicht und geräteübergreifende Synchronisierung erst mit echter Backend-Berechtigung.

## Bugoffensive: 120 voneinander unterscheidbare QA-Fälle

**Status eines Falls:** `nicht getestet` → `bestätigt` / `nicht reproduzierbar` → `behoben` → `Regression grün`. Ein bestandener Fall zählt NICHT als behobener Bug. Keine künstliche Buganzahl durch Umbenennen von CSS-Werten.

### A · Bahnhofstafeln & Provider

- [ ] 001 · 502/Timeout bei Hermannstraße reproduzieren und Ursache mit Fehlercode isolieren
- [ ] 002 · Transitous-Fehler ohne vollständiges Leerräumen bereits geladener Daten behandeln
- [ ] 003 · DB-Gegenprüfung darf primäre Tafel nicht blockieren
- [ ] 004 · Streaming-Antwort bei ausbleibendem zweitem NDJSON-Datensatz abschließen
- [ ] 005 · Timeout und Abort bei raschem Stationswechsel sauber trennen
- [ ] 006 · Retry-Button startet neuen Request statt nur UI-Refresh
- [ ] 007 · HTTP 429 mit Backoff statt aggressivem Dauerpolling
- [ ] 008 · Leere Providerantwort nicht als erfolgreich verifizierte Live-Tafel darstellen
- [ ] 009 · Provider-Fehlermeldung verständlich und ohne technische Interna darstellen
- [ ] 010 · Pro Station/Richtung letzte erfolgreiche Tafel mit deutlich gekennzeichnetem Alter verfügbar halten

### B · Vollständigkeit & Haltestellenzuordnung

- [ ] 011 · Berlin Hbf: Zähler 39 vs. sichtbar 1 mit Rohdaten und UI-Filtern abgleichen
- [ ] 012 · Berlin Hermannstraße: genaue stopId und Betreiber-Halte abgleichen
- [ ] 013 · Fern-, Regional- und S-Bahn-Halte über dieselbe Stationslogik führen
- [ ] 014 · Stationskomplexe und Bahnsteig-Teilstationen bewusst zusammenführen oder trennen
- [ ] 015 · Keine Abfahrten aufgrund Kartenradius, Zoom oder sichtbaren Zugmarkern filtern
- [ ] 016 · Pagination/Limit n auf tatsächlich retournierte Menge überprüfen
- [ ] 017 · Zeithorizont der Tafel explizit anzeigen und erweiterbar machen
- [ ] 018 · Versteckte Verkehrsmittel-/Linienfilter bei Stationswechsel zurücksetzen oder sichtbar markieren
- [ ] 019 · Gleiche Fahrt nicht mehrfach als verschiedene Zeilen doppeln
- [ ] 020 · Abfahrtszähler nur für aktuell sichtbaren Zeitraum und Filter korrekt berechnen

### C · Abfahrt/Ankunft/Zeit

- [ ] 021 · Ankunft und Abfahrt eindeutig getrennte Requests und Tabs
- [ ] 022 · Wechsel des Tabs darf alte Richtungsdaten nicht kurz als neue anzeigen
- [ ] 023 · Zug mit 22:29 bei Gerätezeit 22:30 nur mit korrektem Status zeigen
- [ ] 024 · Zeilen nach Soll- bzw. prognostizierter Abfahrt sinnvoll sortieren
- [ ] 025 · Mitternacht und Folgetag korrekt beschriften
- [ ] 026 · Sommer-/Winterzeitwechsel in Berlin korrekt berechnen
- [ ] 027 · Ungültige Zeitstrings nicht als aktuelle Istzeit rendern
- [ ] 028 · Sollzeit nur dann durchstreichen, wenn gültige abweichende Prognose vorliegt
- [ ] 029 · Vorzeitige Abfahrt und Verspätung mit Vorzeichen korrekt anzeigen
- [ ] 030 · Gleis und entfallener Halt unabhängig von Gesamtzugausfall korrekt zeigen

### D · Datenwahrheit & Frische

- [ ] 031 · Quelle und Erhebungszeit der Tafel sichtbar und eindeutig
- [ ] 032 · Abrufzeit nicht mit Messzeitpunkt oder GPS-Zeitpunkt verwechseln
- [ ] 033 · Echtzeit nur je tatsächlich prognostizierter Fahrt markieren
- [ ] 034 · Gemischte Live-/Fahrplan-Antwort darf keine pauschale Echtzeitgarantie erzeugen
- [ ] 035 · Nach drei Minuten Quelle als möglicherweise veraltet markieren
- [ ] 036 · Offline nicht dieselbe Kennzeichnung wie live verwenden
- [ ] 037 · Fehlende Gleisangaben ohne geratenen Ersatz darstellen
- [ ] 038 · Verspätungshistorie nur aus wirklich beobachteten Änderungen
- [ ] 039 · Unbekannte Auslastung niemals aus Tageszeit ableiten
- [ ] 040 · Fahrzeugposition als Modell kennzeichnen, sofern keine Messposition

### E · Karte & Stationsmarker

- [ ] 041 · 1.8–6px-Markerradius nie als alleinige Touchfläche benutzen
- [ ] 042 · Alle anklickbaren Stationsmarker mit eigenem mindestens 48px-Treffbereich
- [ ] 043 · Punkte bei mittlerem Zoom in lesbare typisierte Bahnhofsmarker überführen
- [ ] 044 · Fernbahnhöfe, Regionalbahnhöfe und lokale Halte differenzieren
- [ ] 045 · Ausgewählte Station mit eindeutigem Fokus- und Auswahlzustand
- [ ] 046 · Cluster-Auswahl öffnet passende Stationsliste und nie zufällige Station
- [ ] 047 · Überlappende Bahnlinien dürfen Tap auf Station nicht verdecken
- [ ] 048 · Kartenverschiebung darf kein unbeabsichtigtes Stationstippen auslösen
- [ ] 049 · Marker-Zoomskalierung respektiert Performance- und Datenbudget
- [ ] 050 · Nicht verfügbare Haltestellenquelle nicht als störungsfrei grün darstellen

### F · Pop-ups, Sheets, Ebenen

- [ ] 051 · Obere Stationskarte und unteres Stationssheet nicht doppelt anzeigen
- [ ] 052 · Stationstap zeigt kompaktes Pop-up mit genau drei klaren Aktionen
- [ ] 053 · Peek/Half/Full haben jeweils eindeutig definierte sichtbare Inhalte
- [ ] 054 · Schließen-X schließt tatsächlich und stellt Kartenbedienung wieder her
- [ ] 055 · Sheet-Drag darf keine Karten-Drag-Geste aktivieren
- [ ] 056 · Android-Zurück schließt zuerst oberstes Pop-up/Sheet
- [ ] 057 · Sheet hinter Navigationsleiste/Safe-Area bleibt bedienbar
- [ ] 058 · Overlay-Z-Index verdeckt keine erforderlichen Bedienelemente
- [ ] 059 · Stationwechsel aktualisiert den Sheet-Titel ohne alten Inhalt
- [ ] 060 · Geöffnete Tastatur kollidiert nicht mit Sheet oder Suchvorschlägen

### G · Suche, Planung & Navigation

- [ ] 061 · Von-/Nach-Autocomplete liefert eindeutige Stationen
- [ ] 062 · Tauschbutton wechselt Eingaben ohne Datenverlust
- [ ] 063 · Mein Standort darf nur nach Zustimmung verwendet werden
- [ ] 064 · Jetzt abfahren und eigenes Datum dürfen nicht widersprüchlich aktiv sein
- [ ] 065 · Planer CTA bleibt auf 320px-Bildschirm erreichbar
- [ ] 066 · Verbindungsabfragen werden bei Eingabewechsel abgebrochen
- [ ] 067 · Routen mit fehlenden Umsteigezeiten nicht als sicher einstufen
- [ ] 068 · Fehlende Verbindungen zeigen klare Alternative/Retry
- [ ] 069 · Zurück von Zugansicht stellt vorherige Suchergebnisse wieder her
- [ ] 070 · Primärnavigation Karte/Planen/Abfahrten/Mehr behält Zustand konsistent

### H · Zugradar & Fahrtansicht

- [ ] 071 · Schwarzer/leer laufender Radarbildschirm mit Lade-/Fehlerzustand ersetzbar
- [ ] 072 · Positionsschätzung ohne GPS eindeutig als modelliert markieren
- [ ] 073 · Der ganze vom Provider gelieferte Halteverlauf statt nur Nähe sichtbar
- [ ] 074 · Ankunft und Abfahrt eines Halts getrennt und aktuell
- [ ] 075 · Haltestellenliste lässt sich scrollen und zurück zur Karte wechseln
- [ ] 076 · Zug verfolgen und folgen/beenden reagieren auf tatsächlichen Tap
- [ ] 077 · Karte springt bei jedem Tick nicht unkontrolliert
- [ ] 078 · Fahrt wechseln räumt alte Marker/Animationen auf
- [ ] 079 · Veralteter Fahrtdatensatz stoppt irreführende Positionsfortschreibung
- [ ] 080 · Datenfehler einer Fahrt legt nicht die gesamte App lahm

### I · UI-Hierarchie & visuelles System

- [ ] 081 · Auf engem Handy keine horizontal abgeschnittene Filter-Schaltfläche
- [ ] 082 · Eine dominante Aktion pro Ansicht, Nebenaktionen zurücknehmen
- [ ] 083 · Abfahrtstafel zeigt Linie/Ziel/Uhrzeit/Gleis/status in klarer Gewichtung
- [ ] 084 · Formen auf konsistente Radius- und Abstandstokens reduzieren
- [ ] 085 · Aus früheren CSS-Versionen widersprechende Überschreibungen konsolidieren
- [ ] 086 · Akzentrot ausschließlich für Aktion/Status statt jede Karte
- [ ] 087 · Doppelte Überschriften, Pseudo-Karten und Glows entfernen
- [ ] 088 · Typografie unter 200%-Textzoom lesbar und ohne Clip
- [ ] 089 · Nachtmodus hat korrekten Kontrast und nicht nur dunkle Transluzenz
- [ ] 090 · Ladezustände als ruhige Skeletons mit wirklichem Endzustand

### J · Touch, Tastatur & Barrierefreiheit

- [ ] 091 · Alle ikonischen Buttons mindestens 48x48px Touch-Ziel auf Mobilgeräten
- [ ] 092 · Zwei benachbarte Marker dürfen sich nicht gegenseitig blind blockieren
- [ ] 093 · Tab-Taste, Enter und Space bedienen Schaltflächen korrekt
- [ ] 094 · Fokus sichtbar nach Dialog-/Sheet-Schließung wiederherstellen
- [ ] 095 · Screenreader liest Linie, Ziel, Soll, Ist, Gleis und Status strukturiert
- [ ] 096 · Beschriftete Controls statt nur dekorativer Icons
- [ ] 097 · Reduzierte Bewegung schaltet nichtessenzielle Bewegungen ab
- [ ] 098 · Farben funktionieren auch bei Farbsehschwäche durch Texte/Symbole
- [ ] 099 · Fehlermeldung fokussierbar und nicht nur per Toast
- [ ] 100 · Kein element mit pointer-events:none blockiert beabsichtigte Interaktion

### K · Leistung, Netzwerk & Offline

- [ ] 101 · Doppelte Requests durch Map/Board/Sheet kontrollieren
- [ ] 102 · Rapid-Station-Switch verhindert Anzeige alter Response
- [ ] 103 · Cache pro stationId/Richtung/Zeithorizont getrennt
- [ ] 104 · Rückkehr aus Hintergrund aktualisiert Frischezustand korrekt
- [ ] 105 · Offline-Cachedaten mit Offline-Label statt falschem Live
- [ ] 106 · Schlechtes Netz lädt keine endlose Animation
- [ ] 107 · Abgebrochene Fetches und Timer leaken nicht
- [ ] 108 · Mobilansicht bei 320/360/390/430px ohne Layout-Schubser
- [ ] 109 · Lange Tabellen virtualisieren oder effizient rendern
- [ ] 110 · Animationen nur GPU-freundlich und bei Reduce Motion minimal

### L · Plus, Zahlung & Vertrauen

- [ ] 111 · Free/Plus-Funktionen klar nach aktuell/verfügbar/geplant unterscheiden
- [ ] 112 · Plus-Gradient langsam, markenkonform und bei Reduce Motion statisch
- [ ] 113 · Plus-Hero bleibt mit dunklem Hintergrund gut lesbar
- [ ] 114 · Pendelmonitor mit lokalen Fahrten als Prototyp testbar und ehrlich gekennzeichnet
- [ ] 115 · Verlauf der beobachteten Pendel-Abweichungen nie fiktiv ergänzen
- [ ] 116 · Abo-Status ausschließlich serverseitig validieren
- [ ] 117 · Kunden dürfen nicht allein per UI-Toggle Plus freischalten
- [ ] 118 · Test-Checkout nicht als öffentliche bezahlbare Subscription darstellen
- [ ] 119 · Webhook-Duplikate und abgelaufene Abos sicher abfangen
- [ ] 120 · Kündigung, Datenschutz und reale Verfügbarkeit vor Live-Zahlung klar kommunizieren

## Umsetzung in 5 Abnahmewellen

| Welle | Fokus | Erst abgenommen, wenn … |
|---|---|---|
| 1 (P0) | Datenvollständigkeit, leere Tafeln, eindeutige Quelle | Hermannstraße und Berlin Hbf sowie S-/Regional-/Fernbahnhöfe per stationId/Request/Response/UI-Diff geprüft; 502/429/Timeout im Fehler-Fallback; gleiche Zählerlogik |
| 2 (P0/P1) | Karte, Hit-Targets, Station-Sheet und Planer | Ein funktionsfähiges Sheet, keine Doppelkarte, Tap auf Marker und Kreuz jederzeit, keine abgeschittenen Filter |
| 3 (P1) | Zeit-/Realtime-Korrektheit, Zugradar, Navigation | Keine erfundenen GPS-/Gleis-/Auslastungsdaten; Mitternacht/Zeitzone, Follow, Browser zurück, Fehlerzustände getestet |
| 4 (P1) | Visuelles Design, Microinteraction und Mobile | 320/360/390/430/768/1024/1440px; Hell/Dunkel; Schriftzoom 200%; Reduce Motion; Hardware-Android |
| 5 (P1/P2) | Plus-UI, real nutzbarer Pendelmonitor, Zahlungsfreigabe | Feature mit tatsächlichen Daten; Status/Preise korrekt; keine kaufbare Subscription ohne Auth, Webhooks und Geschäftsfreigabe |

## Bugfix-KPI und verbindliche Release-Gates

- **120 gezielte QA-Fälle** als initialer Fehlerjagd-Umfang; weitere entdeckte Defekte gehen in ein nummeriertes Register. **Ambitioniertes Ziel:** 50+ **reproduzierte und nach Regression verifizierte echte Fehlerkorrekturen**, falls sie tatsächlich gefunden werden. Bei weniger echten Befunden wird keine Zahl geschönt.
- Freigabe: **0 offene P0**, **0 offene P1** in den Kernfahrgastpfaden; P2 nur explizit dokumentiert und nicht sicherheits-/datenkritisch.
- Jeder behobene Bug erhält: Repro, Ursache, Patch/Commit, Test, Screenshot/Video falls visuell.
- Automatisierte Regression: API-Tests 502/429/Abort/Zeitfenster; stationId-Komplettheit; Playwright Klick-/Scroll-/Visualtests; Android-PWA-Netzwechsel.
- CI: `pnpm typecheck`, `pnpm lint`, `pnpm build`, vorhandene `audit:*` und ergänzte Regressionen müssen grün sein; Cloudflare-Dry-Run ≠ Deployment.
- Externe Datenrechte/Transitous-Lizenz und Stripe-Produktion separat rechtlich/technisch freigeben.
- **Keine automatische Veröffentlichung/Merge** nur weil Zielzahlen erreicht sind. Aktive V60 PR #74 bleibt Release-Basis bis eine saubere Freigabe möglich ist.

## Erste gezielte Diagnose

- A/B: rohe `/api/stations/{id}/board`-Antwort gegen alle deduplizierten/UI-gefilterten Zeilen vergleichen; für Hbf Zähler 39 erklären, nicht nur Fetch-Limit erhöhen.
- Hermannstraße: Stations-ID, tatsächlicher Provider-HTTP-Code, Richtungs-/Zeitparameter und Transitous-Status getrennt prüfen; sichere Fallback-Liste für nur Fahrplan und älteren Cache.
- Karte: Leaflet-Layer-Events, `pointer-events`, Marker-Radius/Hitbox, Z-Index und Sheet-Drag unter echtem Android-Touch nachstellen.
- Layout: CSS-Audit sämtlicher aktiver Versions-Stylesheets; Duplikate und `!important`-Regeln systematisch reduzieren, bevor neue Overrides wachsen.

## Wichtige Wahrheit

Diese Datei ist ein **Arbeits- und Testplan**. Es sind heute weder 120 Fehler bestätigt noch 50 behoben; die App ist hiermit weder veröffentlicht noch abschließend getestet.
