import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
const hooks=registerHooks({resolve(s,c,next){try{return next(s,c);}catch(e){if(e.code==='ERR_MODULE_NOT_FOUND'&&s.startsWith('.')&&!/\.[a-z]+$/i.test(s))return next(s+'.ts',c);throw e;}}});
const {inBatches}=await import('../app/transitous.ts');
let schedule;
try { ({boardTripRequest:schedule}=await import('../app/board-request-budget.ts')); }
catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;schedule=work=>work();}
hooks.deregister();
let active=0,peak=0,completed=0;
const worker=()=>schedule(async()=>{
  active++;peak=Math.max(peak,active);
  await new Promise(resolve=>setTimeout(resolve,4));
  active--;completed++;return completed;
});
// Two actual board batch producers plus the explicitly opened trip detail.
await Promise.all([inBatches(Array.from({length:36}),6,worker),inBatches(Array.from({length:30}),6,worker),worker()]);
assert.ok(peak<=6,`All board producers together must stay within six active requests; observed ${peak}`);
assert.equal(completed,67);
const held=[];
const busy=Array.from({length:6},()=>schedule(()=>new Promise(resolve=>held.push(resolve))));
await Promise.resolve();await Promise.resolve();
const controller=new AbortController();let queuedStarted=false;
const aborted=schedule(async()=>{queuedStarted=true;},controller.signal);
controller.abort();
await assert.rejects(aborted,{name:'AbortError'});
held.forEach(resolve=>resolve());await Promise.all(busy);
assert.equal(queuedStarted,false,'Cancelled station work must not reach fetch');
await assert.rejects(schedule(async()=>{throw Error('upstream');}),/upstream/);
assert.equal(await schedule(async()=>42),42,'A failed request must release capacity');
const source=readFileSync(new URL('../app/live-board.tsx',import.meta.url),'utf8');
assert.match(source,/boardTripRequest\(/,'The tested queue must be used by the actual board HTTP path');
console.log('Board shared HTTP budget: combined producers <=6, abort before dispatch, error recovery passed.');
