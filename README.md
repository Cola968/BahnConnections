# BahnConnections

BahnConnections ist eine interaktive Bahnkarte und Fahrplanauskunft für Deutschland. Die App verbindet eine ruhige, für Desktop und Mobilgeräte optimierte Oberfläche mit aktuellen Fahrplan- und Echtzeitdaten.

**Live-App:** [bahnconnections-de.a-stad.chatgpt.site](https://bahnconnections-de.a-stad.chatgpt.site/)

## V32 · Lyra

Mobile: kompakter Header, feste Hauptnavigation und ein stufenlos ziehbares Bottom-Sheet. Minimieren oder Schließen verändert nur die Darstellung, nicht die Suche oder ausgewählte Fahrt. Die Ziehfläche umfasst auch den Griff. Safe-Areas und die virtuelle Tastatur werden berücksichtigt.

PC: getrennte Bereiche für Planer, Karte und Details. Gemeinsame Design-Tokens, Systemschrift, skalierbare Typografie, zurückhaltende Linien-Badges und sichtbare Fahrplanziele ersetzen historische CSS-Überlagerungen. Fahrplan- und Routing-Schnittstellen bleiben unverändert.

Validierung: Lint, TypeScript, Build, UI- und Board-Audit sowie automatisierte responsive Abläufe von 320 bis 1920 Pixeln. Der responsive Test verwendet ausdrücklich Testverbindungen (keine Fahrplanvalidierung), Klickaktivierung und echte emulierte Touch-Ziehgesten. Öffnen, Suchen, Minimieren während der Suche, Wiederherstellen, Schließen, Alternativwahl, lange Namen und Querformat werden geprüft. Ein echter Android-/iOS-Gerätetest bleibt erforderlich; Edge-Emulation ist kein Ersatz dafür.

```bash
pnpm audit:mobile -- http://localhost:3000 work/mobile-qa
```

## Funktionen

- bundesweite Bahnhofssuche mit eindeutigen Haltestellen-IDs
- Live-Abfahrten und -Ankünfte für Fern-, Regional-, S- und U-Bahn
- vollständige Linienliste eines Bahnhofs mit Richtungen und Endzielen
- Fahrtverläufe mit allen Halten, Soll-/Ist-Zeiten, Gleisen und Meldungen
- quellgelieferte Streckengeometrien ohne erfundene Luftlinien
- Reiseplaner mit Alternativen, bis zu fünf Umstiegen und Sortierung nach erwarteter Ankunft
- Transitous/MOTIS als Hauptquelle und DB transport.rest als unabhängige Gegenprüfung im Reiseplaner
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
