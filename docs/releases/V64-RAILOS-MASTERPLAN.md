# BahnConnections V64 – RailOS / Next Generation

Datum: 26. Oktober 2026  
Status: **Vorbereitung und Umsetzungsspezifikation, KEINE implementierte oder veröffentlichte V64**  
Basis: V63-Draft-PR #88, Commit 4f972ce2596ea477e2acf5cd740ed7233e835599; dessen Basis ist V62-Sync-PR #86.  
Live-Webstand laut V62.0.3-Releaseprotokoll: https://bahnconnections-de.a-stad.chatgpt.site/; öffentliches Deployment und Android APK sind getrennte Produkte.

## Leitbild – das bislang größte nutzbare Update

In 30 Sekunden soll eine neue Person ohne Erklärung eine Verbindung suchen, eine Abfahrt prüfen und einen Zug verfolgen können. Das Design wird **ruhiger, präziser und sichtbar neu**, nicht gläserner oder überladener. Die nächste Welle liefert Funktionen, die im Alltag sofort etwas bringen. Keine künstlichen 20/50/100-Feature-Versprechen: nur belegte Änderungen gelten als geliefert.

### Priorität und Releasestruktur

- **P0 / R0: Stabilität und Baseline.** V62/V63-Branch-Abstammung, bereits veröffentlichte Funktionen und P0-Datenrisiken sichern. Keine pauschalen Cherry-Picks oder Umbenennungen.
- **P1 / R1: Quiet Rail Design System 2.0.** Neues Layout, visuelle Hierarchie, ein konsistentes Bahnhofs-/Fahrtfenster; echter Vorher-Nachher-Screenshot.
- **P1 / R2: Journey Cockpit und Commuter Home.** Umsteigepuffer, sichere Alternativen, Schnellzugriff auf favorisierte Linien/Reisen.
- **P1 / R3: Radar und Follow.** Train Explorer, Datenstatus und native Android-Live-Benachrichtigung als eigenständige APK-Funktion.
- **P1 / R4: Performance/Abnahme/Release.** Belastungstests, Geräteprüfung, Data Governance, versionierte Sites-Freigabe; harte GO/NO-GO-Gates.

Jede Welle ist ein abgrenzbarer Commit-/PR-Abschnitt mit Tests und Screenshots. Ist eine externe Freigabe nicht verfügbar, bleibt das Feature hinter einem sicheren Gate – niemals durch erfundene Daten ersetzen.

## Produktpakete – Definition of Done

### BC64-01 · Quiet Rail Start / Navigation – P1
**Wahrnehmbarer Unterschied:** ein klarer Einstieg mit prominentem Suchfeld, Karte als optionale Entdeckungsfläche, separatem Abfahrtsmodus, Reiseansicht und Merkliste. Mobile Bedienung ohne konkurrierende Panels; Desktop mit sinnvollem Karten-/Listen-Split. Weniger Cards pro Zug; ruhige Typografie, konsistente Farben und Statuschips. Keine Design-Attrappen.
**Akzeptanz:** Suche → Bahnhof → Tafel → Zug → zurück in maximal wenigen Interaktionen; keine doppelten Overlays; Touch-Ziele >=44 CSS-px, Fokus sichtbar, Screenreader-Labels; 320/360/390/430/768/1024/1440/1920, hell/dunkel, Querformat, große Schrift, reduzierte Bewegung. Neue echte Screenshots statt KI-Mockup.
**Codeorientierung:** app/page.tsx, app/desktop-navigation.tsx, app/station-calls-browser.tsx, app/styles/v63-visual-reset.css, app/styles/station-sheet.css.

