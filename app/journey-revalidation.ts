import {fetchLiveJourneys,type LiveJourney,type PlannerCategory} from './live-journey';
import {requireUsableJourney} from './journey-validity';

export function journeyRouteSignature(journey:LiveJourney){
  return JSON.stringify(journey.transitLegs.map(leg=>[leg.name,leg.scheduledStartTime,leg.scheduledEndTime,
    leg.stops.map(stop=>[stop.id??stop.name,stop.scheduledArrival??'',stop.scheduledDeparture??''])]));
}
/** User actions must fetch new evidence; rechecking the old object alone cannot discover a new diversion. */
export async function revalidateJourney(journey:LiveJourney):Promise<LiveJourney>{
  requireUsableJourney(journey);
  const from=journey.legs[0]?.from,to=journey.legs.at(-1)?.to;
  if(!from||!to)throw new Error('Reise vor dem Export neu planen.');
  const station=(stop:typeof from)=>({id:stop.id??stop.name,name:stop.name,lat:stop.lat,lon:stop.lon,hub:false,country:'DE'});
  const fresh=await fetchLiveJourneys({from:station(from),to:station(to),departure:journey.scheduledStartTime,
    arriveBy:false,maxTransfers:8,minTransferMinutes:0,bike:false,wheelchair:false,
    categories:[...new Set(journey.transitLegs.map(leg=>leg.category).filter((category):category is PlannerCategory=>category!=='walk'))],
    signal:AbortSignal.timeout(25_000)});
  const signature=journeyRouteSignature(journey);
  const match=fresh.find(candidate=>journeyRouteSignature(candidate)===signature);
  if(!match)throw new Error('Die gespeicherte Haltefolge ist aktuell nicht bestätigt. Bitte die Reise neu planen.');
  requireUsableJourney(match);return match;
}
