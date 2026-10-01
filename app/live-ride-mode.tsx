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
    timeZone: "Europe/Berlin",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function haversineMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const radius = 6_371_000;
  const toRad = (value: number) => value * Math.PI / 180;
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

export function LiveRideMode({ journey, appMode = false }: { journey: LiveJourney; appMode?: boolean }) {
  const [active, setActive] = useState(false);
  const [geoState, setGeoState] = useState<"idle" | "requesting" | "active" | "denied" | "unavailable">("idle");
  const [location, setLocation] = useState<RideLocation | null>(null);
  const [message, setMessage] = useState("");
  const speedHistoryRef = useRef<number[]>([]);
  const lastFixRef = useRef<{ lat: number; lon: number; time: number } | null>(null);

  const allStops = useMemo(() => journey.transitLegs.flatMap((leg) => leg.stops), [journey]);

  const currentLeg = useMemo(() => {
    const now = Date.now();
    return journey.transitLegs.find((leg) =>
      now >= new Date(leg.startTime).getTime() - 20 * 60_000 &&
      now <= new Date(leg.endTime).getTime() + 20 * 60_000
    ) ?? journey.transitLegs[0] ?? null;
  }, [journey]);

  const nextStop = useMemo(() => {
    const now = Date.now();
    return allStops.find((stop) => {
      const value = stopTime(stop);
      return value ? new Date(value).getTime() >= now - 90_000 : false;
    }) ?? allStops.at(-1) ?? null;
  }, [allStops]);

  const nearestStop = useMemo(() => {
    if (!location) return null;
    return allStops
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
      .map((stop) => ({ stop, distance: haversineMeters(location, stop) }))
      .sort((a, b) => a.distance - b.distance)[0] ?? null;
  }, [allStops, location]);

  const alerts = useMemo(
    () => journey.transitLegs.flatMap((leg) => leg.alerts.map((alert) => ({ ...alert, service: leg.name }))).slice(0, 3),
    [journey],
  );

  const transferRisk = useMemo(() => {
    let smallest: { minutes: number; station: string; nextService: string } | null = null;
    journey.transitLegs.slice(0, -1).forEach((leg, index) => {
      const next = journey.transitLegs[index + 1];
      const minutes = minutesBetween(next?.startTime, leg.endTime);
      if (minutes === null) return;
      if (!smallest || minutes < smallest.minutes) smallest = { minutes, station: leg.to.name, nextService: next.name };
    });
    return smallest;
  }, [journey]);

  useEffect(() => {
    if (!active) return;
    if (!("geolocation" in navigator)) {
      setGeoState("unavailable");
      setMessage("Dein Browser stellt keine Standortdaten bereit.");
      return;
    }

    setGeoState("requesting");
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const now = position.timestamp || Date.now();
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        let rawSpeed = typeof position.coords.speed === "number" && position.coords.speed >= 0
          ? position.coords.speed * 3.6
          : null;

        const previous = lastFixRef.current;
        if (rawSpeed === null && previous && now > previous.time) {
          const meters = haversineMeters({ lat: previous.lat, lon: previous.lon }, { lat, lon });
          const hours = (now - previous.time) / 3_600_000;
          if (hours > 0) rawSpeed = meters / 1000 / hours;
        }
        lastFixRef.current = { lat, lon, time: now };

        let speedKmh: number | null = null;
        if (rawSpeed !== null && Number.isFinite(rawSpeed) && rawSpeed >= 0 && rawSpeed < 450) {
          speedHistoryRef.current = [...speedHistoryRef.current.slice(-4), rawSpeed];
          speedKmh = speedHistoryRef.current.reduce((sum, value) => sum + value, 0) / speedHistoryRef.current.length;
        }

        setLocation({ lat, lon, accuracy: position.coords.accuracy, speedKmh, updatedAt: now });
        setGeoState("active");
        setMessage("");
      },
      (error) => {
        setGeoState(error.code === error.PERMISSION_DENIED ? "denied" : "unavailable");
        setMessage(error.code === error.PERMISSION_DENIED
          ? "Standortzugriff wurde abgelehnt. Du kannst ihn in den Browser-Einstellungen wieder erlauben."
          : "Standort konnte gerade nicht bestimmt werden.");
      },
      { enableHighAccuracy: true, maximumAge: 3_000, timeout: 15_000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, [active]);

  const speedLabel = location?.speedKmh !== null && location?.speedKmh !== undefined
    ? `${Math.round(location.speedKmh)} km/h`
    : "– km/h";
  const arrivalDelay = minutesBetween(journey.endTime, journey.scheduledEndTime) ?? 0;
  const hasLiveData = journey.realtimeStatus === "live" || journey.realtimeStatus === "partial";

  return (
    <section className={"ride-mode" + (active ? " active" : "")} aria-label="Live-Fahrtmodus">
      <header className="ride-mode-head">
        <div>
          <span className="ride-eyebrow">{active ? "Live-Fahrt" : "Unterwegs"}</span>
          <h3>{currentLeg?.name ?? "Deine Verbindung"} <span>→ {currentLeg?.headsign ?? journey.transitLegs.at(-1)?.to.name}</span></h3>
        </div>
        {!active ? (
          <button type="button" className="ride-start" onClick={() => { saveActiveJourney(journey); setActive(true); }}>Fahrtmodus starten</button>
        ) : (
          <button type="button" className="ride-stop" onClick={() => setActive(false)}>Beenden</button>
        )}
      </header>

      <div className="ride-kpis">
        <div className="ride-speed">
          <small>Geschwindigkeit</small>
          <strong>{active ? speedLabel : "GPS starten"}</strong>
          <span>{active && location ? `± ${Math.round(location.accuracy)} m GPS` : "vom Gerät gemessen"}</span>
        </div>
        <div>
          <small>Nächster Halt</small>
          <strong>{nextStop?.name ?? "–"}</strong>
          <span>{nextStop ? `${clock(stopTime(nextStop))}${nextStop.track ? ` · Gl. ${nextStop.track}` : ""}` : "Keine Haltdaten"}</span>
        </div>
        <div>
          <small>Ankunft Ziel</small>
          <strong>{clock(journey.endTime)}</strong>
          <span className={arrivalDelay > 0 ? "ride-delay" : ""}>
            {arrivalDelay > 0 ? `+${arrivalDelay} Min.` : hasLiveData ? "aktuell pünktlich" : "Fahrplan"}
          </span>
        </div>
      </div>

      {active && geoState === "requesting" && <p className="ride-note">Standort wird gesucht …</p>}
      {message && <p className="ride-note warning">{message}</p>}

      {active && nearestStop && (
        <div className="ride-position">
          <span>Position</span>
          <b>{nearestStop.distance < 1_000 ? `${Math.round(nearestStop.distance)} m` : `${(nearestStop.distance / 1000).toFixed(1)} km`} von {nearestStop.stop.name}</b>
          <time>{location ? new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(location.updatedAt)) : ""}</time>
        </div>
      )}

      {transferRisk && (
        <div className={"ride-transfer " + (transferRisk.minutes < 8 ? "risk" : transferRisk.minutes < 13 ? "watch" : "ok")}>
          <div>
            <small>Anschlusswächter · {transferRisk.station}</small>
            <b>{transferRisk.minutes} Min. Umstieg zu {transferRisk.nextService}</b>
          </div>
          <span>{transferRisk.minutes < 8 ? "knapp" : transferRisk.minutes < 13 ? "beobachten" : "komfortabel"}</span>
        </div>
      )}

      {alerts.length > 0 && (
        <div className="ride-alerts">
          <span>Live-Störungen</span>
          {alerts.map((alert, index) => (
            <article key={`${alert.service}-${index}`}>
              <b>{alert.service}</b>
              <p>{alert.header}</p>
              {alert.description && <small>{alert.description}</small>}
            </article>
          ))}
        </div>
      )}

      <div className="ride-actions">
        {!appMode && <button type="button" className="ride-pulse" onClick={() => { saveActiveJourney(journey); window.location.assign("/pulse"); }}>In Pulse öffnen</button>}
        <a href="https://www.bahn.de/buchung/start" target="_blank" rel="noreferrer">Bei DB buchen</a>
        <span>{appMode ? "Pulse begleitet deine aktive Fahrt; Buchungen werden bei der Deutschen Bahn abgeschlossen." : "In Pulse wird diese Fahrt für unterwegs gespeichert."}</span>
      </div>
    </section>
  );
}
