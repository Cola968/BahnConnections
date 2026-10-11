# BahnConnections — Codex-Megaprompt V51: technische und visuelle Generalüberholung

## Auftrag
Du bist Principal Frontend Engineer, Geospatial Engineer, UX/Product Designer, Backend-/Realtime-Engineer und QA-Lead in einer Person. Entwickle das **existierende** Projekt Cola968/BahnConnections zu einer verlässlichen, eleganten, schnellen Bahn-Web-App/PWA weiter. **Implementiere echte Änderungen im Code.** Keine bloße Designstudie, kein Mockup, keine einseitige Analyse und keine kosmetische neue CSS-Schicht. Untersuche, baue, teste, überprüfe Screenshots, korrigiere Regressionen und hinterlasse nachvollziehbare Commits.

**Ausgangsbasis:** Dieser Branch codex/v51-systemic-overhaul basiert auf dem Stand des noch nicht gemergten V50.3-PR #39 (improve/v50-3-realtime-trust-search). Prüfe zuerst Git-Status, Branches, PR-Status und aktuelle Commit-SHA. Falls V50.3 inzwischen gemergt ist, rebase/integriere sauber ohne Änderungen zu verlieren. Verändere main nicht direkt, merge/deploye nicht selbstständig. Bestehende Nutzerdaten, Zugangsdaten und Secrets bleiben unberührt.

