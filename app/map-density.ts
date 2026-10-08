type MapStation = { id:string; lat:number; lon:number; hub?:boolean; source?:string; mergedCodes?:string[] };

/** Bound visible DOM work, preserving selected stations and search access to all stops. */
export function declutterStations<T extends MapStation>(stations:T[], project:(station:T)=>{x:number;y:number}, selectedId:string|null, limit:number) {
  const ranked = [...stations].sort((a,b) => Number(b.id === selectedId) - Number(a.id === selectedId) || Number(a.source === "db") - Number(b.source === "db") || Number(Boolean(b.hub)) - Number(Boolean(a.hub)));
  const kept:T[] = [], cells = new Map<string,{x:number;y:number}[]>(), ids = new Set<string>(), codes = new Set<string>();
  for (const station of ranked) {
    if (ids.has(station.id) || station.mergedCodes?.some(code => codes.has(code))) continue;
    const point = project(station), x = Math.floor(point.x / 18), y = Math.floor(point.y / 18);
    let collision = false;
    for (let dx=-1;dx<=1;dx++) for (let dy=-1;dy<=1;dy++) {
      if (cells.get(`${x+dx},${y+dy}`)?.some(other => Math.hypot(other.x-point.x,other.y-point.y) < 18)) collision = true;
    }
    if (collision && station.id !== selectedId) continue;
    if (kept.length >= limit) break;
    kept.push(station); ids.add(station.id); station.mergedCodes?.forEach(code => codes.add(code));
    const key = `${x},${y}`, bucket = cells.get(key) ?? []; bucket.push(point); cells.set(key,bucket);
  }
  return kept;
}
