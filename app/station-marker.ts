/** Marker size represents only the available DB passenger band.
 *  Hub flags, modelled train stops and direct destinations must never inflate the circle.
 *  Stations without passenger data stay a small neutral point.
 */
export function stationMarkerHierarchy(input: {
  majorHub:boolean; hub?:boolean; passengerBand?:string; dailyStops?:number; directConnections?:number;
}) {
  const band=input.passengerBand;
  const level = band === "> 1.000" ? 3 : band === "100 - 1.000" ? 2 : band === "< 100" ? 1 : 0;
  const radius = level === 3 ? 9.5 : level === 2 ? 6 : level === 1 ? 3.5 : 2.4;
  const minimumZoom = level === 3 ? 5 : level === 2 ? 7 : level === 1 ? 9 : 11;
  return { level, radius, minimumZoom, halo:level === 3, hasPassengerData:level > 0 };
}
