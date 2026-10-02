# BahnConnections

BahnConnections ist eine interaktive Bahnkarte und Fahrplanauskunft für Deutschland. Die App verbindet eine ruhige, für Desktop und Mobilgeräte optimierte Oberfläche mit aktuellen Fahrplan- und Echtzeitdaten.

**Live-App:** [bahnconnections-de.a-stad.chatgpt.site](https://bahnconnections-de.a-stad.chatgpt.site/)

## V36.0 · Minimal Map-first UI

V36.0 reduziert die sichtbare UI-Chrome weiter: kompakter Mobile-Header, schwebende Suche, ruhigere Journey-Flächen und schmalere Desktop-Rails geben Karte und Reiseinformation mehr Raum.

Der Reiseplaner zeigt Abfahrt/Ankunft und Datum/Zeit direkt im Hauptfluss; seltenere Optionen bleiben eingeklappt. Primäre Aktionen verwenden das BahnConnections-Rot, Auswahl- und Informationszustände Blau. Echtzeitstatusfarben bleiben davon getrennt.

Journey und Live-Tafel verwenden ein gemeinsames Zeit- und Gleissystem. Bei einer Abweichung steht die durchgestrichene Planzeit direkt vor der aktuellen Zeit und dem Text zur Änderung. Bestätigte Echtzeit bis +5 Minuten ist grün, +6–14 amber und ab +15 rot; frühere Abfahrten sind amber. Das sind BahnConnections-Schwellen, keine offiziellen Betreiberfarben. Fehlende Echtzeit bleibt neutral. Ausfälle zeigen keinen erfundenen Istzeitpunkt.

Desktop: Planer + Karte vor der Auswahl, Karte + Journey-Inspector danach. „Ändern“ öffnet gezielt den Planer; die ausgewählte Verbindung bleibt erhalten. Mobile behält das frei ziehbare Sheet mit getrenntem Minimieren, Schließen und Wiederherstellen.

V33.1 präzisiert den Echtzeitstatus von auf der Karte geöffneten Bahnhofsfahrtverläufen: vollständige und teilweise Echtzeitabdeckung werden getrennt benannt. Zeit- und Gleisinformationen liefern Screenreadern jetzt echten versteckten Beschreibungstext statt als Bildrolle aufzutreten.

V33.2 ergänzte das Update-System für die installierte PWA. V33.3 härtet zusätzlich die Ringlinienprüfung: wiederholte Ringfahrten werden weiterhin auf einen plausiblen Abschnitt begrenzt, bereits von der Datenquelle begrenzte Fahrtabschnitte werden aber nicht künstlich erweitert oder fälschlich als Fehler behandelt. Die App prüft weiterhin regelmäßig `/version.json` und den Service Worker; verfügbare Updates werden erst nach Entscheidung des Nutzers aktiviert.

Prüfungen und offene Cloud-Einschränkungen: [V33-QA](docs/V33-QA.md); V34 wird über denselben CI-/Browser-QA-Workflow validiert. Der GitHub-Workflow führt TypeScript, Lint, Audits, Build und responsive Browser-QA aus. Ein echtes Android-/iOS-Gerät muss zusätzlich geprüft werden.

```bash
pnpm audit:realtime
pnpm audit:ui
pnpm audit:board
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

