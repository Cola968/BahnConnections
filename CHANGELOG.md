# V61.2 · Zusammengeführtes Webupdate

- Globale Routengültigkeitsprüfung und begrenzte Fahrtabfragen aus dem GitHub-Entwicklungsstand integriert.
- V61.1-Bahnhofshalte, sichtbare Panelinhalte und ruhige PWA-Updates erhalten.
- Kompaktere mobile Panels und überarbeitete Einstellungen.
- Die native Android-Benachrichtigung erfordert eine separat gebaute und getestete Android-App.

# V61.1 · Geöffnete Bahnhofsinhalte bleiben sichtbar

- Bahnhofshalte, Fahrtverläufe und Filter vergrößern das mobile Panel beim Öffnen.
- Die neuen Inhalte werden im vorhandenen Panel sichtbar gemacht; die Seite selbst scrollt nicht mit.
- In kurzen Querformat-Ansichten haben die neuen Bedienelemente Vorrang.
- Browser-Regressionen prüfen die halbhohe Ausgangsansicht und Fahrten am Listenende.
- Update-Hinweise verdecken keine Bedienelemente mehr; Updates stehen unter Mehr und Einstellungen · App bereit. Der bereits laufende Versionsstand löst keinen neuen Hinweis aus.
- Plus bleibt eine Vorschau ohne Zahlungen.

# V61.0 · Weitere Bahnhofshalte sichtbar

- Zusätzliche, durchsuchbare Bahnhofshalte-Liste direkt unter der Tafel: Ankünfte/Abfahrten, lokale Suche und schrittweises Nachladen der Anzeige.
- Die Liste hängt nicht vom Kartenausschnitt ab; ein fehlender Kartenmarker wird nicht durch erfundene GPS-Daten ersetzt.
- Datenstand, Teilantworten, Fehler und fehlende Echtzeitprognosen transparent dargestellt.
- Plus-Vorschau aus V60.2 mit klaren Symbolen und dezenter Bewegung übernommen; keine Kaufmöglichkeit.
- Regressionstests, PWA-Versionswechsel und getrennte V61-Release-Checkliste ergänzt.
- **Wichtig:** Der Code ist ein unveröffentlichter Release-Kandidat. Die offenen Datenrechte, die Abdeckung der Bahnhofskomplexe und die physische Android-PWA-Abnahme bleiben ausdrücklich offen.

# V60.2 · Eine gemeinsame Bahnhofstafel

- Tafel und Fahrten zu einer Bahnhofstafel zusammengeführt; vier klare Bahnhofstabs.
- Schnellfilter hinter Filter gebündelt, kürzere Ergebnisanzeige, eine geöffnete Fahrt gleichzeitig.
- Vollständiger Fahrtverlauf mit getrennten Ankunfts- und Abfahrtszeiten im Tafel-Eintrag; Karte nur auf ausdrücklichen Klick.
- Unbenutzte separate Fahrtenlisten-Komponente entfernt; bestehende Radar-Haltefilter bleiben aktiv.

# V60.1 · Zuverlässigere Bahnhofstafeln

- Abweichende Bahnhofsnamen, Ortszusätze und Kürzel werden bei passenden Koordinaten erkannt.
- Begrenzte Ersatzsuche über vereinfachte Namen und geografische Haltestellentreffer.
- Fern-/Regionalbahnhöfe bleiben getrennt; keine Bushaltestellen oder entfernten Nachbarstationen als Ersatz.
- Regressionstests mit realen Anbieterantworten, Abbruchbehandlung und Schutz vor zusätzlichen Anfragen bei HTTP 429.
- Die Fahrplandaten-Abdeckung des Anbieters bleibt begrenzt; keine Vollständigkeitsgarantie.

# V60.0 · Next Generation – Fahrgastklarheit und zuverlässige Zugverfolgung

- **Besserer Zug-Inspector:** Vollständige tatsächlich gemeldete Halte, nachvollziehbare Soll-/Prognosezeiten, Aufenthalte bis zur Abfahrt, optional nur kommende Halte und Datenstand der Quelle.
- **Umstiege nachvollziehen:** Ankunft/Abfahrt und gemeldeter Fußweg ergeben einen rechnerischen Puffer. Fehlen Wege oder Quellenzeiten, wird das offen ausgewiesen; keine garantierten Anschlüsse oder erfundenen Gehzeiten.
- **Alternativen gezielt finden:** Ausgefallene Vorschläge optional ausblenden sowie nach Ankunft, Dauer, Umstiegen, Gehweg oder Umstiegszeit sortieren.
- **Zugfahrt teilen:** Kompakte, lokal erstellte Momentaufnahme über Geräte-Teilen oder Kopieren, mit separater Prüfung von Echtzeitprognosen für Abfahrt und Ankunft. Keine dauerhafte Verfolgung durch das Teilen.
- **Tastatur und Alltag:** Bedienbare Schnellaktionen samt Hilfedialog und ein lokaler, löschbarer Verlauf der zuletzt geöffneten Bahnhöfe.
- **Klare Datenqualität statt falscher Sicherheit:** Ungültige Prognosezeiten werden verworfen, veraltete Gleisangaben nicht als live markiert. Fantasie-Auslastung und eine unbelegte „Verlässlichkeitsquote“ entfernt. Modellierte Zugpositionen bleiben als Schätzungen gekennzeichnet.
- **Design und Bedienbarkeit:** Railglass-Basis mit Mobil- und Darkmode-Verbesserungen, dezenter Bewegung, Unterstützung für reduzierte Animationen und bestehender Bahnhofstafel-/Radar-Funktionalität.
- **Qualität:** Umfangreiche Regressionstests, Responsive-Chromium-Szenarien, TypeScript, Lint, Produktions-Build und Cloudflare-Worker-Dry-Run gehören zur Releaseprüfung.
- **Hinweis:** Diese Änderungen sind im V60-Release-Branch vorbereitet; ein GitHub-PR oder bestandener Dry-Run allein ist **keine öffentliche Veröffentlichung**. API-Rechte und reale Geräteabnahme bleiben Freigabebedingungen.

