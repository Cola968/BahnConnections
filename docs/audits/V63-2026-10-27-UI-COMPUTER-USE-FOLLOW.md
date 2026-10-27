# V63 UX-/Computer-Use-Audit: belegte Fehler, Fixes und Abnahme
**Stand:** 27.10.2026 · **Quellbasis:** V63-Entwicklungszweig PR #88 auf V62.0.3 · **Status:** Pull-Request-Kandidat, **nicht veröffentlicht**.

## Gesicherte Grundlage
Ein vom Auftraggeber gelieferter unabhängiger Browser-Zwischenbericht dokumentiert **45 einzelne Testfälle** an der öffentlichen V62.0.3 (Windows/In-App-Browser). Dabei wurden u. a. Zug- und Bahnhofssuche, Radar, Follow-Start/Ende, Einstellungen und Viewportwechsel beobachtet. Dieser Bericht ist **kein** Beleg für 60 Tests, echte Smartphones, 200-%-Textzoom, Screenreader, Datenrichtigkeit oder eine externe dauerhaft laufende Follow-Ansicht. Bei einem Reload blieb Follow im beobachteten Ablauf **nicht** aktiv. Datenquellen wurden nicht unabhängig abgeglichen.

Der V63-Branch enthält eine „Quiet Rail“-Designrichtung in `app/styles/v63-visual-reset.css` und importiert weiterhin zahlreiche ältere CSS-Schichten. Die Grundidee (ruhige Datenflächen statt überall Glas) ist plausibel, aber **moderne Gestaltung und WCAG-Konformität sind ohne vollständige Browser- und Nutzungstests nicht nachgewiesen**.

## Änderungen in diesem Arbeitszweig
| ID | Befund | Quellkorrektur | Absicherung | Status |
|---|---|---|---|---|
| UI-01 | „Alle betroffenen Linien“ bei 390 px abgeschnitten | Störungsfilter bis 480 px einspaltig; nativer Select erhält volle Breite | `station-sheet-qa.mjs`: tatsächliche Anordnung und Screenshots bei 320/390 px | Implementiert, CI-/Browserabnahme offen |
| UI-02 | Follow zeigt „…“ statt „kein GPS“/„keine aktuelle Position“ | Follow-Unterzeile umbruchfähig; Aktionen können mobil in folgende Zeile fließen | `mobile-visual-qa.mjs`: sichtbarer Status bei 320/390 px und Overflow-Prüfung | Implementiert, CI-/Browserabnahme offen |
| UX-01 (Teilursache) | Warnung im Störungsbereich mehrfach sichtbar | Identische, auch umgebungsbereinigte Quellwarnungen werden beim Merge dedupliziert | `disruption-provider-audit.mjs`: zwei Quellen mit redundanter Warnung | Implementiert, Live-Reproduktion offen |
| DATA-01 | Gleiche RE8-Darstellung in Bahnhofstafel | **Keine blinde Deduplizierung**: echte Fahrt-IDs und Betriebstage erst abgleichen | Zu ergänzen: Rohdatentests für gleiche/verschiedene IDs | Offen |
| UX-02 | „Auf Karte“ aus der Tafel wirkt unklar | Noch keine Änderung; beobachteter Übergang nicht eindeutig fehlgeschlagen | Zu ergänzen: kontrollierter Marker-/Timeout-/No-Marker-Test | Offen |
| FOLLOW-01 | Follow nach Reload nicht wiederhergestellt | Noch keine Änderung; Produktentscheidung für PWA/Browser/Android getrennt nötig | Zu ergänzen: Zustand nach Tabwechsel, Reload, Minimierung und Schließen | Offen |

