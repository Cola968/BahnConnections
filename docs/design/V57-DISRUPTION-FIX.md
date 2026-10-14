# Störungsdaten: Korrektur nach V57.0

## Reproduzierter Fehler

MOTIS v6 liefert `headerText` und `descriptionText` als Zeichenketten. Haltestellenmeldungen liegen unter `stopTimes[].place.alerts`. V57.0 erwartete Übersetzungsobjekte und las überwiegend `stopTimes[].alerts`. Dadurch wurden vorhandene Störungen verworfen. Auch Tafel- und Reisehinweise waren betroffen.

Ein öffentlicher Transitous-Abruf am 13.10.2026 lieferte für Waterloo 100 Zeilen mit `place.alerts`, aber keine Meldungen auf der bisher ausgewerteten Ebene. Der Regressionstest fiel vor der Korrektur mit „0 statt 1 Meldung“ durch.

## Korrekturen

- Gemeinsamer robuster Parser für aktuelle Zeichenketten und ältere Übersetzungsobjekte; deutsche Übersetzung bevorzugen.
- Störungsansicht und Abfahrtstafel lesen Meldungen auf Fahrt- und Haltestellenebene. Reiseplanung berücksichtigt auch Hinweise an Start, Ziel und Zwischenhalten; identische Hinweise erscheinen nur einmal.
- Deutsche Bahnhofsmeldungen werden durch VBB transport.rest im Berliner/Brandenburger Gebiet beziehungsweise DB transport.rest ergänzt. Stationszuordnung verlangt passenden Namen und Koordinaten; fremde Anbieter-Trip-IDs gelangen nicht ins Radar.
- Hinweise ohne Betriebswirkung, Busfahrten, Betreiber-/Auslastungshinweise und abgelaufene Zusatzmeldungen werden ausgeschlossen. Quellenfehler bleiben sichtbar; erreichbare Quellen bleiben nutzbar.
- Allgemeine Aufzugshinweise werden bei widersprüchlichen Produktzuordnungen als Bahnhofshinweise erhalten, ohne alle angehängten Linien als gestört zu markieren.
- „Fahrt fällt aus“ und englische Ausfallmeldungen werden unter Ausfälle einsortiert. Eine Aussage über störungsfreie andere Linien unterdrückt keine tatsächliche Störung im selben Text.

## Nachweis und Grenzen

Die lokale API lieferte am Berliner Hbf echte deutsche Meldungen: „Aufzug außer Betrieb“ sowie einen Teilausfall von ICE 873 zwischen Hamburg-Altona und Hamburg Hbf. Die Quellenmeldung zum Teilausfall beschreibt nicht automatisch einen Ausfall am ausgewählten Bahnhof; der vollständige Beschreibungstext bleibt verfügbar.

`scripts/disruption-provider-audit.mjs` prüft Datenformat, Deduplizierung, beschädigte Daten, deutsche Übersetzungen, wirkungslose Meldungen, abgelaufene Zusatzmeldungen, reine Bahnhofshinweise und Ausfallkategorisierung. Die Browser-Fixtures verwenden jetzt das reale v6-Format.

Weiterhin keine Garantie einer vollständigen Netzübersicht: Transitous-Abfahrten/Ankünfte sind auf jeweils 175 Ergebnisse begrenzt; die ergänzenden Abfragen umfassen jeweils bis zu 175 Ergebnisse in 120 Minuten. Deutsche Zusatzanbieter können ausfallen oder selbst Meldungen weglassen. Die Tests ersetzen keine Prüfung auf echten Mobilgeräten.

API-Verträge: [MOTIS OpenAPI](https://github.com/motis-project/motis/blob/master/openapi.yaml), [VBB REST](https://github.com/derhuerst/vbb-rest), [HAFAS Abfahrten und Hinweise](https://github.com/public-transport/hafas-client/blob/main/docs/departures.md).
