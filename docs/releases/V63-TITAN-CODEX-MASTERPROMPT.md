# CODEX MASTERPROMPT — BAHNCONNECTIONS V63 TITAN — 31.10.2026

Du bist gleichzeitig Senior Full-Stack Engineer, Architekturverantwortlicher für ÖPNV-Daten, UI/UX Designer, QA-/Performance-Engineer und Release-Manager.

## Mission

Verwandle BahnConnections aus einer vorwiegend karten- und fahrplanorientierten App in eine umfassende, moderne **Rail Operations & Travel Intelligence Platform**, ohne falsche Echtzeit-, GPS- oder Lizenzversprechen.

**Wichtig:** Die bisherigen kosmetischen Aktualisierungen haben den Nutzer nicht überzeugt. V63 TITAN braucht reale andere Screens, navigierbare neue Produktbereiche und ausführbare neue Funktionen. NICHT bloß Farben oder CSS-Overrides austauschen. Der Nutzer will eine deutlich größere Erweiterung als V60–V62.

**Repo:** `Cola968/BahnConnections`  
**Release-Ziel:** `2026-10-31` (kein automatisches Deployment)  
**Öffentliche Baseline:** `V62.0.3`, Source SHA `d61116886df34511404d23d6c296acfc5dde757d`  
**V63 Entwicklungsbranch/PR:** `feat/v63-railglass-operations-20261025`, Draft PR #88  
**V62 Main-Reconciliation:** PR #86 (Draft)  
**Masterissue:** #89  
**Workstreams:** #92–#97.

## ZWINGEND VOR DEM CODEN DIESE DATEIEN VOLLSTÄNDIG LESEN

1. `docs/releases/V63.0.0-OCT31-MEGA-EXECUTION.md` (Release-Gates & bekannte Probleme).
2. `docs/releases/V63-TITAN-120-PLUS-FEATURES.md` (**18 Bereiche, 156 nummerierte und einzeln abnehmbare Anforderungen**).
3. `docs/releases/V63-TITAN-TEST-LAB.md` (**83 konkrete QA-Fälle und Qualitätsnachweise**).
4. `docs/releases/V63-TITAN-STATUS.json` (**maßgeblicher Fortschritt pro Feature**).
5. `scripts/v63-titan-status-audit.mjs` und `scripts/v63-titan-status-audit.test.mjs` (Evidence-Gate).
6. `.github/workflows/quality.yml`, Radar-, Cloudflare- und Android-Workflows, package.json, alte Release-/Design-Audits.
7. Issues #66, #67, #75, #77, #78, #80, #87, #89–#97 und PRs #86, #88.

Lesen und die IST-Funktionen inventarisieren. Jedes der 156 Features als `new`, `upgrade`, `existing`, `defer` oder `blocked-data` klassifizieren; dazu `release_scope=web-63/native/later/blocked`. Zeige keine vorhandene Funktion als neue Innovation. Gib nicht alle Features pauschal als erledigt aus.

## Phase 0 — Reconciliation und Baseline

1. Prüfe die reale öffentliche Sites-Version `/version.json` und ihren Quellcommit.
2. Vergleiche den V63-Branch mit V62.0.3, prüfe divergierende Branches und den Main-Sync.
3. Bewahre sämtliche bereits veröffentlichten V62.0.3-Fehlerkorrekturen (HUD, Inspector State, Kartenfokus, Netzwerkfehler, SW-Version, Follow).
4. Erzeuge echte Vorher-Screenshots aus V62.0.3 (mobil 320/390/430, Tablet 768, Desktop 1440, hell/dunkel).
5. Lege nachvollziehbares Feature-Inventar, Architektur-/Datenquellenkarte und Bugregister an.

Keine ungesicherten Merges und kein Render-Hosting zurückbringen.

## Phase 1 — Alle Kernoberflächen sichtbar umbauen

Realisierung eines echten Designsystems **Railglass 3 / Quiet Rail**:
- klarer Bahnhofskopf, feste scanbare Fahrplandaten, echte Informationshierarchie;
- dynamisch passende Shell und aufgeräumte Karten-/Panelnavigation;
- mattes/sehr dezentes Glasmaterial nur für Shell, Navigation und HUD; keine GPU-teuren Backdrop-Effekte in 300 Fahrplanzeilen;
- gesamtes Erscheinungsbild in Hell/Dunkel, hohe Kontraste, Tastatur, reduzierte Bewegung und Transparenz;
- konsistente Komponenten statt zig konkurrierender V48–V62 CSS-Overrides;
- neue Screens: Start, Suche, Bahnhof, Linie, Zug, Karte, Radar, Reiseplaner, Reisebegleitung, Operations, Stationsvergleich, Favoriten, Einstellungen.

