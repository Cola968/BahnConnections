# BahnConnections V63 TITAN — Testlabor und Freigabematrix (Entwurf)

**Stand:** 26.10.2026; **83 explizite E2E-/QA-Szenarien**, zusätzlich Unit-/Integrationstests je Feature aus dem 156-Einträge-Register.

Nicht alle Testfälle sind bereits automatisiert. Jedes Checkbox-Kästchen ist absichtlich offen. Tests unterscheiden `PASS`, `FAIL`, `UNAVAILABLE`, `NOT-RUN`. `UNAVAILABLE` oder `NOT-RUN` zählen nie als bestanden.

## Testhinweise

- Für deterministische Tests eingefrorene Fixtures/Uhren und simulierte Providerzustände verwenden. Zusätzlich Live-Provider-Prüfungen auf den tatsächlichen Release-SHA.
- Browserbelege als screenshots/traces/console/network abspeichern; keine Bildinterpretation aus bloßen CSS-Textchecks.
- Ausfälle zuerst per rotem Test reproduzieren, dann beheben; keine Abschwächung von Assertionen.
- Jede Test-Case ID mit den betroffenen BC63 Feature IDs und dem ausführenden Befehl verknüpfen.
- Für unsichere Daten müssen UI-Bezeichnungen und Berechnungen konservativ sein: Schedule vs realtime vs modelliert vs confirmed GPS vs unbekannt.

### Release, Branches und Version

- [ ] **QA63-001** Exakt V62.0.3 Quell-SHA mit V63 zusammenführen — Erwartet: Spätere V62-HUD-Fixes bleiben erhalten, Merge-Diff geprüft.
- [ ] **QA63-002** Historisches main diverges kontrollieren — Erwartet: Keine Render-Hosting Dateien oder regressiven Cherry-Picks.
- [ ] **QA63-003** V63 Commit/Tag/Source-Tree zuordnen — Erwartet: Alle Prüfungen und Deployment referenzieren denselben SHA.
- [ ] **QA63-004** Cache Version 62.0.3 → 63.0.0 — Erwartet: Alte Assets verschwinden erst nach erfolgreichem Aktivieren.
- [ ] **QA63-005** Browser-Tabs und Reload beim PWA-Update — Erwartet: Kein Mix aus UI-Versionen, keine verlorenen Benutzerdaten.
- [ ] **QA63-006** Rollback auf exakte öffentliche V62.0.3 — Erwartet: Route, Version und SW nach Rollback korrekt.

### Screen & Responsive

- [ ] **QA63-007** 390×844 iPhone/Android Portrait Hell/Dunkel — Erwartet: Alle Hauptbereiche scanbar und bedienbar.
- [ ] **QA63-008** 320×568 kleines Phone Hell/Dunkel — Erwartet: Kein Overflow oder blockierte erste Fahrt.
- [ ] **QA63-009** 360×740 und 430×932 mobile Varianz — Erwartet: Buttons und Sheets korrekt.
- [ ] **QA63-010** 667×375 + 844×390 Landscape — Erwartet: Erste Fahrt sichtbar, Bedienung ohne Überdeckung.
- [ ] **QA63-011** 768×1024 Tablet Portrait + 1024×768 Landscape — Erwartet: Kein unstabiler Panelwechsel.
- [ ] **QA63-012** 1440×900 und 1920×1080 Desktop — Erwartet: Karte, Detail, Planer sinnvoll nebeneinander.
- [ ] **QA63-013** Schriftzoom 200% und vergrößerte Schrift — Erwartet: Keine abgeschnittenen Zeiten/Buttons.
- [ ] **QA63-014** High Contrast / Reduced Motion / Reduced Transparency — Erwartet: Inhalt und Fokus erhalten.
- [ ] **QA63-015** Vorher-/Nachher des Public-Builds — Erwartet: Gleicher Datenfixture/Viewport mit nachvollziehbarer Veränderung.

### Start, Suche und Navigation

