import { parseSavedRoutes, type SavedRoute } from './saved-routes.ts';
import type { Station } from './network-data';

function validDeparture(value:string|null):value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime()));
}

/** Share search inputs only, never a stale journey result or local account data. */
export function routeShareUrl(origin:string,from:Station,to:Station,departure:string) {
  const route=parseSavedRoutes([{from,to}])[0];
  if(!route) return null;
  const url=new URL('/',origin);
  url.searchParams.set('route',JSON.stringify({from:route.from,to:route.to}));
  if(validDeparture(departure)) url.searchParams.set('departure',departure);
  return url.toString();
}

export function readSharedRoute(params:URLSearchParams):{route:SavedRoute;departure?:string}|null {
  const value=params.get('route');
  if(!value || value.length>3000) return null;
  try {
    const route=parseSavedRoutes([JSON.parse(value)])[0];
    if(!route) return null;
    const departure=params.get('departure');
    return {route,departure:validDeparture(departure)?departure:undefined};
  } catch {return null;}
}
