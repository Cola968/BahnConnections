import { decodePolyline } from "./live-trains";

export type WalkingStep = { instruction: string; distanceMeters: number };
export type WalkingRoute = {
  points: [number, number][];
  durationSeconds: number;
  distanceMeters: number;
  steps: WalkingStep[];
  source: "Transitous / MOTIS · OpenStreetMap";
  updatedAt: string;
};

type ApiStep = { relativeDirection?: string; streetName?: string; distance?: number };
type ApiLeg = { mode?: string; duration?: number; distance?: number; legGeometry?: { points?: string; precision?: number }; steps?: ApiStep[] };
type ApiItinerary = { duration?: number; legs?: ApiLeg[] };
type ApiPlan = { direct?: ApiItinerary[] };

export function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const rad = Math.PI / 180;
  const dLat = (b.lat - a.lat) * rad;
  const dLon = (b.lon - a.lon) * rad;
  const value = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2;
  return 12_742_000 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

function instruction(step: ApiStep) {
  const direction: Record<string, string> = {
    DEPART:"Losgehen", HARD_LEFT:"Scharf links abbiegen", LEFT:"Links abbiegen", SLIGHTLY_LEFT:"Leicht links halten",
    CONTINUE:"Geradeaus gehen", SLIGHTLY_RIGHT:"Leicht rechts halten", RIGHT:"Rechts abbiegen", HARD_RIGHT:"Scharf rechts abbiegen",
    CIRCLE_CLOCKWISE:"Dem Kreisverkehr folgen", CIRCLE_COUNTERCLOCKWISE:"Dem Kreisverkehr folgen", STAIRS:"Treppe benutzen",
    ELEVATOR:"Aufzug benutzen", UTURN_LEFT:"Wenden", UTURN_RIGHT:"Wenden",
  };
  const action = direction[step.relativeDirection ?? ""] ?? "Weitergehen";
  const street = step.streetName?.trim();
  return street && !/^unnamed|unknown|unbekannt$/i.test(street) ? `${action} auf ${street}` : action;
}

export function parseWalkingRoute(plan: ApiPlan, from: { lat: number; lon: number }, to: { lat: number; lon: number }, updatedAt = new Date().toISOString()): WalkingRoute | null {
  for (const itinerary of plan.direct ?? []) {
    const legs = itinerary.legs ?? [];
    if (!legs.length || legs.some((leg) => !["WALK", "FOOT"].includes(leg.mode ?? ""))) continue;
    const points = legs.flatMap((leg, index) => {
      const encoded = leg.legGeometry?.points;
      if (!encoded) return [] as [number, number][];
      const decoded = decodePolyline(encoded, leg.legGeometry?.precision ?? 6);
      return index ? decoded.slice(1) : decoded;
    }).filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)
      .filter((point, index, all) => index === 0 || distanceMeters({ lat:all[index - 1][0], lon:all[index - 1][1] }, { lat:point[0], lon:point[1] }) >= .5);
    if (points.length < 2 || (points.length === 2 && distanceMeters(from, to) > 1_000)) continue;
    if (distanceMeters(from, { lat:points[0][0], lon:points[0][1] }) > 450 || distanceMeters(to, { lat:points.at(-1)![0], lon:points.at(-1)![1] }) > 450) continue;
    const rawSteps = legs.flatMap((leg) => (leg.steps ?? []).filter((step) => (step.distance ?? 0) >= 8).map((step) => ({
      instruction:instruction(step), distanceMeters:Math.round(step.distance ?? 0),
    })));
    const steps = rawSteps.reduce<WalkingStep[]>((items, step) => {
      const previous = items.at(-1);
      if (previous && previous.instruction === step.instruction) previous.distanceMeters += step.distanceMeters;
      else items.push({ ...step });
      return items;
    }, []);
    const tracedDistance = points.slice(1).reduce((total, point, index) => total + distanceMeters({ lat:points[index][0], lon:points[index][1] }, { lat:point[0], lon:point[1] }), 0);
    return {
      points,
      durationSeconds:Math.round(itinerary.duration ?? legs.reduce((sum, leg) => sum + (leg.duration ?? 0), 0)),
      distanceMeters:Math.round(legs.reduce((sum, leg) => sum + (leg.distance ?? 0), 0) || tracedDistance),
      steps,
      source:"Transitous / MOTIS · OpenStreetMap",
      updatedAt,
    };
  }
  return null;
}
