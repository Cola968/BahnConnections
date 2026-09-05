import { estimateMinutes, routePath, type Route, type Station } from "./network-data";
import type { LiveTrip } from "./live-trains";

export type JourneyLeg = { route: Route; from: string; to: string; minutes: number; stops: string[] };
export type Journey = { id: string; direct: boolean; legs: JourneyLeg[]; transfers: string[]; minutes: number; transferMinutes: number };
export type ReachableStation = { station: Station; minutes: number; changes: number; path: string[]; routes: string[] };

type PlannerOptions = {
  maxChanges?: 0 | 1 | 2;
  transferMinutes?: number;
  blockedStationIds?: Set<string>;
  blockedRouteIds?: Set<string>;
};

function leg(route: Route, from: string, to: string): JourneyLeg {
  return { route, from, to, minutes:estimateMinutes(route, from, to), stops:routePath(route, from, to).map((station) => station.id) };
}

function signature(legs: JourneyLeg[]) {
  return legs.map((item) => `${item.route.id}:${item.from}-${item.to}`).join("|");
}

function allowed(route: Route, options: PlannerOptions) {
  if (options.blockedRouteIds?.has(route.id)) return false;
  return !route.stops.some((stationId) => options.blockedStationIds?.has(stationId));
}

export function planJourneyOptions(routes: Route[], from: string, to: string, options: PlannerOptions = {}): Journey[] {
  if (from === to || options.blockedStationIds?.has(from) || options.blockedStationIds?.has(to)) return [];
  const maxChanges = options.maxChanges ?? 2;
  const changeTime = options.transferMinutes ?? 18;
  const usable = routes.filter((route) => allowed(route, options));
  const results: Journey[] = [];
  const direct = usable.filter((route) => route.stops.includes(from) && route.stops.includes(to));
  for (const route of direct) {
    const legs = [leg(route, from, to)];
    results.push({ id:signature(legs), direct:true, legs, transfers:[], minutes:legs[0].minutes, transferMinutes:changeTime });
  }

  if (maxChanges >= 1) {
    const firstRoutes = usable.filter((route) => route.stops.includes(from));
    const lastRoutes = usable.filter((route) => route.stops.includes(to));
    for (const first of firstRoutes) {
      for (const second of lastRoutes) {
        if (first.id === second.id) continue;
        const common = first.stops.filter((stationId) => second.stops.includes(stationId) && stationId !== from && stationId !== to);
        for (const transfer of common) {
          const legs = [leg(first, from, transfer), leg(second, transfer, to)];
          results.push({ id:signature(legs), direct:false, legs, transfers:[transfer], minutes:legs[0].minutes + legs[1].minutes + changeTime, transferMinutes:changeTime });
        }
      }
    }
  }

  if (maxChanges >= 2) {
    const firstRoutes = usable.filter((route) => route.stops.includes(from));
    const lastRoutes = usable.filter((route) => route.stops.includes(to));
    for (const first of firstRoutes) {
      for (const middle of usable) {
        if (middle.id === first.id) continue;
        const transferAOptions = first.stops.filter((id) => middle.stops.includes(id) && id !== from && id !== to);
        if (!transferAOptions.length) continue;
        for (const last of lastRoutes) {
          if (last.id === middle.id || last.id === first.id) continue;
          const transferBOptions = middle.stops.filter((id) => last.stops.includes(id) && id !== from && id !== to);
          for (const transferA of transferAOptions.slice(0, 3)) {
            for (const transferB of transferBOptions.slice(0, 3)) {
              if (transferA === transferB) continue;
              const middleFrom = middle.stops.indexOf(transferA);
              const middleTo = middle.stops.indexOf(transferB);
              if (middleFrom < 0 || middleTo < 0 || middleFrom === middleTo) continue;
              const legs = [leg(first, from, transferA), leg(middle, transferA, transferB), leg(last, transferB, to)];
              const minutes = legs.reduce((sum, item) => sum + item.minutes, 0) + changeTime * 2;
              results.push({ id:signature(legs), direct:false, legs, transfers:[transferA, transferB], minutes, transferMinutes:changeTime });
            }
          }
        }
      }
    }
  }

  const unique = new Map<string, Journey>();
  for (const journey of results) {
    const routeKey = journey.legs.map((item) => item.route.id).join("|") + ":" + journey.transfers.join("|");
    const current = unique.get(routeKey);
    if (!current || journey.minutes < current.minutes) unique.set(routeKey, journey);
  }
  return [...unique.values()].sort((a, b) => a.minutes - b.minutes || a.transfers.length - b.transfers.length).slice(0, 6);
}

