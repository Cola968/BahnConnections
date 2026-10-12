/** Stable board-row identity: unrelated services must never collapse into one row.
 * A source tripId wins; when missing, scheduled time, line and stop identity
 * are all required to distinguish trains sharing the same platform and minute.
 */
export type BoardIdentityInput={
  kind:"arrival"|"departure";
  tripId?:string|null;
  plannedWhen?:string|null;
  when?:string|null;
  plannedPlatform?:string|null;
  platform?:string|null;
  direction?:string|null;
  provenance?:string|null;
  line?:{name?:string;routeId?:string;product?:string}|null;
};
export function boardDedupeKey(entry:BoardIdentityInput):string {
  if(entry.tripId)return JSON.stringify([entry.kind,entry.tripId,entry.plannedWhen??entry.when??""]);
  return JSON.stringify([
    entry.kind,
    entry.plannedWhen??entry.when??"",
    entry.plannedPlatform??entry.platform??"",
    entry.direction??"",
    entry.provenance??"",
    entry.line?.name??"",
    entry.line?.routeId??"",
    entry.line?.product??"",
  ]);
}
