# Eigenständige BahnConnections V55.0 auf Cloudflare Workers

**Status:** Vorbereitung. Dieses GitHub-PR richtet **kein** Cloudflare-Konto ein, veröffentlicht keine Website und verändert die bisherige ChatGPT-Sites-Adresse nicht.

## Was bereits vorhanden ist

Das V55-Projekt enthält Next.js App Router, serverseitige Fahrplan-/Zug-APIs, React-Server-Komponenten und eine installierbare PWA. Der bisherige Build (`vite.config.ts`) lädt zusätzlich das ChatGPT-Sites-Plugin und optional das Sites-Binding `.openai/hosting.json`. Die eigenständige Zielumgebung besteht aus:

- `vite.cloudflare.config.ts`: eigener `vinext`-/Cloudflare-Build **ohne** Sites-Plugin.
- `wrangler.cloudflare.jsonc`: Worker `bahnconnections-standalone`, Node-Kompatibilität, SSR/RSC, statische PWA-Dateien.
- `scripts/cloudflare-output-config.mjs`: findet die **generierte** Worker-Konfigurationsdatei aus `dist` (Pfad kann zwischen Plugin-Versionen variieren).
- `.github/workflows/cloudflare-workers.yml`: führt bei Pull Requests **nur** Build + Wrangler-Dry-Run aus. Produktive Deployments sind manuell oder nach ausdrücklicher Freigabe einer GitHub-Repository-Variable möglich.

**GitHub Pages ist keine gleichwertige Alternative:** Es kann die dynamischen API-Routen und Serverfunktionen dieser Anwendung nicht ohne Umbau betreiben.

## Einmalige Cloudflare-Einrichtung (am PC oder Mobilbrowser)

