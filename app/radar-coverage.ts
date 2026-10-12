/** A radar snapshot belongs to a geographic search window, not merely a station ID.
 * During camera follow the station identity can remain constant while its
 * latitude/longitude change; never expose the preceding window as fresh.
 * Coordinate precision matches the map/trips query's four decimal places.
 */
export function radarCoverageKey(centre:{id:string;lat:number;lon:number}):string {
  return `${centre.id}:${centre.lat.toFixed(4)}:${centre.lon.toFixed(4)}`;
}