# V58.0 · Railglass-Neustart – cleane Fahrgastoberfläche

- **One-tap Bahnhofstafeln:** Schnellansichten „Nächste Stunde“, „Verspätet“, „Ausfälle“ und „Alle Fahrten“ direkt über der Tafel. Alle vier setzen möglicherweise widersprüchliche erweiterte Filter zurück; ein aktiver benutzerdefinierter Filter wird nicht fälschlich als Schnellansicht ausgewiesen.
- **Alternativen vergleichen:** Direkte Filterchips für empfohlene, früheste, schnellste, umstiegsarme oder gehwegoptimierte Verbindungen. Bei ausfallender gewählter Fahrt wird die Alternativsuche klarer hervorgehoben.
- **Radar-Transparenz:** Dezentes, aufklappbares Datenstatus-Element über der Karte mit Quelle/Methodik. Für geschätzte Positionen wird nie Fahrzeug-GPS behauptet; Netzfehler, veraltete Daten und reine Fahrplanlagen erhalten unterscheidbare Zustände.
- **Railglass-Design:** Einheitliches, zurückhaltendes Materialsystem für hell und dunkel: hochwertige Navigation, kompaktere Tafel, flüssigere mobile Sheets, ruhiger Zug-Inspector, weniger dekorative Gradienten und deutlichere Informationshierarchie.
- **Android-Leisten:** Browser-/PWA-Farben folgen dem gewählten Hell-/Dunkelmodus statt hart codierten Flächen; auch Safe Areas und kleine Displays werden berücksichtigt.
- **A11y und Performance:** 44–52px-Touchziele, fokussierbare Bedienelemente, scrollbar-reduzierte Filterchips, reduzierte Bewegung/Transparenz sowie Kontrastmodus.
- **Prüfungen:** Neue deterministische Tests für Schnellfilter, Radar-Aussagen, Gestaltungsintegration und Betriebssystemleisten. Zusätzliche Chromium-Interaktionen und Render/Worker-Builds im PR.
- **Wichtig:** Der Launch ist im PR; Cloudflare/Render/Google Play werden durch diese Änderungen nicht automatisch aktualisiert. Die Quellen- und Lizenzrechte bleiben ein Release-Gate.

# V57.3 · Großes Fahrgast-Update: Meine Linien, Datenklarheit und Teilen

- **Meine Linien:** Betroffene Züge im jeweiligen Bahnhof lokal als beobachtete Linien markieren und Meldungen auf die eigenen Linien eingrenzen. Speicherung nur auf dem Gerät (maximal 20 Bahnhöfe und 12 Linien je Bahnhof), mit transparenter Fehlermeldung bei gesperrtem Speicher. Keine Push- oder Hintergrundüberwachung.
- **Störungszentrale:** Linienfokus, Textsuche, Kategorien und Uhrzeitsortierung kombinieren; baustellenbedingte Ersatzverkehre nicht automatisch als Zugausfall einstufen. Allgemeine Bahnhofshinweise bleiben in der persönlichen Ansicht sichtbar.
- **Meldungen teilen:** Gefilterte Betriebslage per nativer Android-Teilen-Funktion oder Zwischenablage versenden – mit Abrufzeit und Hinweis auf das begrenzte Fahrplanfenster. Einzelne Meldungen bleiben ebenfalls kopierbar.
- **Bahnhöfe teilen:** Bei unterstützten Bahnhöfen führt der Link wieder direkt zur Bahnhofstafel. Für nur dynamisch aufgelöste Stationen werden keine möglicherweise kaputten Links versprochen.
- **Verlässliche Datenqualität:** Neuer Überblick über tatsächliche Echtzeitabdeckung, Zeitstempel und Quellenwarnungen unter Bahnhof → Info. Ein grüner Bahnhofszustand benötigt genügend aktuelle Prognosen; bei dünnen oder veralteten Daten bleibt er unbestimmt.
- **Mobile Bedienung:** Lesbare, größere Filter- und Teilen-Aktionen; kleinere Bildschirme, Darkmode, Tastaturfokus, hohe Kontraste und reduzierte Bewegung berücksichtigt.
- **Sicherheits- und Regressionstests:** Neue Tests für Favoritenspeicherung, Datenqualität, Störungs-Export und die Anbieter-Kategorisierung. Browser-Interaktionen auf mobilen Auflösungen werden erneut geprüft.

