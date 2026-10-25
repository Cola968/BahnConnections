# BahnConnections

BahnConnections ist eine interaktive Bahnkarte und Fahrplanauskunft für Deutschland. Die App verbindet eine ruhige, für Desktop und Mobilgeräte optimierte Oberfläche mit aktuellen Fahrplan- und Echtzeitdaten.

**Live-App:** [bahnconnections-de.a-stad.chatgpt.site](https://bahnconnections-de.a-stad.chatgpt.site/)

**Aktuelle öffentliche Webversion:** **V62.0.0**, am 23.10.2026 über ChatGPT Sites als Version 71 veröffentlicht ([Nachweis PR #85](https://github.com/Cola968/BahnConnections/pull/85)). Die Veröffentlichung erfolgte über den Release-Branch, nicht den Stand von `main`.

**Abgleich für GitHub und ausstehende Funktionen:** [V62 Release-Reconciliation](docs/releases/V62.0.0-RELEASE-RECONCILIATION.md). Ein `main`-Merge ist kein neues Sites-Deployment. Der enthaltene native Android-Code ist **keine** veröffentlichte APK und nicht auf physischen Geräten abgenommen. Vollständigkeit der Bahnhofshalte, Betreibervalidierung, Datenrechte und umfassende Radarabdeckung sind nicht behauptet.

## V62-Webfunktionen

- Schnellfilter für kommende Abfahrten, Verspätungen und Gleisänderungen sowie gespeicherte Pendlerstrecken.
- Überarbeitete Glass-/Railglass-Flächen, mobile Stationsdarstellung und PWA-Versionswechsel.
- Zugverfolgung und Radaransichten mit gekennzeichneter Modellierung; keine pauschal zugesagte GPS-Echtzeitposition.
- Die geplante native, über die App-Laufzeit hinausgehende Android-Benachrichtigung benötigt eine separat gebaute, getestete und veröffentlichte Android-App.

## Funktionen

- bundesweite Bahnhofssuche mit eindeutigen Haltestellen-IDs
- Live-Abfahrten und -Ankünfte für Fern-, Regional-, S- und U-Bahn
- anbietergemeldete Linien eines Bahnhofs mit Richtungen und Endzielen (Abdeckung je Quelle unterschiedlich)
- Fahrtverläufe mit vom Anbieter bestätigten Halten, Soll-/Ist-Zeiten, Gleisen und Meldungen; fehlende Halte werden nicht erfunden
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
