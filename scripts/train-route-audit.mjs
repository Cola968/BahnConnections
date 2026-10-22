import assert from 'node:assert/strict';
import {normaliseTrainStops,nextTrainStopIndex,relevantTrainStops,stopEventTime,trainStopPhase} from '../app/train-inspector-data.ts';
import {stationCalls,matchesStationCall} from '../app/station-radar-data.ts';
const stops=normaliseTrainStops([
 {mode:'REGIONAL_RAIL',realTime:true,from:{name:'Start',departure:'2026-10-13T10:00:00Z'},to:{name:'Berlin Hbf',arrival:'2026-10-13T10:30:00Z'}},
 {mode:'REGIONAL_RAIL',realTime:true,from:{name:'Berlin Hbf',departure:'2026-10-13T10:35:00Z',track:'7'},to:{name:'Ziel',arrival:'2026-10-13T11:00:00Z'}}
]);
assert.deepEqual(stops.map(s=>s.name),['Start','Berlin Hbf','Ziel'],'A dwell at a shared leg boundary is one stop, not two');
assert.equal(stops[1].arrival,'2026-10-13T10:30:00Z');
assert.equal(stops[1].departure,'2026-10-13T10:35:00Z');
assert.equal(stops[1].platform,'7');
// A provider may send prediction-shaped fields while realTime=false.
const unconfirmed=normaliseTrainStops([{
 mode:'REGIONAL_RAIL',realTime:false,
 from:{name:'Start',departure:'2026-10-13T10:45:00Z',scheduledDeparture:'2026-10-13T10:00:00Z'},
 intermediateStops:[{name:'Mitte',arrival:'2026-10-13T10:50:00Z',scheduledArrival:'2026-10-13T10:20:00Z',departure:'2026-10-13T10:52:00Z',scheduledDeparture:'2026-10-13T10:22:00Z'}],
 to:{name:'Ziel',arrival:'2026-10-13T11:30:00Z',scheduledArrival:'2026-10-13T11:00:00Z'}
}]);
const afterMiddle=Date.parse('2026-10-13T10:30:00Z');
assert.equal(stopEventTime(unconfirmed[0],'departure'),'2026-10-13T10:00:00Z','Progress starts from the planned departure');
assert.equal(stopEventTime(unconfirmed[2],'arrival'),'2026-10-13T11:00:00Z','Progress ends at the planned arrival');
assert.equal(nextTrainStopIndex(unconfirmed,afterMiddle),2,'Unconfirmed delayed times must not keep passed stops current');
assert.equal(trainStopPhase(unconfirmed[1],afterMiddle),'departed','An unconfirmed delay cannot extend a station dwell');
assert.equal(relevantTrainStops(unconfirmed,afterMiddle,true,true).hidden,2);
const confirmed=unconfirmed.map(stop=>({...stop,realtime:true}));
assert.equal(stopEventTime(confirmed[0],'departure'),'2026-10-13T10:45:00Z');
assert.equal(nextTrainStopIndex(confirmed,afterMiddle),0,'Confirmed predictions remain usable');
assert.equal(trainStopPhase(confirmed[1],afterMiddle),'approaching');
const noScheduled={...unconfirmed[0],scheduledDeparture:undefined};
assert.equal(stopEventTime(noScheduled,'departure'),'2026-10-13T10:45:00Z','Keep a usable time when the timetable is missing');
const invalidScheduled={...unconfirmed[0],scheduledDeparture:'invalid'};
assert.equal(stopEventTime(invalidScheduled,'departure'),'2026-10-13T10:45:00Z','Ignore malformed planned timestamps');
const long=normaliseTrainStops([{mode:'REGIONAL_RAIL',from:{name:'Start'},intermediateStops:Array.from({length:151},(_,i)=>({name:'Halt '+i})),to:{name:'Ziel'}}]);
assert.equal(long.at(-1).name,'Ziel','Complete route retains destination on a long service');
assert.equal(long.length,153);
const now=Date.parse('2026-10-13T10:00:00Z');
const row=(tripId,time,extra={})=>({tripId,place:{arrival:time,departure:time},...extra});
const calls=stationCalls([row('in','2026-10-13T10:10:00Z'),row('cancelled','2026-10-13T10:10:00Z',{cancelled:true})],[row('out','2026-10-13T09:55:00Z'),row('cancelled-at-stop','2026-10-13T09:55:00Z',{place:{cancelled:true,departure:'2026-10-13T09:55:00Z'}})]);
assert.equal(calls.size,4,'Cancelled station calls remain searchable in the timetable browser');
assert.equal(matchesStationCall(calls.get('cancelled'),'all',now),false,'Cancelled trains must not create radar markers');
assert.equal(matchesStationCall(calls.get('cancelled-at-stop'),'all',now),false,'Cancelled station stops must not create radar markers');
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