- [ ] **QA63-016** Suchen mit verschiedenen Buchstabenfolgen — Erwartet: Debounce, belastbare Ergebnisse, eindeutige Station IDs.
- [ ] **QA63-017** Zwei schnelle unterschiedliche Suchanfragen — Erwartet: Verspätete erste Antwort überschreibt zweite nicht.
- [ ] **QA63-018** Tastatur-Suche bis station UI — Erwartet: Arrow/Enter/Escape/Focus/ARIA korrekt.
- [ ] **QA63-019** Back/Forward über Zug/Station/Planer — Erwartet: History und Auswahl widersprechen sich nicht.
- [ ] **QA63-020** Favorit speichern/löschen und Reload — Erwartet: Zustand korrekt und bewusst lokal.
- [ ] **QA63-021** Deep-Link teilen und in neuem Tab öffnen — Erwartet: Station, Route, Datum korrekt ohne Tracking-Geheimnisse.

### Bahnhofstafel und Haltestellengruppen

- [ ] **QA63-022** Berlin Hbf als echter mehrteiliger Knoten — Erwartet: Roh-IDs, Deduplikation, UI-Zeilen plausibel.
- [ ] **QA63-023** Hermannstraße S/U und Mexikoplatz — Erwartet: Nicht-leere reale Tafel bei verfügbaren Providern.
- [ ] **QA63-024** Gesundbrunnen mit 300+ Einträgen — Erwartet: Lange Liste performant, Scrollfokus bleibt.
- [ ] **QA63-025** Abfahrt ↔ Ankunft 20× — Erwartet: Keine falsche Richtung, keine verlorenen Daten.
- [ ] **QA63-026** 15/30/60/120 Minuten Filter — Erwartet: Grenzzeiten, verspätete Halte, DST sauber.
- [ ] **QA63-027** Gleiswechsel Filter — Erwartet: Alt/neu nur aus Provider.
- [ ] **QA63-028** Storno/Ausfall-Stichprobe — Erwartet: Ausfall farblich UND textual sichtbar.
- [ ] **QA63-029** Provider API 500, Timeout, leere Antwort — Erwartet: Explicit state, retry, stale statt Fake-Ergebnis.
- [ ] **QA63-030** Stationwechsel während 90 Detailabrufen — Erwartet: Abbruch, Limit und keine alten Details.

### Zugdetails und Stop-Timeline

- [ ] **QA63-031** ICE mit mindestens 20 Halten — Erwartet: Alle Stopps geordnet, Zeitfelder aus Quellen.
- [ ] **QA63-032** Tram mit unterschiedlichen Richtungen — Erwartet: Keine erfundenen Haltefolgen.
- [ ] **QA63-033** Fahrt vor/nach Mitternacht — Erwartet: Stopzeiten über Datumsgrenze.
- [ ] **QA63-034** Winterzeit-/Sommerzeit-Übergang — Erwartet: ISO, Zeitzone und Anzeige korrekt.
- [ ] **QA63-035** Prognosen werden stale — Erwartet: Vergangene Prognose verliert Live-Beschriftung.
- [ ] **QA63-036** Verschiedene Soll-/Ist-Gleise — Erwartet: Plan vs Realität genau gekennzeichnet.
- [ ] **QA63-037** Zugdetail → Karte → zurück — Erwartet: Konsistente ID, ein Inspektor.

### Karte, Radar und Follow

