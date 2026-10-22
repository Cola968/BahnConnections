"use client";

import { useEffect, useRef, useState } from "react";
import { APP_VERSION, APP_VERSION_LABEL, isNewerAppVersion } from "./app-version";
import { publishAvailableAppUpdate } from "./pwa-update-state";

type VersionPayload = {
  version?: string;
  label?: string;
};

type UpdateNotice = {
  label: string;
  waiting?: ServiceWorker;
};

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
      if(version===APP_VERSION){
        // The new page is already running; finish its cache update without a prompt.
        try { waiting?.postMessage({type:"SKIP_WAITING"}); } catch { /* Another tab may have activated it. */ }
        setNotice(null);
        return;
      }
      const label = payload?.label || (version ? `V${version}` : "Neue Version");
      const hasNewVersion = Boolean(waiting) || Boolean(version && isNewerAppVersion(version, APP_VERSION));
      if (!hasNewVersion) return;
      setNotice({ label, waiting:waiting ?? undefined });
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

  useEffect(()=>{
    if(!notice){publishAvailableAppUpdate(null);return;}
    publishAvailableAppUpdate({label:notice.label,activate:()=>{
      const worker=notice.waiting;
      if(!worker||worker.state==="activated"||worker.state==="redundant"){
        window.location.reload();
        return;
      }
      reloadRequestedRef.current=true;
      worker.postMessage({type:"SKIP_WAITING"});
    }});
    return()=>publishAvailableAppUpdate(null);
  },[notice]);

  return notice?<span className="sr-only app-update-status" role="status" aria-live="polite">{notice.label} ist im Menü Mehr oder unter Einstellungen · App verfügbar. Aktuell {APP_VERSION_LABEL}.</span>:null;
}