### BC64-02 · Bahnhofstafel Pro – P0/P1
Eine zusammenhängende, lesbare Ankunfts-/Abfahrtstafel mit Kategorien/Zeiten/Richtungen/Gleis, schnellen Filtern und leichten Unterbrechungsmeldungen. Bahnhofskomplexe auflösen und Teil-Stop-IDs sowie Coverage offenlegen. Fehlende Teilbereiche dürfen nicht als vollständiger Bahnhof ausgegeben werden.
**Akzeptanz:** Berlin Hbf, Hermannstraße, Gesundbrunnen, Hamburg, München und kleiner Haltepunkt; Rohantwort → IDs → Deduplizierung → Filter → sichtbare Zeilen dokumentiert; kein Duplikat oder Phantomhalt; Beweis für fehlende Provider-Daten und eindeutige Fehlermeldung; stabile begrenzte Request-Konkurrenz.
**Risiken:** #77 und #65; nicht allein durch CSS oder größere API-Limits lösen.
**Code:** app/live-board.tsx, app/station-calls-browser.tsx, app/api/stations, app/station-resolution*, scripts/board-request-budget-audit.mjs.

### BC64-03 · Live Journey Cockpit – P1
Vertikale, in Echtzeit nachgeführte Reisekette mit Start/Ziel, Zwischenhalten, Gleisänderungen, Umstiegen, Fußwegpuffer und dem nächsten sinnvollen Schritt. Trennt Soll, aktuelle Prognose, Ausfall, offline und veraltete Daten. Fahrtdetails aus einer kanonischen Datenbasis.
**Akzeptanz:** 0/1/2 Umstiege, negatives Zeitbudget, Tagesgrenze, UTC/DST, Teilausfälle, missing/stale; Anschlussrisiko nur erklärbare qualitative Einordnung, keine erfundene Wahrscheinlichkeit; alle ETA/ETD aus konkreten Providerfeldern.
**Code:** app/page.tsx, app/live-trip-inspector.tsx, app/journey-validity.ts, app/train-inspector-data.ts.

### BC64-04 · Smart Alternatives – P1
Bei Ausfall, verpasstem Anschluss oder nachweisbar knappem Umstieg: robuste alternative Verbindungen direkt neben dem aktuellen Reise-Cockpit, begründet durch Fahrplan und Anbieterstand. Kein irreführender Anspruch auf Ticketgültigkeit oder garantiertes Erreichen.
**Akzeptanz:** reproduzierbare Fixtures für Cancel/Stale/Rate Limit und gleichzeitige Suchwechsel; abortierte Requests können keine älteren Ergebnisse wieder einspielen; klare Fehler- und Recovery-UI.

### BC64-05 · Network Pulse – P2
Kompakter, optisch attraktiver Netzstatus für tatsächlich unterstützte Bahnhöfe/Regionen: beobachtete Abfahrten, Ausfälle, Datenalter, Quellenverfügbarkeit und regionale Meldungen. Ein Dashboard nur aus validierten Daten – keine bundesweite Komplettabdeckung, Pünktlichkeitsquote oder Marktanteile behaupten, falls die Datenbasis das nicht stützt.
**Akzeptanz:** exakter Nenner/Zeitraum und Erhebungsquelle pro Kennzahl; Datenlücken und Staleness erkennbar; bei fehlender Quelle neutraler Zustand.

### BC64-06 · Radar/Train Explorer – P1
Verbindung Bahnhofstafel ↔ Radar ↔ Zugdetails ↔ Follow ohne verlorene Auswahl. Alle vom Provider bestätigten Halte sind in einer Liste erreichbar, unabhängig davon, ob eine sichere Karten-Geometrie existiert. Marker nur für geometrisch und zeitlich nachvollziehbare Schätzungen. Keine Fake-GPS.
**Akzeptanz:** #78; 180-Marker-Performance-Budget beibehalten; kein Leaflet-Doppelbinding; bei API-Lücken folgen Detailkarte und HUD sinnvollen Statusregeln; Karte bewegen stoppt höchstens Kamera-Lock, nicht die ausdrücklich gestartete Folge-Sitzung; nur Stop Following beendet die Sitzung.