- [ ] **QA63-038** 180 Marker bei mehrfacher Aktualisierung — Erwartet: Keine DOM-Marker-Leaks oder verschobenen IDs.
- [ ] **QA63-039** Markierung ohne GPS Quelle — Erwartet: Kein genauer Live-Punkt behauptet.
- [ ] **QA63-040** Halt vorhanden, Marker außerhalb Viewport — Erwartet: Halt über Listenansicht erreichbar.
- [ ] **QA63-041** Radar → Follow → Planner → neue Suche — Erwartet: Alter Inspector/Follow HUD verdeckt nichts.
- [ ] **QA63-042** Follow laden mit Radar-API 503 — Erwartet: Ausfallstatus, zuvor gültige Auswahl bleibt.
- [ ] **QA63-043** Gleichzeitige Follow- und Panelanimation — Erwartet: Keine Hit-Test Überlagerung.
- [ ] **QA63-044** Follow stoppen zweimal — Erwartet: Idempotent, Timer/Kamera gestoppt.
- [ ] **QA63-045** Follow nach Web-Tab schließen — Erwartet: Keine falsche dauerhafte Background-Garantie.
- [ ] **QA63-046** Android-Follow nach App schließen — Erwartet: Nur physischer nativer Test, getrennt von Web.
- [ ] **QA63-047** Erneute Marker-Auswahl/Tooltip 20× — Erwartet: Kein Leaflet- oder React-Fehler.

### Planer, Alternativen und Anschlüsse

- [ ] **QA63-048** Berlin Hbf nach München Hbf — Erwartet: Provider-Trip korrekt mit mehreren Alternativen.
- [ ] **QA63-049** Fern-/Regional-/Umsteige-Filter — Erwartet: Echte Optionen, reproduzierbare Sortierung.
- [ ] **QA63-050** Negative Anschlussreserve — Erwartet: Kritischer Status ohne Garantie.
- [ ] **QA63-051** Unbekannte Gehzeit/Gleis — Erwartet: Kein grüner „sicher“-Status.
- [ ] **QA63-052** Verspätete Umstiegsetappe — Erwartet: Puffer aktualisiert, nur echte Alternativen.
- [ ] **QA63-053** Option über Baustelle / gesperrten Halt — Erwartet: Fail-closed statt unbestätigtem Ergebnis.
- [ ] **QA63-054** Trip merken, neue Suche, alte Auswahl — Erwartet: Keine alten Panels und frischer Request.
- [ ] **QA63-055** Export und Shared Link bei DST — Erwartet: Daten und UTC korrekt.

### Neue Module: Linien, Vergleiche, Operations

- [ ] **QA63-056** Linienexplorer mit Richtungsvarianten — Erwartet: Gegenrichtungen nicht zusammenführen.
- [ ] **QA63-057** Linienkarte ohne Geometrie — Erwartet: Fehlend kennzeichnen, keine Luftlinie.
- [ ] **QA63-058** Bahnhof A/B Vergleich gleiches Zeitfenster — Erwartet: Zähler/Quelle/Zeit offenlegen.
- [ ] **QA63-059** Bahnhofvergleich mit ungleichen Quellenstatus — Erwartet: Kein unfairer Vergleich und Warnung.
- [ ] **QA63-060** Verkehrsdichte-Grafik mit partiellen Daten — Erwartet: Stichprobengröße explizit.
- [ ] **QA63-061** Operations-Center Zeitfilter — Erwartet: Nur aktuell gültige Betreiberhinweise.
- [ ] **QA63-062** Dresden Linie 1 Umleitung 09.–24.10.2026 — Erwartet: Historische Tests zeigen gültige alternative Stopfolge.
- [ ] **QA63-063** Dresden nach Ablauf der Baustelle — Erwartet: Alte Sperre nicht weiter als aktiv.
- [ ] **QA63-064** Netzatlas Karte ohne lizenzierte Layer — Erwartet: Keine quarantänisierten DB-Datensätze.

### Accessibility, Security und Provider

- [ ] **QA63-065** Axe / WCAG 2.2 AA automatisiert — Erwartet: Keine blockierenden Verletzungen.
- [ ] **QA63-066** Tastaturbedienung ohne Maus — Erwartet: Alle Kernflows per Tab/Enter/Escape.
- [ ] **QA63-067** Touch Ziele 44×44 Zielwert — Erwartet: Bedienelemente praktikabel erreichbar.
- [ ] **QA63-068** Screenreader semantische Zeiten/Gleise — Erwartet: Bedeutung ohne rein visuelle Farbe.
- [ ] **QA63-069** Provider-Response falscher Datentyp / 429 — Erwartet: Robuster Fehler und angemessener Backoff.
- [ ] **QA63-070** HTTP User-Agent/Referer und Attribution — Erwartet: Transitous-Policy geprüft.
- [ ] **QA63-071** DB Exporte im öffentlichen Build fehlen — Erwartet: Beide DB URLs 404, Quarantäne intakt.
- [ ] **QA63-072** Checkout und Portal weiterhin deaktiviert — Erwartet: Keine Zahlungen; 503 respektive false Status.
- [ ] **QA63-073** Keine Secret-/PII-Leaks in Logs/Links — Erwartet: Review aller neuen Endpoints.

