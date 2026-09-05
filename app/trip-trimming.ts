type StopLike = { name?:string; lat?:number; lon?:number; arrival?:string; departure?:string };
type StationLike = { name:string; lat:number; lon:number };

function normalise(value = "") {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("de")
    .replace(/^s\+u\s+|^s\s+|^u\s+/i, "").replace(/hauptbahnhof|bahnhof|bhf\.?|bf\.?/g, "hbf").replace(/[^a-z0-9]+/g, " ").trim();
}

function distance(a: { lat:number; lon:number }, b: { lat:number; lon:number }) {
  const dy = (a.lat - b.lat) * 111_000;
  const dx = (a.lon - b.lon) * 111_000 * Math.cos(a.lat * Math.PI / 180);
  return Math.hypot(dx, dy);
}

function matches(stop: StopLike, station: StationLike) {
  if (normalise(stop.name) === normalise(station.name)) return true;
  return Number.isFinite(stop.lat) && Number.isFinite(stop.lon) && distance({ lat:stop.lat!, lon:stop.lon! }, station) <= 350;
}

function nearestPoint(points: [number, number][], stop: StopLike, start: number) {
  if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lon)) return start;
  let best = start;
  let bestDistance = Number.MAX_SAFE_INTEGER;
  for (let index = start; index < points.length; index += 1) {
    const current = distance({ lat:points[index][0], lon:points[index][1] }, { lat:stop.lat!, lon:stop.lon! });
    if (current < bestDistance) { bestDistance = current; best = index; }
  }
  return best;
}

export function trimRepeatedStationLoop<T extends StopLike>(stops: T[], points: [number, number][], station: StationLike, referenceTime?: string) {
  const occurrences = stops.map((stop, index) => matches(stop, station) ? index : -1).filter((index) => index >= 0);
  if (occurrences.length < 2) return { stops, points, trimmed:false };
  const reference = referenceTime ? new Date(referenceTime).getTime() : Number.NaN;
  const completeStarts = occurrences.filter((candidate) => occurrences.some((index) => index >= candidate + 4));
  if (!completeStarts.length) return { stops, points, trimmed:false };
  const start = Number.isFinite(reference)
    ? [...completeStarts].sort((left, right) => Math.abs(new Date(stops[left].departure ?? stops[left].arrival ?? 0).getTime() - reference) - Math.abs(new Date(stops[right].departure ?? stops[right].arrival ?? 0).getTime() - reference))[0]
    : completeStarts[0];
  const end = occurrences.find((index) => index >= start + 4);
  if (end == null) return { stops, points, trimmed:false };
  const selectedStops = stops.slice(start, end + 1);
  if (selectedStops.length < 5) return { stops, points, trimmed:false };
  if (points.length < 2) return { stops:selectedStops, points:[] as [number, number][], trimmed:true };
  let cursor = 0;
  const pointIndexes = stops.map((stop) => { cursor = nearestPoint(points, stop, cursor); return cursor; });
  const startPoint = pointIndexes[start];
  const endPoint = pointIndexes[end];
  return { stops:selectedStops, points:endPoint > startPoint ? points.slice(startPoint, endPoint + 1) : [] as [number, number][], trimmed:true };
}