# V57.2 · Kehrtwende: Linienfokus und zuverlässige Störungsinformationen

- **Daten zuerst:** V57.1-Anbieterfix für MOTIS-v6-Störungsdaten und ergänzende VBB-/DB-Bahnhofshinweise mit echten Quell- und Teilfehleranzeigen übernommen.
- **Betroffene Linie gezielt auswählen:** Linienfilter aus tatsächlich gemeldeten Linien, ohne allgemeine Bahnhofshinweise fälschlich einer Bahnlinie zuzuordnen.
- **Sortieren statt suchen müssen:** Meldungen nach Standardgewichtung, planmäßiger Zeit oder Zuglinie ordnen; Kategorien, Suchtext und Linienfilter kombinieren.
- **Meldung kopieren:** Den vollständigen verfügbaren Störungstext mit Linien- und Fahrtrichtungsangaben aus dem geöffneten Hinweis übernehmen. Gerät ohne Clipboard-Zugriff zeigt transparente Fehlermeldung.
- **Eindeutigere Ausfälle:** Hinweise wie „Fahrt fällt aus wegen Bauarbeiten“ werden als Ausfall und nicht als reine Baustelle eingeordnet.
- **UI-Korrekturen:** Mobile Filterfelder, 44-Pixel-Touchziele, Tastaturfokus, Kontrastmodus und reduzierte Animationen.
- **Sicherheit:** Die Funktion erfindet keine Echtzeitdaten und behauptet bei leerer Quellantwort keine Netz-Störungsfreiheit. Reale Android-/PWA-Tests bleiben erforderlich.

# V57.1 · Störungsmeldungen wieder sichtbar

- Aktuelles Transitous-Datenformat und Hinweise an Bahnhofshalten korrekt eingelesen.
- Deutsche Bahnhofsmeldungen durch VBB-/DB-Daten ergänzt; Quellenfehler bleiben sichtbar.
- Tafel und Reiseplanung zeigen bislang verworfene Hinweise.
- Teilausfälle korrekt unter Ausfälle; Bahnhofshinweise markieren nicht pauschal alle Linien.
- PWA-Update und Service-Worker-Cache auf V57.1 abgestimmt.

# V57.0 · Bahnhofsradar, vollständige Zugverläufe und mobile Störungsansicht

- Radar auf bestätigte Halte am ausgewählten Bahnhof begrenzt, mit Alle/Ankommend/Abgehend.
- Vollständiger Zugverlauf von Start bis Ziel, alle Halte und getrennte Zielankunft.
- Kompakte Zugmarker mit Linien-/Verkehrsmittelfarben und genau einem vorderen Richtungspfeil.
- X beendet Auswahl, Kartenstrecke und Verfolgung vollständig.
- Neue Störungsansicht nach 12ui-Entwurf: nur betroffene Linien, Suche, Kategorien und aufklappbare Meldungen.
- Berlin Mexikoplatz korrekt mit dem Anbieterbahnhof verknüpft; mobile Planerfelder besser getrennt.
- Versionsanzeige, PWA-Update und Cache auf V57.0 abgestimmt.

# V56.2 · Stabilität, Live-Tafeln und Störungszentrale

- **Erweiterte Störungszentrale:** Meldungen aus Ankünften und Abfahrten, Suchfeld nach Linie, Ziel und Störungstext sowie getrennte Kategorien für Bauarbeiten, Ausfälle und sonstige Hinweise.
- **Automatische Aktualisierung:** Bahnhofsmeldungen werden bei geöffneter Ansicht regelmäßig erneuert. Bei Quellenfehlern bleibt die zuletzt erfolgreich geladene Liste mit deutlicher Warnung erhalten.
- **Zuverlässigere Bahnhofstafel:** Verspätungen von +1 bis +4 Minuten korrekt filterbar; gespeicherte Fahrtverläufe werden beim Öffnen sichtbar. Fehlerhafte Anbieter-Zeilen, Warnungstexte und Aktualisierungszeiten werden defensiv verarbeitet.
- **Weniger blockierende Anfragen:** Begrenzte parallele Fahrtdetail-Abfragen und Timeouts für Tafel sowie Fahrtdetails.
- **Mobile & Barrierefreiheit:** Richtige englische Navigationsbeschriftung und zuverlässige Rückgabe des Tastaturfokus im Tafel-Filter.
- **Qualitätssicherung:** Erweiterte Regressionstests und mobile Chromium-Interaktionsprüfungen. Reale Android-/iOS-/PWA-Gerätetests bleiben vor breiter Veröffentlichung offen.

# V56.1 · Zugmarker, Kartenfilter und mobile Bedienung

- Größere Touchbereiche für Zugmarker; einzelne Zuggruppen öffnen direkt die Fahrt. Mobile Zugdetails sind sofort ausgeklappt.
- Direkte Zugarten- und Statusfilter mit Trefferzahl, Sichtbarkeitsschalter und Zurücksetzen.
- Störungsmeldungen mit gemeldeter Linie, verfügbarer Fahrtrichtung und Fahrtstrecke; klarere Linienkennungen.
- Standortauswahl am Startbahnhof und Wegdaten direkt am Bahnhof.
- Gespeicherte Sprachwahl Deutsch/Englisch für Hauptnavigation und Planer (Beta); dezente Animationen mit Rücksicht auf reduzierte Bewegung.
- App-Version, Update-Datei, Paket und Service-Worker-Cache auf V56.1 abgestimmt.
- Reale Android-/iOS-Touch- und PWA-Geräteprüfungen bleiben offen.

