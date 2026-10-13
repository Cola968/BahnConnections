import assert from 'node:assert/strict';
import {normaliseTrainStops} from '../app/train-inspector-data.ts';
import {stationCalls,matchesStationCall} from '../app/station-radar-data.ts';
const stops=normaliseTrainStops([
 {mode:'REGIONAL_RAIL',realTime:true,from:{name:'Start',departure:'2026-10-13T10:00:00Z'},to:{name:'Berlin Hbf',arrival:'2026-10-13T10:30:00Z'}},
 {mode:'REGIONAL_RAIL',realTime:true,from:{name:'Berlin Hbf',departure:'2026-10-13T10:35:00Z',track:'7'},to:{name:'Ziel',arrival:'2026-10-13T11:00:00Z'}}
]);
assert.deepEqual(stops.map(s=>s.name),['Start','Berlin Hbf','Ziel'],'A dwell at a shared leg boundary is one stop, not two');
assert.equal(stops[1].arrival,'2026-10-13T10:30:00Z');
assert.equal(stops[1].departure,'2026-10-13T10:35:00Z');
assert.equal(stops[1].platform,'7');
const long=normaliseTrainStops([{mode:'REGIONAL_RAIL',from:{name:'Start'},intermediateStops:Array.from({length:151},(_,i)=>({name:'Halt '+i})),to:{name:'Ziel'}}]);
assert.equal(long.at(-1).name,'Ziel','Complete route retains destination on a long service');
assert.equal(long.length,153);
const now=Date.parse('2026-10-13T10:00:00Z');
const row=(tripId,time,extra={})=>({tripId,place:{arrival:time,departure:time},...extra});
const calls=stationCalls([row('in','2026-10-13T10:10:00Z'),row('cancelled','2026-10-13T10:10:00Z',{cancelled:true})],[row('out','2026-10-13T09:55:00Z'),row('cancelled-at-stop','2026-10-13T09:55:00Z',{place:{cancelled:true,departure:'2026-10-13T09:55:00Z'}})]);
assert.equal(calls.size,2,'Cancelled trains and cancelled station calls are excluded');
assert.equal(matchesStationCall(calls.get('in'),'inbound',now),true);
assert.equal(matchesStationCall(calls.get('in'),'outbound',now),false);
assert.equal(matchesStationCall(calls.get('out'),'outbound',now),true);
assert.equal(matchesStationCall(calls.get('out'),'inbound',now),false);
assert.equal(matchesStationCall(calls.get('same-line-but-unrelated'),'all',now),false);
const dwell={arrival:now-5*60_000,departure:now+5*60_000};
assert.equal(matchesStationCall(dwell,'inbound',now),true,'A train standing at the platform remains inbound during a long dwell');
assert.equal(matchesStationCall(dwell,'outbound',now),true,'A train standing at the platform is also available in outbound');
assert.equal(stationCalls([row('', 'invalid'),row('invalid','invalid')],[]).size,0);
console.log('Train route: dwell merging and complete origin-to-destination itinerary passed.');
