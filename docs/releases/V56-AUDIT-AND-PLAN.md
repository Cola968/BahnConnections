# BahnConnections V56 — Systemaudit, UX-Richtung und Release-Gates

Status: **Draft, noch kein Produktionsrelease**. Basis `main` / V55 vom 12.10.2026.
Dieses Audit basiert auf einer Code- und Workflowprüfung. Es ist **kein** Ersatz für
einen echten Android-/TWA-Gerätetest oder eine unabhängig gemessene Datenquelle.

## Produktentscheidung
BahnConnections muss vorrangig Fragen in folgender Reihenfolge beantworten:
(1) Welcher Zug? (2) Wo und wann? (3) Wie zuverlässig ist diese Auskunft?
Erst danach folgen Kartenanimationen, Prognose-Details und die Marke.

### Priorität P0 — Falsche Informationen und Ausfälle
| Befund | Risiko | V56-Maßnahme | Status |
|---|---|---|---|
| "Pünktlich"-Filter enthielt +1 bis +4 Min. | irreführende Erwartung | exakt 0 Minuten | umgesetzt |
| Verschiedene Linien ohne `tripId` konnten in einer Tafelzeile zusammenfallen | fehlende Fahrten | Identität inkl. Linie/Route/Uhrzeit/Gleis | umgesetzt |
| Alte Gleisänderung statt planmäßiger Gleisinformation | falsche Gleisangabe | nur frische Änderungen; sonst Plangleis | umgesetzt |
| Zug-Inspector löschte alle bekannten Halte bei Update-Ausfall | Informationsverlust | letzten Halteplan behalten, als veraltet kennzeichnen | umgesetzt |
| Zwei Zeitfelder im Zug-Inspector nutzten Realtime-Flag ohne Quellenfrische | veraltete Prognosen wirkten live | Zeitfelder an aktuellen Radarstatus koppeln | umgesetzt |
| Einzelne fehlerhafte `stopTimes`-Zeilen konnten das Mapping abbrechen | ganze Bahnhofstafel leer | malformed rows isolieren | umgesetzt |
| Stationssuche/Fahrtdetail/Geocode ohne hartes Timeout | Spinner und hängende Aufrufe | Timeouts/Abort und Längenbegrenzung | umgesetzt |

### Priorität P1 — Bedienbarkeit und Vertrauen
| Befund | V56-Maßnahme | Status |
|---|---|---|
| Bei aktivierten Filtern unspezifische leere Tafel | Filter zurücksetzen / erneut laden | umgesetzt |
| Abfahrtssortierung in Ankunftsansicht falsch beschriftet | kontextabhängiger Text | umgesetzt |
| Kleine Beschriftungen, unruhige Glasschichten, schwacher Kontrast | zusammenhängende CSS-Typografie-/Oberflächenschicht inkl. 320px & Dark Mode | umgesetzt, Browser-QA offen |
| CSS aus sehr vielen Versionsdateien mit `!important`-Kaskaden | langfristig Tokens + Komponenten statt historischer Override-Ketten | noch offen |
| Mobile Bottom-Sheets können Karte und Navigation verdecken | Touch-, Focus-, Keyboard-, 320px- und Sheet-Abnahme | automatisierte & echte QA erforderlich |
| Mehrere Ladeindikatoren ohne Abbruch/Timeout | globale Stale-/Error-/Retry-Konvention | teilweise behoben |

### Priorität P2 — Architektur / spätere Versionen
- Das rund 105 KB große `app/page.tsx` in Navigation, Kartensteuerung,
  Standort, Zugradar und Zustandslogik zerlegen; Verhalten dabei mit Integrationstests einfrieren.
- Die rund 42 KB umfassende `app/live-board.tsx` in Quelle, Filter,
  Abfahrtsdarstellung und Detailabruf aufteilen.
- CSS-Versionsdateien (`v48` bis `v56`) konsolidieren, erst nach
  tatsächlichem Vorher-/Nachher-Screenshotvergleich.
- API-Lasttests: Bahnhof mit hunderten Fahrten, Störungen, schlechte Verbindung,
  mehrere gleichzeitige Clients; Detail-Fetches drosseln, Cache-Laufzeiten prüfen.
- Dynamische reale Zugposition nur mit ausdrücklich bereitgestellten
  VehiclePosition-Daten. Gegenwärtige km/h und Position sind **Modellwerte**.
- Android TWA/Play-Store-Wrapper auf tatsächliche Edge-to-Edge-
  Insets und native Status-/Navigationsleisten prüfen; CSS macht native Flächen nicht nutzbar.
- Datenschutz, Rechte an Transitous, DB und OpenStreetMap sowie kommerzielle
  Nutzung getrennt prüfen, bevor Werbung/Abonnement freigeschaltet wird.

## Pflichtmatrix für QA
Browser: 320×568, 360×800, 390×844, 430×932, 768×1024,
1024×768, 1440×900 und 1920×1080, jeweils Hell/Dunkel soweit verfügbar.
Handy: reale Android-PWA aus Chrome plus ggf. signierte TWA separat.
Szenarien: Offline nach Appstart; langsame Suche; Navigation zurück; Karte/Sheet
öffnen, vergrößern, schließen; Bildschirmrotation; Tastatur offen; Touch auf
Zugmarker; geplante/aktuelle Abfahrt; +1, +4, +5, +11, +30 Minuten;
Gleiswechsel; Ausfall; fehlerhafte und veraltete Antwort; DST am 25.10.2026;
Übergang über Mitternacht; Speichern ohne LocalStorage; große Schrift;
eingeschränkte Bewegung; fokussierbare Schaltflächen.

### Erfolgsbedingungen
- `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm audit:realtime`,
  `pnpm audit:v56`, `pnpm audit:radar`, `pnpm audit:ui`,
  `pnpm audit:map`, `pnpm build` und Chromium-Interaktionen grün.
- Kein 320px-Überlauf, keine verdeckte Schaltfläche, kein falscher
  Fahrplan-/Echtzeitstatus, keine Veröffentlichung bei fehlender PWA-Installation.
- Ausfall/Fehler darf niemals als "pünktlich" ausgegeben werden.
- Erst nach realer Geräte-QA und geklärter Quellenlizenz Merge und Render-Deployment.

## Forschungsgrundlagen
- GTFS-Realtime TripUpdates:
  https://gtfs.org/documentation/realtime/feed-entities/trip-updates/
- GTFS-Realtime Best Practices:
  https://gtfs.org/documentation/realtime/realtime-best-practices/
- W3C WCAG 2.2 Target Size Minimum:
  https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- Nielsen Norman Group Bottom Sheets:
  https://www.nngroup.com/articles/bottom-sheet/

Keine Behauptung, mit einem einzelnen PR sämtliche App-Bugs gefunden zu haben.
