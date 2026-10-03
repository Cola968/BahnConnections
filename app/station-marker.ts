/** A visual class, never a passenger count estimate. Hub identity wins over coarse source bands. */
export function stationMarkerHierarchy(input: {
  majorHub:boolean; hub?:boolean; passengerBand?:string; dailyStops?:number; directConnections?:number;
}) {
  const activity = Math.max(0, input.dailyStops ?? 0);
  const destinations = Math.max(0, input.directConnections ?? 0);
  const level = input.majorHub ? 4 : input.hub || input.passengerBand === "> 1.000" || activity >= 100 || destinations >= 30 ? 3 : input.passengerBand === "100 - 1.000" || activity >= 20 || destinations >= 8 ? 2 : 1;
  const radius = level === 4 ? 13 : level === 3 ? 10 : level === 2 ? 5.5 : 3;
  return { level, radius, minimumZoom:level >= 3 ? 0 : level === 2 ? 7 : 9, halo:level === 4 };
}