# V56.0 · Reife-Beta: zuverlässiger Zugradar, mobile Bedienung, teilbare Fahrten

- **Kalender:** Reise direkt als vorausgefüllten Termin in Google Kalender oder Outlook öffnen; ICS-Import für Apple und andere Kalender. Im Kalender speichern, mit Fahrplanzeiten und Hinweis auf spätere Reiseänderungen. Textdownload und Kopieren entfernt. Ausgefallene Abschnitte sperren den Kalenderimport.
- **Verbindungen vergleichen:** Sortierung nach Ankunft, Dauer, Umstiegen oder Fußweg; Fußwegdauer und Zeitunterschied zur gewählten Reise sichtbar.
- **Planer:** Einen Tag früher/später bei gleicher Uhrzeit; Reiseoptionen gezielt zurücksetzen, ohne Start und Ziel neu eingeben zu müssen.
- **Offline-Hinweis:** In Planung und Reiseansicht klarer Hinweis auf fehlende Verbindung und möglicherweise veraltete Daten.
- **Responsive Header:** Mobile Suche bleibt im Suchdock; bei kurzen Querformaten ist Platz für beide Karten-/Profilbuttons reserviert.
- **Störungen & Baustellen:** Neuer Bahnhof-Reiter und Schnelleinstieg über „Mehr“; Meldungen aus Transitous/MOTIS, Gruppierung identischer Hinweise, Trennung von Baustellen/Ausfällen/Betriebshinweisen, mit Quellenbegrenzung und Fehlerzuständen. Keine erfundenen Netzinformationen.
- **Tafelfilter:** Kompakte Suchzeile mit korrekter Icon-Ausrichtung, Verkehrsmittel-Chips mit Zählung, direkte Statusfilter, passende Gliederung und Ergebnisknopf. Schließen/Zurücksetzen bleiben erreichbar.
- **Changelog:** Neue lesbare Seite `/changelog` mit Veröffentlichungsstatus je Version und klarer Trennung von Entwicklungsbranch und öffentlicher Version.
- **Profil & Einstellungen:** Bildvorschau beim Auswählen, Avatar im Header, vier getrennte Bereiche (Profil, Design, App, Plus), Datenexport als lokale JSON-Datei, explizite Datenerklärungen.
- **Installation:** Alte Werbeseite unter `/install` durch eine kurze integrierte Installation-/Update-Ansicht ersetzt; der für PWA-Updates wichtige Pfad bleibt bestehen.

- Die bestätigten V55.1-Verbesserungen sind integriert: Bei kurzer Höhe keine überlappende Header-Suche; Desktop-Linien mit lesbaren Spalten und sichtbaren Fernverkehrskennungen.
- Vollständiges Zurücksetzen der Planeroptionen beim Schließen; „Jetzt abfahren“ setzt den aktuellen Zeitpunkt, ohne aktive Filter zu verlieren.
- Nur eine als Modell deklarierte Zuggeschwindigkeit. Abgelaufene Soll-/Prognosezeit ist kein Nachweis einer Ankunft; der Countdown bleibt bei fehlender aktueller Datenbasis leer.
- Reisestrecken mit Start, Ziel, Zeitpunkt, Optionen und Verkehrsmittelfilter als Link teilen und auf einem anderen Gerät wieder öffnen. Ohne Online-Konto.
- Bahnhofstafeln: stabilere Fahrtidentität ohne Quellen-ID, korrekte Verspätungsfilter, Rücksetzen leerer Filter, Gleis-Fallback auf den Planwert und klarer Hinweis auf veraltete Echtzeit.
- Robustere externe Aufrufe: Timeouts, Abbruch, Eingabegrenzen und unabhängige Teilantworten für Stationen, Linien, Verbindungen, Fahrtverläufe und Fußwege.
- Mobile Oberfläche überarbeitet: Kontrast und große Schrift, kompakte Fahrtzeilen, Tastaturfokus, reduzierte Bewegung und verständliche Fehlerzustände.
- Neue Regressionstests für Ankunftsgrenzen, Deep Links, Request-Größen und Datenidentität im GitHub-Quality-Workflow.
- V56.0 wurde nach erfolgreicher CI auf Render veröffentlicht. Reale Android-/PWA-Geräteprüfungen bleiben offen.

# V55.0 · Zugradar, Ankunft und Datenfrische

