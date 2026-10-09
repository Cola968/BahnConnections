import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { decodePolyline, pointOnTrip, trailForTrip } from '../app/live-trains.ts';
import { railDistanceKm, splitRailGeometry } from '../app/rail-geometry.ts';
import { routeShareUrl, readSharedRoute } from '../app/route-sharing.ts';

const from={id:'berlin',name:'Berlin Hbf',lat:52.52,lon:13.37,country:'DE'};
const to={id:'muenchen',name:'München Hbf',lat:48.14,lon:11.56,country:'DE'};
const shared=new URL(routeShareUrl('https://bahn.example',from,to,'2026-10-12T10:30'));
const restored=readSharedRoute(shared.searchParams);
assert.equal(restored.route.from.id,'berlin');
assert.equal(restored.route.to.name,'München Hbf');
assert.equal(restored.departure,'2026-10-12T10:30');
assert.equal(routeShareUrl('https://bahn.example',from,from,''),null);
for(const payload of ['{','null',JSON.stringify({from:{...from,lat:Infinity},to}),JSON.stringify({from,to:from})]) assert.equal(readSharedRoute(new URLSearchParams({route:payload})),null);
assert.equal(readSharedRoute(new URLSearchParams({route:JSON.stringify({from,to}),departure:'not a date'})).departure,undefined);

// Published Google polyline example, including a negative longitude.
assert.deepEqual(decodePolyline('_p~iF~ps|U_ulLnnqC_mqNvxq`@',5),[[38.5,-120.2],[40.7,-120.95],[43.252,-126.453]]);
for(const corrupt of ['_', '?', '~~~~~~~~~~', '\u0000?', '_p~iF~ps|U_ulLnnqC_mqNvxq`']) assert.deepEqual(decodePolyline(corrupt,5),[]);
assert.deepEqual(decodePolyline('??',-1),[]);
assert.deepEqual(decodePolyline('??',Infinity),[]);
assert.deepEqual(splitRailGeometry([[0,179.999],[0,-179.999]]),[],'Dateline must not create a line across the world');
assert.deepEqual(splitRailGeometry([[52,13],[52,13.01]],Infinity),[]);
const trip={points:[[52,13],[52,13.01],[52,13.3],[52,13.31]]};
assert.equal(pointOnTrip(trip,0.5),null,'No train marker interpolated inside a missing rail section');
assert.deepEqual(trailForTrip(trip,0.5),[]);
assert.equal(pointOnTrip({points:[]},0),null,'Missing geometry must not invent a station position');
assert.equal(pointOnTrip(trip,NaN),null);
assert.equal(pointOnTrip({points:[[95,13],[95,13.01]]},0.5),null);
const tail=trailForTrip(trip,0.99);
assert.ok(tail.length>=2);
assert.ok(tail.every(p=>p[1]>=13.3),'Trail is confined to the current surveyed section');
assert.ok(tail.slice(1).every((p,i)=>railDistanceKm(tail[i],p)<=2));
const midpoint=pointOnTrip({points:[[52,13],[52,13.01]]},0.5);
assert.ok(Math.abs(midpoint[0]-52)<1e-10 && Math.abs(midpoint[1]-13.005)<1e-10);
assert.equal(pointOnTrip({points:[[0,179.999],[0,-179.999]]},0.5),null);

// Exercise the worker itself: never serve cached API, auth, version or RSC data.
const handlers=new Map(), cacheWrites=[], added=[];
const offline=new Response('offline dashboard');
const context={
  self:{location:{origin:'https://bahn.example'},registration:{navigationPreload:{enable:async()=>{}}},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(type,handler)=>handlers.set(type,handler)},
  caches:{open:async()=>({add:async path=>added.push(path),put:async(...args)=>cacheWrites.push(args)}),match:async path=>path==='/offline.html'?offline:new Response('unsafe cached payload'),keys:async()=>[],delete:async()=>true},
  URL,Response,Promise,fetch:async()=>{throw Error('offline')},
};
vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),context);
let installing;
handlers.get('install')({waitUntil:p=>installing=p}); await installing;
assert.ok(added.includes('/offline.html'),'Offline dashboard is a required install asset');
assert.ok(!added.includes('/'),'Personalized navigation is not precached');
function request(path,mode='cors',headers=new Headers()) {
  let response;
  handlers.get('fetch')({request:{url:'https://bahn.example'+path,method:'GET',mode,headers},respondWith:p=>response=p});
  return response;
}
for(const path of ['/api/subscription','/api/stations/search','/version.json','/signin-with-chatgpt','/auth/callback']) assert.equal(request(path),undefined,path+' must bypass worker cache');
assert.equal(request('/', 'cors',new Headers({RSC:'1'})),undefined);
assert.equal(request('/', 'cors',new Headers({Accept:'text/x-component'})),undefined);
assert.equal(await (await request('/?station=berlin','navigate')).text(),'offline dashboard');
context.fetch=async()=>new Response('online page');
assert.equal(await (await request('/','navigate')).text(),'online page');
assert.equal(cacheWrites.length,0,'Navigation documents must not be cached');
console.log('Release regressions passed: polyline corruption, missing geometry, train positions/trails, dateline, offline navigation, auth/API/RSC cache isolation.');
