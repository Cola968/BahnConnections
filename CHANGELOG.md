# Updates

## V30 · Asteria

### PC
- Eigene Dreispalten-Ansicht ab 1100 px: dauerhafter Planer, Karte und Ergebnisse/Bahnhof.
- Blau-weiße Navigation, getrennte PC-Komponenten und Styles.
- Direkte Kartenansicht und Deutschland-Ausschnitt.

### Mobile
- Bestehendes Bottom-Sheet beibehalten; Datum und Suchaktion früher erreichbar.
- Straßenbahnfilter in Planer, Tafel und Linienübersicht.

### Fahrplandaten
- Straßenbahnen werden als eigene Kategorie verarbeitet: Transitous `TRAM` und DB `tram`.
- Anbieterfarben, Ziele, Echtzeitstatus, Halte und Geometrien werden über die bestehenden Fahrtquellen übernommen.
- Keine Garantie vollständiger Echtzeitabdeckung: Datenlücken bleiben gekennzeichnet.
- Modus-Schnittstelle: https://github.com/motis-project/motis/blob/master/openapi.yaml

### Prüfungen
- `node scripts/tram-regression.cjs`: ausgeführte Normalisierung, Farben, Ziele und Linien ohne nächste Fahrt.
- `node scripts/track-gap-test.mjs`: getrennte Gleisgeometrien.
- `pnpm audit:mobile -- <URL> <Ausgabeordner>`: Touch-Flows und Desktop-Spalten; Reise-Fixture, kein Nachweis aktueller Fahrplanrichtigkeit.

## V29
- Zielspalte der kompakten Tafel korrigiert.
- Künstliche Gleis-Connectoren nicht mehr gezeichnet.
- Doppelte Kartenanpassungen beim mobilen Ziehen reduziert.
