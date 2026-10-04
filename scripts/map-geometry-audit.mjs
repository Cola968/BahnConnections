import assert from 'node:assert/strict';
import { continuousSegments, railMapGeometry, pointDistance } from '../app/map-geometry.ts';
import { TrackRouter } from '../app/track-routing.ts';

// A missing stretch must remain a gap, including gaps between explicit source sections.
const first=[[52,13],[52.001,13.001]],second=[[52.1,13.1],[52.101,13.101]];
assert.deepEqual(continuousSegments([...first,...second]),[first,second]);
const nearby=[[52.002,13.002],[52.003,13.003]];
assert.deepEqual(railMapGeometry([...first,...nearby],[],false,null,[first,nearby]).segments,[first,nearby]);
assert.deepEqual(continuousSegments([[NaN,13],[52,13],[52.001,13]]),[[[52,13],[52.001,13]]]);

// Stops on the same line use the intervening surveyed section, not both endpoints.
const coordinates=Array.from({length:100},(_,i)=>[13+i*.001,52+Math.sin(i/10)*.0005]);
const router=new TrackRouter({source:'fixture',retrievedAt:'2026-10-04',accuracy:'fixture',lines:[{route:'test',coordinates}]});
const stops=[20,65].map(i=>({id:`stop-${i}`,name:`Stop ${i}`,country:'DE',lon:coordinates[i][0],lat:coordinates[i][1]}));
const geometry=router.geometry(stops);
assert.equal(geometry.points.length,46);
assert.deepEqual(geometry.points[0],[stops[0].lat,stops[0].lon]);
assert.deepEqual(router.geometry([...stops].reverse()).points,[...geometry.points].reverse());
const restored=railMapGeometry(stops.map(stop=>[stop.lat,stop.lon]),stops,true,router);
assert.equal(restored.network,true);
assert.ok(restored.segments.every(segment=>segment.slice(1).every((point,i)=>pointDistance(segment[i],point)<2000)));
assert.equal(railMapGeometry(stops.map(stop=>[stop.lat,stop.lon]),stops,false,router).segments.length,0);
// Simplification can leave a valid, long, straight surveyed section.
// Distance alone must never chop such sections into dashed fragments.
const longLine=[[13,52],[13.04,52],[13.08,52],[13.12,52]];
const longRouter=new TrackRouter({source:'survey',retrievedAt:'2026-10-04',accuracy:'survey',lines:[{route:'straight track',coordinates:longLine}]});
const longStops=[longLine[0],longLine.at(-1)].map(([lon,lat],i)=>({id:String(i),name:String(i),country:'DE',lat,lon}));
const longShape=railMapGeometry(longStops.map(stop=>[stop.lat,stop.lon]),longStops,true,longRouter);
assert.equal(longShape.segments.length,1);
assert.equal(longShape.segments[0].length,4);
assert.ok(pointDistance(longShape.segments[0][0],longShape.segments[0][1])>2000);
assert.equal(longRouter.geometry([{id:'foreign',country:'DE',lat:0,lon:0},longStops[1]]).segments.length,0);
console.log('Geometry gaps, source sections, surveyed same-line routing and reverse routing passed');