### BC64-07 · Native Android Following – P1, separates Release
Native foreground service + Android-Benachrichtigung im Systembereich nach explizitem Follow-Klick; nie bei bloßem Zugöffnen. Zeigt Zug, Strecke, möglichst bestätigte Soll-/Ist-Zeiten, berechenbaren Zeitfortschritt, Datenalter und Stop-Following-Aktion. Benachrichtigung bleibt bei App-Minimierung und gewöhnlichem Schließen bestehen, bis der Nutzer Stop Following wählt; Web- und Android-Status sind synchron. Keine Garantie gegen Android Force-stop, Betriebssystemrestriktionen oder widerrufene Berechtigungen.
**Akzeptanz:** Emulator API 26/33/35, mindestens ein physisches Android-Gerät; Berechtigungen, Hintergrundbetrieb, Prozessneustart, Wiederöffnen, Stop aus Benachrichtigung und in App, ungültige Quellen und Reisen, begrenztes Updateintervall, Akkulast, Play-Store-Foreground-Service-Policy. Echte Android-APK bauen, signieren und separat freigeben. Eine Sites-Veröffentlichung kann keine APK installieren.
**Code:** android/, app/android-follow-bridge.ts, app/train-radar-hud.tsx, app/page.tsx.

### BC64-08 · Meine Bahn – P1
Pendler-Home mit letzten/favorisierten Bahnhöfen, gespeicherten Strecken, nächsten Abfahrten, optional eigenen Linien und Reise-Schnellzugriffen. Alles standardmäßig datensparsam lokal; bei mehreren Geräten keine unbelegte Cloud-Synchronisierung.
**Akzeptanz:** leere Nutzung, Geräte-Neustart, localStorage disabled/quotas, Löschung, von Fremddaten unabhängiger Zugriff, nie stilles Aktivieren von Benachrichtigungen.

### BC64-09 · Störungszentrale – P0/P1
Meldungen nach betroffenen Linien, Richtung, Raum und Zeitfenster. Gemeinsame Validitäts-Policy in Board/Planner/Radar/Export und Cache. Bei aktivem verifiziertem Konflikt bleibt die konkrete unsichere Route gesperrt. Abgelaufene Hinweise dürfen nicht weiter blockieren.
**Akzeptanz:** #80 mit offiziell bestätigtem Dresden-Fall als Regression sowie weiteren Verbünden, DST und Gegenrichtungen; Provider-Status ohne Quellenbeleg als unbestätigt markieren.

### BC64-10 · Offline/PWA/Barrierefreiheit – P1
Letzte verifizierte Daten nur mit Cache-Alter anzeigen; Updates dürfen keine alte UI trotz neuer /version.json festhalten. Unterstützung für reduzierte Transparenz/Bewegung, Tastaturbedienung und Screenreader sowie sinnvolle Lade-, Leer-, Fehler- und Offline-Zustände.
**Akzeptanz:** PWA-Upgrade von V62/V63, Offline-Neustart auf realem Gerät, Cache-Grenzen, no horizontal scroll bei 200% Text; kein altes SW-Asset wird für neues JS ausgeliefert.

### BC64-11 · Performance / Security – P0/P1
Tafel-Requestbudget und Parallelität begrenzen, AbortController und station generation tokens; nicht benötigte Detailabrufe vermeiden; DOM-/Renderer-Budgets prüfen. Android-JS-Bridge nur für trusted first-party origin und genau erlaubte Aktionen. Keine Geheimnisse in Client-Konfiguration.
**Akzeptanz:** parallele Stationswechsel, 429/503, tausende Fahrtdetails (simuliert), keine request storms, kontrollierte CPU/Memory-Regression; positive und negative Sicherheitstests.

### BC64-12 · Release-Qualität – P0
Main-Divergenz aus #86/#87 klären; V63 #88 nicht unbemerkt überschreiben. Jede neue Funktion und jeder Bugfix erhält einen fehlschlagenden Regressionstest vor Umsetzung (RED), grünen Test danach (GREEN) und dokumentierte Browser-/Geräte-Evidenz. Produktionsstatus nur mit finaler SHA und tatsächlichem Deployment.

## Entscheidende offene Freigabe-Gates

