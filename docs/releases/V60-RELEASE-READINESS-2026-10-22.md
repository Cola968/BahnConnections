# BahnConnections V60 – Release-Readiness (22.10.2026)

**Entscheidung: NO-GO für öffentliche Veröffentlichung.** Entwicklungsbranch `feat/v60-next-generation-20261014`, PR #74 bleibt Draft. Kein Merge, kein Tag und kein Deployment durch diesen Bericht.

## Verifizierte automatische Qualitätsprüfungen

Stand: Commit `ba0ce6513bcc544bdba70022bca3ac167bd8afbc`.

- Quality: https://github.com/Cola968/BahnConnections/actions/runs/39792124784 – **success**.
- Cloudflare Workers: https://github.com/Cola968/BahnConnections/actions/runs/39792124727 – **success**.
- Quality enthält: Lint, Build, Release-/Railglass-/V60-/Station-/Routen-/Fahrplan-/Map-Audits und responsive Chromium-Interaktionen mit Screenshots. Auch die Schritte „Live network sources“ und „Live API smoke“ meldeten success.
- **Einschränkung:** CI-Erfolg belegt keine reale Android-/PWA-Abnahme und keine vollständige Datenabdeckung aller Bahnhöfe. Live-Smoke-Schritte können laut Issue #66 Fehler tolerieren; „success“ nicht mit Produktionsfreigabe verwechseln.
- Browser-Layouttest: 320×568, 360×640, 390×844, 430×932, 768×1024, 844×390, 568×320, 1024×400, 1024×600, 1440×900, 1920×1080; Hell/Dunkel, normal/groß. Überlappungen und horizontales Überlaufen werden geprüft.

## Release-Blocker mit verbindlicher Abnahme

- [ ] **#77 P0 – Bahnhofskomplexe:** Stop-Area/Plattform-Zuordnung über offizielle MOTIS-IDs, vollständige und deduplizierte Tafelzeilen. Berlin Hbf, Hermannstraße, Gesundbrunnen, Hamburg Hbf, München Hbf, ländliche Station und Sackbahnhof mit echten Providerantworten vergleichen. Pro Test Rohantworten, Filter und sichtbare Zeilen dokumentieren.
- [ ] **#80 P0 – globale Routengültigkeit:** Betreiber- und GTFS-RT-Umleitungsmeldungen gegen Haltefolge und Gültigkeitsfenster prüfen. Bei belegtem Konflikt fail closed; dieselbe Regel in Planer, Tafel, Fahrtverlauf, Karte und Export. Dresden Linie 1, Gegenrichtung, Mitternacht, Zeitzonen, Ersatzbus und abgelaufene Baustellenmeldungen live verifizieren.
- [ ] **#67 P0 – Daten-/Lizenzrechte:** Eigentümer entscheidet OSI-Lizenz und dokumentiert sie; Transitous-API-Policy, Attribution, API-Last und geplante kommerzielle Nutzung ausdrücklich klären. Keine Lizenz automatisch festlegen.
- [ ] **#66 P1 – echte Android-/PWA-/Live-Abnahme:** Gerät, OS, Browser, Build-SHA, Netzbedingungen, Screenshots, reproduzierbare Schritte und Ergebnis dokumentieren. 320–430 px, Darkmode, 200 % Text, Systemleisten/Safe Areas, Touch, Tab/Escape, Offline, Hintergrund/Rückkehr, PWA-Update, Cache und Live-Providerfehler.
- [ ] **#65 P1 – parallele Fahrtdetailabrufe:** Abrufbudget/Concurrency bei vollen Tafeln nachweisen; keine bis zu 90 gleichzeitigen Detailabrufe.
- [ ] **#78 – Radar:** Als nachgelagerte Funktion behandeln; keine Live-GPS-Versprechen, wenn Position nur geschätzt ist. Nicht als Hauptansicht oder Release-Voraussetzung bewerben.

## Freigabeprotokoll

Für jeden Blocker: Issue-Link, verantwortliche Person, Testdatum, Quellbeleg, Testergebnis, Geräte-/Browserdaten und Regressionsnachweis ergänzen. Vor Veröffentlichung die CI auf dem **finalen** Commit erneut grün prüfen. Release-Entscheidung erst nach vollständiger P0-Abnahme, dokumentierter Android-Prüfung und expliziter Rechtefreigabe durch den Projektinhaber.

**Rollback:** Letzte nachweislich stabile Produktion unverändert lassen; vor Deployment Versions-/Cache-/PWA-Upgrade und Rückrollpfad dokumentieren. Keine automatisierte Veröffentlichung aus diesem Dokument.

