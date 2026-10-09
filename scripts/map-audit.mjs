import assert from 'node:assert/strict';
import { TrackRouter } from '../app/track-routing.ts';
import { declutterStations } from '../app/map-density.ts';

const coordinates = [[13,52],[13.01,52.01],[13.02,52.015],[13.03,52.01],[13.04,52]];
const router = new TrackRouter({source:'surveyed fixture',retrievedAt:'2026-10-04',accuracy:'fixture',lines:[{route:'curve',coordinates}]});
const stop = (id,index) => ({id,lon:coordinates[index][0],lat:coordinates[index][1],country:'DE'});
const forward=router.geometry([stop('a',1),stop('b',3)]);
assert.deepEqual(forward.segments,[coordinates.slice(1,4).map(([lon,lat])=>[lat,lon])]);
assert.deepEqual(router.geometry([stop('b',3),stop('a',1)]).segments,[...forward.segments].reverse().map(segment=>[...segment].reverse()));
assert.equal(router.geometry([{id:'unknown',lon:0,lat:0,country:'DE'},stop('a',1)]).segments.length,0);
assert.equal(router.geometry([{...stop('foreign',1),country:'FR'},stop('b',3)]).segments.length,0);
const split = new TrackRouter({source:'fixture',retrievedAt:'2026-10-04',accuracy:'fixture',lines:[{route:'west',coordinates:[[13,52],[13.01,52]]},{route:'east',coordinates:[[13.3,52],[13.31,52]]}]});
assert.equal(split.geometry([{id:'w',lon:13,lat:52,country:'DE'},{id:'e',lon:13.31,lat:52,country:'DE'}]).segments.length,0,'Disconnected surveyed tracks must not acquire a fictional straight bridge');
const stations=Array.from({length:1000},(_,i)=>({id:String(i),lat:52,lon:13,x:(i%100)*8,y:Math.floor(i/100)*8}));
const selected=declutterStations(stations,item=>item,'999',120);
assert.equal(selected[0].id,'999');
assert.ok(selected.length<=120);
for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++)assert.ok(Math.hypot(selected[i].x-selected[j].x,selected[i].y-selected[j].y)>=18);
assert.equal(declutterStations([{id:'curated',lat:52,lon:13,mergedCodes:['AB']},{id:'db',lat:52,lon:13.1,source:'db',mergedCodes:['AB']}],item=>({x:item.lon*10000,y:0}),null,120).length,1);
console.log('Map audit passed: surveyed curve direction/endpoints, disconnected and foreign tracks, density bound, selected station and DB aliases.');

// A preview may simplify source curves, but must stay inside a five-metre corridor
// and keep disconnected source segments separate. Full detail geometry is retained.
const { simplifyPreview, prepareStationTrip }=await import('../app/station-trip-geometry.ts');
const curve=Array.from({length:3000},(_,i)=>[52+Math.sin(i/2999*Math.PI*4)*.025,13+i/2999*.25]);
const preview=simplifyPreview(curve);
assert.deepEqual(preview[0],curve[0]);assert.deepEqual(preview.at(-1),curve.at(-1));
assert.ok(preview.length<curve.length/5,'Dense previews must reduce projection work');
const lonScale=111320*Math.cos(52*Math.PI/180);
for(const point of curve) {
  let nearest=Infinity;
  for(let i=1;i<preview.length;i++) {
    const a=preview[i-1],b=preview[i],dx=(b[1]-a[1])*lonScale,dy=(b[0]-a[0])*111320;
    const x=(point[1]-a[1])*lonScale,y=(point[0]-a[0])*111320;
    const t=Math.max(0,Math.min(1,(x*dx+y*dy)/(dx*dx+dy*dy||1)));
    nearest=Math.min(nearest,Math.hypot(x-t*dx,y-t*dy));
  }
  assert.ok(nearest<=5.01,'A preview must follow its source within five metres');
}
function encode(points){let result='',lat=0,lon=0;const part=value=>{let n=value<0?~(value<<1):value<<1,s='';while(n>=32){s+=String.fromCharCode((32|(n&31))+63);n>>=5;}return s+String.fromCharCode(n+63);};for(const p of points){const a=Math.round(p[0]*1e6),b=Math.round(p[1]*1e6);result+=part(a-lat)+part(b-lon);lat=a;lon=b;}return result;}
const source=[[52,13],[52.0001,13.0001],[52,13.5],[52.0001,13.5001]];
const prepared=prepareStationTrip({tripId:'qa-gap',name:'S1',category:'sbahn',realtime:false,station:{name:'Elsewhere',lat:0,lon:0},legs:[{from:{name:'A'},to:{name:'B'},legGeometry:{points:encode(source),precision:6}}]});
assert.deepEqual(prepared.points,source);assert.equal(prepared.segments.length,2);assert.equal(prepared.previewSegments.length,2);
assert.deepEqual(prepared.previewSegments,prepared.segments,'No straight bridge across a source gap');
console.log(`Preview geometry passed: ${curve.length} → ${preview.length} points within 5 m; full source/endpoints/gaps preserved.`);

const loopPoints=[[52,13],[52.005,13.01],[52.01,13.02],[52.009,13.025],[52.0035,13.017],[52,13]];
const loopStop=(index,name)=>({name,lat:loopPoints[index][0],lon:loopPoints[index][1]});
const loop=prepareStationTrip({tripId:'qa-loop',name:'S41',category:'sbahn',realtime:false,station:{name:'Berlin Hbf',lat:52,lon:13},legs:[
  {from:loopStop(0,'Berlin Hbf'),intermediateStops:[loopStop(1,'One')],to:loopStop(2,'Two'),legGeometry:{points:encode(loopPoints.slice(0,3)),precision:6}},
  {from:loopStop(3,'Three'),intermediateStops:[loopStop(4,'Four')],to:loopStop(5,'Berlin Hbf'),legGeometry:{points:encode(loopPoints.slice(3)),precision:6}},
]});
assert.equal(loop.stops.length,6);assert.equal(loop.segments.length,2,'Loop trimming must preserve leg boundaries even when the gap is under 2 km');
assert.deepEqual(loop.segments,[loopPoints.slice(0,3),loopPoints.slice(3)]);