- #67 Drittanbieterdaten, Attribution, Lizenzen und ggf. kommerzielle Nutzung: Eigentümerentscheidung. Kein App-Store/kommerzieller Launch ohne diese Freigabe. Aktuelle Lizenzangaben auf Widersprüche prüfen, nicht stillschweigend ändern.
- #77 Teil-Haltestellen und Vollständigkeit; #78 verifizierte Radar-Abdeckung; #80 aktive Route-Validity-Alerts; #65 API-Konkurrenz; #66 physisches Android/PWA; #86/#87 GitHub-Main-Sync.
- Drittanbieter-Datenqualität und echte Anbieter/Operator-Nachweise dürfen nicht durch Fixtures oder synthetische Werte überdeckt werden.
- Stripe/Plus bleibt ohne rechtliche/operative Freigabe deaktiviert; keine erfundenen Buchungen oder Abonnements.
- Versionsnummer V64 und PWA-Cache erst bei Release Candidate umstellen, nicht als bloßes Marketing vor der eigentlichen Funktionsimplementierung.

## Abnahme-Matrix (für jede Releasewelle)

1. Exakter commit SHA, Base, Merge-Ancestor und Datei-/Commitliste; keine ungeprüfte Main-Integration.
2. pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm lint, pnpm build; alle bestehenden audit-Skripte einschließlich Station, Radar, PWA, Requestbudget, global route validity sowie neuer Tests.
3. Responsive Browser-E2E: 320x568, 360x640, 390x844, 430x932, 768x1024, 844x390, 1024x768, 1440x900, 1920x1080; Hell/Dunkel; Fokus; 200% Text; reduce motion.
4. 3 vor/nach echte Build-Screenshots für Start, Tafel, Fahrtdetail; Screenshots in GitHub Actions verfügbar; kein KI-Mockup als Beleg.
5. Provider-Live-Smokes bei mindestens Berlin Hbf, Berlin Hermannstraße, Hamburg Hbf, München Hbf, regionalem Haltepunkt, inkl. Roh-IDs, Aktualität und fehlender Abdeckung. Live-Smokes, die continue-on-error sind, separat auswerten.
6. Android-Gradle/CI Emulator API 26,33,35 plus physisches Gerät; Foreground-Service-Lifecycle. APK ist ein **eigener** Freigabeschritt, unabhängig von Sites.
7. Erfolgreicher Sites-Deploy-Nachweis: Domain, Projekt-/Deployment-ID, Git SHA, /version.json, /sw.js, mobile UI, Rollback-ID; nur wenn Nutzer explizit veröffentlicht oder die Veröffentlichung ausdrücklich beauftragt ist.
8. NO-GO wenn ein P0, ein Pflichtcheck oder die Rechtefreigabe fehlt; keine Tests entfernen, skippen oder weichzeichnen, um eine grüne CI vorzutäuschen.

## Modulschnittstellen / Startpunkte für Codex

app/page.tsx; app/desktop-navigation.tsx; app/live-board.tsx; app/station-calls-browser.tsx; app/live-trip-inspector.tsx; app/train-radar-hud.tsx; app/android-follow-bridge.ts; app/journey-validity.ts; app/pwa-register.tsx; app/styles/v63-visual-reset.css; android/app/src/main/java/de/bahnconnections/android/; scripts/station-sheet-qa.mjs; scripts/mobile-visual-qa.mjs; scripts/live-map-qa.mjs; scripts/radar-lifecycle-audit.mjs; .github/workflows/.

## Definition of Done

- Nicht nur Design-Dateien, Docs, To-do-Listen oder Version hochzählen: reale Funktionen auf nutzbaren Screens integriert, E2E getestet und gegen alte Funktionen abgesichert.
- Mindestens ein komplett durchgehender Fahrgast-Flow, der auf Mobil und Desktop besser funktioniert als V62/V63, muss vor Abschluss jedes Arbeitsabschnitts nachgewiesen sein.
- In PR-Beschreibung für jedes Paket: IMPLEMENTIERT / GETESTET / DEPLOYT / OFFEN; Evidenz-Links. Bei Zeit-/Toolgrenzen ehrlich teilweise liefern, kein behaupteter Hintergrundbetrieb.
- **Dieser Commit enthält zunächst ausschließlich die Umsetzungsvorbereitung; V64 ist dadurch noch nicht implementiert.**
