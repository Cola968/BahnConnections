# BahnConnections V57.2 — Korrektheit zuerst, dann Fahrgastkomfort

## Architekturentscheidungen
- Aufbauend auf [PR #70](https://github.com/Cola968/BahnConnections/pull/70), einschließlich des verbindlichen MOTIS-v6-Alert-Fixes. Neue Funktionen nicht gegen einen fehlerhaften Altdatenparser entwickeln.
- Störungen bleiben **Bahnhofsfahplanfenster-Meldungen**, keine erfundene bundesweite Echtzeitvollständigkeit. Allgemeine Bahnhofshinweise sind nicht automatisch betroffene Zuglinien.
- Live-, Prognose- und berechnete Geschwindigkeitsangaben werden weiter strikt getrennt. Keine Behauptung, dass Zug-GPS vorliegt.
- Render-Produktion laut am 14.10. abgefragter Deployhistorie **V56.1**, obwohl `main` bereits V57.0 enthält. V57.2 daher vorläufig nur GitHub-Releasestand und CI, **kein** öffentliches Deployment.

## Funktionale Änderungen
1. Präziser **Linienfokus**: betroffene Linien aus den deduplizierten Meldungen, keine Bahnhofshinweise als Linienmeldungen; Kombination mit Kategorie und Freitext.
2. Drei Anordnungen: Standard, **nach Uhrzeit** anhand der tatsächlich gelieferten Meldungszeit, **nach Linie**. Fehlende Zeiten erscheinen nicht als erfundene Uhrzeit.
3. Einzelmeldung aus der aufklappbaren Karte **kopieren** (vollständiger Text, Linien, Richtung), mit verständlichem Berechtigungsfehler.
4. Ausfälle mit zusätzlicher Bauarbeitsmeldung als **Zugausfälle** klassifizieren, statt im Baustellenfilter zu verstecken.
5. Bedienfeld passt sich an 320–430 px und Desktop an; 44px Touchflächen, Tastaturfokus, Kontrastmodus und Reduced Motion.
6. V57.2-Releasekennungen einschließlich Service-Worker/PWA-Cache, Changelog und App-Releaseseite.

## Qualitätsabnahme
- Tests: `pnpm audit:surfaces` (inkl. exakter Linienwahl, Anbieter-Hinweise, Sortierung und Kategorisierung), `pnpm audit:disruptions`, `pnpm audit:release`, TypeScript, ESLint, Produktionsbuild und Responsive-Chromium-QA.
- Zusätzlich `Node hosting build and smoke` und `Standalone Cloudflare Workers` beobachten. Nur grün, wenn der **letzte** Commit geprüft wurde.
- Echte Android-PWA-, Systemleisten-, Netzfehler- und Quellenprüfungen weiterhin separat erforderlich. Kein Anspruch auf „alle Bugs behoben“ ohne Hardware- und Live-Tests.
- Keine Änderungen am Live-Render-Dienst, der auf `main` automatisch deployen könnte. Erst nach Freigabe mergen und Render-`/version.json`, Tafel, Planer und Störungsansicht real testen.

## UI-Werkzeuge
- 12ui-V57-Stationsradar-Basis und bestehende Design-Tokens weiterverwendet, statt eine konkurrierende zweite Oberfläche zu erfinden.
- Die lokale 12ui-CLI war in der Ausführungsumgebung nicht installiert; npm-Nachladen scheiterte an fehlender Netzauflösung. Daher keinen 12ui-Export oder Pixelgenauigkeits-Check behaupten.
- Lovable-Planmodus zur gesonderten Kritik der mobilen Bedienung beauftragt; kein unrelated Lovable-Projekt überschrieben.
- Render über verbundene Dienste geprüft, Composio für Deploystatus gelesen.

## Follow-ups für weitergehende V57
- Echte Touch-/Safe-Area-Screenshots auf Android (inklusive roter Systemleisten) und manuelle UX-Abnahme.
- Performance-Profiling bei vielen Zugmarkern und Browser-Memory/Leaks mit realem Netz.
- Lizenz und Transitous-API-Nutzungsbedingungen (Issue #67) vor kommerzieller/öffentlicher Freigabe klären.