## Finaler gesamter V60-Veröffentlichungsdurchgang – 22.10.2026

**Eingefrorener Prüfstand (noch kein Release):** `00b67e0ce63c2fed13ca91294361519fdaed9013`. PR #74 hat 309 Commits und 117 veränderte Dateien, Basis `feat/v58-liquid-glass-relaunch-20261014` statt `main`; PR bleibt Draft. Veröffentlichen würde daher auch eine separate Integration der V58-Basis voraussetzen. Keine automatische Übernahme von Draft-PRs.

### CI-Evidenz – auf exakt dieser SHA
- Cloudflare Workers / Wrangler: **erfolgreich** – https://github.com/Cola968/BahnConnections/actions/runs/39812087297.
- Web Quality: **in progress zum Prüfzeitpunkt**, nicht als bestanden melden – https://github.com/Cola968/BahnConnections/actions/runs/39812087285.
- Der bestehende Quality-Workflow baut **keine Android-APK**; Web-Build und simulierte mobile Browser sind keine native Android-Abnahme.
- Live network sources / Live API smoke sind im Workflow mit `continue-on-error: true` konfiguriert. Der grüne Gesamtstatus garantiert daher keinen erfolgreichen Live-Smoke.

### Release-Scope und Proof-of-Completion
- [ ] **Tafeln, Haltestellen, Fahrtdetails:** #77 mit Betreiber-/Provider-Rohdaten für komplexe Bahnhöfe (Berlin Hbf, Hermannstraße, weitere) reproduzierbar gegen angezeigte Halte prüfen.
- [ ] **Global korrekte Routen:** #80, inkl. Baustellen, Gegenrichtungen, Tagesgrenzen, Ersatzverkehr, abgelaufenen Hinweisen und fail-closed in allen Ausgabeoberflächen.
- [ ] **Echtzeit/Quellenkennzeichnung:** Soll/Ist, ungültige Prognosen, Caches, Fehler, Abbrüche, keine als GPS behauptete Zugposition, Screenshots samt Rohantworten dokumentieren.
- [ ] **Performance:** #65 – station-wide Tafel-Detailabrufe limitieren; API-Limits, Fehlerverhalten und Datenverlust unter Last testen.
- [ ] **UI und Glass:** mobile 320/360/390/430 px, Querformat, Tablet/Desktop, Hell/Dunkel, große Schrift, Fokus, Buttons, Scroll- und Überlappungstests sowie tatsächliche Touch-Abnahme abschließen.
- [ ] **Android-Follow-Modus:** native APK in eigenem Android-CI-Job bauen; sichere Bridge und Berechtigungen validieren; „Follow“ startet nur auf explizite Aktion, Hintergrund/Schließen erhält Benachrichtigung, „Stop Following“ beendet sie in App und System; Öffnen und erneute App-Starts auf Gerät testen. Die aktuelle Benachrichtigung bietet nur einen zeitbasierten Fortschritts-Snapshot, keine kontinuierlich aktualisierte FR24-Liveansicht.
- [ ] **PWA:** #66 – reales Gerät, App-Neustart, Upgrade, Safe Areas, Benachrichtigungsrechte, langsames/offlines Netz dokumentieren.
- [ ] **Lizenz/Recht:** #67 – explizite Freigabe von Datenrechten, Attribution, kommerzieller Nutzung und `LICENSE` durch den Verantwortlichen; Impressum/Datenschutz vor öffentlichem Release überprüfen.
- [ ] **Radar:** #78 gesondert mit echter Abdeckung prüfen oder öffentlich als eingeschränkt/deferred kennzeichnen.
- [ ] **Branch/Deploy:** V58-Basis vor V60 kontrolliert integrieren; die finale zusammengeführte SHA auf der Zielbranch testen, echte Sites-/Cloudflare-Deployment-ID, Domain, `/version.json`, PWA-Cache, Rollback und API-Rauchtests festhalten.
- [ ] **Produktumfang:** Ideen aus der 20/40-Funktionen-Roadmap nicht automatisch als implementiert anpreisen; nur in der finalen Anwendung nachgewiesene Funktionen in Release Notes führen.

**Entscheidung: Release Candidate in Vorbereitung; PUBLIC NO-GO**, bis sämtliche P0-Punkte, Datenrechte, Deployment-Validierung und Android-Abnahme belegbar erledigt sind. Keine Freigabe und kein Merge durch die bloße Erstellung dieser Checkliste.
