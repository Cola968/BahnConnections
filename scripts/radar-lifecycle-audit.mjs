import assert from 'node:assert/strict';
import { VisibilityPoller } from '../app/visibility-poller.ts';
import { readBoardStream } from '../app/board-stream.ts';
import { readPreferenceIds,readPreferenceJson } from '../app/local-preferences.ts';
import { pointOnTrip,trailForTrip,segmentAverageSpeed,matchesLiveStatus } from '../app/live-trains.ts';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
class Visibility extends EventTarget {hidden=false;}
const visibility=new Visibility(),signals=[];
const poller=new VisibilityPoller(async signal=>{signals.push(signal);await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));},10,visibility);
assert.equal(signals.length,1);
visibility.hidden=true;visibility.dispatchEvent(new Event('visibilitychange'));
assert.equal(signals[0].aborted,true);await pause(25);assert.equal(signals.length,1,'Hidden tabs cannot reschedule aborted requests');
visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(signals.length,2);
poller.dispose();assert.equal(signals[1].aborted,true);await pause(25);assert.equal(signals.length,2);

const trip={points:[[52,13],[52.001,13.001],[52.002,13.002]],departure:'2026-10-11T12:00:00Z',arrival:'2026-10-11T12:05:00Z',scheduledArrival:'2026-10-11T12:00:00Z',realTime:true,distance:1000};
assert.ok(pointOnTrip(trip,.5));assert.equal(matchesLiveStatus(trip,'delayed'),true,'Five minutes is delayed');
assert.equal(matchesLiveStatus({...trip,realTime:false},'delayed'),false);
assert.equal(matchesLiveStatus({...trip,scheduledArrival:undefined},'ontime'),false);
assert.equal(matchesLiveStatus({...trip,arrival:'2026-10-11T11:59:00Z'},'ontime'),false,'Early is distinct from on time');
assert.equal(pointOnTrip({...trip,points:[]},.5),null);assert.equal(pointOnTrip({...trip,points:[[52,13],[53,14]]},.5),null,'Never cross a source geometry gap');
assert.equal(pointOnTrip({...trip,arrival:'invalid'},.5),null);assert.deepEqual(trailForTrip({...trip,points:[]},.5),[]);
assert.deepEqual(trailForTrip(trip,.5).at(-1),pointOnTrip(trip,.5));assert.equal(segmentAverageSpeed({...trip,distance:0}),null);assert.equal(segmentAverageSpeed({...trip,distance:1e9}),null);

const records=[],encoder=new TextEncoder();let streamController;
const stream=new ReadableStream({start(controller){streamController=controller;}});
const read=readBoardStream(new Response(stream),new AbortController().signal,record=>records.push(record));
const primary=encoder.encode(JSON.stringify({type:'board',destination:'München',stopTimes:[1]})+'\n');
const umlaut=primary.indexOf(195);streamController.enqueue(primary.slice(0,umlaut+1));streamController.enqueue(primary.slice(umlaut+1));
await pause(1);assert.equal(records.length,1,'Primary rows arrive before verification completes');assert.equal(records[0].destination,'München');
streamController.enqueue(encoder.encode('{"type":"verification","status":"inconclusive"}\n'));streamController.close();await read;assert.equal(records.length,2);
let cancelled=false;
const pendingStream=new ReadableStream({cancel(){cancelled=true;}}),abort=new AbortController();
const aborted=readBoardStream(new Response(pendingStream),abort.signal,()=>assert.fail('Aborted stream must not publish'));
abort.abort();await assert.rejects(aborted,{name:'AbortError'});assert.equal(cancelled,true);
const store={getItem:key=>({'bad':'{"invalid":true}','broken':'{','ids':'[1,"berlin","berlin",null,"hamburg"]'})[key]??null};
assert.deepEqual(readPreferenceIds(store,'bad'),[]);assert.equal(readPreferenceJson(store,'broken'),null);assert.deepEqual(readPreferenceIds(store,'ids'),['berlin','hamburg']);assert.deepEqual(readPreferenceIds({getItem(){throw Error('denied');}},'ids'),[]);
console.log('Radar lifecycle: visibility, abort, geometry truth, 5-minute threshold, streaming and damaged storage passed.');
