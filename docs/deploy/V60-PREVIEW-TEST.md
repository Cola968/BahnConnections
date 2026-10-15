# V60 Testumgebung (nicht Produktion)

Der bestehende PR #74 bleibt Draft. Dieser Ablauf erstellt eine getrennte Cloudflare-Preview für den Entwicklungsbranch. Die Live-Sites-Adresse und der produktive Worker werden nicht geändert.

## Einmalige Einrichtung durch den Besitzer

1. In Cloudflare unter Workers & Pages ein neues Worker-Projekt mit dem GitHub-Repository `Cola968/BahnConnections` verbinden. Als Produktionsbranch `main` festlegen; **nicht** den V60-Entwicklungsbranch.
2. Buildbefehl: `pnpm build:cloudflare`. Production deployment **nicht** genehmigen, bevor Datenrechte und Release-Gates geklärt sind.
3. In Worker **Settings → Builds** Preview Builds für `feat/v60-next-generation-20261014` aktivieren. Der Preview-Befehl muss `pnpm exec wrangler preview --config "$(node scripts/cloudflare-output-config.mjs)"` verwenden; der Output-Config-Pfad existiert erst nach dem Build.
4. Preview-URL im Cloudflare-Buildlog öffnen und auf dem Android-Handy testen. Nicht als produktive PWA über die bestehende Installation installieren. Falls nötig, ein zweites Browserprofil verwenden.
5. Jede Änderung im PR erzeugt einen neuen Preview-Build, sofern die Git-Integration autorisiert und aktiviert wurde. Vor manueller Freigabe muss die Quality-CI für denselben Commit erfolgreich sein.

**Wichtig:** Die Preview-URL existiert erst, nachdem Cloudflare den Worker tatsächlich gebaut hat. Dieser Branch allein schaltet keinen Worker frei. Die Preview läuft auf Cloudflare und benötigt gegebenenfalls die Zustimmung des Kontoinhabers zu Nutzungsbedingungen und Ressourcenkontingenten. Keine Cloudflare-Zugangsdaten in GitHub-Dateien speichern.

Cloudflare-Dokumentation: https://developers.cloudflare.com/workers/previews/ und https://developers.cloudflare.com/workers/ci-cd/builds/configuration/

## Android-Abnahme vor Veröffentlichung

- Plus unter Einstellungen öffnen, schließen und erneut aufrufen (320/360/390 CSS-px); keine überlappenden Elemente oder horizontalen Scrollbalken.
- Auf Plus tippen: Die ausführlichen Angaben werden erst danach sichtbar; nochmal tippen klappt zu. Preise erscheinen ausschließlich als unverbindliche Planung, keine Kaufaktion.
- Der Verlauf wandert langsam durch Weinrot, Orange, Gelb, Grün, Türkis, Blau, Violett. Die Beschriftung muss auf dem bewegten Hintergrund lesbar bleiben.
- In **Design → Animationen reduzieren** prüfen, dass der Farbverlauf stillsteht; zusätzlich Android-Systemeinstellung für reduzierte Bewegung beachten.
- Bahnhofsuche, Abfahrten/Ankünfte, Tabs, Bottom Sheet und Schließen in echter mobiler Chromium-/PWA-Umgebung prüfen.
- Netzwerk offline/online schalten; keine erfundenen Live-Daten und keine unmarkierten Prognosen. Externe Verkehrs- und Kartendaten-Rechte bleiben vor einer öffentlichen Freigabe zu klären.

**Status:** Testumgebung dokumentiert und vorbereitbar, aber noch **nicht** provisioniert. Ohne Cloudflare-Account-Freigabe ist kein echter klickbarer Preview-Link belegbar.
