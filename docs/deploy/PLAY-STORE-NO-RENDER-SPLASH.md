# BahnConnections Android / Google Play – direkt in die App starten, ohne Render-Ladeseite

## Warum erscheint diese Seite?

Die bisherige öffentliche Website `bahnconnections-v55.onrender.com` verwendet nach aktuellem Eindruck den kostenlosen Render-Webservice. Render Free legt Services nach 15 Minuten ohne eingehenden Traffic schlafen. Beim ersten Aufruf nach dem Einschlafen zeigt Render eine eigene Lade-/Aufwachseite, teils circa eine Minute lang.

**Eine Google-Play-Installation behebt das nicht:** Eine Trusted Web Activity (TWA) oder WebView öffnet weiterhin denselben Host. Ein schön gestalteter Splashscreen oder künstliches Ping-System löst weder den Serverstart noch die schlechte Nutzererfahrung. Diese Version darf deshalb **nicht** mit der Render-Free-Adresse in Google Play veröffentlicht werden.

Offizielle Quelle: https://render.com/docs/free

## Zielarchitektur

1. App: unveränderter React-/Vinext-Client und API-Routen im bereits konfigurierten **Cloudflare Worker** `bahnconnections-standalone`.
2. Adresse: öffentliches HTTPS, bevorzugt eine eigene stabile Subdomain wie `app.<eigene-domain>`; für den ersten Test reicht die **nach dem Deployment tatsächlich zugeteilte** `workers.dev`-Adresse. Niemals eine nicht existierende URL raten.
3. Auslieferung: Worker mit Build `pnpm build:cloudflare` und Deploy `pnpm deploy:cloudflare`. Keine Render-Sleep-Seite. Ein Cloudflare-Worker kann trotzdem Netzwerk-/Quellenfehler erleben; deshalb tatsächliche API-Aufrufe testen.
4. PWA: Webmanifest nutzt `start_url:"/"`, `scope:"/"`, `display:"standalone"`. Ohne expliziten Override darf `metadataBase` nicht mehr auf den alten Sites-Host festgenagelt sein. `NEXT_PUBLIC_APP_ORIGIN` kann für die neue kanonische HTTPS-Adresse gesetzt werden.
5. Android: per Bubblewrap / PWA Builder aus **genau dieser** Worker-Origin eine Android-App (TWA) erstellen. Die Origin bleibt auch nach Play-Store-Freigabe unverändert; ein Providerwechsel erfordert Umzug mit Bedacht.

## Einmaliger Einrichtungsschritt auf dem Handy

1. Über https://dash.cloudflare.com/ zum verbundenen Konto gehen.
2. **Workers & Pages → Create application → Import a repository**.
3. GitHub-Zugriff einmalig autorisieren; Repository `Cola968/BahnConnections` wählen. **Production branch `main`** erst dann, wenn geprüfte Release-Änderungen gemergt sind; für unveröffentlichten V57.3-Code zunächst eine separate Vorschau verwenden.
4. Worker-Name `bahnconnections-standalone`, Build `pnpm build:cloudflare`, Deploy `pnpm deploy:cloudflare`, Root-Verzeichnis Wurzel. `wrangler.jsonc` und `vite.cloudflare.config.ts` sind im Repository.
5. **Save and Deploy**; erst danach liegt eine reale `https://...workers.dev`-Adresse vor. Die Render-Adresse wird durch diesen Schritt **nicht** ersetzt.
6. Auf der neuen Origin `/`, `/version.json`, `/manifest.webmanifest`, `/sw.js`, den Planer, die Tafel, Fahrtverläufe und APIs mit realen Quellen prüfen. Auf Android Chrome installieren, App schließen und kalt erneut öffnen.
7. Wenn verfügbar, eigene HTTPS-Domain in Cloudflare konfigurieren, **bevor** die Play-Store-App gepackt wird. Exakte Origin für die TWA festschreiben.
8. `NEXT_PUBLIC_APP_ORIGIN` auf diese Origin (ohne Pfad) konfigurieren, damit OpenGraph-/Share-Links denselben App-Ursprung verwenden.

## Verbindlicher automatischer Abnahmetest vor Google Play

**Statische Prüfung (läuft in GitHub Actions):**

```bash
pnpm audit:play-hosting
```

Dieser Test schließt direkte `*.onrender.com`-Starts, alte Sites-Hosts, HTTP, lokale und falsche Pfade aus.

**Echter Online-/TWA-Starttest (erst nach einer echten Cloudflare-URL):**

```bash
BAHNCONNECTIONS_PLAY_ORIGIN="https://TATSAECHLICHE-APP-DOMAIN" pnpm smoke:play-start
```

Prüft Root-Seite statt Infrastrukturladeseite, Versionsdatei und PWA-Manifest, Service Worker, Same-Origin-Weiterleitungen und die **echte** Android-Digital-Asset-Link-Verknüpfung. Ein Test ohne tatsächliche HTTPS-App-URL kann und darf nicht als bestanden gelten. Ergänzend nach mindestens 20 Minuten Inaktivität auf echtem Gerät einen Cold-Start überprüfen.

## Google Play: Android-Paket signieren und Domain verifizieren

Der Play Store benötigt mehr als eine PWA-URL. Eine einfache Option ist eine **Trusted Web Activity** mit Googles Bubblewrap oder PWABuilder. Das Projekt wird für die tatsächliche Veröffentlichungsdomain konfiguriert und daraus ein signiertes Android-App-Bundle (`.aab`) erzeugt.

**Digital Asset Links:** Die Datei `/.well-known/assetlinks.json` muss auf der echten App-Origin ausgeliefert werden und die echte Android-Paket-ID und den **SHA-256-Fingerabdruck des Play-App-Signing-Schlüssels** enthalten. Beispiel-Format, **keine produktive Datei**:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "de.beispiel.bahnconnections",
    "sha256_cert_fingerprints": ["AA:BB:...:ECHTER-PLAY-FINGERPRINT"]
  }
}]
```

Die Paketkennung und der richtige Google-Play-Signatur-Fingerabdruck müssen noch vom Eigentümer festgelegt/ermittelt werden. **Keinen erfundenen Fingerprint in `public/.well-known/assetlinks.json` committen** – andernfalls startet statt der vollbildigen TWA möglicherweise ein Browser-Tab. Signing-Schlüssel, Passwörter und API-Tokens niemals in GitHub oder Chat posten.

Dokumentation: https://developer.android.com/develop/ui/views/layout/webapps/guide-trusted-web-activities-version2 und https://developer.chrome.com/docs/android/trusted-web-activity/android-for-web-devs

## Weitere Freigabepunkte

- **Datenrechte und fehlende Open-Source-Lizenz:** vor breiter bzw. kommerzieller Veröffentlichung mit Transitous und anderen Anbietern klären (Issue #67).
- Datenschutz, Impressum/Kontakt, Google-Play-Datensicherheit und Berechtigungsangaben.
- Echte Android-/PWA-/TalkBack-Tests (Issue #66), Performance und PWA-Service-Worker-Updates.
- Der Worker und die Website werden nicht allein durch das Anlegen dieses Dokuments publiziert. Öffentliche Freigabe erfolgt ausdrücklich nach Review.

## Alternative ohne Cloudflare

Render auf einen **kostenpflichtigen, nicht einschlafenden Web-Service-Tarif** umstellen. Das ist eine zahlungspflichtige Änderung und benötigt ausdrückliche Zustimmung. Auch dann muss die tatsächliche Launch-Origin getestet werden. Ein Free-Render-Uptime-Ping wird bewusst **nicht** als produktionsreife Lösung angeboten.
