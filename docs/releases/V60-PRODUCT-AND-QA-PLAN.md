# BahnConnections V60 — Product Shift / Release-Plan

**Status:** Entwicklungs-Branch, noch **nicht** veröffentlicht. Ausgangspunkt V58-PR #72, inkl. bisheriger Karten- und Mobile-Fixes. Ein grüner Wrangler-Dry-Run ist **kein** Live-Deployment.

## Leitbild

Eine alltagstaugliche Fahrgast-App aus einem Guss: **DB-Navigator**-Nutzwert (Reisebegleitung, Alternativen, Benachrichtigungen), **Flightradar24**-Klarheit (Karte, Verfolgung, Herkunft/Stand der Daten), **Apple-HIG**-Bewegungsregeln (kurz, präzise, abschaltbar). Kein Fake-GPS, keine ungesicherten Aussagen wie „garantierte Ankunft“, keine kostenpflichtigen Push- oder Backend-Zusagen ohne Infrastruktur.

Referenzen:
- https://www.bahn.de/service/fahrplaene/digitale-reisebegleitung
- https://www.flightradar24.com/blog/inside-flightradar24/introducing-the-all-new-flightradar24-mobile-app/
- https://developer.apple.com/design/human-interface-guidelines/motion
- https://developer.apple.com/design/human-interface-guidelines/accessibility

## 20 überprüfbare Produktideen für die Entwicklungs-Roadmap

Status = **geplant**, bis UI, Datenfluss, Tests und responsive QA wirklich fertig sind. Diese Tabelle ist **keine Zusage, alle 20 in V60 auszuliefern**. Ein Grundgerüst allein zählt nicht als ausgelieferte Funktion.

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

1. **Keine Merge-/Veröffentlichungsautomatik** solange V58-Regressionen, Fahrplandaten-/Android-Gates oder die verbindlich für V60 ausgewählten Kernfunktionen unvollständig sind. Der Ideen-Backlog ist kein Release-Blocker.
2. `pnpm audit:v60`, `pnpm audit:v58` bzw. `pnpm audit:railglass`, `pnpm audit:layout`, `pnpm audit:mobile`, `pnpm audit:map`, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, Cloudflare Wrangler Dry-Run müssen grün sein.
3. Playwright/Chromium auf 320/360/390/430/768/1024/1440, Hell/Dunkel, 200% Text und System „Reduce Motion“; reale API-Fehlerzustände.
4. Mindestens ein echtes Android-Gerät: langsames Netz, Flugmodus, Hintergrund/Rückkehr, Dialoge, Tastatur, Sheet-Swipes, Map-Follow und PWA-Update.
5. Öffentliche Versionsangabe erst auf **V60** umstellen, wenn ein freigabefähiger Release-Kandidat mit den versprochenen Funktionen vorliegt. Vorher nicht V60 „veröffentlicht“ behaupten.

## Implementationsprotokoll

- [x] V60-Projektbranch isoliert angelegt aus V58 inkl. dortiger Mobile-Fixes.
- [ ] Verbindlich ausgewählte V60-Kernfunktionen einzeln implementieren und abnehmen; alle übrigen Pakete bleiben ungeplante Kandidaten.
- [ ] Code-Review und CI-Befunde vollständig bearbeiten.
- [ ] Externe Daten-/Lizenzfreigaben und finalen Deploy-Nachweis dokumentieren.

## Iteration 3 – Fahrtverlauf und Zeitzustände (14. Oktober 2026)

- [x] Bugfix: Ein Bahnhof wird nicht mehr als abgefahren behandelt, solange das Ende des gemeldeten Halts erst in der Zukunft liegt; die Abfahrt statt allein die Ankunft bestimmt den Wechsel des nächsten Halts.
- [x] Ungültige Echtzeit-Zeitstrings werden auf gültige Sollzeiten zurückgeführt. Ein ausschließlich fahrplanbasierter Aufenthalt erhält keine Echtzeit-Kennzeichnung.
- [x] Im Zug-Inspector erscheint während eines zeitlich gemeldeten Aufenthalts eine Abfahrt in Minuten. Die Bezeichnung lautet bewusst 'laut Fahrplan' bzw. 'laut Prognose', nicht 'Zug steht am Gleis'.
- [x] Bei frischem Fahrtverlauf können früher liegende Halte über 'Ab jetzt' ausgeblendet und über 'Alle zeigen' vollständig wiederhergestellt werden. Bei veralteten Daten darf der Filter keine Halte verstecken.
- [x] Quell-/Geräteuhr-Toleranz bis zehn Sekunden und zusätzliche deterministische Regressionen über `pnpm audit:v60-passenger`; als verpflichtender CI-Schritt eingebunden.
- [ ] Vollständige interaktive End-to-End- und Android-Geräteabnahme, neue Funktionen #02–#20 und Datenrechte weiterhin offen. Ein erfolgreiches CI allein gibt keine Releasefreigabe.

