"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { LiveJourney, LiveJourneyStop } from "./live-journey";
import { saveActiveJourney } from "./travel-store";

type RideLocation = {
  lat: number;
  lon: number;
  accuracy: number;
  speedKmh: number | null;
  updatedAt: number;
};

function clock(value?: string) {
  if (!value) return "–";
  return new Intl.DateTimeFormat("de-DE", {
    timeZone:"Europe/Berlin",
    hour:"2-digit",
    minute:"2-digit",
  }).format(new Date(value));
}

function haversineMeters(a: { lat:number; lon:number }, b: { lat:number; lon:number }) {
  const radius = 6_371_000;
  const toRad = (value:number) => value * Math.PI / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radius * Math.asin(Math.sqrt(h));
}

function stopTime(stop: LiveJourneyStop) {
  return stop.arrival ?? stop.departure ?? stop.scheduledArrival ?? stop.scheduledDeparture;
}

function minutesBetween(later?: string, earlier?: string) {
  if (!later || !earlier) return null;
  return Math.round((new Date(later).getTime() - new Date(earlier).getTime()) / 60_000);
}

function compactMinutes(value: number) {
  if (value <= 0) return "jetzt";
  if (value < 60) return value + " Min.";
  const hours = Math.floor(value / 60);
  const rest = value % 60;
  return rest ? hours + " h " + rest + " min" : hours + " h";
}

