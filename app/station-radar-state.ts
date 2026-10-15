import type {StationCall} from "./station-radar-data";

export type StationRadarSnapshot = {
  key:string|null;
  calls:Map<string,StationCall>;
  status:"loading"|"ready"|"stale"|"error";
  updatedAt:number;
  coverage:"complete"|"partial"|"unknown";
};

/** Preserve an earlier snapshot after a failed refresh, but never across stations.
 * Older predictions are browsable as history, not live radar positions. */
export function failedStationRadarSnapshot(previous:StationRadarSnapshot,key:string|null):StationRadarSnapshot {
  if(previous.key===key && previous.updatedAt>0)
    return {...previous,status:"stale"};
  return {key,calls:new Map<string,StationCall>(),status:"error",updatedAt:0,coverage:"unknown"};
}
