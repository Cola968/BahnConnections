import assert from 'node:assert/strict';
import {registerHooks} from 'node:module';

// Node executes the actual route, whose extensionless imports are resolved by
// the application bundler in production. No copy of its response logic here.
const hooks=registerHooks({resolve(specifier,context,next){
  try{return next(specifier,context);}catch(error){
    if(error.code==='ERR_MODULE_NOT_FOUND'&&specifier.startsWith('.')&&!/\.[a-z]+$/i.test(specifier))return next(specifier+'.ts',context);
    throw error;
  }
}});
const {GET}=await import('../app/api/stations/[id]/board/route.ts');
hooks.deregister();
const originalFetch=globalThis.fetch;
const planned='2026-10-17T12:00:00Z',predicted='2026-10-17T12:12:00Z';
const row={tripId:'test:api',realTime:true,place:{arrival:predicted,departure:predicted,scheduledArrival:planned,scheduledDeparture:planned,track:'2',scheduledTrack:'1'}};
const request=(query='verify=0',signal)=>GET(new Request('https://test.invalid/api/stations/test/board?'+query,{signal}),{params:Promise.resolve({id:'test:stop'})});
try{
  let modes=[];
  globalThis.fetch=async url=>{
    const mode=new URL(url).searchParams.get('realtimeMode');modes.push(mode);
    return mode==='REALTIME'?new Response(null,{status:503}):Response.json({stopTimes:[row]});
  };
  const recovered=await request();
  assert.equal(recovered.status,200);
  const body=await recovered.json();
  assert.deepEqual(modes,['REALTIME','OFF']);
  assert.equal(body.realtimeStatus,'schedule');
  assert.equal(body.stopTimes[0].realTime,false);
  assert.equal(body.stopTimes[0].place.departure,planned);
  assert.equal(body.stopTimes[0].place.track,'1');
  assert.equal(recovered.headers.get('cache-control'),'no-store');
  // The streaming UI must receive the same normalized rows. Fail the optional
  // DB verification locally rather than contacting any real provider.
  const streamed=await request('stream=1');
  const frames=(await streamed.text()).trim().split('\n').map(JSON.parse);
  assert.equal(frames[0].type,'board');
  assert.equal(frames[0].stopTimes[0].realTime,false);
  assert.equal(frames[1].type,'verification');
  assert.equal(frames[1].verification.status,'unavailable');
  for(const primaryStatus of [200,503]){
    modes=[];
    globalThis.fetch=async url=>{
      const mode=new URL(url).searchParams.get('realtimeMode');modes.push(mode);
      return mode==='REALTIME'?(primaryStatus===200?Response.json({stopTimes:[]}):new Response(null,{status:503})):new Response(null,{status:429});
    };
    const throttled=await request();
    assert.equal(throttled.status,429,'OFF throttle must survive HTTP error translation');
    assert.equal(throttled.headers.get('retry-after'),'60');
    assert.deepEqual(modes,['REALTIME','OFF']);
  }
  let calls=0;
  globalThis.fetch=async()=>{calls++;return new Response(null,{status:429});};
  assert.equal((await request()).status,429);
  assert.equal(calls,1,'Primary throttle must not be retried');
  calls=0;
  const controller=new AbortController();controller.abort();
  globalThis.fetch=async(_url,options)=>{calls++;options.signal.throwIfAborted();throw Error('unreachable');};
  await request('verify=0',controller.signal);
  assert.equal(calls,1,'Caller cancellation must not produce a second provider request');
  calls=0;
  await request('window=invalid&verify=0');
  assert.equal(calls,0,'Invalid input must not reach the provider');
}finally{globalThis.fetch=originalFetch;}
console.log('Actual board GET: JSON/NDJSON schedule provenance, 429 + Retry-After, cancellation and invalid-input budget passed');