- Kompaktes Zugradar-Fenster mit Zug, Strecke, Fahrplanankunft, erwarteter Ankunft, Prognoseabweichung und direkter Kartenverfolgung.
- km/h-Anzeige als aus aktuellen Haltezeitprognosen und gültiger Streckengeometrie abgeleitete **Modellschätzung**, nicht als gemessene GPS- oder Tachogeschwindigkeit. Bei fehlender Datenbasis bleibt sie leer.
- Kamera folgt dem gewählten Zug; manuelle Kartenbewegung stoppt die Verfolgung. Abgelaufene und ungültige Streckenabschnitte erzeugen keine scheinbar aktuellen Positionen.
- Fahrtprognosen werden erneut geladen; überalterte Prognosen werden ausdrücklich von Fahrplanzeiten unterschieden.
- Bahnhofstafel verwendet aktuelle Vorhersagen nur bei ausreichend frischen Daten. Bei fehlgeschlagenem oder veraltetem Abruf werden bekannte Sollzeiten angezeigt und problematische Daten gekennzeichnet.
- Mobil: kompakter Zug-Inspector, mehr nutzbare Breite, kleinere Standardschrift und einstellbare Schriftgröße; ruhigere Animationen mit Reduced-Motion-Alternative.
- Chromium-Prüfung erweitert um Zugmarker antippen, Ankunftsvergleich, Modellgeschwindigkeit, Follow-HUD, Stop und Schließen. Vollständige Live- und Echtgerätevalidierung bleibt ein Freigabeschritt.
- PWA-Version, Update-Pfad und Service-Worker-Cache auf V55.0 synchronisiert.

# V51.0 · Flüssiger Radar & progressive Abfahrten

- Bestehende Zugmarker werden aktualisiert statt bei jedem Radar-Takt neu aufgebaut. Geometrie wird vorbereitet und in kurzen Zeitbudgets verarbeitet.
- Abfahrten erscheinen bereits während der optionalen DB-Prüfung. Ein späteres Prüfergebnis erhält die geöffnete Fahrt.
- Kompaktere Desktop-Tafel und konsolidierte Liquid-Glass-Flächen; mobiles Bahnhofssheet weiterhin mit vier vollständigen Abfahrten bei 390 px.
- Veraltete Anfragen werden beim Stationswechsel abgebrochen. Hintergrund-Polling pausiert bei unsichtbarer App.
- Barrierefreie Tastatursteuerung für Tafel-Tabs und Radar-Marker; Inspector ohne horizontalen Scrollbalken.
- PWA-Version, Update-Pfad und Service-Worker-Cache auf V51.0 angehoben.

# V50.2 · Responsive Station UI & Lines

- Klarere Typografie, feine Tab-Indikatoren und ruhige Abfahrtszeilen auf der gemeinsamen Liquid-Glass-Fläche.
- Bahnhofssuche bleibt im mobilen Header erreichbar. Die Linienansicht zeigt kompakte Ziele, nächste Fahrtzeiten und Fortschritt der automatischen Linienkarte.
- Geschlossene Suche berechnet keine unscharfen Treffer; Tippfehlersuche bricht aussichtslose Vergleiche früh ab.
- Fahrtgeometrie wird im Worker aufbereitet. Karten-Vorschauen folgen der Quelle innerhalb von fünf Metern; vollständige Geometrie und getrennte Segmente bleiben erhalten.
- Neue Linien werden in kurzen Frames ergänzt, statt alle vorherigen Linien erneut zu zeichnen. Bahnhofsmarker erhalten ein eigenes Zeitbudget nach dem Öffnen des Sheets.
- Echter Chromium-Stresstest mit 4× CPU-Drosselung und 18 Linien à 12.000 Geometriepunkten in CI.

# V50.1 · Compact Station Sheet & Liquid Glass

- Bahnhofstitel und Tafel/Linien/Info bilden einen gemeinsamen, festen Header außerhalb des Inhalts-Scrollbereichs. Keine konkurrierenden Sticky-Layer mehr.
- Standard-Tafel auf Abfahrt/Ankunft und Filter reduziert; Produktfilter und Suche öffnen sich bei Bedarf. Zeiten, Ziele und Gleise bleiben sofort erfassbar.
- Vier vollständig sichtbare Abfahrten im halben Sheet bei 390 px; 130 statt 269 px Oberfläche vor der ersten Zeile (deterministische Browser-QA).
- Liquid-Glass-Materialien in tokens.css konsolidiert; transparente gemeinsame Sheet-Fläche, native Untertabs und eine Bottom-Navigation ohne einzelne aktive Glaskarte.
- Relevante Änderungen aus v41.1-liquid-polish übernommen: kompakte Suchaktion, ruhige Vorschläge, transparente Half-Sheets und eindeutiger Gleiswechsel-Pfeil.
- PWA-Version und Cache auf V50.1 angehoben.

# V47.1 · Mobile Header Fix

- Mobiles Suchfeld stabilisiert: Clear-Button und „Anzeigen“-Button haben feste, kollisionsfreie Geometrie und können sich nicht mehr gegenseitig überdecken.
- Suchtext wird bei sehr wenig Platz sauber gekürzt statt unter Controls zu laufen.
- Leaflet-+/-Zoomsteuerung auf Mobile und Tablet entfernt; Pinch-to-zoom und Double-Tap bleiben erhalten.
- PWA-Version und Cache auf V47.1 angehoben.

# V47.0 · Desktop Glass & Station Visibility

