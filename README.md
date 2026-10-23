# BahnConnections

BahnConnections ist eine interaktive Bahnkarte und Fahrplanauskunft für Deutschland. Die App verbindet eine ruhige, für Desktop und Mobilgeräte optimierte Oberfläche mit aktuellen Fahrplan- und Echtzeitdaten.

**Live-App:** [bahnconnections-de.a-stad.chatgpt.site](https://bahnconnections-de.a-stad.chatgpt.site/)

**V58.0 Railglass in Entwicklung:** [Draft PR #72](https://github.com/Cola968/BahnConnections/pull/72). Die vorherigen ungemergten V57.3-Änderungen sind in diesem Branch enthalten; die öffentliche App ist **nicht automatisch V58**. Kein Cloudflare-Production-Deploy ohne GitHub-Secret, Abnahme und Freigabe.

## V58.0 · Railglass Relaunch

- Neue hochwertige Hell-/Dunkelansichten mit einem durchgängigen Navigations- und Sheetsystem, reduzierter „Kartenstapel“-Ästhetik und Android-Systemleistenanpassung.
- Vier Ein-Tipp-Ansichten für Bahnhofstafeln: Nächste Stunde, Verspätet, Ausfälle, Alle Fahrten. Bestehende Filter bleiben erhalten.
- Direkter Vergleich von Reisealternativen nach Ankunft, Dauer, Umstiegen oder Fußweg.
- Kartenstatus mit echten Datenqualitätszuständen: Positionen werden nicht als Fahrzeug-GPS ausgegeben.
- Vorhandene Funktionen bleiben bestehen (Live-Tafel, Planer, Karte, Zugverfolgung, Merkliste, Störungen und Sharing). Tests auf dem aktuellen Branch in GitHub Actions, reale Android-Hardware weiter erforderlich.

**Designkonzept und Go/No-Go:** [Railglass V58](docs/design/V58-RAILGLASS-DIRECTION.md), [Cloudflare und Android](docs/deploy/PLAY-STORE-NO-RENDER-SPLASH.md). Quellen-/Nutzungsrechte vor Veröffentlichung klären (Issue #67).

## Funktionen

- bundesweite Bahnhofssuche mit eindeutigen Haltestellen-IDs
- Live-Abfahrten und -Ankünfte für Fern-, Regional-, S- und U-Bahn
- vollständige Linienliste eines Bahnhofs mit Richtungen und Endzielen
- Fahrtverläufe mit allen Halten, Soll-/Ist-Zeiten, Gleisen und Meldungen
- quellgelieferte Streckengeometrien ohne erfundene Luftlinien
- Reiseplaner mit Alternativen, bis zu fünf Umstiegen und Sortierung nach erwarteter Ankunft
- Transitous/MOTIS als Hauptquelle und DB transport.rest als zusätzlichen Fahrplanabgleich im Reiseplaner (keine unabhängige Betreiberbestätigung)
- installierbare Progressive Web App mit responsivem Bottom-Sheet auf Mobilgeräten
- sichtbare Kennzeichnung von Echtzeit-, Teil- und reinen Fahrplandaten

## Datenqualität

Die App erfindet keine Ziele, Zeiten oder Strecken. Kann eine Station nicht eindeutig einer Haltestellen-ID zugeordnet werden, wird die Abfrage abgebrochen und als unvollständig gekennzeichnet. Fehlende Geometrien bleiben sichtbar als Datenlücke, werden aber nicht durch gerade Linien ersetzt.

Externe Fahrplandaten können keine mathematische 100-%-Garantie bieten. BahnConnections zeigt deshalb Quelle, Aktualisierungszeit, Echtzeitstatus und Warnungen an und mischt widersprüchliche Fahrten nicht zu einer scheinbar exakten Verbindung.

## Lokal starten

Voraussetzungen: Node.js 22 oder neuer und pnpm.

```bash
pnpm install
pnpm dev
```

Produktionsbuild:

```bash
pnpm lint
pnpm audit:ui
pnpm build
pnpm start
```

Die Netzwerk- und API-Prüfungen benötigen Internetzugriff:

```bash
pnpm audit:network
BAHNCONNECTIONS_BASE_URL=http://localhost:3000 pnpm audit:api
```

## Datenquellen

- [Transitous](https://transitous.org/) / MOTIS für Haltestellen, Linien, Fahrten und Echtzeitdaten
- [DB transport.rest](https://v6.db.transport.rest/) als zweite Reiseplaner-Quelle
- OpenStreetMap-Kartenmaterial über die in der App ausgewiesenen Kacheldienste

Die jeweiligen Quelldaten und Marken bleiben Eigentum ihrer Anbieter. BahnConnections ist ein unabhängiges Projekt und kein offizielles Angebot der Deutschen Bahn AG.


## Lizenz und Datenrechte

Eigener Anwendungscode: MIT, siehe [LICENSE](LICENSE). Fremddaten und Bibliotheken behalten ihre Bedingungen; siehe [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Die dort dokumentierten offenen Datenfreigaben bleiben Release-Blocker.
