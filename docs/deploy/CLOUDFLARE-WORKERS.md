# BahnConnections V56.2 auf Cloudflare Workers veröffentlichen – auch vom Handy

**Release-Kandidat:** [PR #64](https://github.com/Cola968/BahnConnections/pull/64) – **noch nicht auf Cloudflare online**. Hier wird eine eigenständige Web-/PWA-Version vorbereitet; die ursprüngliche ChatGPT-Sites-URL bleibt unabhängig.

## Einfachster Weg: Workers Builds mit GitHub

Wenn der Code freigegeben ist, braucht dieser Weg **keinen Cloudflare-API-Token in GitHub Secrets**: Cloudflare richtet den Build-Token selbst ein. Du musst den GitHub-Zugriff einmalig im Dashboard autorisieren. Das geht auch am Smartphone.

1. Zuerst die [Release-Checkliste V56.2](../releases/V56.2-RELEASE-CHECKLIST.md) abhaken: erfolgreiche GitHub-Checks, Datenrechte (Transitous-Policy, Open-Source-Lizenz, keine ungeklärte kommerzielle Verwendung), Android-/PWA-Smoke und bewusste Veröffentlichungsgenehmigung.
2. Die getestete PR #64 auf **`main`** übernehmen. Wenn du erst einen Teststand willst, nutze einen gesonderten Staging-/Preview-Prozess statt unbeabsichtigt Produktion zu überschreiben.
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
7. Neue Adresse öffnen, `/version.json` auf **`"version": "56.2"`** prüfen. Bahnhofssuche, Abfahrten/Ankünfte, Störungsfilter, Journey Planner, Radar, Mobile und PWA-Update testen.
8. Bei Bedarf in **Settings → Builds** die gewünschte Auto-Deploy-/Preview-Branch-Strategie festlegen. Ein Push auf den Produktionsbranch kann einen neuen Build und eine Veröffentlichung auslösen.

Cloudflare Dokumentation: [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) und [Build Settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/).

## Alternative: GitHub Actions statt Cloudflare Git-Integration

Der Workflow [Standalone Cloudflare Workers](../../.github/workflows/cloudflare-workers.yml) ist ebenfalls eingerichtet.

- Ohne Zugangsdaten kann er Cloudflare-Preflight, TypeScript, Worker-Build und Wrangler-Dry-Run überprüfen.
- Die eigentliche Veröffentlichung läuft **nur von `main`** und nur mit einem ausdrücklich aktivierten Workflow-Dispatch (`publish=true`) oder dem Repository-Opt-in `CLOUDFLARE_DEPLOY_ENABLED=true`.
- Für diese Alternative sind `CLOUDFLARE_API_TOKEN` und `CLOUDFLARE_ACCOUNT_ID` als **GitHub Actions Secrets** erforderlich. Niemals im Chat, Quellcode oder PR veröffentlichen.
- Nicht gleichzeitig beide automatischen Deployment-Wege für denselben Worker aktivieren.

## Was bereits vorbereitet ist

- Getrennter Cloudflare Worker mit `wrangler.jsonc`, `vite.cloudflare.config.ts`, `pnpm build:cloudflare` und `pnpm deploy:cloudflare`.
- App-Version, PWA-Service-Worker-Cache, Installations-URL, Changelog und Release-Notizen sind auf **V56.2** abgestimmt.
- Die Code-Tests werden über GitHub Actions ausgeführt; Status immer für den **neuesten** PR-Commit ansehen.

## Offene Freigaben und Grenzen

- **Transitous** unterstützt primär freie, quelloffene, nicht-kommerzielle Projekte. Das öffentliche Repo enthält gegenwärtig **keine `LICENSE`-Datei**. Der Rechteinhaber muss die Lizenz wählen und die Daten-Nutzungsbedingungen sowie eventuelle Gebühren-/Abo-Pläne mit Transitous abklären; [API-Regeln](https://transitous.org/api/).
- Anbieter-Attribution, Kontakt-/Datenschutzhinweise, OSM-/Kartenkachel-Bedingungen und mögliche Zahlungsfunktionen gesondert prüfen.
- Das verbundene Cloudflare-Konto hat noch keinen Worker dieses Projekts. Eine vorhandene Cloudflare-Plugin-Verbindung ersetzt **nicht** den GitHub-Import bzw. den erstmaligen Cloudflare-Build.
- Reale Android-/iOS-/PWA-Gerätetests und Live-Netzwerktests sind unabhängig von simulierten Browserprüfungen nötig.
- Google Play ist ein **separater** Prozess mit Android-Paket, Signatur und Play Console.

**Rückfall:** Bei Fehlern den eigenständigen Worker im Cloudflare-Dashboard auf eine funktionierende Version zurücksetzen. GitHub-Merge-SHA dokumentieren; bei Bedarf Code-Revert. Die bisherige Sites-Adresse bleibt separat erreichbar.
