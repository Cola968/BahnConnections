# BahnConnections V60 — Product Shift / Release-Plan

**Status:** Entwicklungs-Branch, noch **nicht** veröffentlicht. Ausgangspunkt V58-PR #72, inkl. bisheriger Karten- und Mobile-Fixes. Ein grüner Wrangler-Dry-Run ist **kein** Live-Deployment.

## Leitbild

Eine alltagstaugliche Fahrgast-App aus einem Guss: **DB-Navigator**-Nutzwert (Reisebegleitung, Alternativen, Benachrichtigungen), **Flightradar24**-Klarheit (Karte, Verfolgung, Herkunft/Stand der Daten), **Apple-HIG**-Bewegungsregeln (kurz, präzise, abschaltbar). Kein Fake-GPS, keine ungesicherten Aussagen wie „garantierte Ankunft“, keine kostenpflichtigen Push- oder Backend-Zusagen ohne Infrastruktur.

Referenzen:
- https://www.bahn.de/service/fahrplaene/digitale-reisebegleitung
- https://www.flightradar24.com/blog/inside-flightradar24/introducing-the-all-new-flightradar24-mobile-app/
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/accessibility

## 20 echte Produktfunktionen für V60

Status = **geplant**, bis UI, Datenfluss, Tests und responsive QA wirklich fertig sind. Ein Grundgerüst allein zählt nicht als ausgelieferte Funktion.

| Nr. | Funktionspaket | Abnahmekriterium |
|---|---|---|
| 01 | **Schnellaktionen & Tastaturhilfe** | Hilfe-Dialog mit eindeutigem Tastaturbeleg; keine Kollision mit Cmd/Ctrl/Alt oder Eingabefeldern; auf Handy erreichbar |
| 02 | **Persönlicher Startbildschirm** | Startbahnhof, nächste Züge und Pendelstrecken ohne erneute Konfiguration, lokal datensparsam |
| 03 | **Reise-Cockpit** | Über alle Reiseabschnitte: aktueller Abschnitt, Soll/Ist, Halte, Umstieg und Datenherkunft |
| 04 | **Umstiegsrisiko-Ampel** | Rest-Umsteigezeit vs. Puffer auf Basis gekennzeichneter Fahrplan-/Ist-Zeiten |
| 05 | **Alternativen-Retter** | Bei Ausfall/Verspätung alternative Live-Verbindungen sichtbar; kein falsches Ticket-Gültigkeitsversprechen |
| 06 | **Gleisänderungs-Feed** | Altes/neues Gleis mit Stand, Änderung nur bei bestätigter Quelle |
| 07 | **Verspätungs-Timeline** | Zeitliche Entwicklung in aktiver Session, nur wenn tatsächlich beobachtet; keine erfundene Historie |
| 08 | **Radar-Fortschritt** | Fortschrittsanzeige je Fahrt, sichere ETA/ETD und Modell-/GPS-Hinweis |
| 09 | **Radar-Wiedergabe (Sitzung)** | Lokale, gekennzeichnete Aufzeichnung während aktiver Sitzung; keine erfundene Datenhistorie |
| 10 | **Bahnhof vergleichen** | Zwei Haltepunkte nebeneinander mit Abfahrten und Quellenstatus |
| 11 | **Abfahrtslücken-Finder** | Nächste Verbindung einer gewählten Kategorie mit prüfbarem Zeitfenster |
| 12 | **Meine Linien** | Favoritenlinien mit lokalen Filter- und Alert-Ansichten ohne Tracking durch Dritte |
| 13 | **Störungszentrale** | Meldungen nach Auswirkungen, Bahnhof, Strecke, Richtung und Aktualität sortieren |
| 14 | **Barrierefrei umsteigen** | Aufzüge/Wege ausschließlich aus bestätigter Infrastrukturquelle; sonst Daten fehlen anzeigen |
| 15 | **Stations-Kurzkarte** | Direktinfo, ankommende/nächste Abfahrten, Gleis und Favorit in einem kompakten Sheet |
| 16 | **Reise teilen 2.0** | Lesbarer Textlink samt Soll-/Ist-Hinweis und Quelle; keine privaten Präferenzen im Link |
| 17 | **Suchen-Verlauf** | Letzte Stationen/Gruppen optional und lokal löschbar; keine Übertragung an Server |
| 18 | **Offline-Kompass** | Letzter verifizierter Datenstand, Cache-Alter und manueller Aktualisierungsweg |
| 19 | **Einhandmodus** | Relevante Aktionen im Daumenbereich, ohne Scroll-/Kartenkonflikt und ohne Doppelsteuerung |
| 20 | **Dichte- und Animationseinstellungen** | Kompakt/komfortabel + reduzierte Bewegung systemweit einschließlich PWA/Web und Kartenbedienung |