Die eigentliche UI muss objektiv anders aussehen. Die automatisierte QA muss identische Vorher/Nachher-Screens vergleichen. Keine bloße Versionsnummer.

## Phase 2 — Neue Produktbereiche bauen

### 2.1 Linien-Explorer
Alle zulässig verfügbaren Linien einer Station einschließlich gültiger Varianten, Richtung, Abfahrten, Stopps und erlaubter echter Geometrie. Favorisieren und direkt in Radar/Station springen. Fehlende Geometrie offenlegen statt Luftlinie zu zeichnen.

### 2.2 Zwei-Bahnhofs-Vergleich
Vergleiche zwei Bahnhöfe in demselben Zeitraum nach beobachteten Abfahrten, Linien, Verkehrsmitteln, Verspätungen, Ausfällen, Gleiswechseln und Frequenzlücken. Die Stichprobengröße, Quelle, Frische, Entdoppelung und Unvollständigkeit sind IMMER sichtbar. Keine behaupteten vollständigen Netzwerkstatistiken.

### 2.3 Rail Atlas / Netzwerkintelligenz
Neue interaktive Karte mit Umschaltung relevanter, lizenzierter Verkehrs-Layer, Linienverläufen, Stationsdichte, tatsächlichen Radarfahrten und Störungsmeldungen. Zoom-Cluster und Such-/Filterzustand performant. Ein Kartenlayer ist keine Freigabe, unlizenzierte DB-Dateien einzubauen.

### 2.4 Operations Center
Störungszentrale auf Basis tatsächlich gemeldeter Ereignisse mit Gültigkeitsfenstern, Status, Priorisierung, betroffenen Linien/Halten, Filterung und Link zurück zu realen Fahrten. #80: Baustellenfälle, Gegenseite, Ablaufdatum und DST müssen fail-closed sein. Kein angebliches „Alles störungsfrei“, wenn Datenquelle nur Teilinformationen liefert.

### 2.5 Train Radar + Zugdetails + Follow 3.0
Zugdetail mit vollständiger Stop-Timeline, Soll-/Prognose-Zeit, Plattform, Delay, Qualität, echten verknüpften Trips. Verbesserte sichtbare Marker und separat erreichbare providerbestätigte Halte ohne Marker. Follow-HUD wie ein professioneller Verkehrs-Liveinspektor, mit Zug, Ziel, ETA, Fortschritt, nächsten Halten und Stop. Nur wenn Quellen es belegen; zeitbasierter Fortschritt ≠ GPS. Vermeide Radar→Follow→Planer-Überlagerungen, Marker-Leaks, alte Auswahl, doppelte Polls.

### 2.6 Reise-Cockpit und Anschlussrisiko
Planer mit echten Alternativen, besseren Vergleichsfiltern, Risikostufen für Anschluss (konservative Regeln), Puffer, aktuell erwarteter Ankunft, verfügbarem Gleis, Verlauf, Änderungs-Diff, gemerkten Reisen. Unbekannte Umstiegswege und fehlende Echtzeit dürfen niemals als sicher erscheinen. Reiseplanung bleibt kostenlos und auch ohne Personalisierung nutzbar.

### 2.7 Persönlicher Start und Pendelmodus
Heimatbahnhof, letzte Stationen, gespeicherte Linien/Routen, Sofortsuche, Schnellfilter, aktuell beobachtete Reise; lokale Speicherung mit Löschen. Jede gespeicherte Route muss bei Ausführung frische Ergebnisse abfragen.

## Phase 3 — Data and Reliability Engineering