## V60 Erweiterung: Pakete 21–40

Die ursprünglichen 20 Ideen bleiben als Backlog bestehen. Die folgenden Ergänzungen sind kleinere, einzeln prüfbare Fahrgastfunktionen und **nicht automatisch V60-Releaseumfang**. **Umgesetzt** bedeutet im Entwicklungsbranch eingecheckt, nicht veröffentlicht. Alle Änderungen benötigen weiterhin CI und reale Browser-/Geräteabnahme.

| Nr. | Funktion | Stand | Abnahmekriterium |
|---|---|---|---|
| 21 | Zugfahrt als Momentaufnahme teilen | Implementiert, QA offen | Native Teilen-Funktion mit Kopieren-Fallback; vollständiger Verlauf nur aus echten Halten; bei veraltetem Stand keine Istzeiten als aktuell anzeigen |
| 22 | Netto-Umstiegspuffer nach Fußweg | Implementiert, QA offen | Negative Puffer korrekt; tatsächliche, zwischen Zugabschnitten gelieferte Fußwegdauer abziehen; keine Anschlussgarantie |
| 23 | Ausgefallene Alternativen ausblenden | Implementiert, QA offen | Vorbelegte Filteransicht mit manueller Rückstellung; Zug- und Halt-Ausfälle berücksichtigt |
| 24 | Alternativen nach Umstiegspuffer sortieren | Implementiert, QA offen | Kleinsten berechenbaren Puffer eines Reisewegs priorisieren, unbekannte Daten nicht als sicher ausweisen, Reihenfolge der Quelldaten nicht verändern |
| 25 | Keine erfundene Zugauslastung | Implementiert, QA offen | Tageszeit/Verkehrsmittel erzeugen keine scheinbar echten Besetzungswerte; nur bestätigte Auslastungsdaten erlauben konkrete Stufen |
| 26 | Zug-Alarm während geöffneter App | Geplant | Lokale Warnung bei tatsächlich aktualisiertem Gleis/Ausfall/Verspätung, ohne falsches Push-Versprechen |
| 27 | Veränderungsprotokoll der Zugankunft | Geplant | Nur seit Sitzungsbeginn beobachtete Werte mit Zeitstempel, keine rückwirkend erfundene Historie |
| 28 | Persönliche Mini-Abfahrtstafel | Geplant | Gemerkte Station mit nächsten Abfahrten und Datenalter; keine zusätzlichen unkontrollierten Poller |
| 29 | Pendleransicht mehrerer Haltestellen | Geplant | Maximal drei gespeicherte Stationen, Quellenfehler pro Station isoliert, Ladebudget begrenzt |
| 30 | Pendelstrecken sortierbar | Geplant | Lokal gespeicherte Favoriten umordnen, Tastaturbedienung, keine Serverpflicht |
| 31 | Schrift- und Tabellendichte pro Ansicht | Geplant | Große Schrift ohne Zeit-/Zugnummern-Überlagerung bei 320–430px und 200%-Zoom |
| 32 | Zwei reale Reisealternativen vergleichen | Geplant | Soll/Ist, Umstiege, Puffer, Fußweg und Quelle nebeneinander; fehlende Daten sichtbar |
| 33 | Gleiswechsel während einer aktiven Sitzung | Geplant | Vorher/nachher nur bei beobachteter Anbieteränderung anzeigen; keine historische Behauptung |
| 34 | Radar-Quellzeit direkt am Zug | Geplant | Zeitpunkt der zuletzt gesehenen Positionsgrundlage; Modellposition darf nie GPS genannt werden |
| 35 | Datenstatus direkt je Teilansicht | Geplant | Letzter erfolgreicher Abruf, veraltet/teilweise/fehlend ohne pauschalen Grünstatus |
| 36 | Quellenabdeckung je Zugkategorie | Geplant | Transparenter Vergleich von Fern-, Regional- und Nahverkehrsantworten; keine erfundene Vollständigkeit |
| 37 | Sitzungsspur einer verfolgten Fahrt | Geplant | Ausschließlich lokal tatsächlich berechnete Zeitpunkte, klar modelliert statt gemessener Strecke |
| 38 | Ressourcenschonender Radar | Geplant | Karte im Hintergrund pausiert, keine Timer-/Fetch-Duplikate, Batterieverhalten unter Mobilbedingungen testen |
| 39 | Direktsuche nach Zugnummer | Geplant | Nur eindeutige Treffer aus Anbieterfahrten und Uhrzeitfenstern, kein blindes Zeichnen eines Zuges |
| 40 | Verifizierbarer Offline-Datenstand | Geplant | Letzter Cache mit Zeitstempel und ausdrücklichem Offline-Hinweis; keine Aktualitätsbehauptung |

