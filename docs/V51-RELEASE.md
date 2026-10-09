# V51.0 · Release-Kandidat

Basis: `main` Commit `1301039` (V50). Ziel bleibt die bestehende BahnConnections-Site aus `.openai/hosting.json`; es wurde keine neue Site erzeugt.

## Was sich für Reisende verbessert

Die Suche bleibt auf dem Handy sichtbar, während Optionen und gespeicherte Strecken unabhängig scrollen. Der Planer erklärt fehlende Auswahl, verhindert eine Suche ohne Verkehrsmittel und erlaubt den Abbruch laufender Anfragen. Deckende Inhalte, größere Tafeltexte und deutliche Kontraste ersetzen Text über wechselndem Kartenmaterial. Die Tastatur kann über einen Sprunglink direkt zur Suche gelangen.

Suchlinks enthalten ausschließlich Start, Ziel und eine optionale Uhrzeit. Beim Öffnen werden diese Felder ausgefüllt; es wird keine alte Verbindung als aktueller Fahrplan dargestellt und keine Suche ungefragt gestartet. Lokal gespeicherte Strecken erhalten ihre eindeutigen Transitous-IDs.

Eine eigene Offline-Seite benötigt keine React-Dateien oder Kartenkacheln und zeigt lokal gespeicherte Pendelstrecken mit einem deutlichen Hinweis auf fehlende Fahrplandaten. Namen werden als Text eingefügt. Erreichbarkeit kann dadurch verbessert, aber nicht dauerhaft garantiert werden.

Geometrie mit beschädigter Polyline-Kodierung wird vollständig verworfen. Eine unterbrochene Schienengeometrie bleibt unterbrochen, auch bei Zugmarkern und Spuren. Radar-Daten nach zwei Minuten werden nicht weiter als aktuelle Bewegung dargestellt. Positionen bleiben aus Zeiten und Streckengeometrie geschätzt; dies sind keine GPS-Ortungen.

Der Service Worker nimmt API-, Versions-, Authentifizierungs- und RSC-Anfragen nicht aus seinem Cache. Er speichert keine personalisierten Navigationsdokumente und löscht bei Versionswechseln nur eigene statische Caches. Ohne Cloudflare-Bindings liefert der Node-Produktionsserver eine lesbare Free-Abonnement-Antwort; Checkout, Portal und Webhooks bleiben gesperrt.

## Vergleichsrahmen