- Gemeinsam verwendetes Datenstatusmodell: scheduled/forecast/actual positions/modelled/unknown; partial/stale/error/available + timestamps + source provenance.
- API-Limits und Request-Batching (Issue #65), Abbruch bei Auswahlwechsel, Retry mit Backoff, kein blindes request bombing.
- Bahnhofskomplexe und Stop-ID-Gruppierung (Issue #77), bestätigte Halte ohne Kartenzwang (Issue #78).
- Routenvalidität (Issue #80) über Tafel, Route, Karte, Sharing, Follow.
- GTFS-RT TripUpdate ist keine Fahrzeugposition. Kein erfundenes GPS oder Routing.
- Quellenrichtlinien: https://transitous.org/api/ – nicht-kommerziell/OSS, User-Agent bzw Referer und Attribution, Last beachten. Checkout bleibt deaktiviert. Unfreigegebene DB-Exports bleiben quarantänisiert und im öffentlichen Build 404.
- Neue echte Datenquellen nur nach Lizenz-/Sicherheit-/Qualitätsabnahme. Wagensequenz, Auslastung, Aufzugsstatus, historische Replay-Funktion NUR bei verfügbarer geeigneter Quelle; sonst klares „nicht verfügbar“ oder verstecktes Feature.

## Phase 4 — Tests: kein Abhaken ohne Belege

Implementiere jede kritische Logik testgetrieben:
1. RED: reproduzierender Test schlägt zu Beginn fehl.
2. GREEN: kleinstmögliche Korrektur.
3. REFACTOR: bestehende Tests bleiben grün.
4. E2E: realer Browser mit tatsächlichen Clickpaths.
5. PROVENANCE: API-/Quellenqualität und Staleness-Kennzeichnung.
6. SCREENSHOT: reales Vorher/Nachher, kein KI-Bild und keine CSS-Textassertion als Ersatz.

Arbeite **alle 83 QA-Fälle** aus `V63-TITAN-TEST-LAB.md` durch, soweit im freizugebenden Scope; Nichtausführbares separat als UNAVAILABLE dokumentieren, nicht als PASS. Teste min. 320/360/390/430/768/1024/1440/1920, 667×375 und 844×390, dark/light, Zoom, Tastatur, Screenreader, Touchziele, Reducе Motion, High Contrast.

Gates: alle bestehenden `audit:*`, TypeScript, ESLint, Produktionsbuild, Live/API Smoke, Radar-Perf, echte Browser E2E, Cloudflare build, Android Build/Emulator. CI nur am exakten Head-Commit. Ein alter grüner Lauf ist kein Beleg für neuen Code.

**Maschinenregister pro Feature aktualisieren:** `V63-TITAN-STATUS.json`. Für getestete Features Commit und reale Test-IDs; für `live_verified` zusätzlich wirkliche Live-Evidenz. Keine erfundenen Screens/SHAs oder scheinerfüllten Checkboxen.

Führe aus:  
`node --test scripts/v63-titan-status-audit.test.mjs`  
`node scripts/v63-titan-status-audit.mjs`  
Vor Release außerdem: `node scripts/v63-titan-status-audit.mjs --release`

Letzter Befehl verlangt triagierten Scope und reale Belege: >=20 echte neue/verbesserte Funktionen, >=4 eigenständige tatsächlich getestete Produktbereiche und >=8 visuelle Nachweise. Auch bei grünem Metadatencheck müssen Evidence-URLs manuell validiert werden.

## Phase 5 — Veröffentlichung (nur GO)

**Ziel 31.10.2026**. Die Deadline darf weder Test-Bypass noch Fake-Feature-Claim auslösen.

- Zeige für jede Funktion `geplant / implementiert / getestet / live_verifiziert / veröffentlicht / abgenommen`.
- P0/P1 = 0 **bekannt und offen** im Web-Release. Sicherheits- und Lizenz-Blocker weiterhin geschützt.
- PWA-Version, Service Worker, Release-Changelog, Code und Sites-Deployed Commit müssen übereinstimmen.
- Update **bestehendes** BahnConnections Sites-Projekt, NICHT neue Instanz.
- Kontrolliere nach echter Veröffentlichung V63.0.0 unter `/version.json`, `/sw.js`, das sichtbare UI, reale Station Berlin Hbf und andere Bahnhöfe, Reiseplaner und Folgen.
- Bereite Rückrollen auf öffentlich bestätigtes V62.0.3 vor.
- Android APK/Store nur separat mit realem Hardware-Akzeptanztest (Issue #66).

Ist die Prüfung nicht bestanden oder ein nötiges Tool nicht verbunden, erstelle einen klaren NO-GO-Befund mit konkretem Blocker, exaktem SHA, nächstem Code-/Testschritt. Kein „fertig“ auf Zuruf.

## Abschlussformat

Erstelle `docs/releases/V63.0.0-TITAN-RELEASE-REPORT.md` mit:
- eindeutiger Liste der nachweislich neuen Funktionen (nicht nur Kandidaten),
- Screenshots früher vs. jetzt,
- behobene Bugs mit Reproducer/Regression-ID,
- Status sämtlicher 156 Features + 83 QA-Szenarien (einschließlich blocked/deferred),
- Ergebnisse sämtlicher Pflichtjobs am finalen SHA,
- Daten-/Lizenzrestriktionen,
- Freigabeentscheidung Web/PWA/Android jeweils getrennt,
- Live-URL, Versions-/SW-Nachweis, veröffentlichter Commit und Rollback, falls deployt.

**Starte jetzt mit Repository-Synchronisation und echter Implementierung. Setze die Arbeit in nachvollziehbaren geprüften Commits fort. Die Aufgabe endet nicht nach einem Designentwurf oder einer Dokumentenänderung.**
