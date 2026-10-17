# BahnConnections: GitHub → ChatGPT Sites

## Ziel

GitHub bleibt die überprüfbare Quelle für Änderungen. Bestehende ChatGPT-Site: https://bahnconnections-de.a-stad.chatgpt.site/ . **Ein Commit auf GitHub veröffentlicht nicht automatisch die Site.** Der GitHub-Connector kann keinen Sites-Deploy auslösen. Es ist derzeit keine offiziell dokumentierte GitHub-Actions-Deploy-API für ChatGPT Sites bestätigt; keine geheimen Endpunkte, Browser-Cookie-Automation oder Tokens in diesem Repo verwenden.

## Release-Handoff ohne Render oder Cloudflare

1. Gewünschten Commit-SHA und CI-Nachweise im bestehenden Draft-PR #74 dokumentieren. Nur freigegebene Changes übernehmen, nicht automatisch alle noch unfertigen V60-Arbeiten.
2. In ChatGPT **Work** mit `@Sites` die **bestehende** BahnConnections-Site öffnen (keine zweite Site erstellen). Auf GitHub-Repository `Cola968/BahnConnections`, Ziel-Commit und den bestehenden Sites-Projektkontext verweisen.
3. Den Stand aus GitHub übernehmen, Sites-Preview erstellen und Funktionstests durchführen: `/version.json`, Start/Ziel suchen, echte Verbindungssuche inkl. Anbieterfehlern, mobile Planer-Höhe/Scroll/Schließen, Bahnhofstafel, Darkmode, PWA.
4. Änderungen erst nach ausdrücklicher Freigabe in Sites veröffentlichen. Deployment-SHA/Version, URL und Zeitpunkt im PR dokumentieren. Keine automatischen Publishes aus einem CI-Success ableiten.

## Offene Voraussetzungen

- Issue #67: Daten-/Nutzungsrechte und Lizenzfreigabe.
- Issue #66: echte Android-/PWA-Abnahme.
- CI grün bedeutet nicht, dass Live-Datenanbieter oder die veröffentlichte Site funktionieren.

## Für spätere Automatisierung

Falls ChatGPT Sites künftig einen offiziell unterstützten Deploy-Endpunkt oder eine GitHub-Integration anbietet, kann ein abgesicherter GitHub-Actions-Workflow die Build-Artefakte übertragen. Vorher die offizielle API dokumentieren und erforderliche Credentials ausschließlich als GitHub Actions Secrets konfigurieren; keine nicht unterstützten Aufrufe erfinden.
