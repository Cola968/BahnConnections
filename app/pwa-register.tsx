"use client";

import { useEffect } from "react";

export function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let active = true;
    let reloading = false;
    let removeWorkerRefreshListeners = () => undefined;
    const controllerChange = () => {
      if (!active || reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", controllerChange);
    void navigator.serviceWorker.register("/sw.js", { scope:"/", updateViaCache:"none" }).then((registration) => {
      if (!active) return;
      void registration.update();
      const refreshWorker = () => { if (document.visibilityState === "visible") void registration.update(); };
      window.addEventListener("online", refreshWorker);
      document.addEventListener("visibilitychange", refreshWorker);
      removeWorkerRefreshListeners = () => { window.removeEventListener("online", refreshWorker); document.removeEventListener("visibilitychange", refreshWorker); };
    }).catch(() => undefined);
    return () => { active = false; removeWorkerRefreshListeners(); navigator.serviceWorker.removeEventListener("controllerchange", controllerChange); };
  }, []);
  return null;
}
