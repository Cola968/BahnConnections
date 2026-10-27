import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const {GET:board}=await import('../app/api/stations/[id]/board/route.ts');
const {GET:trip}=await import('../app/api/trips/[source]/[id]/route.ts');
const {GET:services}=await import('../app/api/stations/[id]/services/route.ts');
const {journeyCalendar,journeyCalendarLinks,journeyText}=await import('../app/journey-tools.ts');
hooks.deregister();
const originalFetch=globalThis.fetch;
const at='2026-10-18T12:00:00Z';
const row={tripId:'broken',displayName:'RE 1',mode:'REGIONAL_RAIL',place:{name:'Teststadt Hbf',scheduledDeparture:at,departure:at},alerts:[{header:'Umleitung',effect:4}]};
const context={params:Promise.resolve({id:'test:station'})};
try{
  // A station dwell is one stop, not a round trip from departure back to arrival.
  // Regression from the real Gesundbrunnen S42 payload (one minute dwell).
  const dwell={tripId:'valid-dwell',displayName:'S42',mode:'SUBURBAN',realTime:false,
    place:{name:'Gesundbrunnen',scheduledArrival:at,arrival:at,scheduledDeparture:'2026-10-18T12:01:00Z',departure:'2026-10-18T12:01:00Z'}};
  for(const sample of [dwell,{...dwell,realTime:true,place:{...dwell.place,arrival:'2026-10-18T11:58:00Z',departure:'2026-10-18T11:59:00Z'}},
    {...dwell,place:{...dwell.place,arrival:'2026-10-24T23:59:00+02:00',scheduledArrival:'2026-10-24T23:59:00+02:00',departure:'2026-10-25T00:01:00+02:00',scheduledDeparture:'2026-10-25T00:01:00+02:00'}}]){
    globalThis.fetch=async()=>Response.json({routes:[{routeShortName:'S42'}],stopTimes:[sample]});
    for(const query of ['verify=0','stream=1','verify=0&kind=arrival']){
      const response=await board(new Request('https://test.invalid/api/stations/test/board?'+query),context);
      const payload=query.includes('stream')?JSON.parse((await response.text()).split('\n')[0]):await response.json();
      assert.equal(payload.stopTimes.length,1,'Valid dwell must survive actual board '+query);
      assert.equal(payload.stopTimes[0].routeValidity.status,'unverified','Dwell is not independent operator verification');
    }
    assert.equal((await(await services(new Request('https://test.invalid/api/stations/test/services'),context)).json()).stopTimes.length,1,'Services must preserve valid dwell');
  }
  for(const invalid of [
    {...dwell,place:{...dwell.place,scheduledDeparture:'2026-10-18T11:59:00Z'}},
    {...dwell,place:{...dwell.place,departure:'2026-10-18T11:59:00Z'}},
    {...dwell,place:{...dwell.place,alerts:[{header:'Haltestelle verlegt',effect:9}]}},
  ]){
    globalThis.fetch=async()=>Response.json({routes:[],stopTimes:[invalid]});
    const payload=await(await board(new Request('https://test.invalid/api/stations/test/board?verify=0'),context)).json();
    assert.equal(payload.stopTimes.length,0,'Real chronology errors and active stop alerts still fail closed');
    assert.equal(payload.routeValidity.blockedCount,1);
  }
  for(const query of ['verify=0','stream=1','verify=0&kind=arrival']){
    globalThis.fetch=async url=>new URL(url).hostname==='api.transitous.org'?Response.json({stopTimes:[row]}):new Response(null,{status:503});
    const response=await board(new Request('https://test.invalid/api/stations/test/board?'+query),context);
    const payload=query.includes('stream')?JSON.parse((await response.text()).split('\n')[0]):await response.json();
    assert.equal(payload.stopTimes.length,0,'blocked route must not escape through board '+query);
    assert.equal(payload.routeValidity.blockedCount,1);
    assert.ok(payload.warnings.some(text=>/Umleitung|Bedienung/.test(text)));
  }
  globalThis.fetch=async()=>Response.json({routes:[],stopTimes:[row]});
  assert.equal((await (await services(new Request('https://test.invalid/api/stations/test/services'),context)).json()).stopTimes.length,0,'services cannot bypass board policy');
  const leg={mode:'REGIONAL_RAIL',displayName:'RE 1',startTime:at,endTime:'2026-10-18T12:20:00Z',from:{name:'A'},to:{name:'B'},alerts:row.alerts};
  globalThis.fetch=async()=>Response.json({legs:[leg]});
  const response=await trip(new Request('https://test.invalid/api/trips/transitous/broken'),{params:Promise.resolve({id:'broken',source:'transitous'})});
  assert.equal(response.status,409,'route conflict must be distinguishable from network failure');
  const payload=await response.json();assert.equal(payload.trip,null);assert.equal(payload.routeValidity.status,'blocked');
  assert.equal(response.headers.get('cache-control'),'no-store');
  const normalized={...leg,category:'regional',name:'RE 1',scheduledStartTime:leg.startTime,scheduledEndTime:leg.endTime,stops:[leg.from,leg.to]};
  const journey={id:'unsafe',updatedAt:at,scheduledStartTime:leg.startTime,scheduledEndTime:leg.endTime,startTime:leg.startTime,endTime:leg.endTime,legs:[normalized],transitLegs:[normalized],warnings:[],sourceLabel:'Test',transfers:0};
  for(const exportFn of [journeyCalendar,journeyCalendarLinks,journeyText])assert.throws(()=>exportFn(journey),/Bedienung|gesichert|Umleitung/,'export must not bypass blocked route');
}finally{globalThis.fetch=originalFetch;}
console.log('Global route API: JSON + NDJSON + arrival + services + trip 409 + all export formats passed.');