1. Bei [Cloudflare](https://dash.cloudflare.com/sign-up) anmelden. Im Dashboard **Workers & Pages** öffnen, ein Konto auswählen und gegebenenfalls die `workers.dev`-Subdomain aktivieren. Einen bestehenden Worker brauchst du vorher nicht zu erstellen: Wrangler kann ihn mit dem ersten Deployment anlegen.
2. Die **Account ID** dieses Cloudflare-Kontos kopieren. Sie steht im Dashboard unter dem gewählten Konto beziehungsweise Workers & Pages. Dies ist eine Konto-Kennung, *kein* API-Token.
3. Unter [Cloudflare API Tokens](https://dash.cloudflare.com/profile/api-tokens) **Create Token → Edit Cloudflare Workers** auswählen. Auf **genau das gewünschte Cloudflare-Konto** begrenzen (Least Privilege). Für `workers.dev` ist üblicherweise die Account-Berechtigung **Workers Scripts: Edit** erforderlich. Für eigene Domains/Routen gegebenenfalls zusätzliche Berechtigungen; diese erst später freischalten. Den generierten Token **niemals in Chat, Screenshots, GitHub-Dateien oder Issues teilen**.
4. Im Repository [Cola968/BahnConnections → Settings → Secrets and variables → Actions](https://github.com/Cola968/BahnConnections/settings/secrets/actions) zwei **Repository-Secrets** anlegen:

   | Name | Wert |
   |---|---|
   | `CLOUDFLARE_ACCOUNT_ID` | Die Account ID aus Schritt 2 |
   | `CLOUDFLARE_API_TOKEN` | Der auf das Konto beschränkte API-Token aus Schritt 3 |

   GitHub-Secrets sind verschlüsselte Werte; die Namen dürfen in der Workflow-Datei stehen, die **Werte nicht**.
5. Optional: In **Settings → Environments** das Environment `cloudflare-production` erstellen und einen erforderlichen Reviewer konfigurieren. So kann niemand einen produktiven Deploy ohne Freigabe starten. Falls du Secrets stattdessen als *Environment Secrets* speichern willst, nutze genau dieses Environment und dieselben beiden Namen.
6. Erst wenn dieser PR **nach `main` gemergt** wurde: **Actions → Standalone Cloudflare Workers → Run workflow → main** öffnen und `publish` aktivieren. Eine manuelle Veröffentlichung erfordert ein bestätigtes Recht, die verwendeten Daten öffentlich bereitzustellen. Ein Testlauf ohne `publish` erstellt nur einen Dry-Run.
7. Nach dem ersten erfolgreichen Deploy gibt Wrangler die neue `https://bahnconnections-standalone.<deine-workers-subdomain>.workers.dev`-Adresse aus. **Nicht** die Subdomain vorher erraten. Die App auf dieser Domain kontrollieren: `/version.json` muss `55.0` melden; Stationensuche, Abfahrtstafel, Zugradar, ETA, Follow/Stop, mobile Ansicht und PWA müssen funktionieren.
8. Optional: Die vollständige HTTPS-Adresse als GitHub **Repository-Variable** `CLOUDFLARE_WORKER_URL` hinterlegen, damit der Deploy nach dem Start `/version.json` automatisch prüft. Wenn du alle späteren `main`-Änderungen automatisch veröffentlichen möchtest, außerdem die Variable `CLOUDFLARE_DEPLOY_ENABLED` mit genau `true` setzen. **Standard ist aus.**

**Die zwei Cloudflare-Secrets reichen für das reine Workers-Deployment aus.** Die Bahn-/Zug-APIs verwenden öffentlich erreichbare externe Quellen. Es werden keine zusätzlichen Schlüssel für Transitous oder DB transport.rest in der Deployment-Automation verlangt.

## Kosten, Rechte und Grenzen

- Cloudflare Workers bietet einen kostenlosen Tarif mit Limits; hoher Traffic, lange API-Laufzeiten, Worker-Größe, Rate Limits und eventuell erforderliche Funktionen können Kosten oder ein Upgrade auslösen. Vor dem Deployment im Cloudflare-Dashboard den ausgewählten Plan und Limits kontrollieren.
- Die öffentliche Transitous-API ist auf ihren Nutzungszweck und insbesondere nichtkommerzielle Open-Source-Verwendung beschränkt. Ein öffentliches GitHub-Repository ohne passende Open-Source-Lizenz ist **nicht automatisch Open Source im lizenzrechtlichen Sinne**. Prüfe Datenlizenz/Nutzungsbedingungen und die unabhängige DB-Datenquelle, bevor die neue Domain öffentlich beworben oder kommerziell genutzt wird.
- Für die Standalone-Version gibt es aktuell **kein D1-/R2-Binding und kein Stripe-Billing-Setup**. Abos müssen deshalb deaktiviert bleiben. Keine Stripe-Keys zu GitHub Actions hinzufügen, solange keine explizite Freigabe und erforderliche Infrastruktur vorliegt.
- Der Worker wird mit einer **neuen Origin** installiert. Bestehende Service-Worker/PWA-Installationen auf `a-stad.chatgpt.site` aktualisieren sich dadurch nicht automatisch; es ist keine Übernahme der alten Domain. Wer eine eigene Domain verwendet, braucht deren DNS-Zugriff und eine gesonderte Cloudflare-Route.
- Die App-Metadaten verweisen teilweise noch auf die bisherige ChatGPT-Sites-Origin. Nach Festlegung der neuen Live-Domain müssen Canonical-/Social-Metadaten und externe Links angepasst werden.
- Bei `wrangler deploy` wird der für die aktuelle Vite-/Cloudflare-Plugin-Version **generierte** `dist/<worker>/wrangler.json` verwendet; nicht die Quellkonfiguration direkt deployen. Der Pfad wird über das kleine Skript ermittelt.

## Ohne Secrets lokal und in CI prüfen

```bash
pnpm install --frozen-lockfile
pnpm audit:cloudflare
pnpm exec tsc --noEmit
pnpm build:cloudflare
pnpm exec wrangler deploy --config "$(node scripts/cloudflare-output-config.mjs)" --dry-run --outdir .wrangler/cloudflare-dry-run
```

Der Dry-Run schickt **nichts** live und benötigt keinen Cloudflare-API-Token. Bei Buildfehlern zuerst den Pull-Request-Check korrigieren. Der bestehende Sites-Build `pnpm build` und die Qualitäts-CI bleiben davon unabhängig.
