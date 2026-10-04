import type { TrackRouter } from "./track-routing";

export type MapPoint = [number, number];
export function pointDistance(a: MapPoint, b: MapPoint) {
  return Math.hypot((a[0] - b[0]) * 111_000, (a[1] - b[1]) * 111_000 * Math.cos((a[0] + b[0]) * Math.PI / 360));
}

/** Never bridge missing shape data with a straight chord. */
export function continuousSegments(points: MapPoint[], maxGap = 2_000): MapPoint[][] {
  const segments: MapPoint[][] = [];
  let current: MapPoint[] = [];
  for (const point of points) {
    if (!point.every(Number.isFinite)) { if (current.length > 1) segments.push(current); current = []; continue; }
    if (current.length && pointDistance(current.at(-1)!, point) > maxGap) {
      if (current.length > 1) segments.push(current);
      current = [];
    }
    current.push(point);
  }
  if (current.length > 1) segments.push(current);
  return segments;
}

/** Sparse provider shapes are replaced only by surveyed DB rail sections.
 * This is a network path between reported stops, not proof of a train's track. */
export function railMapGeometry(points: MapPoint[], stops: { lat?: number; lon?: number; name: string }[], rail: boolean, router: Pick<TrackRouter,'geometry'> | null, sourceSegments: MapPoint[][] = [points]) {
  const sparse = points.some((point, index) => index > 0 && pointDistance(points[index - 1], point) > 2_000);
  if (rail && router && (sparse || points.length < 2)) {
    const anchors = stops.filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lon))
      .map((stop) => ({ id:`shape-${stop.lat}-${stop.lon}`, lat:stop.lat!, lon:stop.lon!, country:"DE" }));
    const geometry = router.geometry(anchors);
    // Network sections are surveyed continuous lines. Long straight railway
    // sections may legitimately have distant vertices after simplification.
    if (geometry.segments.length) return { segments:geometry.segments.flatMap((segment) => continuousSegments(segment,Infinity)), network:true };
  }
  return { segments:sourceSegments.flatMap(segment => continuousSegments(segment)), network:false };
}
