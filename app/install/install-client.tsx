"use client";
/* eslint-disable @next/next/no-html-link-for-pages -- installation recovery must navigate even when client hydration fails. */

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome:"accepted" | "dismissed" }> };

export function InstallClient() {
  const [promptEvent, setPromptEvent] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "desktop">("desktop");
  const [repairing, setRepairing] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLocaleLowerCase();
    const initialTimer = window.setTimeout(() => {
      setPlatform(/iphone|ipad|ipod/.test(ua) ? "ios" : /android/.test(ua) ? "android" : "desktop");
      setInstalled(window.matchMedia("(display-mode: standalone)").matches);
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

  if (installed) return <div className="install-status success"><b>✓ App-Modus aktiv</b><span>BahnConnections läuft als installierte App. Falls du nach einem Update hier landest, öffne jetzt die Karte.</span><a className="install-primary" href="/?source=pwa">Bahnkarte öffnen</a><button type="button" className="install-secondary" onClick={() => void repair()} disabled={repairing}>{repairing ? "Offline-Cache wird entfernt …" : "App-Verbindung reparieren"}</button></div>;
  return <div className="install-actions">
    {promptEvent && <button type="button" className="install-primary" onClick={() => void install()}>App jetzt installieren</button>}
    {!promptEvent && platform === "ios" && <div className="install-steps"><b>Auf iPhone oder iPad</b><ol><li>Unten auf <strong>Teilen</strong> tippen.</li><li><strong>Zum Home-Bildschirm</strong> wählen.</li><li>Mit <strong>Hinzufügen</strong> bestätigen.</li></ol></div>}
    {!promptEvent && platform === "android" && <div className="install-steps"><b>Auf Android</b><ol><li>Das Browsermenü <strong>⋮</strong> öffnen.</li><li><strong>App installieren</strong> oder <strong>Zum Startbildschirm</strong> wählen.</li><li>Installation bestätigen.</li></ol></div>}
    {!promptEvent && platform === "desktop" && <div className="install-steps"><b>Auf dem Computer</b><p>Öffne diese Seite in Chrome oder Edge und wähle rechts in der Adresszeile „App installieren“. Auf Mobilgeräten erscheinen hier passende Anweisungen.</p></div>}
    <a className="install-map-link" href="/">Bahnkarte öffnen</a>
    <button type="button" className="install-secondary" onClick={() => void repair()} disabled={repairing}>{repairing ? "Offline-Cache wird entfernt …" : "Alten Offline-Cache entfernen"}</button>
    <small className="install-repair-note">Entfernt nur BahnConnections-Service-Worker und Cache. Favoriten und letzte Suchen bleiben erhalten.</small>
  </div>;
}
