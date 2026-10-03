import type { Station } from './network-data';
export type SavedRoute = {id:string;from:Station;to:Station;createdAt:string};
export const SAVED_ROUTES_KEY='bahnconnections-saved-routes';
function station(value:unknown):Station|null {
  if(!value || typeof value!=='object') return null;
  const s=value as Station;
  if(typeof s.id!=='string'||s.id.length>120||typeof s.name!=='string'||s.name.length>160||!Number.isFinite(s.lat)||!Number.isFinite(s.lon)||Math.abs(s.lat)>90||Math.abs(s.lon)>180) return null;
  return {id:s.id,name:s.name,lat:s.lat,lon:s.lon,country:typeof s.country==='string'?s.country.slice(0,3):'DE',hub:false,eva:typeof s.eva==='string'?s.eva.slice(0,20):undefined,code:typeof s.code==='string'?s.code.slice(0,20):undefined};
}
export function parseSavedRoutes(value:unknown):SavedRoute[] {
  if(!Array.isArray(value)) return [];
  const seen=new Set<string>();
  return value.slice(0,20).flatMap(v=>{
    if(!v || typeof v!=='object') return [];
    const from=station(v.from),to=station(v.to);
    if(!from||!to||from.id===to.id) return [];
    const id=JSON.stringify([from.id,to.id]);
    if(seen.has(id)) return [];seen.add(id);
    return [{id,from,to,createdAt:typeof v.createdAt==='string'?v.createdAt.slice(0,40):''}];
  });
}
export function saveRoute(routes:SavedRoute[],from:Station,to:Station):SavedRoute[]|null {
  const candidate=parseSavedRoutes([{from,to,createdAt:new Date().toISOString()}])[0];
  if(!candidate)return null;
  const others=routes.filter(route=>route.id!==candidate.id);
  if(others.length>=20)return null;
  return [candidate,...others];
}