## Repository-Realität — berücksichtige diese Dateien
- Next.js 16.2, React 19, TypeScript, vinext/Vite 8, Leaflet 1.9, installierbare PWA.
- app/page.tsx: große zentrale Home-Komponente (~1.380 Zeilen in V50.2), enthält Kartensteuerung, Echtzeit-Radar, Planner, Details, Navigation und Zustandsverwaltung.
- app/globals.css, app/desktop-workspace.css sowie app/styles/{tokens,controls,workspace,transport,liquid-glass,profile,content-layout,designer-v48,v49-ui,v50-ui}.css: gewachsenes CSS mit teilweise überlagernden Regeln und !important.
- app/station-map-renderer.ts, app/map-density.ts, app/station-marker.ts, app/station-lines.tsx, app/station-trip-geometry.ts, app/track-routing.ts, app/track-worker-client.ts: Karten-/Schienengeometrien, Canvas/Worker, Dichtekontrolle.
- app/live-trains.ts, app/live-board.tsx, app/realtime-presentation.ts, app/realtime-time.tsx, app/board-verification.ts: Live-Züge, Abfahrtstafel, Statuslogik und externe Gegenprüfung.
- app/smart-search.tsx, app/journey-search.tsx, app/live-journey.ts: Suche und Reiseplanung.
- app/api/stations/*, app/api/trips/*, app/api/journeys/*, app/transitous.ts: Transitous/MOTIS als Hauptquelle, DB transport.rest als unabhängige Gegenprüfung.
- scripts/*-audit.mjs, .github/workflows/quality.yml: bereits umfangreiche TypeScript-, Lint-, Browser-, Karten-, Daten- und Responsive-QA.
- app/app-version.ts, public/version.json, public/sw.js: müssen bei tatsächlichem Release-Update synchron bleiben.

Lies die relevanten Implementierungen, nicht nur README, Commit-Nachrichten oder frühere Megaprompts. Verifiziere Vermutungen am ausgeführten Verhalten. Frühere V48/V49/V50-Arbeit nicht rückgängig machen.

## Absolute Qualitätsprinzipien
1. **Map first, content first.** Die Karte zeigt echte Schienengeometrie; Navigation und Panels schweben darüber, Fahrpläne sind ruhig und gut lesbar.
2. **Information schlägt Dekoration.** Kein KI-Dashboard-Look, keine leeren Riesenkarten, kein unnötiger Glow, keine Neonakzente, keine riesigen Radien und kein redundant erklärender Text.
3. **Liquid Glass ist funktionales Material, kein pauschaler Blur.** Suche, Navigation, Toolbars und Sheets dürfen optische Tiefe haben; datenintensive Zeilen bleiben klar lesbar. High Contrast, Reduced Transparency und Reduced Motion sind Pflicht.
4. **Datenwahrheit vor Eindruck.** Niemals eine interpolierte Zugposition als GPS-Ortung bezeichnen; niemals Fahrgastzahlen, Gleise, Pünktlichkeit, Live-Fahrten oder Geometrien erfinden. Schienenlücken bleiben Lücken, keine geraden Luftlinien.
5. **Bestehendes erhalten.** Funktionierende Strecken, Regional-/Fern-/S-/U-Bahn/Tram, Suchlogik, Reiseplaner, Bahnhofstafeln, Favoriten, PWA, Accessibility und Tests nicht abschneiden.
6. **Performance messen.** Keine Optimierungsbehauptung ohne Vergleich und reproduzierbaren Messaufbau.
7. **Kein unkontrollierter Rewrite.** Refaktoriere schrittweise in kleine, typisierte und testbare Einheiten; entferne Legacy-Regeln erst nach Abgleich des Verhaltens.
8. **Arbeite wirklich.** Nach einem kurzen Audit selbstständig implementieren, nicht mit 50 Ideen oder Rückfragen aufhören.

## P0 — Stabilität, bekannte Risiken und Benutzerfluss
- Verifiziere zunächst V50.3 aus PR #39: geänderte Verzögerungsgrenzen (grün 0–4, gelb 5–10, rot ab 11 Minuten; verfrüht separat), konservative DB-Quellengegenprüfung mit Status „inconclusive“, schnellere Suche, gesicherter Polling-Abbruch, geschätzte statt gemessene Zugposition. Bestehende Tests und Browser-Fixtures prüfen, nicht stillschweigend alte Regeln zurückspielen.
- Suche systematisch nach Race Conditions, stale closures, konkurrierenden Effects, verzögert wiederöffnenden Panels, doppelt gesendeten Requests, Memory Leaks, unstabilen Markern, Fehlern beim Stationswechsel und unvollständig abgebrochenen Fetches.
- Besonderes Augenmerk auf app/page.tsx, den Radar-Effect mit ~45-s-Polling und den ~4-s-Animations-Tick, LiveBoard-Refresh, Planner-Anfragen, Standort-Tracking und mobile Bottom-Sheet-Steuerung.
- Priorität haben: Bahnhof suchen → auswählen → Abfahrten sehen; Zug auswählen → Details → Karte; Verbindung planen → Alternative → Fahrtverlauf; Ansicht schließen/wechseln ohne verlorenen oder wiederauftauchenden Zustand.
- Alle Buttons, Back-/Close-Aktionen und Tabs müssen funktionsfähig sein; auch bei Browser-Back, Escape, Touch, Resize und Netzwerkfehlern.
- Zeige veraltete Daten eindeutig an. Unterscheide „keine Fahrt“, „nur Fahrplan“, „externe API nicht erreichbar“, „teilweise Echtzeit“, „Gegenprüfung unklar“ und „Bestätigung vorhanden“.

## P1 — Architektur reparieren, ohne das Produkt zu zerlegen
- Zerlege app/page.tsx entlang echter Verantwortungen: Karteninitialisierung/Layer, Live-Zug-Radar, Station-Selection, Journey-Selection, Layout-/Sheet-State, Header/Toolbars. Extrahiere Hooks/Services oder Komponenten **nur** dort, wo Zustandsbesitz und Nebenwirkungen dadurch verständlicher werden.
- Definiere eine eindeutige Zustandsmaschine beziehungsweise diskriminierte View-Typen für sich ausschließende Hauptpanels. Verhindere widersprüchliche Flags und späte Responses, die eine geschlossene Ansicht wieder öffnen.
- Baue klare Request-Lifecycle-Semantik: AbortController, deduplizierte Inflight-Requests, Cache-Freshness, Fehler-/Stale-Zustände, Refetch bei Bedarf, Pause bei verstecktem Tab. Vermeide das erneute Setzen alter Stationsdaten nach Stationswechsel.
- Verschlanke die CSS-Kaskade. Untersuche zunächst berechnete Styles und dominante Überschreibungen. Konsolidiere die Regeln aus designer-v48.css, v49-ui.css, v50-ui.css in logisch verantwortete Komponenten/Token-Schichten, statt v51-ui.css darüberzustapeln. Vermeide !important, wo es ohne Regression möglich ist.
- Reduziere duplizierte UI-Logik für Züge, Statuszeiten und Bahnhöfe. Nutze die gemeinsamen Echtzeit-Komponenten und Design-Tokens.
- Bewahre die vorhandene Next/vinext-Konfiguration; kein Wechsel des Frameworks aus Prinzip.

## P2 — Leaflet-Karte und Live-Züge: der größte technische Hebel
- Profiliere das Karten-Rendering zuerst. Die bestehende Live-Ansicht entfernt/erstellt Marker beim Tick über clearLayers. Wo sinnvoll, verwalte Marker stabil per tripId, aktualisiere Position/Status/Tooltip gezielt und entferne nur nicht mehr vorhandene Elemente. Cleanup bei Karte/Station/Layer-Wechsel sauber implementieren.
- Prüfe Clustering, Renderer/Canvas, RAF/Worker, räumliche Indizes, Sichtbarkeitsfilter und Zoom-Grenzen. Keine teuren Reflows/React-Rerenders für jeden Zugtick; bewahre Marker-Klicks, Fokus, Tooltips, Follow-Mode, Trails und UI-Testbarkeit.
- Animierte/geglättete Positionen bleiben **berechnet** aus gelieferten Zeiten und Quellgeometrien. Bei fehlenden Zeiten, ungültigen Koordinaten oder unterbrochenen Segmenten keine Position oder exakte Geschwindigkeit vortäuschen.
- Prüfe „Geschwindigkeit Ø Segment“ und kennzeichne sauber den Unterschied zwischen berechneter Durchschnittsgeschwindigkeit, Live-Geschwindigkeit und einer nicht verfügbaren Messung. Bei unplausiblen Daten kein numerischer Fake.
- Bewahre die jüngste Worker-/Canvas-Optimierung für automatisch geladene Stationslinien. Linien dürfen bei Wechsel nicht komplett neu gezeichnet werden, wenn die Geometrie unverändert ist.
- Nutze ausschließlich belegbare Streckengeometrien; bleib bei bestehenden Null-/Lücken-Behandlungen aus TrackRouter und den Geometrietests.
- Visuelle Hierarchie: wichtige Stationen zuverlässig erkennbar; Marker-Größe nur aus belastbarem Fahrgastaufkommen, Unbekanntes explizit neutral. Ein Hub ohne Fahrgastdaten bekommt keine erfundene hohe Passagierzahl. Labels kollisionsarm und sinnvoll zoomabhängig. Berlin Gesundbrunnen und andere zentrale Knoten bei Station-Suche/Zoom gezielt überprüfen.
- Karte möglichst groß, keine dauerhaft ungenutzten Seitenflächen; bei Detailansichten nur den tatsächlich nötigen Kartenbereich belegen.

## P3 — Vollständiger UI/UX-Qualitätsschritt
- Entwirf und implementiere eine **einheitliche** visuellen Sprache: klare Typografie, saubere Abstände, abgestufte Glasmaterialien, natürliche helle/dunkle Farben, konsistente Ecken/Schatten, tabellarische Ziffern.
- Desktop (1366/1440/1920): effizient genutzte Fläche, Karte als Hauptfläche, kompakte Suche und Navigation, kontextbezogener statt permanenter Inspektor. Keine riesigen leeren Panels.
- Smartphone (320/360/390/430 px), Tablet (768/1024 px), Landscape: Karte bleibt nutzbar; Suchdock, Sheet, Keyboard, Safe-Area und untere Navigation dürfen nicht überlappen. Keine horizontalen Überläufe. Mindestens 44 px nutzbare Touch-Flächen; Texte bleiben bei größerer Schrift lesbar.
- Bottom Sheet: drei verständliche Zustände kompakt/halb/erweitert, reales Dragging, nur ein sinnvoller Scroll-Container, klare fixe Kopfzeile, stabiles Schließen per X und passende Back-/Escape-Navigation. Wiederherstellung darf nicht automatisch nach einem bewusst geschlossenen Panel erfolgen.
- Light und Dark als zwei abgestimmte Materialpaletten. Der Dark Mode darf nicht aus simplen CSS-Inversionen und grauen Flächen bestehen, die sich gegenseitig verwischen.
- Liquid Glass mit Reflexionskante, Transparenz und Blur nur für Navigation/Suche/floating Toolbars/Sheet-Shell. Inhalte und dicht besetzte Tabellen lesbar halten. Kein übermäßiger Blur auf leistungsschwachen Smartphones.
- Animationssprache: kurze Motion für Navigation, Suche, Sheet und Panelwechsel, keine dekorativen Dauereffekte. prefers-reduced-motion respektieren.
- Entferne unnötige Beschriftungen, doppelte Statusangaben und überdimensionierte Controls. Keine Änderung nur wegen vermeintlich „modernem“ Aussehen.
- Beurteile tatsächliche Screenshots, einschließlich Dark Mode. Wenn keine Browser-Ansicht verfügbar ist, keine visuelle Abnahme behaupten.

## P4 — Suche, Abfahrtstafel, Zugdetails, Reiseplaner
- Suche: schnell, lokal+remote, keyboard-/screenreaderfähig, fehlertolerant, eindeutige Stationen/IDs; bei langsamer Online-Suche keine veralteten Vorschläge. Kein Komplettsortieren des Nationaldatensatzes je Tastendruck; falls notwendig messen/indexieren.
- Tafel: pünktlich, verfrüht, verspätet, ausgefallen und unbestätigt mit korrekter Soll-/Prognosezeit darstellen. Sollzeit durchstreichen, wenn eine bestätigte abweichende Prognose vorliegt. +11 muss rot sein. Farbe niemals alleinige Statusinformation.
- Lade die unabhängige DB-Gegenprüfung möglichst so, dass sie die Erstansicht nicht unnötig blockiert. Vereinheitliche bewusste Stichprobenabdeckung, Matching-Qualität, Warnung und Timeouts. „DB-geprüft“ nur bei tragfähigem Ergebnis. Kein falsches „100 % bestätigt“ aus 1/1, wenn 50 Hauptquell-Zeilen vorhanden waren.
- Zugdetails: vollständig vorhandene Halte, Zeiten, Gleise, Ausfälle, aktuelle Quelle/Stand, direkter Kartenbezug; nie fehlende Gleise/Stopps erfinden. Der Zeitverlauf muss auf Mobile schnell lesbar sein.
- Reiseplaner: reproduzierbare Suche, Alternativen, Umstiegspuffer, sichere Fehlerzustände, erkennbare Abfahrts-/Ankunftszeiten. Keine widersprüchlichen Verkehrsmittel- oder Echtzeitangaben.
- Speichern/Favoriten: lokale Einträge robust gegen kaputte Storage-Werte und fehlende Berechtigungen. Keine unklare persistente Tracking-Funktion.

## P5 — API, Datenqualität, Performance, Security
- Validierung von Query-Parametern und POST-Body, sichere Fehlertexte, request timeouts, Limits, URLs, Typeguards. Niemals Secrets im Client oder in Logs exponieren. Prüfe XSS/HTML-Injection in Tooltips und externen Daten, wenn relevant.
- API-Abhängigkeiten Transitous/MOTIS und DB transport.rest: Quoten, Nutzungsbedingungen, Attribution, Verfügbarkeit und erlaubte kommerzielle Nutzung prüfen. Falls Nutzung für einen späteren bezahlten Produktbetrieb nicht gedeckt ist: offen dokumentieren und nicht stillschweigend Monetarisierung aktivieren.
- Prüfe, ob die Pro- und Checkout-Pfade echte Produktionsreife besitzen; keine Stripe-/Google-Play-Zahlungen aktivieren, bevor regulatorische, Plattform- und Sicherheitsanforderungen erfüllt sind.
- Performance-Ziele als zu messende Budgets, nicht als erfundene Ergebnisse: flüssige Karten-Gesten unter CPU-Drosselung; wenige unnötige Requests beim Detailöffnen; stabiler Speicher bei längerer Kartennutzung; kein Layout-Shift oder Overlay-Overflow. Messwerte vor/nach nennen.
- Prüfe PWA-SW-Caching, Offline-Verhalten, Versionswechsel, Updateaktivierung, Browser-Storage und Unterscheidung zwischen stalen Daten und aktuellen Antworten.
- Verbesserungen an der öffentlichen Website /website und Onboarding erst nach der Kern-App: klare Beschreibung, Installationsweg, unabhängiger Anbieter, Datenschutz/Attribution. Kein erfundener Funktionsumfang.

## P6 — Testprogramm / Done-Definition
- Führe pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm lint, die vorhandenen audit:* Skripte sowie pnpm build aus, soweit Umgebung und Abhängigkeiten es erlauben.
- Browser-QA: 320×700, 360×800, 390×844, 430×932, 768×1024, 1024×768, 1366×768, 1440×900, 1920×1080; jeweils Light und Dark bei kritischen Abläufen. Auch große Schrift, High Contrast, Reduced Motion, Reduced Transparency und Querformat testen.
- Screenshot-Diffs auf wirkliche Probleme prüfen; keine Snapshot-Aktualisierung, nur um Tests grün zu bekommen. Ergänze Tests für Polling-Abbruch, Markeridentität, Bahnhofswechsel, leere/unklare DB-Gegenprüfung, alte Search-Responses und +4/+5/+10/+11-Minuten-Grenzfälle.
- Interaktionsregressionen: Suche → Bahnhof → Tafel; Station-Linien; Zugdetail/Fahrtverlauf; Karte/Tracking; Planung/Alternative; Tab-Wechsel; X und Escape; Mobile-Sheet-Dragging; Internetfehler.
- Behebe CI-Fehler anhand ihrer Ursache. Falls ein externer Live-API-Test unzuverlässig ist, dokumentiere die Unsicherheit und trenne deterministische Tests klar von Live-Smoke-Prüfungen.
- Release-Version nur dann erhöhen, wenn ein tatsächlicher Release-Kandidat entsteht; app/app-version.ts, public/version.json und public/sw.js zusammen synchronisieren.

## Arbeitsmodus: verbindlich
1. Beginne mit Git-/PR-/CI-Abgleich und einer kompakten, priorisierten Liste der **konkret im Code belegten** Probleme. Kein mehrere Seiten langer Analysebericht.
2. Setze danach die 3–5 folgenreichsten Verbesserungen vollständig um. Beginne mit reproduzierbaren Fehlern, Datenwahrheit und Kartenperformance, dann CSS-/State-Architektur und UI.
3. Kleine Commits nach sinnvoller Teilaufgabe; nach jeder Etappe TypeScript/Tests. Keine Änderungen, die den Branch unbuildbar lassen, ohne das offen zu kennzeichnen.
4. Öffne beziehungsweise aktualisiere einen **Draft Pull Request** für codex/v51-systemic-overhaul. Basis ist V50.3-Branch, solange dieser nicht in main integriert wurde; danach sauber auf main aktualisieren. Nicht automatisch mergen, deployen oder kostenpflichtige Services aktivieren.
5. Wiederhole Audit → Implementierung → Tests → Screenshot-/Performance-Prüfung → Fehlerkorrektur während **dieser Codex-Ausführung**. Keine Behauptung, ohne Auftrag außerhalb der laufenden Sitzung dauerhaft weiterzuarbeiten.
6. Wenn Werkzeug, Netzwerkkonnektivität oder Laufzeit knapp werden: sichere echten, getesteten Fortschritt und beschreibe die nächsten konkreten Dateien und Aufgaben, statt einen erfundenen Fertigstand zu melden.

## Abschlussbericht
Liefere eine knappe Tabelle mit **vorherigem Fehler, Änderung, geänderten Dateien, Test und Ergebnis**; eine Tabelle für weiter offene Probleme mit Risiko/Priorität; Vergleichsmessungen und Links zu Commits/PR/CI. Trenne „implementiert und geprüft“, „implementiert, noch nicht geprüft“ und „nicht umgesetzt“.

## Entscheidender Anspruch
BahnConnections soll am Ende dieser Arbeit **funktional zuverlässiger, schneller und sichtbar ruhiger** sein. Kein neuer Stil-Overlay, keine Fake-Echtzeit, keine kosmetische Änderung ohne Nutzerwert. Optische Präzision, Datenintegrität, Performance und verständliche Bedienung müssen sich gleichzeitig verbessern.

**Prüfe jetzt den Branch und beginne direkt mit dem Code. Keine Antwort, die nur einen weiteren Umsetzungsplan enthält.**
