# BahnConnections auf Cloudflare Workers veröffentlichen – auch vom Handy

**Unveröffentlichter Release Candidate (NO-GO):** V62.0.0 mit Korrekturen für sichtbare Bahnhofshalte, Fahrtverläufe und Filter. Der zuletzt bestätigte Sites-Produktionsstand ist V61.2.1 / Sites-Version 69 unter https://bahnconnections-de.a-stad.chatgpt.site/; V62.0.0 ist hier noch nicht live. Den endgültigen Quell- und Deployment-Nachweis führt [PR #79](https://github.com/Cola968/BahnConnections/pull/85). Sites und ein eigenständiger Cloudflare-Worker sind getrennte Veröffentlichungswege. Checkliste: [V62.0.0](../releases/V62.0.3-RELEASE-CHECKLIST.md).

## Einfachster Weg: Workers Builds mit GitHub

Wenn der Code freigegeben ist, braucht dieser Weg **keinen Cloudflare-API-Token in GitHub Secrets**: Cloudflare richtet den Build-Token selbst ein. Du musst den GitHub-Zugriff einmalig im Dashboard autorisieren. Das geht auch am Smartphone.

1. Zuerst die [Release-Checkliste V62.0.0](../releases/V62.0.3-RELEASE-CHECKLIST.md) abhaken: erfolgreiche GitHub-Checks, Datenrechte (Transitous-Policy, Open-Source-Lizenz, keine ungeklärte kommerzielle Verwendung), Android-/PWA-Smoke und bewusste Veröffentlichungsgenehmigung.
2. Zuerst den geprüften V58-PR #72 und anschließend den geprüften V60-PR #74 und danach den genehmigten V61-Draft-PR auf **`main`** übernehmen. Wenn du erst einen Teststand willst, nutze einen gesonderten Staging-/Preview-Prozess statt unbeabsichtigt Produktion zu überschreiben.
3. [Cloudflare Workers & Pages öffnen](https://dash.cloudflare.com/?to=/:account/workers-and-pages). **Create application → Import a repository** auswählen und GitHub verbinden.
4. Repo **`Cola968/BahnConnections`**, Produktionsbranch **`main`**, Worker-Name **`bahnconnections-standalone`** wählen. Der Worker-Name muss mit `wrangler.jsonc` übereinstimmen.
5. In den Einstellungen folgende Werte eintragen:

| Cloudflare-Einstellung | Wert |
| --- | --- |
| Root directory | Repository-Wurzel / leer |
| Production branch | `main` |
| Build command | `pnpm build:cloudflare` |
| Deploy command | `pnpm deploy:cloudflare` |

6. **Save and Deploy** nur nach erfolgter Freigabe ausführen. Eine tatsächliche `workers.dev`-URL wird erst **nach erfolgreichem** Deployment vergeben. Die vorherige ChatGPT-Sites-URL wird dadurch nicht aktualisiert.
7. Neue Adresse öffnen, `/version.json` auf **`"version": "62.0.3"`** prüfen. Bahnhofssuche, Abfahrten/Ankünfte, Störungsfilter, Journey Planner, Radar, Mobile und PWA-Update testen.
8. Bei Bedarf in **Settings → Builds** die gewünschte Auto-Deploy-/Preview-Branch-Strategie festlegen. Ein Push auf den Produktionsbranch kann einen neuen Build und eine Veröffentlichung auslösen.

Cloudflare Dokumentation: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) und [Build Settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Alternative: GitHub Actions statt Cloudflare Git-Integration

Der Workflow [Standalone Cloudflare Workers](../../.github/workflows/cloudflare-workers.yml) ist ebenfalls eingerichtet.

- Ohne Zugangsdaten kann er Cloudflare-Preflight, TypeScript, Worker-Build und Wrangler-Dry-Run überprüfen.
- Die eigentliche Veröffentlichung läuft **nur von `main`** und nur mit einem ausdrücklich aktivierten Workflow-Dispatch (`publish=true`) oder dem Repository-Opt-in `CLOUDFLARE_DEPLOY_ENABLED=true`.
- **Vereinfacht:** Die nicht geheime Cloudflare-Konto-ID ist bereits als GitHub-Actions-Repository-Variable `CLOUDFLARE_ACCOUNT_ID` hinterlegt. Der Workflow liest sie automatisch; du musst **nur ein Secret** anlegen: `CLOUDFLARE_API_TOKEN`. Niemals das Token im Chat, Quellcode oder PR veröffentlichen.

### GitHub-Verbindung in Cloudflare hängt? Einmalig ohne Import-Dialog

1. [Cloudflare – Account API Tokens](https://dash.cloudflare.com/?to=/:account/api-tokens) öffnen. **Create Token → Edit Cloudflare Workers** wählen. Das Token auf das eigene Cloudflare-Konto beschränken und erstellen. Hinweis: Es wird nur bei Erstellung vollständig angezeigt.
2. In [GitHub → BahnConnections → Actions secrets](https://github.com/Cola968/BahnConnections/settings/secrets/actions) unter **New repository secret** den Namen `CLOUDFLARE_API_TOKEN` wählen und dort den Tokenwert einfügen. **Den Token niemals hier im Chat senden.**
3. Danach kann der bestehende GitHub-Workflow `Standalone Cloudflare Workers` die App direkt über Wrangler bereitstellen, **ohne** Cloudflare „Connect GitHub“ oder die fehlerhafte Weiterleitung. Deployment bleibt bewusst an den Branch `main` und `publish=true` gebunden; V58-PR #72 und V60-PR #74 müssen erst nach Rechte- und QA-Abnahme integriert werden.
4. Erst ein echter Deployment-Erfolg (nicht der erfolgreiche Dry-Run) liefert eine funktionierende Worker-Adresse und beendet den Render-Free-Aufwachbildschirm **für die neu installierte PWA auf Cloudflare**. Bereits auf Render installierte Apps müssen von der Cloudflare-Adresse neu installiert werden.

[Cloudflare-Dokumentation: GitHub Actions mit Wrangler](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/).
- Nicht gleichzeitig beide automatischen Deployment-Wege für denselben Worker aktivieren.

## Was bereits vorbereitet ist

- Getrennter Cloudflare Worker mit `wrangler.jsonc`, `vite.cloudflare.config.ts`, `pnpm build:cloudflare` und `pnpm deploy:cloudflare`.
- App-Version, PWA-Cache, Installations-URL und Changelog sind auf **V62.0.0** abgestimmt. GitHub-Commits veröffentlichen Sites nicht automatisch; der tatsächliche Deployment-Nachweis steht in PR #79.
- Die Code-Tests werden über GitHub Actions ausgeführt; Status immer für den **neuesten** PR-Commit ansehen.

## Offene Freigaben und Grenzen

- **Transitous** unterstützt primär freie, quelloffene, nicht-kommerzielle Projekte. Das öffentliche Repo enthält gegenwärtig **keine `LICENSE`-Datei**. Der Rechteinhaber muss die Lizenz wählen und die Daten-Nutzungsbedingungen sowie eventuelle Gebühren-/Abo-Pläne mit Transitous abklären; [API-Regeln](https://transitous.org/api/).
- Anbieter-Attribution, Kontakt-/Datenschutzhinweise, OSM-/Kartenkachel-Bedingungen und mögliche Zahlungsfunktionen gesondert prüfen.
- Das verbundene Cloudflare-Konto hat noch keinen Worker dieses Projekts. Eine vorhandene Cloudflare-Plugin-Verbindung ersetzt **nicht** den GitHub-Import bzw. den erstmaligen Cloudflare-Build.
- Reale Android-/iOS-/PWA-Gerätetests und Live-Netzwerktests sind unabhängig von simulierten Browserprüfungen nötig.
- Google Play ist ein **separater** Prozess mit Android-Paket, Signatur und Play Console.

**Rückfall:** Bei Fehlern den eigenständigen Worker im Cloudflare-Dashboard auf eine funktionierende Version zurücksetzen. GitHub-Merge-SHA dokumentieren; bei Bedarf Code-Revert. Die bisherige Sites-Adresse bleibt separat erreichbar.


## Google Play und Render-Ladeseite

Für eine Google-Play-App ist Render Free mit einer Einschlaf-/Aufwachseite kein geeigneter Start-Host. Zusätzlich zur Cloudflare-Bereitstellung sind die Domain-Verifizierung, eine echte `assetlinks.json` und signierte Android-Pakete erforderlich: [Anleitung ohne Render-Ladeseite](PLAY-STORE-NO-RENDER-SPLASH.md). Die Cloudflare-Git-Integration muss der Eigentümer **einmalig im Dashboard autorisieren**; ein grüner Worker-Dry-Run ist noch keine Veröffentlichung.