## Querschnittliche Bugfix-Matrix (P0 vor Features)

- **P0:** 320/360/390/430 px: ICE-/Liniennummer, Ziel und Zeiten dürfen weder überlappen noch abgeschnitten werden; größere Textskalierung und Darkmode einbeziehen.
- **P0:** Mobile Station-Sheet: kein leeres 100-px-Panel, Buttons funktionieren, Hit-Targets >= 44px, kein Attribution-Overlay.
- **P0:** Keine Datenlücken durch erfundene Schienen schließen. Gestrichelte Übergänge sind als Schätzungen gekennzeichnet.
- **P0:** Minuten-/Tageswechsel bei Soll/Ist/Zeitzonen, fehlende Echtzeit und rückdatierte Einträge korrekt kennzeichnen.
- **P0:** Source-/Network-Fehler, stale requests, Abort und Cache vermeiden inkonsistente UI.
- **P0:** Render vollständig entfernt — auch aus dem V60-Branch, Worker/Sites getrennt.
- **P1:** Fokus/Escape/Tastaturkürzel/ContentEditable, sichere Dialognavigation, Touch-Targets, horizontale Überläufe.
- **P1:** Animate only transform/opacity, no layout thrash, no flashing pulses, hardware- und battery-sparend; `prefers-reduced-motion`, Einstellung und Kontrast respektieren.
- **P1:** Responsive Live-Inspector, Card-Animationen, Ladeindikatoren, Fokuszustände, Dialoge, Maps und Footer auf Mobile/Desktop prüfen.
- **P1:** Datenschutz, API-Lizenz (Transitous) und Abos vor kommerziellem Play-Store-Launch klären.

## V60-Release-Gates

1. **Keine Merge-/Veröffentlichungsautomatik** solange V58-Regressionen offen oder die 20 Features unvollständig sind.
2. `pnpm audit:v60`, `pnpm audit:v58` bzw. `pnpm audit:railglass`, `pnpm audit:layout`, `pnpm audit:mobile`, `pnpm audit:map`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, Cloudflare Wrangler Dry-Run müssen grün sein.
3. Playwright/Chromium auf 320/360/390/430/768/1024/1440, Hell/Dunkel, 200% Text und System „Reduce Motion“; reale API-Fehlerzustände.
4. Mindestens ein echtes Android-Gerät: langsames Netz, Flugmodus, Hintergrund/Rückkehr, Dialoge, Tastatur, Sheet-Swipes, Map-Follow und PWA-Update.
5. Öffentliche Versionsangabe erst auf **V60** umstellen, wenn ein freigabefähiger Release-Kandidat mit den versprochenen Funktionen vorliegt. Vorher nicht V60 „veröffentlicht“ behaupten.

## Implementationsprotokoll

- [x] V60-Projektbranch isoliert angelegt aus V58 inkl. dortiger Mobile-Fixes.
- [ ] Funktionspakete 01–20 einzeln implementieren und abnehmen.
- [ ] Code-Review und CI-Befunde vollständig bearbeiten.
- [ ] Externe Daten-/Lizenzfreigaben und finalen Deploy-Nachweis dokumentieren.