- Desktop-Workspace auf eine konsistente Layout-Basis reduziert; alte V34–V37-Override-Ketten entfernt, damit Panels und Karte weniger gegeneinander arbeiten.
- Desktop-Liquid-Glass gezielter eingesetzt: Navigation, Suche und Inspector erhalten Materialtiefe, während die Karte visuell dominant bleibt.
- Mobile bleibt bewusst auf der bewährten V46-Komposition statt das Desktop-Redesign zu übernehmen.
- Offizielle DB-Bahnhöfe werden nicht mehr allein wegen fehlender Fahrgast-Metadaten ausgeblendet.
- Für Bahnhöfe ohne Fahrgastklasse nutzt die Karte strukturelle Fallbacks aus Bahnhofsart und zusammengeführten Betriebsstellen; dadurch kann unter anderem Berlin-Gesundbrunnen wieder sichtbar werden.
- Keine künstlichen Strecken, dekorativen Kartenlinien oder erfundenen Verkehrsdaten ergänzt.
- PWA-Version und Cache auf V47.0 angehoben.

# V44.0 · Simpler More & Cleaner Board

- Mobiles „Mehr“ vom Karten-Ansicht-Menü getrennt.
- „Mehr“ auf drei Kernaktionen reduziert: Darstellung, App & Updates sowie Hilfe & Daten.
- Netzreport, Netzlabor, Kontrast-/Schrift-Schalter und technische Kartenoptionen aus dem allgemeinen Mehr-Menü entfernt.
- Kartenoptionen bleiben unter „Ansicht“ verfügbar; seltene Optionen liegen hinter „Weitere Kartenoptionen“.
- Technische Haltestellenzusätze wie „Zugang über den …“ werden in der Tafel entfernt.
- „Hauptbahnhof“ wird in kompakten Tafelzielen als „Hbf“ dargestellt.
- Doppelte Ausfalltexte unter dem Fahrziel entfernt; „Entfällt“ bleibt als eindeutiger Status bestehen.
- Abfahrtszeilen leicht verdichtet, ohne Zeit, Ziel, Zugnummer oder Gleis zu verlieren.
- QA ergänzt: exakt drei Mehr-Aktionen, keine technischen Zugangszusätze im Board und kompakte Bahnhofsnamen.
- PWA-Version und Cache auf V44.0 angehoben.

# V43.0 · Dark Material & Realtime Polish

- Dark Mode nach aktuellen Materialprinzipien neu kalibriert: neutrale Base-/Elevated-Flächen statt blau getönter Karten, klarere Tiefenstaffelung und höherer Textkontrast.
- Liquid Glass im Dark Mode luminanzorientiert abgestimmt: weniger Farbstich, weniger Sättigung, subtilere Lichtkanten und stärker vom Karteninhalt beeinflusste Glasflächen.
- Dark-Map deutlich ruhiger: geringere Helligkeit und Sättigung, neutralerer Hintergrund und zurückhaltendere Stationsmarker.
- Expanded Sheets nutzen im Dark Mode ein dichteres neutrales Elevated-Material; schwebende Controls, Suche und Navigation bleiben transparenter.
- Frühere bestätigte Abfahrt/Ankunft ist jetzt semantisch success und wird explizit grün dargestellt; Realtime-, Board- und Screenshot-Fixtures sichern das Verhalten ab.
- Live-Zugmarker und Trails übernehmen für frühe Züge ebenfalls den grünen Status statt des bisherigen Warnzustands.
- Mobile Querformat korrigiert: Header-Aktionen bleiben auf 44 px begrenzt und können die Suche nicht mehr überdecken.
- Responsive-QA enthält einen Regressionstest gegen die Header-Überlappung im 844×390-Querformat.
- Mehrere alte Light-Only-Hintergründe in Linien-, Warn- und Statuskomponenten erhalten Dark-Mode-sichere Materialwerte.
- Accessibility-Fallbacks für Reduced Transparency, High Contrast, Forced Colors und Browser ohne backdrop-filter bleiben erhalten.
- PWA-Version und Cache auf V43.0 angehoben.

# V42.0 · Deep Liquid Glass

- Optische Materialschicht komplett verstärkt: deutlich mehr Transparenz, Backdrop-Blur, Sättigung, innere Lichtkanten und räumliche Schatten statt flacher halbtransparenter Flächen.
- Mobile Suche, Brand, Kartenoptionen, Standort, Bottom-Navigation, Bottom-Sheets und Popover wirken als getrennte schwebende Glaslinsen über der realen Karte.
- Aktiver Navigationstab erhält eine eigene transluzente Innenfläche mit Lichtkante statt nur einer Farbmarkierung.
- Halb geöffnete und minimierte Sheets bekommen stärkere Refraction-/Highlight-Wirkung; Expanded Sheets werden für lange Fahrplandaten bewusst etwas dichter.
- Desktop-Chrome überarbeitet: Topbar, Navigation, Suche, Inspector und Kartenrahmen bilden ein zusammenhängendes, tiefes Glass-System.
- Formularfelder und wichtige Micro-Controls sind keine grauen Boxen mehr, sondern klare Glass-Aperturen mit Fokuslicht und kontrollierter Elevation.
- Dark Mode erhält hellere Glaskanten und stärkere Tiefentrennung, damit die Oberfläche nicht zu schwarzen Karten zusammenfällt.
- Reduced Transparency, High Contrast, Forced Colors und Browser ohne backdrop-filter fallen weiterhin auf solide, gut lesbare Oberflächen zurück.
- PWA-Version und Cache auf V42.0 angehoben.

