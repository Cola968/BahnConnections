import {RouteValidityError,type RouteValidity} from './journey-validity.ts';

export const ROUTE_INVALIDATED_EVENT='bahnconnections-route-invalidated';
const revisions=new Map<string,number>();
export const tripRevision=(id:string)=>revisions.get(id)??0;
export function invalidateTrip(id:string,reason:string){
  revisions.set(id,tripRevision(id)+1);
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent(ROUTE_INVALIDATED_EVENT,{detail:{id,reason}}));
}
/** A response started before a known conflict cannot resurrect that route. */
export async function readTripResponse<T>(response:Response,id:string,revision:number):Promise<T>{
  const data=await response.json() as T&{routeValidity?:RouteValidity;warnings?:string[]};
  if(data.routeValidity?.status==='blocked'){
    invalidateTrip(id,data.routeValidity.reason??'Fahrtverlauf gesperrt');
    throw new RouteValidityError(data.routeValidity);
  }
  if(!response.ok)throw new Error(data.warnings?.join(' ')||`Fahrtverlauf ${response.status}`);
  if(revision!==tripRevision(id))throw new Error('Veraltete Antwort nach einer Routensperrung verworfen.');
  return data;
}
