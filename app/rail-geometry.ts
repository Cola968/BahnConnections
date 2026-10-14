export type RailPoint = [number, number]; // [latitude, longitude]

const RADIUS_KM = 6371;

export function railDistanceKm(a: RailPoint, b: RailPoint) {
  if (![...a, ...b].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const radians = Math.PI / 180;
  const latitude = (b[0] - a[0]) * radians;
  const longitude = (b[1] - a[1]) * radians;
  const value = Math.sin(latitude / 2) ** 2 + Math.cos(a[0] * radians) * Math.cos(b[0] * radians) * Math.sin(longitude / 2) ** 2;
  return 2 * RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(value)));
}

/** Never turn a sparsely sampled or disconnected source into a visual rail bridge. */
export function splitRailGeometry(points: RailPoint[], maximumGapKm = 2): RailPoint[][] {
  const segments: RailPoint[][] = [];
  let current: RailPoint[] = [];
  const flush = () => {
    if (current.length > 1) segments.push(current);
    current = [];
  };
  for (const point of points) {
    if (!Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 90 || Math.abs(point[1]) > 180) {
      flush();
      continue;
    }
    if (current.length && railDistanceKm(current.at(-1)!, point) > maximumGapKm) flush();
    current.push(point);
  }
  flush();
  return segments;
}

export function railGeometryLengthKm(segments: RailPoint[][]) {
  return segments.reduce((total, segment) => total + segment.slice(1).reduce((sum, point, index) => sum + railDistanceKm(segment[index], point), 0), 0);
}

/**
 * Visual-only joins for successive portions of ONE known service/route.
 * Track geometry remains split: these links are NOT evidence of a surveyed rail
 * alignment and must be drawn with a distinct dashed style and explanation.
 * A small maximum prevents fictitious city-to-city shortcuts.
 */
export function railContinuityLinks(
  segments: readonly (readonly RailPoint[])[],
  maximumInferredGapKm = 15,
): RailPoint[][] {
  if (!Number.isFinite(maximumInferredGapKm) || maximumInferredGapKm <= 0) return [];
  const maximum = Math.min(maximumInferredGapKm, 15);
  const links: RailPoint[][] = [];
  const valid = (point: RailPoint | undefined): point is RailPoint =>
    Array.isArray(point) && point.length === 2 && Number.isFinite(point[0]) &&
    Number.isFinite(point[1]) && Math.abs(point[0]) <= 90 && Math.abs(point[1]) <= 180;

  for (let i = 1; i < segments.length; i++) {
    const before = segments[i - 1];
    const after = segments[i];
    if (before.length < 2 || after.length < 2) continue;
    const start = before.at(-1);
    const end = after[0];
    if (!valid(start) || !valid(end)) continue;
    const distance = railDistanceKm(start, end);
    if (distance > 0.035 && distance <= maximum) {
      links.push([[start[0], start[1]], [end[0], end[1]]]);
    }
  }
  return links;
}
