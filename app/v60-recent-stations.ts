export const RECENT_STATIONS_KEY="bahnconnections-recent-stations-v60";
export const RECENT_STATIONS_LIMIT=6;

/** Only store DB/MOTIS station identifiers; no location or personal itinerary. */
export function nextRecentStations(current:readonly string[],stationId:string):string[] {
  if(!stationId||stationId.length>180||/[\x00-\x1f]/.test(stationId))return current.slice(0,RECENT_STATIONS_LIMIT);
  return [stationId,...current.filter(item=>item!==stationId&&typeof item==="string")].slice(0,RECENT_STATIONS_LIMIT);
}