export function calculateReachability(routes: Route[], stations: Station[], startId: string, options: PlannerOptions = {}) {
  const stationById = new Map(stations.map((station) => [station.id, station]));
  const usable = routes.filter((route) => allowed(route, options));
  const changeTime = options.transferMinutes ?? 18;
  const maxChanges = options.maxChanges ?? 2;
  const queue: { id:string; routeId:string | null; minutes:number; changes:number; path:string[]; routePath:string[] }[] = [{ id:startId, routeId:null, minutes:0, changes:0, path:[startId], routePath:[] }];
  const bestState = new Map<string, number>([[`${startId}|`, 0]]);
  const bestStation = new Map<string, ReachableStation>();

  while (queue.length) {
    queue.sort((a, b) => a.minutes - b.minutes);
    const current = queue.shift()!;
    const candidates = usable.filter((route) => route.stops.includes(current.id));
    for (const route of candidates) {
      const changing = current.routeId !== null && current.routeId !== route.id;
      const changes = current.changes + Number(changing);
      if (changes > maxChanges) continue;
      for (let index = 0; index < route.stops.length; index += 1) {
        const nextId = route.stops[index];
        if (nextId === current.id || !stationById.has(nextId) || options.blockedStationIds?.has(nextId)) continue;
        const segment = estimateMinutes(route, current.id, nextId);
        const minutes = current.minutes + segment + (changing ? changeTime : 0);
        if (minutes > 300) continue;
        const stateKey = `${nextId}|${route.id}|${changes}`;
        if ((bestState.get(stateKey) ?? Infinity) <= minutes) continue;
        bestState.set(stateKey, minutes);
        const path = [...current.path, nextId];
        const routeIds = current.routePath.at(-1) === route.id ? current.routePath : [...current.routePath, route.id];
        queue.push({ id:nextId, routeId:route.id, minutes, changes, path, routePath:routeIds });
        const previous = bestStation.get(nextId);
        if (!previous || minutes < previous.minutes) bestStation.set(nextId, { station:stationById.get(nextId)!, minutes, changes, path, routes:routeIds });
      }
    }
  }
  return [...bestStation.values()].sort((a, b) => a.minutes - b.minutes);
}

export function transferQualityScore(journey: Journey, liveTrips: LiveTrip[]) {
  if (!journey.transfers.length) return { score:96, label:"Direkt", tone:"good" as const, explanation:"Kein Umstieg nötig." };
  const liveDelay = liveTrips.length ? liveTrips.reduce((sum, trip) => sum + trip.delay, 0) / liveTrips.length : 0;
  const effectiveBuffer = journey.transferMinutes - Math.min(15, liveDelay);
  const score = Math.max(18, Math.min(94, Math.round(46 + effectiveBuffer * 2.4 - (journey.transfers.length - 1) * 14)));
  const tone = score >= 75 ? "good" as const : score >= 50 ? "medium" as const : "risk" as const;
  return {
    score,
    label:tone === "good" ? "Sehr gut" : tone === "medium" ? "Beobachten" : "Riskant",
    tone,
    explanation:`${journey.transferMinutes} Min. Modell-Umstieg; lokale Live-Verzögerung Ø ${liveDelay.toLocaleString("de-DE", { maximumFractionDigits:1 })} Min. Bahnsteigwege sind im Feed nicht enthalten.`,
  };
}

export function rankRoutes(routes: Route[], liveTrips: LiveTrip[]) {
  const liveDelay = liveTrips.length ? liveTrips.reduce((sum, trip) => sum + trip.delay, 0) / liveTrips.length : 0;
  return routes.map((route) => {
    const duration = estimateMinutes(route, route.stops[0], route.stops.at(-1) ?? route.stops[0]);
    const path = routePath(route, route.stops[0], route.stops.at(-1) ?? route.stops[0]);
    const distanceFactor = Math.max(1, path.length - 1);
    const frequencyScore = Math.min(35, route.frequency * 1.8);
    const reliability = Math.max(8, 38 - liveDelay * 1.4);
    const speed = Math.min(27, Math.round(distanceFactor * 110 / Math.max(35, duration) * 8));
    return { route, duration, score:Math.round(frequencyScore + reliability + speed), liveDelay };
  }).sort((a, b) => b.score - a.score || b.route.frequency - a.route.frequency);
}
