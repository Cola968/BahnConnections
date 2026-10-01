"use client";

import type { LiveJourney } from "./live-journey";

export type StoredJourney = {
  id: string;
  journey: LiveJourney;
  startedAt: string;
  completedAt?: string;
};

const ACTIVE_KEY = "bahnconnections-active-journey-v1";
const HISTORY_KEY = "bahnconnections-passport-v1";

function canStore() {
  return typeof window !== "undefined" && "localStorage" in window;
}

export function saveActiveJourney(journey: LiveJourney) {
  if (!canStore()) return;
  const record: StoredJourney = {
    id: journey.id || "journey-" + Date.now(),
    journey,
    startedAt: new Date().toISOString(),
  };
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(record));
}

export function readActiveJourney(): StoredJourney | null {
  if (!canStore()) return null;
  try {
    const value = localStorage.getItem(ACTIVE_KEY);
    return value ? JSON.parse(value) as StoredJourney : null;
  } catch {
    return null;
  }
}

export function readJourneyHistory(): StoredJourney[] {
  if (!canStore()) return [];
  try {
    const value = localStorage.getItem(HISTORY_KEY);
    const parsed = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as StoredJourney[] : [];
  } catch {
    return [];
  }
}

export function completeActiveJourney() {
  if (!canStore()) return null;
  const active = readActiveJourney();
  if (!active) return null;
  const finished: StoredJourney = { ...active, completedAt: new Date().toISOString() };
  const history = readJourneyHistory().filter((item) => item.id !== finished.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([finished, ...history].slice(0, 500)));
  localStorage.removeItem(ACTIVE_KEY);
  return finished;
}

export function removeJourneyFromHistory(id: string) {
  if (!canStore()) return;
  const history = readJourneyHistory().filter((item) => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export function journeyDistanceKm(journey: LiveJourney) {
  const points = journey.transitLegs
    .flatMap((leg) => leg.stops)
    .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon));
  if (points.length < 2) return 0;
  const toRad = (value: number) => value * Math.PI / 180;
  let meters = 0;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1];
    const b = points[index];
    const radius = 6_371_000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    meters += 2 * radius * Math.asin(Math.sqrt(h));
  }
  return Math.round(meters / 1000);
}