## Gestaltungsrichtlinie: modern heißt klar, nicht maximal dekorativ
1. **Status vor Optik:** Quellenstatus („kein GPS“, Zeitprognose, Datenalter), Verspätungen, Ziel, Gleis und Handlung müssen sichtbar sein. Niemals wesentliche Semantik hinter Auslassungspunkten verstecken.
2. **Ruhige Hierarchie:** Karte und Navigation als Grundstruktur, eine dominante primäre Handlung, zusammengehörige Informationen gruppieren; keine neuen Glasflächen oder Badge-Reihen nur aus Designgründen.
3. **Responsives Verhalten:** Inhalte ab 320 CSS-px ohne unbeabsichtigtes horizontales Scrollen; Toolbars, Karten und Tabellen dürfen begründete Ausnahmen haben. Long-Label-Selects müssen ausreichend breit sein.
4. **Interaktion:** Ein Wechsel „Auf Karte“ muss einen sichtbaren Erfolg oder eine eindeutige Fehlerrückmeldung erzeugen. Follow muss anhand des Datenstands als live, modelliert oder pausiert erscheinen.
5. **Zugänglichkeit:** Starke Fokusindikatoren, Tastaturfluss, große Touch-Ziele, ausreichend Kontrast; ohne Messung keine WCAG-AA-Freigabe.
6. **Designsystem:** Bestand an überlappenden V48–V63-Styles prüfen; schrittweise zu dokumentierten semantischen Tokens/Kernkomponenten konsolidieren, ohne bestehende Features zu verlieren.

**Prüfbare Grundlagen:**
- [W3C WCAG 2.2, SC 1.4.10 Reflow](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html) – 320 CSS-px Reflow mit Ausnahmen für genuine zweidimensionale Inhalte.
- [W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/) – Kontrast, Tastatur, Textzoom, Fokus.
- [Nielsen Norman Group: 10 Usability Heuristics](https://www.nngroup.com/articles/ten-usability-heuristics/) – sichtbarer Systemstatus, Konsistenz, sparsames Design.
- [Google Android Accessibility: Touch target size](https://support.google.com/accessibility/android/answer/7101858?hl=en) – 48dp als Plattformempfehlung, nicht automatisch WCAG-AA-Webmaßstab.

## Noch zu erfüllende Abnahmekriterien (keine fingierten Tests)
- [ ] CI: `node scripts/v63-mobile-legibility-audit.mjs` erfolgreich.
- [ ] CI: `node scripts/disruption-provider-audit.mjs` erfolgreich.
- [ ] Browser: neue Filter-/Follow-Screenshots bei 320 und 390 CSS-px aus V63-Build; kein überdeckter Text, keine unzugänglichen Buttons.
- [ ] Zusätzlich 360, 430, 768, 1024, 1440 und 1920 px; Hell/Dunkel, 200 % Schrift/Zoom.
- [ ] Keyboard-Only, Fokus, Screenreader, Kontrastmessung und WCAG-2.2-AA-Protokoll.
- [ ] 15+ neue, eigenständig protokollierte Tests, damit die Zielzahl von mindestens 60 realen Fällen erreicht wird.
- [ ] RE8/ICE-Dubletten gegen `tripId`, `plannedWhen`, Quelle, Datum, Plattform und Richtung verifizieren; keine falsche Zusammenfassung von Zugteilen.
- [ ] „Auf Karte“ mit bestehendem, verspätetem und fehlendem Radar-Marker wiederholen; sichtbar definierte Rückmeldung.
- [ ] Follow-State-Matrix für Web, PWA und Android erstellen (Reload, Tabwechsel, Minimieren, Schließen); echtes OS-Fenster/Android-Benachrichtigung gesondert abnehmen.
- [ ] Unabhängige Datenstichprobe mehrerer Bahnhöfe und Betreiber mit Quelle, Datum und Abweichungen.
- [ ] Visuelle Vergleichsstudie der tatsächlichen Oberfläche gegen DB Navigator/bahn.de, Flightradar24, Trainline, SBB und ÖBB; nicht nur Herstellerbeschreibungen.
- [ ] Core Web Vitals, Offline/PWA-Upgrades, Browserkonsole und API-Fehler unter realistischen Bedingungen prüfen.
- [ ] Für jede designkritische Änderung Vorher/Nachher-Screenshot, Reasoning und nachvollziehbares Abnahmekriterium erfassen.

**Release-Gate:** PR nicht als V62.0.3-Livefix darstellen; V63 #88 ist ein Draft und baut auf V62-Sync #86 auf. Kein Merge nach `main`, keine Veröffentlichung nach Sites/Android, solange CI, Browserabnahme, Quellabgleich und Freigabe fehlen.
