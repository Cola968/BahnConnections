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