### Stabilität, Last und Release

- [ ] **QA63-074** Langlauf App 30min und wiederholte Navigation — Erwartet: Keine Timer-/Observer-/Memory-Leaks.
- [ ] **QA63-075** Langsame Datenverbindung und Offline-Schalter — Erwartet: UI bleibt reaktionsfähig und ehrlich.
- [ ] **QA63-076** Request-Budget eines großen Bahnhofs — Erwartet: Keine 90 ungedrosselten Requests.
- [ ] **QA63-077** LCP/CLS/INP Baseline-Vergleich — Erwartet: Keine unbegründete Verschlechterung.
- [ ] **QA63-078** Mobile GPU-Budget bei Blur/Glass — Erwartet: Keine unnötigen repaintenden Glaslisten.
- [ ] **QA63-079** Jedes bestehende package.json Audit — Erwartet: Bestehende grüne Checks bleiben grün.
- [ ] **QA63-080** Live network + Live API separat auswerten — Erwartet: continue-on-error nicht als grünen Datenbeweis zählen.
- [ ] **QA63-081** GitHub Web, Radar, Android, Cloudflare CI — Erwartet: Alle Pflichtjobs exakt auf finalem SHA.
- [ ] **QA63-082** Sites Public Smoke post deploy — Erwartet: version.json, sw.js, reale Bahnhofstafel, train details.
- [ ] **QA63-083** Rollbackprozedur trocken geprüft — Erwartet: Deployment kontrolliert zurücksetzbar.

## Erforderliche Dokumentation des Testlaufs

`test_id | related_feature_ids | git_sha | cmd_or_userflow | fixture/live_provider | viewports | evidence_path | status PASS/FAIL/UNAVAILABLE/NOT-RUN | notes`.

## Pflichtstatus des Releases

- [ ] V62.0.3 Public Baseline in identischen Screens dokumentiert.
- [ ] >= 20 **neue oder materiell verbesserte** Benutzerfunktionen in der tatsächlich veröffentlichten Webversion nachweisbar; keine 20 bestehende Buttons als Fortschritt zählen.
- [ ] >= 4 zuvor nicht als eigenständiger abgeschlossener Bereich belegte Module (z.B. Linien-Explorer, Zwei-Bahnhofsvergleich, Operationscenter, verknüpfte Reisebegleitung) mit realen End-to-End-Flows und Provider-Herkunft.
- [ ] 8 Kernoberflächen (Start, Suche, Bahnhof, Zug, Radar, Planer, Netzatlas, persönlicher Bereich) in realen Build-Screens im neuen UI.
- [ ] Keine bekannten P0-/P1-Bugs in Web-Release-Scope; keine ungeregelte Datennutzung.
- [ ] Alle Pflicht-CI und die datenseitig wirklich ausführbaren Live-Smokes PASS. Nicht verfügbare unabhängige Quellen gesondert als offene Limitierung dokumentieren; kein falscher Erfolgsstatus.
- [ ] Falls Kriterien nicht erfüllt: NO-GO für „TITAN“-Behauptung, klarer Scope kleineres Patch-Release nur mit separater Entscheidung, kein automatischer Scheinerfolg.

*Anmerkung:* Die GTFS-RT-Empfehlung von 90 Sekunden für Positions-/Fahrtupdates ist kein Ersatz für quellenspezifische Frische-/SLA-Verträge. 
