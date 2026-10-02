"use client";

import { useEffect, useRef, useState } from "react";
import { APP_VERSION, APP_VERSION_LABEL, isNewerAppVersion } from "./app-version";

type VersionPayload = {
  version?: string;
  label?: string;
  installPath?: string;
};

type UpdateNotice = {
  label: string;
  installPath: string;
  waiting?: ServiceWorker;
};

const DISMISSED_UPDATE_KEY = "bahnconnections-dismissed-update";

function fallbackInstallPath(label: string) {
  return `/install?update=${encodeURIComponent(label)}`;
}

export function PwaRegister() {
  const [notice, setNotice] = useState<UpdateNotice | null>(null);
  const reloadRequestedRef = useRef(false);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let active = true;
    let reloading = false;
    let registration: ServiceWorkerRegistration | null = null;
    let removeWorkerRefreshListeners = () => undefined;
    let updateTimer: number | undefined;

    const showNotice = (payload?: VersionPayload, waiting?: ServiceWorker | null) => {
      if (!active) return;
      const version = payload?.version?.replace(/^v/i, "");
      const label = payload?.label || (version ? `V${version}` : "Neue Version");
      const installPath = payload?.installPath || fallbackInstallPath(label);
      const hasNewVersion = Boolean(waiting) || Boolean(version && isNewerAppVersion(version, APP_VERSION));
      if (!hasNewVersion) return;
      if (window.localStorage.getItem(DISMISSED_UPDATE_KEY) === label) return;
      setNotice({ label, installPath, waiting:waiting ?? undefined });
    };

    const fetchVersion = async () => {
      try {
        const response = await fetch(`/version.json?ts=${Date.now()}`, { cache:"no-store" });
        if (!response.ok) return undefined;
        return await response.json() as VersionPayload;
      } catch {
        return undefined;
      }
    };

    const checkForUpdates = async () => {
      if (!active || !registration) return;
      try { await registration.update(); } catch { /* The current app remains usable offline. */ }
      const payload = await fetchVersion();
      if (!active) return;
      if (registration.waiting) {
        showNotice(payload ?? { label:"Neue Version" }, registration.waiting);
        return;
      }
      if (payload?.version && isNewerAppVersion(payload.version, APP_VERSION)) showNotice(payload);
    };

    const controllerChange = () => {
      if (!active || reloading || !reloadRequestedRef.current) return;
      reloading = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);

    void navigator.serviceWorker.register("/sw.js", { scope:"/", updateViaCache:"none" }).then(async (currentRegistration) => {
      if (!active) return;
      registration = currentRegistration;

      const inspectInstallingWorker = () => {
        const worker = currentRegistration.installing;
        if (!worker) return;
        const onStateChange = async () => {
          if (!active || worker.state !== "installed" || !navigator.serviceWorker.controller) return;
          const payload = await fetchVersion();
          showNotice(payload ?? { label:"Neue Version" }, currentRegistration.waiting ?? worker);
        };
        worker.addEventListener("statechange", onStateChange);
      };

      if (currentRegistration.waiting) {
        const payload = await fetchVersion();
        showNotice(payload ?? { label:"Neue Version" }, currentRegistration.waiting);
      }

      currentRegistration.addEventListener("updatefound", inspectInstallingWorker);
      inspectInstallingWorker();

      const refreshWorker = () => {
        if (document.visibilityState === "visible") void checkForUpdates();
      };
      window.addEventListener("online", refreshWorker);
      document.addEventListener("visibilitychange", refreshWorker);
      removeWorkerRefreshListeners = () => {
        window.removeEventListener("online", refreshWorker);
        document.removeEventListener("visibilitychange", refreshWorker);
        currentRegistration.removeEventListener("updatefound", inspectInstallingWorker);
      };

      await checkForUpdates();
      updateTimer = window.setInterval(() => void checkForUpdates(), 30 * 60 * 1000);
    }).catch(() => undefined);

    return () => {
      active = false;
      removeWorkerRefreshListeners();
      if (updateTimer !== undefined) window.clearInterval(updateTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", controllerChange);
    };
  }, []);

  if (!notice) return null;

  const activateWaitingUpdate = () => {
    if (!notice.waiting) {
      window.location.assign(notice.installPath);
      return;
    }
    reloadRequestedRef.current = true;
    notice.waiting.postMessage({ type:"SKIP_WAITING" });
  };

  const dismiss = () => {
    window.localStorage.setItem(DISMISSED_UPDATE_KEY, notice.label);
    setNotice(null);
  };

  return (
    <aside className="app-update-notice" role="status" aria-live="polite">
      <div>
        <b>Neue BahnConnections-Version verfügbar</b>
        <span>{notice.label} kann jetzt geladen werden. Du nutzt aktuell {APP_VERSION_LABEL}.</span>
      </div>
      <div className="app-update-actions">
        <button type="button" onClick={activateWaitingUpdate}>{notice.waiting ? "Jetzt aktualisieren" : "Update prüfen"}</button>
        <a href={notice.installPath}>Download / Installation</a>
        <button type="button" className="app-update-dismiss" onClick={dismiss} aria-label="Update-Hinweis später anzeigen">Später</button>
      </div>
    </aside>
  );
}
