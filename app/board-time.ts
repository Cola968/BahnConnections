/** A non-GPS board update may carry both timetable and predicted times.
 * Only a fresh source can authorize a predicted event as the primary time.
 */
export type BoardTimeInput = {
  when?: string | null;
  plannedWhen?: string | null;
  realtime?: boolean;
};
function instant(value?:string|null):number|null {
  if(!value)return null;
  const time=Date.parse(value);
  return Number.isFinite(time)?time:null;
}
export function boardPredictionFresh(updatedAt:Date|null,now:number,failed:boolean):boolean {
  if(failed||!updatedAt||!Number.isFinite(now))return false;
  const age=now-updatedAt.getTime();
  return age>=-10_000&&age<=150_000;
}
export function boardEventTime(entry:BoardTimeInput,fresh:boolean):number|null {
  const planned=instant(entry.plannedWhen),actual=instant(entry.when);
  if(fresh&&entry.realtime&&actual!==null)return actual;
  if(planned!==null)return planned;
  // Without a timetable a stale predicted departure cannot be authenticated.
  return entry.realtime?null:actual;
}
export function boardDisplayActual(entry:BoardTimeInput,fresh:boolean):string|undefined {
  if(fresh&&entry.realtime&&instant(entry.when)!==null)return entry.when??undefined;
  if(!entry.realtime&&instant(entry.when)!==null)return entry.when??undefined;
  return undefined;
}

/** Never keep a realtime platform change labeled as current after its source expires. */
export function boardDisplayPlatform(entry:{platform?:string|null;plannedPlatform?:string|null;realtime?:boolean},fresh:boolean):string|undefined {
  if(fresh||!entry.realtime)return entry.platform??undefined;
  return undefined;
}
