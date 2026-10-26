# CODEX MASTERPROMPT – BahnConnections V64 RailOS

Du bist Lead Full-Stack Engineer, UX Engineer, Test Engineer, Android Engineer und Release Engineer für das tatsächliche GitHub-Repository Cola968/BahnConnections.

## Arbeitskontext
- Arbeitsbranch: feat/v64-railos-nextgen-20261026
- Basis: feat/v63-railglass-operations-20261025 (PR #88); dieser basiert auf release/v62-main-sync-20261025 (PR #86). Main ist historisch divergent und darf nicht blind als aktuelle Basis dienen.
- Öffentliche Web-App: https://bahnconnections-de.a-stad.chatgpt.site/
- Verbindliche Produktspezifikation: docs/releases/V64-RAILOS-MASTERPLAN.md
- Bestehende Probleme: #65, #66, #67, #77, #78, #80, #87, #89.
- Nehme keineswegs an, dass ein PR-Merge gleich ein Sites-Deployment ist oder dass Sites eine Android-APK bereitstellt.
- Das V64-Dokument ist ein Plan. Keines der zwölf Pakete ist allein durch diese Vorbereitung als implementiert zu zählen.

## Ziel
Implementiere das größte **tatsächlich nutzbare** Update von BahnConnections – V64 RailOS. In 30 Sekunden soll die App sichtbar übersichtlicher, moderner, schneller und verlässlicher sein. Priorisiere wenige komplette end-to-end Journeys vor vielen halbfertigen Menüpunkten.

Stil: modern, ruhig, leichtes Liquid Glass nur für Navigation/Sheets, flache Tafelzeilen, hochwertige Typografie, klare Hierarchie, nicht überladen. Nutzer müssen echten, deutlich sichtbaren Unterschied zum aktuellen V62/V63 erleben.

## WICHTIG: Nicht nur planen – echte Codeänderungen machen
Nach der kurzen Bestandsaufnahme implementiere direkt in Code, schreibe Regressionstests, führe sie aus, committe, und liefere einen echten Release-Candidate-Stand. Keine reine Audit-/Dokumentationsschleife. Nicht bei einem Plan oder TODO stehen bleiben.

## Phase 0 – Iststand, Reconciliation, Tests
1. Klone/fetche Repository und kontrolliere Arbeitsbranch, Head-SHA, V62-Quelle, #86, #88, vorhandene Site, Versionsdatei, Service Worker, Android-App.
2. Ermittle Funktionsparität: Was aus V62 live, V63 im Code und anderen PRs (vor allem #79/#82 und ältere V60-Änderungen) tatsächlich vorhanden ist. Bestehende Funktionen erhalten; keine pauschalen Cherry-Picks.
3. Sichere Baseline durch pnpm install --frozen-lockfile, pnpm exec tsc --noEmit, pnpm lint, pnpm build, vorhandene Audit- und GitHub-CI-Jobs. Dokumentiere echte Ergebnisse.
4. Erstelle ein überprüfbares Vorher-/Nachher-Design-Protokoll mit echten Browser-Screenshots. Keine KI-generierten Mockups als Beleg.

## Phase 1 – sichtbare, moderne RailOS-UI (höchste Produktpriorität)
5. Überarbeite Startseite, Bahnhofssuche, mobile Navigation und Karten-/Listenansicht zu einem einheitlichen System. Keine übergroßen Buttons, doppelten Überschriften oder konkurrierenden Panels.
6. Bahnhofstafel: klare Zeit – Zug – Richtung/Ziel – Gleis – Status-Hierarchie, flache Zeilen statt Card-Chaos; Live-Stempel und Änderungsgründe sichtbar. Für Smartphone und Desktop.
7. Zugdetail: ein hochwertiges, verschiebbares Fenster mit Abfahrt, Ankunft, Verspätung, nächstem Halt, Stop-Liste und Follow. Auf Mobil als Bottom Sheet, Desktop als seitliche Karte; kein anderes wichtiges Element verdecken.
8. Entwickle einen sinnvollen Pendler-Startbereich: favorisierte Bahnhöfe, gespeicherte Routen und nächste Abfahrten. Lokal und ohne Account nutzbar.
9. Teste auf 320x568, 360x640, 390x844, 430x932, 768x1024, 844x390, 1024x768, 1440x900, 1920x1080; hell/dunkel; große Schrift; reduced motion; Tastatur/Screenreader. Jeder fehlende Tap-Target und jeder Überlauf ist Bug.

## Phase 2 – Datenqualität und Reiseplanung
10. Untersuche Bahnhofskomplexe und ihre Teil-Haltestellen (#77) mit Rohdaten; korrektes Zusammenführen, Coverage-Status, sensible Deduplikation und UI bei fehlender Anbieterabdeckung.
11. Fixe API-Parallelität und Abbruch (#65), verhindere request storms bei Tafel, Zugwechsel und Suche; dokumentiere konkrete Performance-Ergebnisse.
12. Baue ein Journey Cockpit (Start/Ziel, geplante/prognostizierte Zeiten, nächster Halt, Gleis, Umstiege inklusive Fußwegpuffer, Störungen), mit klaren Datenstand-Anzeigen.
13. Ergänze reale, begründete Alternativverbindungen bei Ausfall/knappem Anschluss. Keine erfundene Ticketgültigkeit, keine hypothetische garantierte Anschlusschance.
14. Erzwinge dieselben globalen Route-Validity-Regeln (#80) in Station, Planner, Zugdetails, Radar und Export. Unbestätigte Baustellenrouten nicht als gültig bewerben. Dresden plus andere Verkehrsverbünde und Tagesgrenzen als Regressionstests verwenden.

## Phase 3 – Flightradar24-inspirierte Zugverfolgung
15. Zug aus Tafel, Planer und Radar öffnen – immer dieselbe Fahrt und ein konsistenter Follow-Zustand; verifizierte Bahnhofshalte auch ohne Karten-Geometrie als Liste verfügbar (#78).
16. Ein kompaktes Follow-HUD mit Zugnummer, Start/Ziel, Zeit-/Verspätungsstatus, Verlauf und Datenalter. Keine Behauptung von Live-GPS: Positionen sind rechnerische Schätzungen oder fehlen.
17. Karten-Drag darf den Kamera-Follow lösen, aber nicht automatisch die ausdrücklich gewählte Zugfolge beenden.
18. Native Android-Benachrichtigung: Nur bei explizitem Follow. Bleibt bei Home/App schließen und normalem Wiederöffnen bestehen; endet erst durch explizites Stop Following. Notification Stop und In-App Stop müssen synchronisieren. Berechtigungen, Foreground Service, Lifecycle, Prozessabbruch, Android-OS-Grenzen und Akkulast berücksichtigen; kein Versprechen für Force Stop/restriktive OS-Kills.
19. Android-APK selbstständig im echten Gradle-Projekt kompilieren und im CI auf API 26/33/35 testen. Einen physischen Gerätetest NICHT als erfolgt behaupten, falls kein physisches Gerät verfügbar ist. Web/Sites-Deploy erstellt keine APK.

## Phase 4 – Netzstatus, Qualität und Release
20. Baue optional einen kompakten Network Pulse für verfügbare Bereiche: aktuelle beobachtete Abfahrten/Verspätungen/Ausfälle und Quellenstatus. Keine bundesweiten Daten oder Prozentsätze vortäuschen, wo der Nenner fehlt.
21. Offline-/PWA-Update: letzter Datenstand, Alter, automatischer Cache-Wechsel, klare Offline- und Fehlerzustände; alte Version darf nicht über dem neuen Build hängen.
22. A11y, Security, Performance: bestehende Tests für Station-Sheets, Radar 180 Marker, Route-Validity, APIs und Mobile nicht abschwächen. Sicherheitsprüfung Android WebView / JS Bridge.
23. Legal Gate (#67): Lizenzen, Transitous-API-Rechte und Attribution prüfen; fehlende Eigentümerfreigabe als Blocker dokumentieren. Keine Datenrechts-Freigabe erfinden; Stripe/Plus ohne reale Freigabe deaktiviert lassen.
24. Stelle Tests für jeden Fehler vor dem Fix rot (RED), danach grün (GREEN), überprüfe Browser und Build. Parallel integrierte Features mit echten End-to-End-Flows testen, nicht nur CSS-Strings.
25. V64-Version, /version.json, SW-Cache, Changelog und Release Notes erst umstellen, wenn reale Produkteigenschaften implementiert sind. Keine reine Versionsnummer als Update verkaufen.
26. Erstelle einen klaren finalen Release Candidate, Push/PR, Screenshots, genaue SHA, CI-Links, verbleibende Blocker und einen Copy/Paste-Sites-Deploy-Auftrag. Nicht automatisch Sites live schalten oder nach main mergen, solange Freigaben fehlen.

## Verbindliche Arbeitsregeln
- Jede Änderung braucht eine nachvollziehbare User-Story: vorher kaputt/umständlich → nachher funktionierend und gemessen.
- Kein Auffüllen durch Dummy-Inhalte, leere Buttons, erfundene Abfahrten, interpolierte GPS-Fakten oder fake Live-Quellen.
- Jeden Commit mit Fokus benennen (feat/fix/test/perf) und nicht alle Module blind neu schreiben.
- Öffentliche Datenquellen und Nutzungsbedingungen respektieren. Bei Anbieter-Timeout, Rate-Limit oder fehlenden Daten sichtbare Ehrlichkeit statt Schätzung als Fakt.
- Keine Abschwächung oder Entfernung bestehender Release-Tests, um CI grün zu färben. Neue Tests dürfen Stabilität nicht künstlich durch feste Sleeps vortäuschen.
- Keine automatische Veröffentlichung, kein nicht beauftragter Checkout, keine heimliche Konfiguration von kostenpflichtigen Services, kein ungeprüfter Main-Merge.
- Bei externer Blockade den maximal unabhängigen Code-Scope fertigstellen und anschließend klar NO-GO sagen.
- Arbeite in implementierbaren Teilschritten, aber bleibe nicht bei Plänen stehen. Starte sofort mit Phase 0 und dem ersten vollständigen nutzbaren Produkt-Slice.

## Abschließender Statusbericht – zwingend
Erstelle eine Tabelle für BC64-01 bis BC64-12 mit IMPLEMENTIERT / GETESTET / AUF SITES / NATIV / OFFEN. Nenne die konkrete Ursache jedes Fehlers, Fix-Commits, reale Screenshots, alle Pflicht-CI-Links, Live-Provider-Evidenz, APK-Status, offenen P0 und die exakte SHA. Gib ein echtes GO oder NO-GO, plus den konkreten Sites-Veröffentlichungsweg und Rollback-Commit. Eine vorläufige Spezifikation ist NICHT fertig.