### Produktdisziplin

Die Pakete sind keine Sammlung von Design-Gimmicks. Neue Statusanzeigen brauchen eine reale Quelle, einen benannten Fehlerzustand und einen überprüfbaren Klickpfad. Offene API-Rechte, fehlende GPS-Positionen und fehlende echte Auslastungswerte dürfen nicht durch KI-Schätzungen kaschiert werden. Reihenfolge: P0-Bugfixes und Fachlogik → Browser- und Android-Tests → Nutzerfunktionen → Veröffentlichung.


## Produkt-Review: realistische V60-Freigabe statt 40-Funktionen-Wettlauf

**V60-Kernumfang (verbindliche Qualitätsziele):** korrekte Fahrplan-/Echtzeit-Zeiten, Gleis und Ausfälle; funktionierende Suche/Verbindungen; nachvollziehbare Umstiegszeiten und Alternativen; Bahnradar mit klar gekennzeichneter modellierter Position; mobile Navigation/Sheets, Lesbarkeit und Tastatur; stabile Lade-, Fehler- und Offline-Status; Pendlerfavoriten und datensparsames Teilen nur soweit stabil integriert.

**Nur bei bestätigter Datenquelle:** Gleiswechsel-Feed und echte Ereignisbenachrichtigungen (benötigen mehrere beobachtete Zustände), Barrierefreiheits-/Aufzugzustände, Zugauslastung, Zugnummern-Suche und historische Betriebstaten. Ohne Quelle ist das Feature **nicht auslieferbar** und wird nicht durch eine KI-Prognose simuliert.

**Nach V60 verschieben:** Bahnhof-zu-Bahnhof-Vergleiche (#10/#29), Radar-Wiedergabe (#09) und Sitzungsspuren (#37), Statistik zur Quellenabdeckung (#36), mehrere konkurrierende Datenstatusansichten (#35) sowie redundante Offline-Anzeigen (#18/#40). Viele dieser Funktionen haben geringe Alltagsnutzung oder überschneiden sich; sie sollen insbesondere nicht das mobile Hauptlayout belasten.

**Bewusst nicht als Feature-KPI verwenden:** Anzahl der Features, große Score-Zahlen ohne empirische Grundlage, Animationen nur zur Dekoration, zweite Bedienelemente für dieselbe Aktion. Ziel ist eine schnelle, klare Fahrgastansicht mit nachvollziehbaren Daten – nicht eine aufgeblähte Oberfläche.

**Fehlerkorrekturen im aktuellen PR:** Keine fiktive Null-Minuten-Gehzeit und kein unbelegter grüner Anschluss, keine als aktuell angezeigten Gleise bei abgelaufener Prognose, ungültige Anbieter-Zeitstrings sanitisiert, beim Teilen Echtzeitstand getrennt für Abfahrt und Ankunft. Die Tests dafür laufen unter `audit:v60-transfer`, `audit:v60-passenger` und `audit:v60-share`. Alle weiterhin durch mobile Browser-/Android- und Datenquellenprüfung abnehmen.
