import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const source = await readFile(new URL('../app/track-routing.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
const { TrackRouter } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
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
