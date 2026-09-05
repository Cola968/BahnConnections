/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS test loader transpiles the existing TypeScript modules in memory. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, path) => {
  const output = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { module:ts.ModuleKind.CommonJS, target:ts.ScriptTarget.ES2022, jsx:ts.JsxEmit.ReactJSX, esModuleInterop:true } }).outputText;
  module._compile(output, path);
};
const { categoryForMode, dbCategory } = require('../app/live-journey.ts');
const { normaliseRoutes } = require('../app/station-lines.tsx');
const { brandFor } = require('../app/live-board.tsx');
const { serviceColors } = require('../app/transit-style.ts');
const { RAIL_MODES } = require('../app/transitous.ts');
assert.equal(categoryForMode('TRAM'), 'tram');
assert.equal(dbCategory('tram'), 'tram');
assert.ok(RAIL_MODES.split(',').includes('TRAM'));
const lines = normaliseRoutes([{mode:'TRAM',routeShortName:'M10',routeColor:'FF9900',agencyName:'BVG'}, {mode:'TRAM',routeShortName:'12'}], [
  {mode:'TRAM',routeShortName:'M10',tripId:'one',headsign:'Turmstraße',realTime:true,place:{departure:'2026-09-05T20:05:00+02:00'}},
  {mode:'TRAM',routeShortName:'M10',tripId:'two',tripTo:{name:'Warschauer Straße'},place:{scheduledDeparture:'2026-09-05T20:10:00+02:00'}},
]);
assert.equal(lines.length, 2, 'Lines without imminent departure remain visible');
const m10=lines.find(line=>line.shortName==='M10');
assert.equal(m10.category,'tram');
assert.deepEqual(m10.destinations,['Turmstraße','Warschauer Straße']);
assert.equal(m10.realtimeTrips,1);
assert.equal(serviceColors('tram',m10.routeColor).background,'#ff9900');
assert.deepEqual(brandFor({line:{product:'tram',name:'M10'}}),{label:'M10',number:'',className:'tram'});
assert.equal(brandFor({line:{product:'tram',name:'12'}}).className,'tram');
assert.equal(categoryForMode('REGIONAL_RAIL'),'regional');
assert.equal(serviceColors('ubahn',undefined,undefined,'U2','Berlin').background,'#da421e');
console.log('PASS: Tram modes, provider colors, destinations, line inventory, badges, S/U/rail compatibility');
