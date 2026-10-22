# P0-Prüfung vom 17. Oktober 2026

Arbeitsbranch: `feat/v60-next-generation-20261014`, Draft-PR #74.
Die Programmziele 50 Fehlerkorrekturen / 25 Funktionen / 10 Verbesserungen sind
Ziele, keine bereits gelieferten Ergebnisse. Der maschinenlesbare Stand steht
in `V61-PROGRESS.json`. Dieser Prüfpunkt führt drei neu reproduzierte Fehler;
frühere Änderungen werden nicht nachträglich ungeprüft mitgezählt.

## Korrekturen

- `BC-001`, `9ec4d09`: OFF-Antworten konnten trotz Gesamtstatus „schedule“ ein
  `realTime:true` je Zeile weitergeben. Normalisierung im gemeinsamen Fallback
  schützt sowohl Tafel als auch Radar; Sollzeiten/-gleise bleiben maßgeblich.
- `BC-002`, `851a58a`: Nach primärem 503 verdeckte dieser Fehler eine folgende
  429-Sperre. Die Sperre erreicht jetzt den bestehenden API-Pfad mit HTTP 429
  und `Retry-After: 60`.
- `BC-003`, `851a58a`: Abbruch des Primärabrufs startete dennoch OFF.
  Regression vor Änderung: zwei statt eines Aufrufs. Caller-Abbrüche werden
  weitergereicht; ein Anbieter-Timeout darf weiterhin per OFF erholt werden.

`node scripts/board-fallback-audit.mjs` prüft die gemeinsame Logik.
`node scripts/board-api-audit.mjs` ruft die echte GET-Route mit ausschließlich
synthetischen Fehlerantworten auf: JSON und NDJSON, 429/Retry-After, Abbruch,
Eingabevalidierung. Der API-Test scheitert gegen die ursprüngliche
Fallback-Implementierung an `true !== false` und besteht mit der Korrektur.
Diese Tests behaupten keine aktuelle Anbieterfahrt und keine reale Position.

Lokal: 30 vorhandene/erweiterte Quality-Audits bestanden, zusätzlich der neue
API-Test, TypeScript und Produktionsbuild. ESLint: null Fehler, zwei bestehende
img-Hinweise. Build: weiterhin Chunk-Hinweis >500 kB und vinext-Hinweise zur
statischen Routenerkennung. Keine gemessene Performanceverbesserung verbuchen.

## Reale Anbieterbeobachtung zu #77 und #78

Ausführen: `node scripts/station-complex-provider-audit.mjs`.
Die Rohantworten und der Bericht werden in `work/station-complex-provider/`
gespeichert. Jeder Fehler ergibt einen Exitcode ungleich null; der Bericht
bleibt erhalten. [Gesicherter Befund](evidence/2026-10-17-station-provider.json)
enthält IDs, Eltern-IDs, Roh-/Validierungs-/Deduplizierungszahlen und Hashes der
Rohbelege. Die Ergebnisse sind zeitgebundene Beobachtungen.

| Bahnhof | Ankunftszeilen | Abfahrtszeilen | Radar-Fahrt-IDs |
|---|---:|---:|---:|
| Berlin Hbf | 148 | 149 | 179 |
| Hamburg Hbf | 190 | 187 | 204 |
| München Hbf | 261 | 262 | 256 |
| Leipzig Hbf | 118 | 121 | 131 |
| Berlin Hermannstraße | 50 | 50 | 66 |
| Berlin Gesundbrunnen | 92 | 91 | 100 |
| Erdeborn | nicht aufgelöst | nicht aufgelöst | nicht ermittelt |

Abfrage: 60-Minuten-Fenster, `n=50` als Mindestzahl. Bei dünnem Angebot kann die
Antwort über das Fenster hinausreichen. Kein Wert dieser Tabelle ist eine
Vollständigkeitsquote oder eine Zahl tatsächlich gezeichneter Kartenmarker.

Die [offizielle MOTIS-Spezifikation](https://github.com/motis-project/motis/blob/master/openapi.yaml)
beschreibt für `/api/v6/stoptimes` standardmäßig Eltern-, Kind- und äquivalente
Halte. Die Berlin-Hbf-Antwort enthält entsprechend mehrere Bahnsteige aus
DELFI/VBB. Eine einzelne aufgelöste ID beweist deshalb weder einen fehlenden
Bahnhofskomplex noch dessen vollständige Abdeckung. Kein Radius-Merging auf
Verdacht eingebaut. Cross-Feed-Dubletten und gerenderte UI-Zahlen sind noch
separat zu prüfen; `browserVisibleRows` bleibt im Bericht ausdrücklich `null`.

Erdeborn: Textsuche HTTP 200 mit leerer Liste; Rückwärtssuche liefert den
geografisch passenden Halt `de-DELFI_de:15087:8011496` ausschließlich mit BUS.
`/stop` führt dort eine S7 von Abellio als BUS/routeType 3; `/stoptimes` mit
Bahnmodi und OFF liefert HTTP 200 ohne Zeilen. Das ist ein Quellenbefund,
kein Beleg für fehlende reale Bahnleistungen. Die Schutzprüfung gegen
Bus-Ersatztreffer bleibt bestehen. Keine Zugfahrt oder Position ergänzen.

#78 bleibt offen: Der Datenlayer besitzt eine stationsweite Fahrtenliste,
die Radaroberfläche filtert ihre Kartenmarker weiter aus räumlich geladenen
Fahrten. Die von Kartenpositionen unabhängige Liste ist dort noch anzubinden,
inklusive On-demand-Details, Fehler-/Offlinezuständen und Mobiltests.

## Grenzen und nächste Priorität

Zuerst den Anbieterbefund für den ländlichen Halt klären und weitere echte
Haltehierarchien gegen gerenderte Tafeln prüfen. Danach #78 mit unabhängiger
Radar-Fahrtenliste bearbeiten. Browser-CI ist von physischer Android/PWA-Abnahme
zu trennen. #77, #78, #66 und #67 bleiben offen. PR bleibt Draft; keine neue
PR, kein Merge, Deployment, Kauf oder Lizenzbeschluss.
