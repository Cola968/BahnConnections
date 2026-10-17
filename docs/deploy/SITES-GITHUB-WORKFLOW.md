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

## Site-Automationen (neu geprüft am 17.10.2026)

Die [offizielle OpenAI-Hilfe](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) dokumentiert jetzt **Site-spezifische Cloud-Automationen**, soweit diese Funktion im Konto verfügbar ist. Öffne die **bereits existierende** BahnConnections-Site unter Sites → Automations → Create schedule. Nur der Eigentümer kann die Site mit seiner Schedule verknüpfen. Auch ohne offenen Codex-Chat kann eine solche Aufgabe im Hintergrund laufen.

**Empfohlener stündlicher Auftrag (zunächst KEIN automatisches Veröffentlichen):** „Vergleiche `Cola968/BahnConnections` Branch `feat/v60-next-generation-20261014` gegen die zuletzt gespeicherte Sites-Version für Site-Projekt `appgprj_6a9069a2d9848191b604e8fb97e1c05f`. Prüfe SHA, Quality-/Browser-CI, Datenquellen, #66 und #67; falls alles freigegeben und tatsächlich Site-kompatibel ist, baue eine neue *gespeicherte Version zur Freigabe*, prüfe mobile Planer/Stationsanzeige, protokolliere SHA/Testergebnisse in PR #74. Wenn eine Berechtigung, Quelle oder Tests fehlen, veröffentliche nichts und dokumentiere den Blocker.“

Site-Verknüpfung: `.openai/hosting.json` enthält die bestehende `project_id`. Diese ID **nicht** durch eine neu erzeugte Site-ID ersetzen. Neue Versionen und Deployments sind getrennte Aktionen, laut [Sites-Handbuch](https://learn.chatgpt.com/docs/sites/managing-a-site).

**Grenze:** Eine Website-Schedule ist **keine belegte direkte GitHub-Actions→Sites-Deploy-API**. Es muss im Site-Konto ausprobiert werden, ob die Schedule Quellcodeänderungen automatisch von GitHub laden kann und selbstständig eine gespeicherte Version anlegen darf. Solange diese Probe fehlt: keine automatische Publikationszusage. Siehe auch das [offizielle Sites-Toolkit](https://github.com/openai/sites) (`@openai/sites-vite-plugin` zum Verpacken kompatibler Projekte; kein belegter Publish-Token/CLI-Deploy).
