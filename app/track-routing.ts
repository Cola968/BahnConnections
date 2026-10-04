type Coordinate = [number, number]; // [longitude, latitude]

export type RailNetwork = {
  source: string;
  retrievedAt: string;
  accuracy: string;
  lines: { route: string; coordinates: Coordinate[] }[];
};

export type GeoStation = { id: string; lat: number; lon: number; country: string };
export type TrackGeometry = { points: [number, number][]; segments: [number, number][][]; coverage: number };

type Edge = { to: number; distance: number; coordinates: Coordinate[]; track: boolean };
type Node = { point: Coordinate; edges: Edge[] };
type Snap = { lineIndex: number; pointIndex: number; distance: number };
type EndpointOption = { node: number; distance: number; coordinates: Coordinate[]; trackDistance: number };

const EARTH_RADIUS = 6371;

function distanceKm(a: Coordinate, b: Coordinate) {
  const toRad = (value: number) => value * Math.PI / 180;
  const dLat = toRad(b[1] - a[1]);
  const dLon = toRad(b[0] - a[0]);
  const lat1 = toRad(a[1]);
  const lat2 = toRad(b[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

function lineDistance(points: Coordinate[]) {
  let total = 0;
  for (let index = 1; index < points.length; index += 1) total += distanceKm(points[index - 1], points[index]);
  return total;
}

function append(target: Coordinate[], incoming: Coordinate[]) {
  if (!incoming.length) return;
  const start = target.at(-1);
  const first = incoming[0];
  target.push(...(start && first && Math.abs(start[0] - first[0]) < 1e-7 && Math.abs(start[1] - first[1]) < 1e-7 ? incoming.slice(1) : incoming));
}

class MinHeap {
  private values: { node: number; distance: number }[] = [];

  push(value: { node: number; distance: number }) {
    this.values.push(value);
    let index = this.values.length - 1;
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (this.values[parent].distance <= value.distance) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }

  pop() {
    if (!this.values.length) return undefined;
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length && last) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= this.values.length) break;
        const child = right < this.values.length && this.values[right].distance < this.values[left].distance ? right : left;
        if (this.values[child].distance >= last.distance) break;
        this.values[index] = this.values[child];
        index = child;
      }
      this.values[index] = last;
    }
    return first;
  }
}

export class TrackRouter {
  private nodes: Node[] = [];
  private lineNodes: [number, number][] = [];
  private snapCache = new Map<string, Snap | null>();
  private pathCache = new Map<string, TrackGeometry>();
  private network: RailNetwork;

  constructor(network: RailNetwork) {
    this.network = network;
    const nodeByKey = new Map<string, number>();
    const getNode = (point: Coordinate) => {
      const key = `${point[0].toFixed(4)},${point[1].toFixed(4)}`;
      const existing = nodeByKey.get(key);
      if (existing !== undefined) return existing;
      const index = this.nodes.length;
      this.nodes.push({ point, edges: [] });
      nodeByKey.set(key, index);
      return index;
    };

    for (const line of network.lines) {
      const from = getNode(line.coordinates[0]);
      const to = getNode(line.coordinates.at(-1)!);
      const distance = lineDistance(line.coordinates);
      this.nodes[from].edges.push({ to, distance, coordinates: line.coordinates, track: true });
      this.nodes[to].edges.push({ to: from, distance, coordinates: [...line.coordinates].reverse(), track: true });
      this.lineNodes.push([from, to]);
    }

    const cellSize = 0.008;
    const buckets = new Map<string, number[]>();
    const cellKey = (point: Coordinate) => `${Math.floor(point[0] / cellSize)},${Math.floor(point[1] / cellSize)}`;
    for (let index = 0; index < this.nodes.length; index += 1) {
      const key = cellKey(this.nodes[index].point);
      const bucket = buckets.get(key) ?? [];
      bucket.push(index);
      buckets.set(key, bucket);
    }
    for (let index = 0; index < this.nodes.length; index += 1) {
      const point = this.nodes[index].point;
      const x = Math.floor(point[0] / cellSize);
      const y = Math.floor(point[1] / cellSize);
      for (let dx = -1; dx <= 1; dx += 1) for (let dy = -1; dy <= 1; dy += 1) {
        for (const other of buckets.get(`${x + dx},${y + dy}`) ?? []) {
          if (other <= index) continue;
          const distance = distanceKm(point, this.nodes[other].point);
          if (distance > 0.02 && distance <= 0.65) {
            this.nodes[index].edges.push({ to: other, distance, coordinates: [point, this.nodes[other].point], track: false });
            this.nodes[other].edges.push({ to: index, distance, coordinates: [this.nodes[other].point, point], track: false });
          }
        }
      }
    }
  }