# V40.0 · Liquid Hierarchy

- Liquid Glass neu kalibriert: deutlich transparentere Navigation/Controls, stärkerer Backdrop-Blur und echte Trennung zwischen Karteninhalt und Funktionsschicht.
- Halb geöffnete und minimierte Mobile-Sheets schweben mit Abstand zum Rand über der Karte; voll geöffnete Sheets werden für Lesbarkeit bewusst deckender.
- Bottom-Navigation nutzt Glass als gemeinsame Fläche; aktive Tabs werden nur über Farbe markiert statt über zusätzliche Pill-Karten.
- Bahnhofsmarker erhalten eine klare Größenhierarchie aus DB-Reisendenklassen: kleine Stationen bleiben kleine Punkte, mittlere werden deutlich größer, große Bahnhöfe erhalten starke Marker und sehr große Knoten zusätzlich einen äußeren Halo.
- Kleine Stationen werden bei Deutschland-Zoom reduziert, damit die Karte nicht mit gleichwertigen Punkten überladen wird.
- Journey-Sheet stark entschlackt: keine doppelte Zug-/Routenüberschrift, keine prominente Live-Daten-Zeile, keine Top-Level-Auslastungs-/Barrierefreiheitsprosa und weniger Statuswiederholungen in Fahrtabschnitten.
- Bahnhof Mobile entschlackt: Stationsname steht direkt im Sheet-Kopf; die fünf Linien-KPIs, technische Details und der doppelte Bahnhofskopf sind nicht mehr in der ersten Ebene.
- Live-Tafel zeigt keine Gesamtzahl/Echtzeitquote mehr, solange nichts auffällig ist; Verspätungen und Ausfälle bleiben sichtbar. Verkehrsmittel-Zähler und das separate 500-Minuten-Kommando wurden aus der Hauptzeile entfernt.
- Expanded Journey/Board-Inhalte bleiben flach; Glass wird nicht in Inhaltskarten verschachtelt.
- Accessibility-Fallbacks für Reduced Transparency, Forced Colors und Browser ohne backdrop-filter bleiben erhalten.
- PWA-Version und Cache auf V40.0 angehoben.

# V39.0 · Liquid Map Polish

- Stationsmarker skalieren jetzt vorrangig nach den vorhandenen DB-Reisendenklassen; kuratierte Hauptbahnhöfe übernehmen dafür ihre DB-Aliasdaten statt nur nach Hub-Status dargestellt zu werden.
- Größere Bahnhöfe erhalten sichtbar größere Marker, kleinere Stationen bleiben zurückhaltend; innerhalb großer Klassen differenziert die vorhandene Netzbedeutung zusätzlich.
- Grau als Standardmarkerfarbe entfernt: Light und Dark Mode nutzen ein konsistentes blau/teal Stationssystem.
- Dark Mode behält die echte OpenStreetMap-Geometrie, verwendet aber eine kontrastreiche Nacht-Transformation mit invertierten Beschriftungen statt der bisherigen matschigen Abdunklung.
- Mobile Kopfzeile korrigiert: Kartenoptionen oben rechts sind fest auf 46×46 px begrenzt und können nicht mehr als vertikale weiße Fläche ausbrechen.
- Brand, Suche, Kartenoptionen, Standort, Zoom, Sheet und Bottom-Bar verwenden stärkeres, aber zusammenhängendes Liquid Glass; lange Inhaltslisten bleiben flach.
- Dark Journey/Station-Inhalte verzichten weiter auf verschachtelte Glas-Karten; Alternativverbindungen zeigen weniger redundante Statusprosa.
- PWA-Version und Cache auf V39.0 angehoben.

# V38.0 · Native Minimal UI

- Heller Mobile-Look näher an der bevorzugten Referenz: Karte übernimmt die Fläche, Suche/Navigation/Sheet bleiben die wenigen bewussten Glass-Schichten.
- Sichtbare „Live-Ebene“-Status-Pille entfernt; Live-Funktionen bleiben im Ansicht-Menü und für Screenreader erhalten.
- Kartenmarker komplett neu abgestimmt: keine grauen Standardkreise mehr, sondern ruhige blau/teal umrandete Stationsmarker mit klarer Hub-Hierarchie und dezenter Tiefe.
- Dark Mode nicht mehr als generisches Card-/Shadcn-Theme behandelt: weniger Borders, weniger verschachtelte Kacheln, neutralere Statusfarben und flachere Inhaltsbereiche.
- Journey-Sheet deutlich kompakter: kürzere Texte, weniger redundante Metadaten, reduzierte Sekundärinformationen und flachere Alternativen.
- Bahnhof/Live-Tafel aufgeräumt: KPI-Zahlen als zusammenhängende Informationszeile statt fünf Cards; Tabs, Produktfilter und Suchzeile deutlich weniger „Pill“-lastig.
- Mobile Header liegt map-first über der Karte; Suchfeld, Bottom-Bar und Sheet nutzen zusammenhängendes Liquid Glass statt Glassmorphism auf jeder Komponente.
- Reduced Motion/Transparency, Forced Colors und 44px-Touchziele bleiben erhalten.
- PWA-Version und Cache auf V38.0 angehoben.

