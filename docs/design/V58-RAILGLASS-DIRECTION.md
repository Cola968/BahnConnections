# BahnConnections V58 — Railglass, eine nutzbare Fahrgastoberfläche

## Brief (aus bestehendem Produkt selbst abgeleitet)
BahnConnections ist ein aktuelles Fahrgastwerkzeug für Menschen, die in zehn Sekunden wissen möchten: **Welcher Zug fährt, wann kommt er wirklich, und was muss ich jetzt tun?** Für neugierige Nutzer bleibt die Karte und das Nachverfolgen einzelner Züge ein echter zweiter Schwerpunkt.

**Unverändert behalten:** Bahnhofssuche, Abfahrten/Ankünfte, Soll- und Prognosezeiten, Ausfälle/Gleise, Linien, Bahnhofsstörungen, Reiseplanung, Reise- und Streckenfavoriten, Kartenansicht, Bahnhofspins, geschätzter Zugradar, Fahrtverlauf, Zugverfolgung, Barrierefreiheit, Kartenfilter, Profil/Einstellungen, Datenqualität/Quellen, Hell/Dunkel, mobiles Bottom Sheet. Keine künstliche Ticketbuchung oder nie existierende GPS-Positionen erfinden.

**Verlieren:** doppelte bzw. rein dekorative Glasschichten über Datenkarten, unruhige Farbverläufe, mikroskopische Labels, versteckte Schnellfilter hinter tiefen Menüs, Hardcoding der Android-Browserleistenfarbe.

## Drei Designrichtungen aus der hochgeladenen App-Designer-Methode

1. **Railglass (ausgewählt):** Physisches Instrument: mattes Eisen, kühles satiniertes Glas, ruhige weiße/anthrazitfarbene Flächen, kräftige timetable-Typografie. Glas ausschließlich als Navigation/Overlays, Inhalte überwiegend flach. Muted Red für CTA, Statusfarben ausschließlich für Betriebszustände.
2. **Anzeigetafel Editorial (verworfen):** Gedrucktes Kursbuch, starke Tabellenführung, viel Text und fast kein Glas. Ausgesprochen lesbar, aber zu statisch für die interaktive Live-Karte.
3. **Radar Night Instrument (verworfen):** Dunkles Cockpit mit graphischen Punkten und feinen Radarlinien. Funktional fürs Tracking, aber nicht geeignet als alleinige Tag-/Pendleroberfläche.

## Designsystem
- **Farben light:** Papier `#f9fbfd`, Grund `#eaf1f5`, Schrift `#182a34`, Sekundärschrift `#526675`, Aktionsrot `#c32b40`, Informationsakzent `#14657a`.
- **Farben dark:** Grund `#101b24`, Papier `#15222c`, erhöhte Fläche `#20313d`, Text `#f2f6f9`, Muted `#b1c2cb`, Aktion `#ff8998`.
- **Zeiten und Zugnummern:** tabellarische Ziffern, relative Hierarchie. Echte Prognose nur bei tatsächlichen Anbieterangaben; Quelle/Kennzeichnung bleiben auffindbar.
- **Typografie:** Systemschrift als bewusstes natives Element statt Google-Webfont, ruhige kleine Labels mindestens circa 12px, Zeithervorhebung 18–26px.
- **Abstände:** 4 / 8 / 12 / 16 / 24 / 32. Touch 44px Minimum, Navigation 52px. Data Row statt Kartenstapel.
- **Material:** transluzentes oberes und unteres Chrome/Bottom-Sheet, nicht eine frei gewählte Glas-Schicht über jeder Tafelzeile. Supports `prefers-reduced-transparency`, `prefers-reduced-motion`, Forced Colors und App-Schriftoptionen.
- **Bewegung:** ruhiger Sheet-Übergang, keine endlosen Pulsanimationen für „live“, kein sinnloses Springen von Zugmarkern.
- **Android:** CSS Safe Areas plus dynamisches `theme-color`; Render-Aufwachseite löst dieses Design nicht – eigentlicher Play-Host benötigt Cloudflare/always-on Hosting.

## Jetzt implementierte Interaktionen
1. **DB-Navigator-inspiriert:** Ein-Tipp-Filter `upcoming` (60 Minuten), `delayed`, `canceled`, `all` (240 Minuten) direkt an der Bahnhofstafel. Aktiv setzt jeweils andere benutzerdefinierte Filter bewusst zurück; das ist im UI sichtbar und durch Tests abgesichert. Erweiterte Filter bleiben in der gewohnten Filterseite.
2. **FR24-inspiriert:** Karte erhält einen kleinen datentreuen Status-Chip. Text unterscheidet „Züge im Radar“, „Fahrplanposition“, „veraltet“ und „nicht erreichbar“. Tippen öffnet **Daten & Methodik**. Keine erfundenen Koordinaten/Speed/GPS.
3. **Liquid-Glass-Relaunch:** Durchgehende Chrome-/Nav-/Sheet-/Board-/Train-Inspector-Gestaltung und systemkonformer Darkmode. Die Karte selbst bleibt interaktiv; die Datenfläche ist bewusst nicht von Dekoration bedeckt.
4. **PWA-Systemleisten:** Browser-Chrome passt sich dem aktiv gewählten Theme an. Die schlechte Render-Free-Ladeseite muss weiterhin durch Deploymentwechsel beseitigt werden.

## Qualitätstore für Go/No-Go
- TypeScript, ESLint, `pnpm audit:railglass`, vorhandene Board-/Realtime-/Disruption-Audits, Production-Build, Cloudflare-Dry-Run und Render-/Node-Build.
- Browser: 320/390px, Android-like Viewport, 1024+ Desktop, Schriften, Hell/Dunkel, Board-Schnellfilter und Rückstellung, Filter-Dialog, Scroll-/Click-Overlap, Kartenstatus und mobile Sheets.
- Live-Datenfehler, Netzwerk aus, stale feed, Source warning, leere Tafel, Fokus/Keyboard/Reduced Motion, App-Cache-Update und echte Android-Geräteabnahme.
- Vor Veröffentlichung: Nutzungsbedingungen Datenquellen / offene Lizenz (#67) sowie Play-Host / echte Cloudflare-URL. Kein automatisches Merge oder Deployment aus diesem Draft.

## Quellen
- DB Navigator: https://www.bahn.de/service/mobile/db-navigator
- Flightradar24: https://www.flightradar24.com/blog/product-features/
- Eingereichte `app-designer (1).zip`: Struktur, Farbe, Layout, Typografie, Slop-Kriterien und Kontrast als Design-Referenz **ausgewertet**, nicht als ausführbare Cloud-App übernommen.
