import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(specifier,context,next){try{return next(specifier,context);}catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);throw error;}}});
const validityModule=await import('../app/journey-validity.ts');
const {assessRawTransitTrip}=validityModule;
const {STATIONS}=await import('../app/network-data.ts');
const {assessStationRows}=await import('../app/station-route-validity.ts');
const {journeyIntegrityConflict}=await import('../app/journey-integrity.ts');
hooks.deregister();
const start='2026-10-18T14:00:00+02:00',end='2026-10-18T14:20:00+02:00';
const leg=(city='Berlin',extra={})=>({mode:'TRAM',displayName:'1',startTime:start,endTime:end,from:{name:city+' A',scheduledDeparture:start},to:{name:city+' B',scheduledArrival:end},...extra});
for(const city of ['Berlin','Hamburg','Dresden','Wedemark','München','Erdeborn']){
  const conflict=assessRawTransitTrip([leg(city,{alerts:[{header:'Umleitung',effect:'DETOUR'}]})]);
  assert.ok(conflict.conflict,city+': active unresolved diversion must fail closed, not merely warn');
}
for(const effect of [1,4,7,9,'NO_SERVICE','DETOUR','MODIFIED_SERVICE','STOP_MOVED']){
  assert.ok(assessRawTransitTrip([leg('Test',{alerts:[{effect,header:'Betriebshinweis'}]})]).conflict,'numeric and text effects: '+effect);
}
for(const periods of [
  [{start:'2026-10-18T13:00:00+02:00',end:start}],
  [{start:'2026-10-18T15:00:00+02:00'}],
])assert.equal(assessRawTransitTrip([leg('Test',{alerts:[{header:'Umleitung',effect:'DETOUR',activePeriods:periods}]})]).conflict,null,'inactive alert must not block');
assert.ok(assessRawTransitTrip([leg('Test',{alerts:[{header:'Umleitung',effect:'DETOUR',activePeriods:[{start:'bad',end:'bad'}]}]})]).conflict,'invalid alert window cannot authenticate a route');
assert.ok(assessRawTransitTrip([leg('Test',{alerts:[{header:'Stop closed',effect:1,active_period:[{start:Date.parse(start)/1000,end:Date.parse(end)/1000}]}]})]).conflict,'GTFS epoch-second interval');
assert.equal(assessRawTransitTrip([leg('Test',{alerts:[{header:'Umleitung aufgehoben'}]})]).conflict,null);
assert.ok(assessRawTransitTrip([leg('Test',{alerts:[{header:'Umleitung aufgehoben',effect:4}]})]).conflict,'conflicting structured effect must remain blocked');
assert.ok(assessRawTransitTrip([leg('Test',{startTime:undefined,endTime:undefined}),leg('Test',{startTime:end,endTime:start})]).conflict,'incomplete leg must not disable checking other legs');
assert.ok(assessRawTransitTrip([leg('Test',{intermediateStops:[{name:'C',scheduledArrival:end,scheduledDeparture:start}]})]).conflict,'departure before arrival at one stop');
assert.equal(assessRawTransitTrip([leg('Test',{startTime:'2026-10-24T23:55:00+02:00',endTime:'2026-10-25T00:20:00+02:00',from:{name:'A'},to:{name:'B'}})]).conflict,null,'midnight is chronological');
assert.equal(assessRawTransitTrip([leg('Test',{startTime:'2026-10-25T02:50:00+02:00',endTime:'2026-10-25T02:10:00+01:00',from:{name:'A'},to:{name:'B'}})]).conflict,null,'DST repeated hour uses absolute time');
const safe=['Straßburger Platz','Georg-Arnhold-Bad','Lennéplatz','Hauptbahnhof Nord','Prager Straße','Postplatz'];
function dresden(names,at=start){const stops=names.map(name=>({name}));return {transitLegs:[{category:'tram',name:'1',startTime:at,scheduledStartTime:at,from:stops[0],to:stops.at(-1),stops}]};}
assert.ok(journeyIntegrityConflict(dresden([safe[0],safe[2],safe[1],...safe.slice(3)])),'unordered diversion stops cannot pass');
assert.equal(journeyIntegrityConflict(dresden(safe)),null);
assert.equal(journeyIntegrityConflict(dresden([...safe].reverse())),null);
assert.equal(journeyIntegrityConflict(dresden(['Dresden Altmarkt','Dresden Postplatz'],'2026-10-24T03:30:00+02:00')),null,'expired Dresden rule');
const boundary=dresden(['Dresden Straßburger Platz','Dresden Altmarkt'],'2026-10-09T19:55:00+02:00');
boundary.transitLegs[0].stops[1].scheduledArrival='2026-10-09T20:05:00+02:00';
assert.ok(journeyIntegrityConflict(boundary),'departure before works does not exempt a later affected stop');
console.log('Global route validity: active/expired alerts, numeric effects, chronology, Dresden ordering, directions, midnight and DST passed.');

assert.equal(typeof validityModule.assessRouteCandidates,'function','Shared candidate gate is required across provider fallback');
const normalized=(alerts=[])=>({transitLegs:[{category:'regional',name:'RE 1',startTime:start,endTime:end,scheduledStartTime:start,scheduledEndTime:end,stops:[{name:'A'},{name:'B'}],alerts}]});
const conflict=normalized([{header:'Umleitung',effect:4}]),fallback=normalized(),unrelated=normalized();
unrelated.transitLegs[0].name='RE 2';
const gated=validityModule.assessRouteCandidates([conflict,fallback,unrelated]);
assert.deepEqual(gated.admissible,[unrelated],'A warning-free second provider must not resurrect the same blocked service');

for(const station of [...STATIONS,{id:'uncatalogued',name:'Neue unbekannte Haltestelle'}]){
  const row={tripId:station.id,mode:'REGIONAL_RAIL',displayName:'RE 1',place:{name:station.name,scheduledDeparture:start},alerts:[{header:'Verlegter Halt',effect:9}]};
  const assessed=assessStationRows([row]);
  assert.equal(assessed.stopTimes.length,0,station.name+': station membership must never bypass route validation');
  assert.equal(assessed.routeValidity.blockedCount,1);
}
console.log(`Shared station policy exercised for ${STATIONS.length} curated stations plus an uncatalogued stop (synthetic alerts, not operator coverage).`);

assert.ok(assessRawTransitTrip([leg('Test',{startTime:'2026-10-18T14:00:00'})]).conflict,'Timezone-free event timestamps cannot establish a route time');
