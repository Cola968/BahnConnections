import assert from 'node:assert/strict';
import { VisibilityPoller } from '../app/visibility-poller.ts';
import { radarCoverageKey } from '../app/radar-coverage.ts';
import { readBoardStream } from '../app/board-stream.ts';
import { readPreferenceIds,readPreferenceJson } from '../app/local-preferences.ts';
import { pointOnTrip,activeEstimatedPosition,trailForTrip,segmentAverageSpeed,realtimeModelSpeed,matchesLiveStatus } from '../app/live-trains.ts';
import { normaliseTrainStops,nextTrainStopIndex,headingDegrees,cardinalDirection,sourceFreshness } from '../app/train-inspector-data.ts';
import { trainArrivalView } from '../app/train-arrival.ts';
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Distinguish genuine realtime predictions from the base timetable.
const scheduled='2026-10-11T12:00:00Z',predicted='2026-10-11T12:08:00Z';
const delayed=trainArrivalView({scheduled,actual:predicted,realtime:true,fresh:true});
assert.equal(delayed.plannedLabel,'14:00');
assert.equal(delayed.expectedLabel,'14:08');
assert.equal(delayed.delayMinutes,8);
assert.equal(delayed.status,'+8 Min. Verspätung');
assert.equal(delayed.tone,'warning');
assert.equal(delayed.isFreshPrediction,true);
const punctual=trainArrivalView({scheduled,actual:scheduled,realtime:true,fresh:true});
assert.equal(punctual.delayMinutes,0);
assert.equal(punctual.status,'Pünktlich');
assert.equal(punctual.tone,'success');
const early=trainArrivalView({scheduled,actual:'2026-10-11T11:57:00Z',realtime:true,fresh:true});
assert.equal(early.delayMinutes,-3);
assert.equal(early.status,'3 Min. früher');
const noRealtime=trainArrivalView({scheduled,actual:predicted,realtime:false,fresh:true});
assert.equal(noRealtime.plannedLabel,'14:00');
assert.equal(noRealtime.expected,null,'A schedule-only feed must not claim an ETA prediction');
assert.equal(noRealtime.status,'Nur Fahrplan');
const stale=trainArrivalView({scheduled,actual:predicted,realtime:true,fresh:false});
assert.equal(stale.expected,null,'Stale data must not appear as a fresh ETA');
assert.equal(stale.delayMinutes,null);
assert.equal(stale.status,'Keine aktuelle Echtzeitprognose');
const missingSchedule=trainArrivalView({actual:predicted,realtime:true,fresh:true});
assert.equal(missingSchedule.planned,null);
assert.equal(missingSchedule.expectedLabel,'14:08');
assert.equal(missingSchedule.delayMinutes,null,'Do not invent delay without a timetable');
assert.equal(missingSchedule.status,'Prognose ohne Sollvergleich');
const missingForecast=trainArrivalView({scheduled,realtime:true,fresh:true});
assert.equal(missingForecast.expected,null,'Missing realtime ETA cannot be invented');
assert.match(missingForecast.status,/Echtzeitprognose fehlt/);
const scheduleFallback=trainArrivalView({actual:scheduled,realtime:false,fresh:false});
assert.equal(scheduleFallback.plannedLabel,'14:00');
assert.equal(scheduleFallback.expected,null);
const invalidArrival=trainArrivalView({scheduled,actual:'invalid',realtime:true,fresh:true});
assert.equal(invalidArrival.expected,null);
assert.equal(invalidArrival.delayMinutes,null);

class Visibility extends EventTarget {hidden=false;}
assert.equal(radarCoverageKey({id:'berlin',lat:52.00004,lon:13}),radarCoverageKey({id:'berlin',lat:52,lon:13}), 'Same rounded radar viewport keeps identity');
assert.notEqual(radarCoverageKey({id:'berlin',lat:52,lon:13}),radarCoverageKey({id:'berlin',lat:52.015,lon:13}), 'Moving radar anchor invalidates same-station cached data');
assert.notEqual(radarCoverageKey({id:'berlin',lat:52,lon:13}),radarCoverageKey({id:'hamburg',lat:52,lon:13}), 'Station changes invalidate cached data');
const visibility=new Visibility(),signals=[];
const poller=new VisibilityPoller(async signal=>{signals.push(signal);await new Promise(resolve=>signal.addEventListener('abort',resolve,{once:true}));},10,visibility);
assert.equal(signals.length,1);
visibility.hidden=true;visibility.dispatchEvent(new Event('visibilitychange'));
assert.equal(signals[0].aborted,true);await pause(25);assert.equal(signals.length,1,'Hidden tabs cannot reschedule aborted requests');
visibility.hidden=false;visibility.dispatchEvent(new Event('visibilitychange'));assert.equal(signals.length,2);
poller.dispose();assert.equal(signals[1].aborted,true);await pause(25);assert.equal(signals.length,2);