# V37.0 · Liquid Glass Minimal

- Neues Materialsystem mit klarer Trennung zwischen Content-, Functional-Glass- und Status-Layer.
- Liquid Glass wird gezielt für schwebende Suche, Kartencontrols, Popover, Mobile-Navigation, Sheet-Kopf und Desktop-Chrome eingesetzt; Fahrplan- und Journey-Inhalte bleiben lesbar und weitgehend opak.
- Drei Glasstufen (`clear`, `regular`, `strong`) mit Dark-Mode-Anpassung, subtilen Innenlichtern und kontrollierter Elevation statt flächigem Glassmorphism.
- Mobile Bottom-Navigation als kompakte schwebende Fläche neu komponiert und auf Tablets in der Breite begrenzt.
- Journey-Datenstatus und Sekundärinformationen weiter entkartet; Hierarchie entsteht stärker durch Typografie und Abstand.
- Desktop-Navigation, Suche und Sidebars erhalten eine zurückhaltende Materialtiefe, während die Karte visuell dominant bleibt.
- Accessibility-Fallbacks für High Contrast, Forced Colors, Reduced Motion und Reduced Transparency ergänzt; Browser ohne `backdrop-filter` erhalten solide Oberflächen.
- Keine Gradients, kein Neon und keine Glasflächen in langen Transit-Datenlisten.
- PWA-Version und Cache auf V37.0 angehoben.

# V36.0 · Minimal Map-first UI

- Mobile Kopfbereich auf eine kompakte Zeile reduziert; die Bahnhofssuche schwebt nun direkt über der Karte statt eine zweite Header-Zeile zu belegen.
- Dadurch gewinnt die Karte sichtbar an Höhe, ohne Suche oder Live-Zugriff zu verstecken.
- Im mobilen Verbindungssheet entfällt die doppelte Planer-Überschrift; Start/Ziel beginnen sofort nach dem Sheet-Kopf.
- Bottom-Navigation, Sheet-Griff und Panel-Abstände weiter beruhigt; aktive Navigation nutzt nur noch Farbe statt zusätzlicher Flächen.
- Journey-Abschnitte, Umstiege und Qualitätsblöcke verwenden weniger verschachtelte Karten und sichtbare Rahmen.
- Desktop-Seitenleisten wurden schmaler, sodass die Karte stärker das visuelle Zentrum bleibt.
- Karten-, Status- und Aktionsfarben bleiben semantisch getrennt; Reduced Motion, Touch-Ziele und Echtzeitdarstellung bleiben erhalten.
- PWA-Version und Cache auf V36.0 angehoben.

# V35.0 · Premium UI polish

- UI-Hierarchie aus einem visuellen UX-Review weiter verdichtet: Karte bleibt Hauptfläche, Journey und Bahnhof zeigen zuerst die entscheidenden Reiseinformationen.
- Mobile Bottom-Navigation vereinfacht: kein Dashboard-artiger Aktiv-Hintergrund mehr, stattdessen ruhiger Farbzustand und dezentes Press-Feedback.
- Bottom-Sheet erhält ein nativeres 240-ms-Bewegungsprofil, größere Griff-Fläche und reduzierte Trennlinien.
- Desktop-Panels, Kartencontrols und Popover verwenden weniger sichtbare Rahmen und eine konsistentere Elevation.
- Journey-Alternativen von verschachtelten Karten zu einer ruhigeren gruppierten Liste reduziert.
- Bahnhof-KPIs, Board-Filter, Transfer- und Detailflächen visuell vereinheitlicht.
- Fokus- und Accessibility-Verhalten sowie bestehende Reduced-Motion-Regeln bleiben erhalten.
- PWA-Version und Cache auf V35.0 angehoben.

# V34.0 · Interface overhaul

- Visuelles System neu kalibriert: native Systemtypografie, ruhigere Flächen, weniger gleich starke Rahmen, größere Radien und eine klarere Hierarchie.
- Desktop-Workspace überarbeitet: Karte bleibt Hauptfläche, Suche sitzt als eigenständige linke Sidebar, Journey/Bahnhof als fokussierter rechter Inspector.
- Hauptnavigation als kompakte Segment-Navigation mit eindeutigem aktiven Zustand gestaltet.
- Reiseplaner vereinfacht: Abfahrt/Ankunft und Datum/Zeit stehen direkt im Hauptfluss; Detailfilter bleiben eingeklappt.
- Primäre Aktion nutzt BahnConnections-Rot, Auswahl- und Informationszustände bleiben blau; Echtzeitstatusfarben bleiben davon getrennt.
- Bahnhof, Live-Tafel, Journey, Alternativen und Umstiege verwenden neue ruhige Karten- und Gruppierungsflächen.
- Mobile Bottom-Navigation und das frei ziehbare Sheet wurden stärker wie eine native App strukturiert, inklusive klarer aktiver Zustände und größerer Touch-Ziele.
- PWA-Version und Cache auf V34.0 angehoben.

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