export function LiveRideMode({ journey, appMode = false }: { journey: LiveJourney; appMode?: boolean }) {
  const [active, setActive] = useState(false);
  const [geoState, setGeoState] = useState<"idle" | "requesting" | "active" | "denied" | "unavailable">("idle");
  const [location, setLocation] = useState<RideLocation | null>(null);
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => new Date(journey.updatedAt).getTime());
  const speedHistoryRef = useRef<number[]>([]);
  const lastFixRef = useRef<{ lat:number; lon:number; time:number } | null>(null);

  const allStops = useMemo(() => journey.transitLegs.flatMap((leg) => leg.stops), [journey]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const currentLeg = useMemo(() => {
    return journey.transitLegs.find((leg) =>
      now >= new Date(leg.startTime).getTime() - 20 * 60_000 &&
      now <= new Date(leg.endTime).getTime() + 20 * 60_000
    ) ?? journey.transitLegs[0] ?? null;
  }, [journey, now]);

  const nextStopIndex = useMemo(() => allStops.findIndex((stop) => {
    const value = stopTime(stop);
    return value ? new Date(value).getTime() >= now - 90_000 : false;
  }), [allStops, now]);

  const nextStop = nextStopIndex >= 0 ? allStops[nextStopIndex] : allStops.at(-1) ?? null;
  const upcomingStops = useMemo(() => {
    const start = nextStopIndex >= 0 ? nextStopIndex : Math.max(0, allStops.length - 1);
    return allStops.slice(start, start + 3);
  }, [allStops, nextStopIndex]);

  const nearestStop = useMemo(() => {
    if (!location) return null;
    return allStops
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
      .map((stop) => ({ stop, distance:haversineMeters(location, stop) }))
      .sort((a,b) => a.distance - b.distance)[0] ?? null;
  }, [allStops, location]);

  const alerts = useMemo(
    () => journey.transitLegs.flatMap((leg) => leg.alerts.map((alert) => ({ ...alert, service:leg.name }))).slice(0, 4),
    [journey],
  );

  const transferRisk = useMemo(() => {
    let smallest: { minutes:number; station:string; nextService:string } | null = null;
    journey.transitLegs.slice(0, -1).forEach((leg, index) => {
      const next = journey.transitLegs[index + 1];
      const transfer = minutesBetween(next?.startTime, leg.endTime);
      if (transfer === null) return;
      if (!smallest || transfer < smallest.minutes) smallest = { minutes:transfer, station:leg.to.name, nextService:next.name };
    });
    return smallest;
  }, [journey]);

  const tripProgress = useMemo(() => {
    const start = new Date(journey.startTime).getTime();
    const end = new Date(journey.endTime).getTime();
    const total = Math.max(1, end - start);
    return Math.max(0, Math.min(100, Math.round(((now - start) / total) * 100)));
  }, [journey, now]);

  const remainingMinutes = Math.max(0, Math.round((new Date(journey.endTime).getTime() - now) / 60_000));
  const arrivalDelay = minutesBetween(journey.endTime, journey.scheduledEndTime) ?? 0;
  const dataAgeMinutes = Math.max(0, Math.round((now - new Date(journey.updatedAt).getTime()) / 60_000));
  const hasLiveData = journey.realtimeStatus === "live" || journey.realtimeStatus === "partial";
  const gpsQuality = !location ? "Noch kein GPS" : location.accuracy <= 25 ? "GPS sehr gut" : location.accuracy <= 80 ? "GPS gut" : "GPS ungenau";

  function startRide() {
    saveActiveJourney(journey);
    if (!("geolocation" in navigator)) {
      setGeoState("unavailable");
      setMessage("Dein Browser stellt keine Standortdaten bereit.");
      setActive(true);
      return;
    }
    setGeoState("requesting");
    setMessage("");
    setActive(true);
  }

  useEffect(() => {
    if (!active || !("geolocation" in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const fixTime = position.timestamp || Date.now();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let rawSpeed = typeof position.coords.speed === "number" && position.coords.speed >= 0
          ? position.coords.speed * 3.6
          : null;

        const previous = lastFixRef.current;
        if (rawSpeed === null && previous && fixTime > previous.time) {
          const meters = haversineMeters({ lat:previous.lat, lon:previous.lon }, { lat, lon });
          const hours = (fixTime - previous.time) / 3_600_000;
          if (hours > 0) rawSpeed = meters / 1000 / hours;
        }
        lastFixRef.current = { lat, lon, time:fixTime };

        let speedKmh: number | null = null;
        if (rawSpeed !== null && Number.isFinite(rawSpeed) && rawSpeed >= 0 && rawSpeed < 450) {
          speedHistoryRef.current = [...speedHistoryRef.current.slice(-5), rawSpeed];
          speedKmh = speedHistoryRef.current.reduce((sum, value) => sum + value, 0) / speedHistoryRef.current.length;
        }

        setLocation({ lat, lon, accuracy:position.coords.accuracy, speedKmh, updatedAt:fixTime });
        setGeoState("active");
        setMessage("");
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setMessage(error.code === error.PERMISSION_DENIED
          ? "Standortzugriff wurde abgelehnt. Er kann in den Browser-Einstellungen wieder freigegeben werden."
          : "Standort konnte gerade nicht bestimmt werden.");
      },
      { enableHighAccuracy:true, maximumAge:3_000, timeout:15_000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);

  const speedLabel = location?.speedKmh !== null && location?.speedKmh !== undefined
    ? Math.round(location.speedKmh).toString()
    : "–";

  return (
    <section className={"ride-mode ride-mode-v33" + (active ? " active" : "")} aria-label="Live-Fahrtmodus">
      <header className="ride-mode-head ride-mode-head-v33">
        <div>
          <span className="ride-eyebrow">{active ? "LIVE · GPS AKTIV" : appMode ? "PULSE · LIVE-MODUS" : "UNTERWEGS"}</span>
          <h3>{currentLeg?.name ?? "Deine Verbindung"} <span>nach {currentLeg?.headsign ?? journey.transitLegs.at(-1)?.to.name}</span></h3>
        </div>
        {!active ? (
          <button type="button" className="ride-start" onClick={startRide}>{appMode ? "GPS aktivieren" : "Fahrtmodus starten"}</button>
        ) : (
          <button type="button" className="ride-stop" onClick={() => setActive(false)}>GPS pausieren</button>
        )}
      </header>

      {journey.cancelled && <div className="ride-critical-banner"><b>Fahrt fällt aus</b><span>Prüfe in Atlas eine Alternative.</span></div>}

      <div className="ride-progress-block">
        <div className="ride-progress-copy"><span>Reisefortschritt</span><b>{tripProgress}%</b><em>noch {compactMinutes(remainingMinutes)}</em></div>
        <div className="ride-progress-track"><i style={{ width:tripProgress + "%" }} /><span style={{ left:tripProgress + "%" }} /></div>
      </div>

      <div className="ride-kpis ride-kpis-v33">
        <article className="ride-speed">
          <small>Geschwindigkeit</small>
          <strong>{active ? speedLabel : "–"}<em> km/h</em></strong>
          <span>{active ? gpsQuality : "GPS optional aktivieren"}</span>
        </article>
        <article>
          <small>Nächster Halt</small>
          <strong>{nextStop?.name ?? "–"}</strong>
          <span>{nextStop ? clock(stopTime(nextStop)) + (nextStop.track ? " · Gleis " + nextStop.track : "") : "Keine Haltdaten"}</span>
        </article>
        <article>
          <small>Ankunft</small>
          <strong>{clock(journey.endTime)}</strong>
          <span className={arrivalDelay > 0 ? "ride-delay" : ""}>{arrivalDelay > 0 ? "+" + arrivalDelay + " Min." : hasLiveData ? "aktuell planmäßig" : "Fahrplan"}</span>
        </article>
      </div>

      <div className="ride-data-strip">
        <span><i className={hasLiveData ? "good" : ""} />{hasLiveData ? "Echtzeitdaten" : "Fahrplandaten"}</span>
        <span>Stand {dataAgeMinutes === 0 ? "gerade eben" : "vor " + dataAgeMinutes + " Min."}</span>
        <span>{Math.max(0, allStops.length - Math.max(0, nextStopIndex))} Halte verbleiben</span>
      </div>

      {active && geoState === "requesting" && <p className="ride-note">Standort wird gesucht …</p>}
      {message && <p className="ride-note warning">{message}</p>}

      {upcomingStops.length > 0 && (
        <div className="ride-upcoming">
          <div className="ride-section-title"><span>Nächste Halte</span><small>Live-Fahrplan</small></div>
          {upcomingStops.map((stop, index) => (
            <div key={(stop.id ?? stop.name) + "-" + index} className={"ride-upcoming-row" + (index === 0 ? " next" : "")}>
              <i />
              <div><b>{stop.name}</b><span>{stop.track ? "Gleis " + stop.track : "Gleis –"}</span></div>
              <time>{clock(stopTime(stop))}</time>
            </div>
          ))}
        </div>
      )}

      {active && nearestStop && (
        <div className="ride-position ride-position-v33">
          <div><span>GPS-Position</span><b>{nearestStop.distance < 1_000 ? Math.round(nearestStop.distance) + " m" : (nearestStop.distance / 1000).toFixed(1) + " km"} von {nearestStop.stop.name}</b></div>
          <time>{location ? new Intl.DateTimeFormat("de-DE", { hour:"2-digit", minute:"2-digit", second:"2-digit" }).format(new Date(location.updatedAt)) : ""}</time>
        </div>
      )}

      {transferRisk && (
        <div className={"ride-transfer ride-transfer-v33 " + (transferRisk.minutes < 8 ? "risk" : transferRisk.minutes < 13 ? "watch" : "ok")}>
          <div>
            <small>Anschlusswächter · {transferRisk.station}</small>
            <b>{transferRisk.minutes} Min. zu {transferRisk.nextService}</b>
            <p>{transferRisk.minutes < 8 ? "Der Umstieg ist knapp. Behalte die Live-Ankunft im Blick." : transferRisk.minutes < 13 ? "Noch machbar, aber Verzögerungen können relevant werden." : "Aktuell ist ausreichend Umstiegszeit vorhanden."}</p>
          </div>
          <span>{transferRisk.minutes < 8 ? "knapp" : transferRisk.minutes < 13 ? "beobachten" : "entspannt"}</span>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="ride-alerts ride-alerts-v33">
          <div className="ride-section-title"><span>Hinweise auf deiner Reise</span><small>{alerts.length}</small></div>
          {alerts.map((alert, index) => (
            <article key={alert.service + "-" + index}>
              <b>{alert.service}</b>
              <div><p>{alert.header}</p>{alert.description && <small>{alert.description}</small>}</div>
            </article>
          ))}
        </div>
      )}

      <div className="ride-actions ride-actions-v33">
        {!appMode && <button type="button" className="ride-pulse" onClick={() => { saveActiveJourney(journey); window.location.assign("/pulse"); }}>In Pulse weiterreisen</button>}
        <a href="https://www.bahn.de/buchung/start" target="_blank" rel="noreferrer">Bei DB buchen ↗</a>
        <span>{appMode ? "Pulse nutzt Geräte-GPS und die geladenen Fahrtdaten. Es besteht keine direkte Verbindung zur Fahrzeugtelemetrie." : "Pulse speichert diese Reise lokal für unterwegs."}</span>
      </div>
    </section>
  );
}
