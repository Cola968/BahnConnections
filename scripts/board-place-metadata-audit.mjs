import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hook=registerHooks({resolve(s,c,n){try{return n(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return n(s+'.ts',c);throw e;}}});
const {GET}=await import('../app/api/stations/[id]/board/route.ts');hook.deregister();
const original=globalThis.fetch,seen=[];
const place={name:'Berlin Hauptbahnhof',lat:52.525,lon:13.369,stopId:'provider:platform',parentId:'provider:parent'};
const at='2026-10-22T12:00:00Z';
try{
 globalThis.fetch=async(url,options)=>{
  const u=new URL(url);seen.push(u.pathname);
  assert.ok(!u.pathname.endsWith('/stop'),'MOTIS has no /api/v6/stop endpoint in its published API');
  if(u.pathname.endsWith('/stoptimes'))return Response.json({place,stopTimes:[{tripId:'trip',displayName:'ICE 100',mode:'HIGHSPEED_RAIL',headsign:'Hamburg',place:{...place,scheduledDeparture:at,departure:at}}]});
  if(u.pathname==='/locations')return Response.json([{type:'stop',id:'db:stop',name:place.name,location:{latitude:place.lat,longitude:place.lon}}]);
  if(u.pathname.endsWith('/departures'))return Response.json([{line:{name:'ICE 100'},direction:'Hamburg',plannedWhen:at,when:at}]);
  throw Error('Unexpected endpoint '+u.pathname);
 };
 const response=await GET(new Request('https://test.invalid/api/stations/test/board?time='+encodeURIComponent(at)),{params:Promise.resolve({id:'provider:platform'})});
 const body=await response.json();
 assert.ok(seen.includes('/locations'),'Cross-check must use the official board Place metadata, not an unsupported stop lookup');
 assert.equal(body.stationScope.requestedStopId,'provider:platform');
 assert.equal(body.stationScope.providerStopId,'provider:platform');
 assert.equal(body.stationScope.parentId,'provider:parent');
 assert.equal(body.stationScope.operatorCoverage,'unverified');
 assert.equal(body.routeValidity.status,'unverified','A matching board is not operator route confirmation');
}finally{globalThis.fetch=original;}
console.log('Board provider Place, opaque parent ID, supported cross-check and unverified coverage passed.');