Die offiziellen Seiten von [DB Navigator](https://www.bahn.de/service/mobile/db-navigator), [Transit](https://transitapp.com/) und [Citymapper](https://www.citymapper.com/) wurden am 9. Oktober 2026 angefragt. Alle drei Anfragen wurden in dieser Umgebung mit HTTP 403 blockiert. Es gab deshalb keinen aktuellen visuellen Direktvergleich oder vollständigen Funktionstest dieser Apps. Die folgende Tabelle ist ein Vergleich von Produktprinzipien, keine Behauptung über ihre aktuell eingesetzten Screens oder Vollständigkeit.

| Orientierung | Daraus abgeleitetes Kriterium | Nachweis in BahnConnections |
| --- | --- | --- |
| Bahn-Reiseplanung wie bei DB Navigator | Start/Ziel, Uhrzeit und primäre Suche müssen verständlich und erreichbar sein | Geteilte Suche, sichtbare Aktion, Auswahlhinweise, Suchabbruch im Browser geprüft |
| Kartenorientierte Orientierung wie bei Transit | Karte und Bedienung dürfen sich nicht verdecken; Datenstatus muss nachvollziehbar sein | Ein Inspector, feste Navigation, responsive Layout-Matrix und keine erfundenen Strecken |
| Alltagstaugliche Reisewege wie bei Citymapper | Häufige Wege wiederverwenden und Verbindungsprobleme verständlich behandeln | Pendelstrecken, Rückweg, Suchlink und Offline-Wiederherstellung geprüft |

BahnConnections verkauft keine Tickets und bietet keine bestätigten Buchungen. Es wird keine Funktionsgleichheit mit diesen Angeboten behauptet.

## Ausgeführte Prüfungen

- TypeScript, ESLint, Produktionsbuild.
- Bestehende UI-, Karten-, Transport-, Echtzeit-, Tafel- und Billing-Audits sowie Track-Gap-Regressionen.
- Neue Release-Regressionen: beschädigte Polylines, Geometrie-Lücken, Zugspuren, Datumsgrenze, Suchlink-Validierung, Offline-Navigation und API/Auth/RSC-Cache-Isolation.
- Responsive Browser-QA: 108 Matrix-Einträge, 22 Echtzeitfälle, 7 Profilprüfungen und 4 Websiteansichten. Fahrplandaten waren deterministische Testdaten.
- Content-Layout-QA: 165 Prüfungen, 18 automatische Linien und erfolgreiches Zurücksetzen beim Schließen.
- Live-API-Smoke am Node-Produktionsserver: 7 Prüfungen bestanden, einschließlich 60 Linien, 301 Tafelzeilen und 24 Reiseoptionen. Die unabhängige Echtzeit-Gegenprüfung war nicht verfügbar; dies bestätigt keine Übereinstimmung mit einer zweiten Quelle.
- Separater Live-Netzwerk-Audit: Stations- und Linienprüfungen erfolgreich; die fest erwartete S42-Zubringerverbindung fehlte in der Referenzsuche. Die Prüfung wurde nicht abgeschwächt.
- Produktions-Browser-QA: geteilte Suche, sichtbare Suchaktion, Suchabbruch, Offline-Hinweis, Offline-Navigation, sichere Darstellung gespeicherter Namen, Wiederherstellung, Free-Abonnement-API und Version `51.0`.

Belege liegen lokal in `work/release-qa/report.json`, `work/release-layout/content-layout-report.json` , `work/release-api-production.json`, `work/release-network-proxy.json` und `work/release-browser/report.json` sowie den daneben gespeicherten Screenshots. Diese generierten Dateien sind absichtlich nicht Teil des Git-Commits. CI lädt dieselben Prüfberichte und Bilder als Artefakte hoch.

```bash
pnpm install --frozen-lockfile
pnpm exec tsc --noEmit
pnpm lint
pnpm audit:release
pnpm audit:map
node scripts/track-gap-test.mjs
pnpm build
pnpm start --port 3001
# In der verwalteten Cloud-Umgebung für echte API-Anfragen:
# NODE_USE_ENV_PROXY=1 pnpm start --port 3001
# In einer zweiten Shell; EDGE_PATH bei Bedarf auf den lokalen Chromium/Chrome-Pfad setzen:
BAHNCONNECTIONS_BASE_URL=http://localhost:3001 pnpm audit:release-browser
```

## Noch vor Produktionsfreigabe

1. Den offenen S42-Referenzfall im separaten Live-Netzwerk-Audit untersuchen und die unabhängige Echtzeit-Gegenprüfung wiederholen. Native Node-Anfragen funktionieren mit dem bereitgestellten Systemproxy (`NODE_USE_ENV_PROXY=1`); der lokale Miniflare-Entwicklungsserver lieferte für dieselben Live-Ziele interne 502-Fehler. Für die Live-API-Prüfung wurde deshalb der echte Node-Produktionsserver verwendet.
2. Kartenkacheln von `tile.openstreetmap.org` auf der tatsächlichen Site prüfen. Lokale Screenshot-Tests hier enthalten wegen der Netzwerkbeschränkung keine externen Kartenkacheln.
3. Auf echten Mobilgeräten VoiceOver/TalkBack, System-Zoom, virtuelle Tastatur, Standortberechtigung und PWA-Installation prüfen. Die Browsermatrix ist eine Emulation, kein Hardwaretest.
4. Die bestehende Site meldete am 9. Oktober weiterhin `50.0`. Das vorhandene Sites-Projekt aktualisieren und die tatsächliche Produktionsantwort `/version.json` auf `51.0` prüfen. Build und Git-Push sind kein Deployment-Nachweis.
5. Zahlungsfunktionen bleiben optional und deaktiviert. Für ihren Release sind authentifizierte Konten, D1, sichere Stripe-Bindings und Sandbox-End-to-End-Prüfungen nötig.

Solange diese Punkte offen sind, gilt V51 als geprüfter Release-Kandidat und nicht als vollständig produktionsfreigegebene App.