  geometry(stations: GeoStation[]): TrackGeometry {
    const segments: [number, number][][] = [];
    let weightedCoverage = 0;
    let totalDistance = 0;
    for (let index = 1; index < stations.length; index += 1) {
      const segment = this.between(stations[index - 1], stations[index]);
      const segmentDistance = lineDistance(segment.points.map(([lat, lon]) => [lon, lat]));
      const directDistance = distanceKm([stations[index - 1].lon, stations[index - 1].lat], [stations[index].lon, stations[index].lat]);
      totalDistance += segmentDistance || directDistance;
      weightedCoverage += segmentDistance * segment.coverage;
      if (segment.points.length < 2 || segment.coverage < .55) continue;
      // Keep disconnected track sections separate: flattening reconnects gaps with air lines.
      segments.push(...segment.segments);
    }
    return { points:segments.flat(), segments, coverage: totalDistance ? weightedCoverage / totalDistance : 0 };
  }

  private snap(station: GeoStation) {
    if (this.snapCache.has(station.id)) return this.snapCache.get(station.id) ?? null;
    if (station.country !== "DE") { this.snapCache.set(station.id, null); return null; }
    const target: Coordinate = [station.lon, station.lat];
    let best: Snap | null = null;
    for (let lineIndex = 0; lineIndex < this.network.lines.length; lineIndex += 1) {
      const line = this.network.lines[lineIndex];
      for (let pointIndex = 0; pointIndex < line.coordinates.length; pointIndex += 1) {
        const distance = distanceKm(target, line.coordinates[pointIndex]);
        if (!best || distance < best.distance) best = { lineIndex, pointIndex, distance };
      }
    }
    if (best && best.distance > 2.5) best = null;
    this.snapCache.set(station.id, best);
    return best;
  }

  private options(station: GeoStation, towardGraph: boolean): EndpointOption[] {
    const snap = this.snap(station);
    if (!snap) return [];
    const line = this.network.lines[snap.lineIndex].coordinates;
    const [fromNode, toNode] = this.lineNodes[snap.lineIndex];
    const toFrom = line.slice(0, snap.pointIndex + 1).reverse();
    const toTo = line.slice(snap.pointIndex);
    // Snapping is a routing cost, not a surveyed rail connection to draw.
    const connector: Coordinate[] = [line[snap.pointIndex]];
    const startFrom = [...connector, ...toFrom.slice(1)];
    const startTo = [...connector, ...toTo.slice(1)];
    const first = { node: fromNode, distance: snap.distance + lineDistance(toFrom), coordinates: towardGraph ? startFrom : [...startFrom].reverse(), trackDistance: lineDistance(toFrom) };
    const second = { node: toNode, distance: snap.distance + lineDistance(toTo), coordinates: towardGraph ? startTo : [...startTo].reverse(), trackDistance: lineDistance(toTo) };
    return [first, second];
  }

