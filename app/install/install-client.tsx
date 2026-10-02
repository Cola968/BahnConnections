"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- installation recovery must navigate even when client hydration fails. */

import { useEffect, useState } from "react";
import { APP_VERSION, APP_VERSION_LABEL, isNewerAppVersion } from "../app-version";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome:"accepted" | "dismissed" }> };
type VersionPayload = { version?: string; label?: string };

async function waitForWaitingWorker(registration: ServiceWorkerRegistration, timeoutMs = 8000) {
  if (registration.waiting) return registration.waiting;
  return await new Promise<ServiceWorker | null>((resolve) => {
    let settled = false;
    let timer = 0;
    const finish = (worker: ServiceWorker | null) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      registration.removeEventListener("updatefound", inspect);
      resolve(worker);
    };
    const watch = (worker: ServiceWorker) => {
      const onStateChange = () => {
        if (worker.state === "installed") finish(registration.waiting ?? worker);
        if (worker.state === "redundant") finish(null);
      };
      worker.addEventListener("statechange", onStateChange, { once:false });
    };
    const inspect = () => {
      if (registration.waiting) return finish(registration.waiting);
      if (registration.installing) watch(registration.installing);
    };
    registration.addEventListener("updatefound", inspect);
    inspect();
    timer = window.setTimeout(() => finish(registration.waiting), timeoutMs);
  });
}

export function InstallClient() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [repairing, setRepairing] = useState(false);
  const [requestedUpdate, setRequestedUpdate] = useState<string | null>(null);
  const [updateState, setUpdateState] = useState<"idle" | "checking" | "activating" | "done" | "unavailable" | "error">("idle");

  useEffect(() => {
    const ua = navigator.userAgent.toLocaleLowerCase();
    const initialTimer = window.setTimeout(() => {
      setPlatform(/iphone|ipad|ipod/.test(ua) ? "ios" : /android/.test(ua) ? "android" : "desktop");
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
      setRequestedUpdate(new URLSearchParams(window.location.search).get("update"));
    }, 0);
    const onPrompt = (event: Event) => { event.preventDefault(); setPromptEvent(event as InstallPromptEvent); };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.clearTimeout(initialTimer); window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
  }, []);

  async function install() {
    if (!promptEvent) return;
    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setPromptEvent(null);
  }

  async function updateApp() {
    setUpdateState("checking");
    try {
      const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      for (const registration of registrations) {
        try { await registration.update(); } catch { /* keep checking other registrations */ }
      }

      let waiting: ServiceWorker | null = null;
      for (const registration of registrations) {
        waiting = await waitForWaitingWorker(registration);
        if (waiting) break;
      }

      if (waiting) {
        setUpdateState("activating");
        const fallback = window.setTimeout(() => window.location.replace("/?source=pwa&updated=1"), 5000);
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.clearTimeout(fallback);
          window.location.replace("/?source=pwa&updated=1");
        }, { once:true });
        waiting.postMessage({ type:"SKIP_WAITING" });
        return;
      }

      const response = await fetch(`/version.json?ts=${Date.now()}`, { cache:"no-store" });
      const payload = response.ok ? await response.json() as VersionPayload : {};
      if (payload.version && !isNewerAppVersion(payload.version, APP_VERSION)) {
        setUpdateState("done");
      } else if (requestedUpdate && payload.label && requestedUpdate === payload.label && payload.version && isNewerAppVersion(payload.version, APP_VERSION)) {
        setUpdateState("unavailable");
      } else {
        setUpdateState("unavailable");
      }
    } catch {
      setUpdateState("error");
    }
  }

  async function repair() {
    setRepairing(true);
    try {
      const registrations = "serviceWorker" in navigator ? await navigator.serviceWorker.getRegistrations() : [];
      await Promise.all(registrations.map((registration) => registration.unregister()));
      if ("caches" in window) await Promise.all((await caches.keys()).map((key) => caches.delete(key)));
      window.location.replace("/install?repaired=1");
    } catch {
      setRepairing(false);
    }
  }

  const updatePanel = requestedUpdate ? (
    <div className="install-update-panel" role="status">
      <b>{requestedUpdate} herunterladen / aktualisieren</b>
      <span>Installierte BahnConnections-Version: {APP_VERSION_LABEL}. Die Web-App lädt Updates direkt vom BahnConnections-Server; es gibt keine separate APK-Datei.</span>
      <button type="button" className="install-primary" onClick={() => void updateApp()} disabled={updateState === "checking" || updateState === "activating"}>
        {updateState === "checking" ? "Update wird gesucht …" : updateState === "activating" ? "Neue Version wird aktiviert …" : "Neue Version laden"}
      </button>
      {updateState === "done" && <small>✓ Du verwendest bereits die aktuell veröffentlichte Version.</small>}
      {updateState === "unavailable" && <small>Die angeforderte Version ist auf dem Hosting noch nicht verfügbar. Versuche es später erneut.</small>}
      {updateState === "error" && <small>Das Update konnte gerade nicht geprüft werden. Internetverbindung prüfen und erneut versuchen.</small>}
    </div>
  ) : null;

  if (installed) return <div className="install-status success"><b>✓ App-Modus aktiv</b><span>BahnConnections läuft als installierte App. Updates können direkt hier geladen werden.</span>{updatePanel}<a className="install-primary" href="/?source=pwa">Bahnkarte öffnen</a><button type="button" className="install-secondary" onClick={() => void repair()} disabled={repairing}>{repairing ? "Offline-Cache wird entfernt …" : "App-Verbindung reparieren"}</button></div>;
  return <div className="install-actions">
    {updatePanel}
    {promptEvent && <button type="button" className="install-primary" onClick={() => void install()}>App jetzt installieren</button>}
    {!promptEvent && platform === "ios" && <div className="install-steps"><b>Auf iPhone oder iPad</b><ol><li>Unten auf <strong>Teilen</strong> tippen.</li><li><strong>Zum Home-Bildschirm</strong> wählen.</li><li>Mit <strong>Hinzufügen</strong> bestätigen.</li></ol></div>}
    {!promptEvent && platform === "android" && <div className="install-steps"><b>Auf Android</b><ol><li>Das Browsermenü <strong>⋮</strong> öffnen.</li><li><strong>App installieren</strong> oder <strong>Zum Startbildschirm</strong> wählen.</li><li>Installation bestätigen.</li></ol></div>}
    {!promptEvent && platform === "desktop" && <div className="install-steps"><b>Auf dem Computer</b><p>Öffne diese Seite in Chrome oder Edge und wähle rechts in der Adresszeile „App installieren“. Auf Mobilgeräten erscheinen hier passende Anweisungen.</p></div>}
    <a className="install-map-link" href="/">Bahnkarte öffnen</a>
    <button type="button" className="install-secondary" onClick={() => void repair()} disabled={repairing}>{repairing ? "Offline-Cache wird entfernt …" : "Alten Offline-Cache entfernen"}</button>
    <small className="install-repair-note">Entfernt nur BahnConnections-Service-Worker und Cache. Favoriten und letzte Suchen bleiben erhalten.</small>
  </div>;
}
