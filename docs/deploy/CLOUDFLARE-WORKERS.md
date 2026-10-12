# BahnConnections V55 auf Cloudflare veröffentlichen – einfach vom Handy

**Einfachster Weg: Cloudflare Workers Builds mit GitHub verbinden. Keine API-Token, keine Account-ID und keine GitHub Secrets nötig.** Cloudflare erzeugt und verwaltet seinen Deployment-Token selbst. Die bestehende ChatGPT-Sites-Adresse bleibt unberührt.

## 1. Vorbereiteter Code

- V55 auf `main`, sobald Pull Request #58 freigegeben und gemergt wurde.
- `wrangler.jsonc`: offizielle Cloudflare Worker-Konfiguration. Name ist **`bahnconnections-standalone`**.
- `vite.cloudflare.config.ts`: separater Server-/PWA-Build ohne ChatGPT-Sites-Plugin; der bestehende Sites-Build bleibt unabhängig.
- `pnpm build:cloudflare`: erstellt den Cloudflare-Worker einschließlich API-Endpunkten und Browser-Dateien.
- `pnpm deploy:cloudflare`: veröffentlicht genau den fertig gebauten Worker.
- `.github/workflows/cloudflare-workers.yml`: optionale Alternative mit GitHub Actions. Produktives Deployment ist dort weiterhin nur von `main` und mit ausdrücklicher Freigabe erlaubt.

## 2. Einmalig auf dem Handy klicken – ohne Tokens

1. Öffne [Cloudflare Workers & Pages](https://dash.cloudflare.com/?to=/:account/workers-and-pages) und melde dich an (ein kostenloses Konto reicht zum Einstieg).
2. **Create application → Import a repository → GitHub verbinden**. Bei der GitHub-Freigabe nur `Cola968/BahnConnections` auswählen, wenn Cloudflare die Repository-Auswahl anbietet.
3. Das Repository **`Cola968/BahnConnections`** und den Branch **`main`** wählen. Den Worker **`bahnconnections-standalone`** nennen, exakt wie in `wrangler.jsonc`.
4. Die folgenden Werte in den Build-Einstellungen eintragen (per Kopieren):

| Cloudflare-Feld | Wert |
| --- | --- |
| Root directory | Repository-Root (`/`, beziehungsweise Feld leer lassen) |
| Production branch | `main` |
| Build command | `pnpm build:cloudflare` |
| Deploy command | `pnpm deploy:cloudflare` |

Falls Cloudflare bereits einen anderen Build- oder Deploy-Befehl eingesetzt hat: **durch diese Werte ersetzen**. Nicht `pnpm build` verwenden – das startet den alten Sites-Build! Der Default `npx wrangler deploy` würde die vom Plugin generierte Bundle-Konfiguration nicht zuverlässig finden.

5. **Save and Deploy**: Cloudflare installiert Abhängigkeiten, baut und veröffentlicht den Worker. Cloudflare Builds erstellt dabei selbst einen API-Token für das Projekt; du musst keinen in GitHub hinterlegen. Die echte `workers.dev`-Adresse erscheint erst danach.
6. Auf der neuen Website prüfen: `/version.json` liefert `55.0`, die Bahnhofssuche und Abfahrtstafeln laden, der Zugradar lässt sich öffnen und die PWA funktioniert. Teile erst dann die neue Adresse.

**Hinweis:** Mit „Save and Deploy“ wird die App online erreichbar; prüfe vor diesem Klick insbesondere die Nutzungsbedingungen der externen Fahrplandaten. Auch ein kostenloser Tarif hat technische Limits. Cloudflare kann später bei jedem Push auf `main` automatisch eine neue Version bauen und bereitstellen. Für eine zunächst kontrollierte Freigabe in Cloudflare **Settings → Builds** automatische Deployments deaktivieren bzw. nur Versionen hochladen, sofern die Oberfläche diese Option anbietet.

## 3. Was du NICHT machen musst

- Keinen Computer einschalten oder Terminal bedienen.
- Keinen `CLOUDFLARE_ACCOUNT_ID` und `CLOUDFLARE_API_TOKEN` in GitHub Secrets eintragen.
- Keine GitHub-Action manuell starten.
- Keine eigene Domain kaufen.
- Kein neues BahnConnections-Repository erstellen.

**Einzig unvermeidbar:** Du musst Cloudflare einmal erlauben, auf dein GitHub-Repository zuzugreifen. Das ist eine Kontofreigabe, die ChatGPT nicht für dich ausführen kann.

## 4. Alternative: GitHub Actions (nur wenn du das bevorzugst)

Wenn du **nicht** die native Cloudflare-GitHub-Anbindung nutzen möchtest, existiert zusätzlich die GitHub-Action „Standalone Cloudflare Workers“. Hierfür wären zwei GitHub Actions Secrets nötig: `CLOUDFLARE_ACCOUNT_ID` (Account ID) und `CLOUDFLARE_API_TOKEN` (auf das Konto beschränkter Token, Workers Scripts: Edit). Die Werte gehören ausschließlich in **Settings → Secrets and variables → Actions**, nie in Chat, PRs oder Dateien. Nach dem Merge des PR kann ein Deployment auf `main` in GitHub Actions manuell mit `publish=true` gestartet werden. Standardmäßig führt die Action nur einen Build-Dry-Run durch.

Verwende **nicht beide automatischen Produktions-Deploy-Wege gleichzeitig**, sonst konkurrieren zwei Systeme um denselben Worker. Für den normalen Betrieb ist Cloudflare Workers Builds die einfachere Wahl.

## 5. Technische Grenzen und Lizenz

- Der Worker enthält SSR/RSC und App-Router-API-Routen, nicht nur eine statische Webseite.
- Kein D1/R2-Binding, kein betriebsfertiges Stripe-Billing: Bezahlfunktionen und Nutzerkonten nicht als fertig anbieten.
- Die Transitous Public API hat Nutzungsbedingungen; ein öffentliches Repository ohne Open-Source-Lizenz erfüllt nicht automatisch Anforderungen an Open Source. Vor öffentlicher Bewerbung oder Kommerzialisierung die Datenrechte prüfen.
- Die neue Cloudflare-Origin ist unabhängig von `bahnconnections-de.a-stad.chatgpt.site`; installierte PWAs auf der alten Domain werden nicht automatisch migriert.
- Die Metadaten für Canonical/Social Preview verweisen teilweise noch auf die alte Domain und sollten nach dem ersten Deployment zur neuen festen Domain aktualisiert werden.
- Build- und Dry-Run-Prüfungen auf GitHub ersetzen keinen echten Browser- und Android-Gerätetest unter der neuen URL.

### Entwicklerprüfung ohne Zugangsdaten

```bash
pnpm install --frozen-lockfile
pnpm audit:cloudflare
pnpm exec tsc --noEmit
pnpm build:cloudflare
pnpm exec wrangler deploy --config "$(node scripts/cloudflare-output-config.mjs)" --dry-run
```

Die bestehende ChatGPT-Sites-Buildkonfiguration `vite.config.ts` wurde absichtlich nicht umgestellt.
