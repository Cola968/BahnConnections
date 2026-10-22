/** Passenger volume determines size; network importance only controls visibility. */
export function stationMarkerHierarchy(input: {
  majorHub?:boolean; hub?:boolean; passengerBand?:string; dailyPassengers?:number; dailyStops?:number; directConnections?:number;
}) {
  const count=input.dailyPassengers;
  const measured=typeof count==="number" && Number.isFinite(count) && count>0;
  const level=measured ? count>=100_000 ? 4 : count>1_000 ? 3 : count>=100 ? 2 : 1 : input.passengerBand==="> 1.000" ? 3 : input.passengerBand==="100 - 1.000" ? 2 : input.passengerBand==="< 100" ? 1 : 0;
  // Area scales with the published count. Small stops remain selectable.
  const radius=measured ? Math.max(1.8,Math.min(6,6*Math.sqrt(count/345_084))) : level===3 ? 3.4 : level===2 ? 2.5 : level===1 ? 1.8 : 2.2;
  return {level,radius,minimumZoom:input.majorHub || level===4 ? 0 : input.hub ? 5 : level===3 ? 7 : level===2 ? 9 : 11,halo:false,measured,unknown:level===0};
}