  private between(from: GeoStation, to: GeoStation): TrackGeometry {
    const key = `${from.id}>${to.id}`;
    const cached = this.pathCache.get(key);
    if (cached) return cached;
    const fromSnap = this.snap(from), toSnap = this.snap(to);
    if (fromSnap && toSnap && fromSnap.lineIndex === toSnap.lineIndex) {
      const line = this.network.lines[fromSnap.lineIndex].coordinates;
      const low = Math.min(fromSnap.pointIndex,toSnap.pointIndex), high = Math.max(fromSnap.pointIndex,toSnap.pointIndex);
      const section = line.slice(low,high + 1);
      if (fromSnap.pointIndex > toSnap.pointIndex) section.reverse();
      const points = section.map(([lon,lat]) => [lat,lon] as [number,number]);
      const result = {points,segments:points.length > 1 ? [points] : [],coverage:1};
      this.pathCache.set(key,result);
      return result;
    }
    const reverseCached = this.pathCache.get(`${to.id}>${from.id}`);
    if (reverseCached) {
      const segments = [...reverseCached.segments].reverse().map((segment) => [...segment].reverse());
      return { points:segments.flat(), segments, coverage:reverseCached.coverage };
    }

    const startOptions = this.options(from, true);
    const targetOptions = this.options(to, false);
    if (!startOptions.length || !targetOptions.length) {
      const unavailable: TrackGeometry = { points:[], segments:[], coverage:0 };
      this.pathCache.set(key, unavailable);
      return unavailable;
    }

    const distances = new Float64Array(this.nodes.length); distances.fill(Number.POSITIVE_INFINITY);
    const trackDistances = new Float64Array(this.nodes.length);
    const previous = new Int32Array(this.nodes.length); previous.fill(-1);
    const previousEdge = new Array<Edge | null>(this.nodes.length).fill(null);
    const sourceOption = new Int32Array(this.nodes.length); sourceOption.fill(-1);
    const heap = new MinHeap();
    startOptions.forEach((option, index) => {
      if (option.distance < distances[option.node]) {
        distances[option.node] = option.distance;
        trackDistances[option.node] = option.trackDistance;
        sourceOption[option.node] = index;
        heap.push({ node: option.node, distance: option.distance });
      }
    });

    while (true) {
      const current = heap.pop();
      if (!current) break;
      if (current.distance !== distances[current.node]) continue;
      for (const edge of this.nodes[current.node].edges) {
        const nextDistance = current.distance + edge.distance;
        if (nextDistance >= distances[edge.to]) continue;
        distances[edge.to] = nextDistance;
        trackDistances[edge.to] = trackDistances[current.node] + (edge.track ? edge.distance : 0);
        previous[edge.to] = current.node;
        previousEdge[edge.to] = edge;
        sourceOption[edge.to] = sourceOption[current.node];
        heap.push({ node: edge.to, distance: nextDistance });
      }
    }

    let bestTarget = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let bestTargetOption = -1;
    targetOptions.forEach((option, index) => {
      const distance = distances[option.node] + option.distance;
      if (distance < bestDistance) { bestDistance = distance; bestTarget = option.node; bestTargetOption = index; }
    });
    if (bestTarget < 0 || !Number.isFinite(bestDistance) || sourceOption[bestTarget] < 0) {
      const unavailable: TrackGeometry = { points:[], segments:[], coverage:0 };
      this.pathCache.set(key, unavailable);
      return unavailable;
    }

    const edges: Edge[] = [];
    for (let node = bestTarget; previous[node] >= 0; node = previous[node]) edges.push(previousEdge[node]!);
    edges.reverse();
    const coordinates: Coordinate[] = [];
    const trackSections: Coordinate[][] = [];
    const flush = () => { if (coordinates.length > 1) trackSections.push([...coordinates]); coordinates.length = 0; };
    append(coordinates, startOptions[sourceOption[bestTarget]].coordinates);
    for (const edge of edges) {
      if (edge.track) append(coordinates, edge.coordinates);
      else flush();
    }
    append(coordinates, targetOptions[bestTargetOption].coordinates);
    flush();
    const trackDistance = trackDistances[bestTarget] + targetOptions[bestTargetOption].trackDistance;
    const segments = trackSections.map((section) => section.map(([lon, lat]) => [lat, lon] as [number, number]));
    const result: TrackGeometry = { points:segments.flat(), segments, coverage:Math.min(1, trackDistance / bestDistance) };
    this.pathCache.set(key, result);
    return result;
  }
}
