# V33.3 · Ringlinien-Hardening

- Ringlinien-Logik stellt die erkannten Wiederholungen des Referenzbahnhofs explizit für Diagnostik und Tests bereit.
- Der API-Smoke-Test prüft das Kürzen einer wiederholten Ringfahrt jetzt mit einem deterministischen Regressionsfall.
- Live-S42-Prüfungen unterscheiden zwischen einer mehrfach enthaltenen Ringrunde und einem von Transitous bereits begrenzten Fahrtabschnitt. Ein bereits begrenzter Abschnitt wird nicht künstlich verlängert oder als Fehler gewertet.
- PWA-Version und Cache auf V33.3 angehoben.

# V33.2 · In-App Updates

- Installierte BahnConnections-PWAs prüfen regelmäßig, ob eine neuere veröffentlichte Version verfügbar ist.
- Bei einem Update erscheint eine kompakte In-App-Benachrichtigung mit „Jetzt aktualisieren“ und einem Link zu „Download / Installation“.
- `/version.json` stellt die veröffentlichte Versionsnummer und den Installationspfad bereit.
- Service-Worker-Updates warten auf die Entscheidung des Nutzers statt sofort ungefragt per `skipWaiting()` zu übernehmen.
- Die Installationsseite kann gezielt über `/install?update=V…` geöffnet werden und versucht, einen wartenden Service Worker zu laden und zu aktivieren.
- PWA-Cache auf V33.2 angehoben.

# V33.1 · Polish & Accessibility

- Bahnhofsfahrtverläufe unterscheiden jetzt „Echtzeit an allen Halten“, „Echtzeit teilweise verfügbar“ und reine Fahrplandaten.
- Zeit- und Gleisänderungen verwenden Screenreader-Text statt einer künstlichen Bildrolle; die sichtbare kompakte Darstellung bleibt unverändert.
- UI-Audit prüft die konservative Realtime-Zusammenfassung und die neue Accessibility-Semantik.
- PWA-Cache auf V33.1 angehoben, damit installierte Apps die neue Oberfläche zuverlässig übernehmen.

# V33 · Realtime & Reiseinformation

Gemeinsame Soll-/Ist-Zeiten und Gleisänderungen in Journey, Tafel, Alternativen und Tooltips. Konservative Echtzeitsemantik, verständliche Ausfälle, Desktop-Suche und Journey als getrennte Modi, zurückhaltende allgemeine Kartenmarker. Responsive Status-Fixtures und Qualitätsworkflow ergänzt. Siehe `docs/V33-QA.md` für tatsächlich ausgeführte und ausstehende Prüfungen.

# Updates

## V31 · Polaris

### PC
- Standort und Fußweg als eigenständige Kartenebenen, ohne die bestehende Dreispalten-Ansicht umzubauen.

### Mobile
- Explizit aktivierbarer Live-Standort mit Genauigkeitskreis, Zentrieren und Ausschalten; keine Speicherung der Position.
- Fußweg vom aktuellen Standort zum gewählten Bahnhof oder zum nächstgelegenen Personenbahnhof. Das Bottom-Sheet wird für die Wegkarte minimiert, Such- und Fahrtdaten bleiben erhalten.
- Kompakte, touchgerechte Standortaktionen und eine aufklappbare Wegbeschreibung; Fehler bei fehlender Freigabe oder nicht verfügbarer Route werden sichtbar.

### Daten & Grenzen
- Fußwege kommen als echte Straßengeometrie mit Dauer, Strecke und – wenn geliefert – Abbiegehinweisen aus Transitous/MOTIS und OpenStreetMap. Ohne Geometrie wird keine gerade Ersatzlinie gezeichnet.
- Für die Fußwegabfrage werden Start- und Zielkoordinaten an Transitous übermittelt. Die Standortfreigabe erfolgt nur nach Antippen und wird nicht lokal gespeichert.
- Die Fußwegroute ist eine Planung, keine Live-Baustellen- oder Sicherheitsprüfung. Bei Bewegung kann sie manuell neu berechnet werden.
- PWA-Cache auf V31 erhöht.

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

