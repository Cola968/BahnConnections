import assert from 'node:assert/strict';
import { TrackRouter } from '../app/track-routing.ts';
import { railDistanceKm, splitRailGeometry } from '../app/rail-geometry.ts';
const router = new TrackRouter({ source:'test', retrievedAt:'test', accuracy:'fixture', lines:[
  { route:'a', coordinates:[[13,52],[13.01,52],[13.02,52]] },
  { route:'b', coordinates:[[13.025,52],[13.035,52],[13.045,52]] },
] });
const from = { id:'a', lon:13, lat:52, country:'DE' };
const to = { id:'b', lon:13.045, lat:52, country:'DE' };
for (const stations of [[from,to],[to,from]]) {
  const result = router.geometry(stations);
  assert.equal(result.segments.length, 2, 'Artificial graph connector must remain a gap');
  for (const section of result.segments) {
    assert.ok(!section.some((p) => p[1] <= 13.02) || !section.some((p) => p[1] >= 13.025), 'No section crosses missing track');
  }
}
console.log('Track gap and reverse-cache regression tests passed');

const sparse = [[52.5,13.3],[52.501,13.31],[52.6,13.4],[52.601,13.41]];
assert.equal(splitRailGeometry(sparse).length,2,'A long jump in source points must remain a visible gap');
assert.ok(splitRailGeometry(sparse).every(segment=>segment.slice(1).every((point,i)=>railDistanceKm(segment[i],point)<=2)));
const sparseLine = new TrackRouter({ source:'fixture',retrievedAt:'test',accuracy:'fixture',lines:[{route:'sparse',coordinates:sparse.map(([lat,lon])=>[lon,lat])}] });
const gap = sparseLine.geometry([{id:'near-a',lat:52.5,lon:13.3,country:'DE'},{id:'near-b',lat:52.601,lon:13.41,country:'DE'}]);
assert.equal(gap.segments.length,2,'The rail network itself must split sparse surveyed sections');
assert.ok(gap.coverage<1,'Missing geometry must reduce reported coverage');
console.log('Sparse-source geometry regression passed');
