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
