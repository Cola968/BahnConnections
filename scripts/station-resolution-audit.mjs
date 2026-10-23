import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {chooseStationMatch,stationDistanceMeters} from '../app/station-match.ts';
const cases=JSON.parse(readFileSync(new URL('./fixtures/station-provider-aliases.json',import.meta.url),'utf8'));
const failures=[];
for(const {station,candidates} of cases){
 const match=chooseStationMatch(station,candidates);
 if(!match)failures.push(station.name);
 else assert.ok(stationDistanceMeters(station,match)<450,station.name);
}
assert.deepEqual(failures,[],'Actual provider aliases must resolve without losing the station board');
const at={lat:50,lon:8};
for(const [name,other] of [['Berlin Hbf','Hbf'],['Frankfurt Flughafen Fernbf','Frankfurt Flughafen Regionalbahnhof'],['Celle','Celle West'],['Marburg (Lahn)','Marburg Südbahnhof'],['Norden','Norddeich'],['Rumeln','Duisburg Hbf']]){
 assert.equal(chooseStationMatch({name,...at},[{name:other,...at}]),null,`${name} must not resolve to ${other}`);
}
assert.equal(chooseStationMatch({name:'Celle',...at},[{name:'Celle Bahnhof',lat:50.01,lon:8}]),null,'Loose aliases need a tight distance limit');
console.log(`${cases.length} real provider aliases and 7 wrong-station guards passed`);
// Exercise the public resolver, including provider failures and cancellation.
const {resolveTransitousStopId}=await import('../app/transitous.ts');
const originalFetch=globalThis.fetch;
try{
 const station={id:'resolver-er-test',name:'Erdeborn',lat:51.46878295,lon:11.63691551,country:'DE'};
 const stop={type:'STOP',id:'rail-er',name:'Erdeborn',lat:station.lat,lon:station.lon,modes:['REGIONAL_RAIL']};
 const calls=[];
 globalThis.fetch=async(url)=>{const u=new URL(url);calls.push(u);return Response.json(u.pathname.endsWith('/reverse-geocode')?[{...stop,id:'bus-er',modes:['BUS']},stop]:[]);};
 assert.equal(await resolveTransitousStopId(station),'rail-er');
 assert.equal(calls.length,2,'Only unmatched names trigger reverse lookup');
 assert.equal(calls[0].searchParams.get('place'),`${station.lat},${station.lon}`);
 assert.equal(await resolveTransitousStopId(station),'rail-er');
 assert.equal(calls.length,2,'Successful lookup is shared across views');
 let requests=0;
 globalThis.fetch=async()=>{requests++;return new Response('',{status:429});};
 assert.equal(await resolveTransitousStopId({...station,id:'rate',name:'Rate-limit station'}),null);
 assert.equal(requests,1,'429 must not amplify traffic with fallbacks');
 globalThis.fetch=async(url)=>Response.json(String(url).includes('reverse-geocode')?[{...stop,name:'Bus-only station',modes:['BUS']}]:[]);
 assert.equal(await resolveTransitousStopId({...station,id:'bus',name:'Bus-only station'}),null);
 const abort=new AbortController();abort.abort();
 globalThis.fetch=async(_url,options)=>{options.signal.throwIfAborted();return Response.json([stop]);};
 const retry={...station,id:'abort',name:'Erdeborn (Test)'};
 assert.equal(await resolveTransitousStopId(retry,abort.signal),null);
 assert.equal(await resolveTransitousStopId(retry),'rail-er','Aborted lookup must not poison later views');
 const official={...station,id:'db-bus-audit',name:'Official railway stop',source:'db',kind:'Hp'};
 const bus={...stop,id:'provider-bus-at-railway',name:official.name,modes:['BUS']};
 globalThis.fetch=async(url)=>Response.json(String(url).includes('reverse-geocode')?[bus]:[]);
 assert.equal(await resolveTransitousStopId(official),bus.id,'Known DB station retains its provider ID when the current feed reports BUS only');
 globalThis.fetch=async(url)=>Response.json(String(url).includes('reverse-geocode')?[{...bus,name:'Nearby bus stop'}]:[]);
 assert.equal(await resolveTransitousStopId({...official,name:'Wrong stop guard'}),null,'Nearby bus stops must not substitute the railway station');
 globalThis.fetch=async(url)=>Response.json(String(url).includes('reverse-geocode')?[{...bus,name:'Distant exact name',lat:bus.lat+.001}]:[]);
 assert.equal(await resolveTransitousStopId({...official,name:'Distant exact name'}),null,'Bus fallback needs the same precise station location');
 globalThis.fetch=async(url)=>Response.json(String(url).includes('reverse-geocode')?[{...bus,name:'Ambiguous stop'},{...bus,id:'other-provider-id',name:'Ambiguous stop'}]:[]);
 assert.equal(await resolveTransitousStopId({...official,name:'Ambiguous stop'}),null,'Ambiguous IDs cannot establish station identity');
 globalThis.fetch=async()=>Response.json([{...bus,name:'Mode mismatch'}]);
 assert.equal(await resolveTransitousStopId({...station,name:'Mode mismatch'}),null,'An explicit BUS mode cannot bypass the rail-only search contract');
}finally{globalThis.fetch=originalFetch;}
console.log('Resolver: rail priority, exact DB bus-only identity, wrong-stop guards, success cache, 429 and abort recovery passed');
