import { chooseStationMatch, type NamedPoint } from "./station-match.ts";

type DbCandidate = {
  id?: string;
  name?: string;
  type?: string;
  location?: { latitude?: number; longitude?: number };
};

/** Resolve only a named, geographically verified stop; never nearest-only. */
export function chooseDbJourneyStation<T extends DbCandidate>(station:NamedPoint, candidates:T[]):T|null {
  const mapped=candidates.flatMap(item=>
    item.type==="stop" && item.id && Number.isFinite(item.location?.latitude) && Number.isFinite(item.location?.longitude)
      ? [{ item, name:item.name, lat:item.location!.latitude!, lon:item.location!.longitude! }]
      : []
  );
  return chooseStationMatch(station,mapped)?.item ?? null;
}
