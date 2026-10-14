/** Device-local line monitoring. This never requests notifications or stores journeys remotely. */
export const INCIDENT_WATCH_KEY="bahnconnections-incident-watch-v1";
const MAX_STATIONS=20,MAX_LINES=12;
export type StationWatchMap=Record<string,string[]>;
const isValidId=(v:unknown):v is string=>typeof v==="string"&&v.length>0&&v.length<=150&&v!=="__proto__"&&v!=="constructor"&&v!=="prototype";
const isValidLine=(v:unknown):v is string=>typeof v==="string"&&v.trim()===v&&v.length>0&&v.length<=32;
/** Discard corrupt, oversized and prototype-key data from manually editable localStorage. */
export function parseIncidentWatches(value:unknown):StationWatchMap{
 const out:StationWatchMap=Object.create(null);
 if(!value||typeof value!=="object"||Array.isArray(value))return out;
 for(const [id,lines] of Object.entries(value).slice(-MAX_STATIONS)){
  if(!isValidId(id)||!Array.isArray(lines))continue;
  const valid=[...new Set(lines.filter(isValidLine))].slice(0,MAX_LINES);
  if(valid.length)out[id]=valid;
 }
 return out;
}
export function readIncidentWatch(map:StationWatchMap,stationId:string):string[]{
 return isValidId(stationId)?(map[stationId]??[]):[];
}
export function toggleIncidentWatch(map:StationWatchMap,stationId:string,line:string):StationWatchMap{
 const next=parseIncidentWatches(map);
 if(!isValidId(stationId)||!isValidLine(line))return next;
 const prev=next[stationId]??[];
 if(prev.includes(line)){
  const remaining=prev.filter(item=>item!==line);
  if(remaining.length)next[stationId]=remaining;
  else delete next[stationId];
 }else{
  if(prev.length>=MAX_LINES)return next;
  delete next[stationId];
  next[stationId]=[...prev,line];
 }
 return parseIncidentWatches(next);
}
/** Station-wide accessibility warnings remain visible in watch mode. */
export function filterWatchedIncidents<T extends {lines:readonly string[]}>(items:readonly T[],lines:readonly string[]):T[]{
 if(!lines.length)return [...items];
 return items.filter(item=>item.lines.length===0||item.lines.some(line=>lines.includes(line)));
}
