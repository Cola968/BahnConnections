# BahnConnections

BahnConnections ist eine interaktive Bahnkarte und Fahrplanauskunft für Deutschland. Die App verbindet eine ruhige, für Desktop und Mobilgeräte optimierte Oberfläche mit aktuellen Fahrplan- und Echtzeitdaten.

**Live-App:** [bahnconnections-de.a-stad.chatgpt.site](https://bahnconnections-de.a-stad.chatgpt.site/)

## V48.1 · Mobile Polish

V48.1 verfeinert die bereits kompakte V48-Mobile-Oberfläche. Der Planer verliert redundante Beschriftung, Bahnhofsinformationen zeigen keine langen Platzhalterlisten mehr und Linien-/Qualitätsdaten liegen hinter einer kompakten Detailzeile. Außerdem wurde die Sheet-Bedienung nach freiem Ziehen robuster gemacht. Das bestehende Liquid-Glass-System und die Größenbalance bleiben bewusst unverändert.

## V48.0 · Mobile Cleanup

V48.0 konzentriert sich auf mobile Informationsdichte statt auf ein neues Design. Das bestehende Liquid Glass bleibt erhalten, aber sichtbare Chrome-Elemente, Sheets, Planer und Live-Tafel wurden deutlich kleiner und klarer hierarchisiert. Standort läuft nach erteilter Browserfreigabe automatisch im Hintergrund; die bisherigen Standort- und „Nächster Bahnhof“-Overlays entfallen. Mobile Panels öffnen standardmäßig kompakt und lassen mehr Karte sichtbar.

## V44.0 · Simpler More & Cleaner Board

V44.0 reduziert die sichtbare Bedienoberfläche weiter. Der mobile Tab „Mehr“ ist jetzt ein eigenes, kurzes Menü mit nur drei Kernpunkten: Darstellung, App & Updates sowie Hilfe & Daten. Technische Kartenfilter und Netzoptionen liegen nicht mehr im allgemeinen Mehr-Menü, sondern ausschließlich hinter der Kartenansicht; seltene Kartenoptionen sind dort zusätzlich eingeklappt.

Die Abfahrtstafel zeigt öffentliche Bahnhofsnamen statt technischer Haltestellenbezeichnungen. Zusätze wie „Zugang über den Bahnhofsvorplatz“ werden entfernt und „Hauptbahnhof“ wird in der kompakten Tafelansicht zu „Hbf“. Doppelte Ausfalltexte unter dem Ziel entfallen, da der rote Echtzeitstatus bereits eindeutig ist. Zeilen wurden zusätzlich etwas kompakter abgestimmt.

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

