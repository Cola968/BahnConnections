import assert from 'node:assert/strict';
import { serviceColors } from '../app/transit-style.ts';
import { resolveTransitousStopId } from '../app/transitous.ts';

const categories=['fern','regional','sbahn','ubahn','tram'];
const colours=categories.map(category=>serviceColors(category).background);
assert.equal(new Set(colours).size,categories.length);
for(const category of categories)for(const grey of ['888888','#777','000000','ffffff']) {
  assert.equal(serviceColors(category,grey).background,serviceColors(category).background);
}
assert.equal(serviceColors('sbahn','888888',undefined,'S 1','Berlin').background,'#d84b9b');
assert.equal(serviceColors('ubahn',undefined,undefined,'U8','BVG').background,'#224f86');
assert.equal(serviceColors('ubahn',undefined,undefined,'U4','Berlin').text,'#172b35');
assert.deepEqual(serviceColors('tram','ab1234','ffffff'),{background:'#ab1234',text:'#ffffff'});
assert.equal(serviceColors('regional','invalid').background,'#1455a0');

// Cancelled and failed lookups must remain retryable, including a concurrent caller.
const originalFetch=globalThis.fetch;
const station={id:'qa-cache',name:'Cache test',lat:52.5251,lon:13.3694,country:'DE'};
let calls=0;
globalThis.fetch=async (_url,{signal}={})=>{
  calls++;
  await new Promise(resolve=>setTimeout(resolve,5));
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  return {ok:true,json:async()=>[{type:'STOP',id:'verified-stop',lat:station.lat,lon:station.lon}]};
};
try {
  const controller=new AbortController();
  const cancelled=resolveTransitousStopId(station,controller.signal);
  controller.abort();
  const concurrent=resolveTransitousStopId(station);
  assert.equal(await cancelled,null);
  assert.equal(await concurrent,'verified-stop');
  assert.equal(await resolveTransitousStopId(station),'verified-stop');
  assert.equal(calls,2);
} finally {globalThis.fetch=originalFetch;}
console.log('Transport colours and aborted station lookup regression passed');