const trip={points:[[52,13],[52.001,13.001],[52.002,13.002]],departure:'2026-10-11T12:00:00Z',arrival:'2026-10-11T12:05:00Z',scheduledArrival:'2026-10-11T12:00:00Z',realTime:true,distance:1000};
assert.ok(pointOnTrip(trip,.5));
assert.equal(activeEstimatedPosition(trip,Date.parse('2026-10-11T11:59:00Z')),null,'Future trips must not appear as live radar markers');
assert.equal(activeEstimatedPosition(trip,Date.parse('2026-10-11T12:06:00Z')),null,'Finished trips must not appear as live radar markers');assert.equal(matchesLiveStatus(trip,'delayed'),true,'Five minutes is delayed');
assert.equal(matchesLiveStatus({...trip,realTime:false},'delayed'),false);
assert.equal(matchesLiveStatus({...trip,scheduledArrival:undefined},'ontime'),false);
assert.equal(matchesLiveStatus({...trip,arrival:'2026-10-11T11:59:00Z'},'ontime'),false,'Early is distinct from on time');
assert.equal(pointOnTrip({...trip,points:[]},.5),null);assert.equal(pointOnTrip({...trip,points:[[52,13],[53,14]]},.5),null,'Never cross a source geometry gap');
assert.equal(pointOnTrip({...trip,arrival:'invalid'},.5),null);assert.deepEqual(trailForTrip({...trip,points:[]},.5),[]);
assert.deepEqual(trailForTrip(trip,.5).at(-1),pointOnTrip(trip,.5));
const halfway=Date.parse('2026-10-11T12:02:30Z');
assert.deepEqual(activeEstimatedPosition(trip,halfway),pointOnTrip(trip,.5),'Tracking must use source geometry inside the active section');
assert.equal(activeEstimatedPosition(trip,Date.parse('2026-10-11T11:59:59Z')),null,'No camera tracking before reported departure');
assert.equal(activeEstimatedPosition(trip,Date.parse('2026-10-11T12:05:01Z')),null,'No frozen camera at the last stop after arrival');
assert.equal(activeEstimatedPosition({...trip,points:[[52,13],[53,14]]},halfway),null,'Never track through a missing railway section');
assert.equal(activeEstimatedPosition({...trip,arrival:'invalid'},halfway),null,'Invalid predictions are not trackable');
assert.ok(realtimeModelSpeed(trip,halfway)>0,'Valid realtime polyline permits a modelled current speed');
assert.equal(realtimeModelSpeed({...trip,realTime:false},halfway),null,'Scheduled journeys must not show a realtime speed');
assert.equal(realtimeModelSpeed({...trip,points:[[52,13],[55,14]]},halfway),null,'Disconnected geometry must not yield a model speed');
assert.equal(realtimeModelSpeed({...trip,points:[[52,13],[52.001,13.001],[53,14]]},halfway),null,'Distant jumps elsewhere on route cannot inflate model speed');
assert.equal(realtimeModelSpeed(trip,Date.parse('2026-10-11T12:00:10Z')),null,'Do not show cruise speeds just after departure');
assert.equal(realtimeModelSpeed(trip,halfway+3_600_000),null,'Completed journeys have no current speed');
assert.equal(realtimeModelSpeed({...trip,departure:'invalid'},halfway),null,'Broken timestamps cannot produce speeds');
assert.equal(realtimeModelSpeed({...trip,arrival:'2026-10-11T12:00:01Z'},halfway),null,'Implausible durations cannot yield attractive false speeds');
assert.equal(segmentAverageSpeed({...trip,distance:0}),null);assert.equal(segmentAverageSpeed({...trip,distance:1e9}),null);



const fullStops=normaliseTrainStops([
  {mode:'LONG_DISTANCE',realTime:true,from:{name:'Berlin Hbf',departure:'2026-10-11T12:00:00Z'},to:{name:'Südkreuz',arrival:'2026-10-11T12:05:00Z'}},
  {mode:'LONG_DISTANCE',realTime:true,from:{name:'Südkreuz',arrival:'2026-10-11T12:05:00Z'},to:{name:'Halle Hbf',arrival:'2026-10-11T13:00:00Z'}},
]);
assert.deepEqual(fullStops.map(stop=>stop.name),['Berlin Hbf','Südkreuz','Halle Hbf'],'Shared leg boundary does not duplicate');
assert.equal(nextTrainStopIndex(fullStops,Date.parse('2026-10-11T12:20:00Z')),2,'Next stop is the upcoming timetable event');
assert.equal(nextTrainStopIndex(fullStops,Date.parse('2026-10-11T15:20:00Z')),-1,'Completed train has no next stop');
assert.equal(headingDegrees([52,13],[53,13]),0,'North is zero degrees');
assert.ok(Math.abs(headingDegrees([52,13],[52,14])-90)<.0001,'East is 90 degrees');
assert.equal(cardinalDirection(headingDegrees([52,13],[51,13])),'S');
assert.equal(headingDegrees([52,13],[52,13]),null,'Stationary/invalid direction is hidden');
assert.equal(sourceFreshness(new Date('2026-10-11T12:00:00Z'),Date.parse('2026-10-11T12:01:00Z'),true),'current');
assert.equal(sourceFreshness(new Date('2026-10-11T12:00:00Z'),Date.parse('2026-10-11T12:03:00Z'),true),'old');
assert.equal(sourceFreshness(new Date('2026-10-11T12:00:00Z'),Date.parse('2026-10-11T12:01:00Z'),false),'missing');

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
