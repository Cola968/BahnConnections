"use client";

import { useEffect, useState } from "react";

/** Browser connectivity is not a claim about the availability of upstream APIs. */
export function ConnectivityNotice() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    const initial = window.setTimeout(update, 0);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.clearTimeout(initial);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return <div className="connectivity-announcement" role="status" aria-live="polite">
    {offline && <div className="connectivity-notice">
      <span><strong>Du bist offline</strong><small>Fahrplan und Live-Daten können nicht aktualisiert werden.</small></span>
      <a href="/offline.html">Gespeicherte Strecken</a>
    </div>}
  </div>;
}
