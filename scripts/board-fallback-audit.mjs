import assert from 'node:assert/strict';
import {loadStationBoardWithFallback} from '../app/station-board-fallback.ts';
import {stationCalls} from '../app/station-radar-data.ts';

// Synthetic fault injection, not a claim about current provider services.
// Removing fallback normalization must fail these consumer-level assertions.
const planned='2026-10-17T12:00:00Z', predicted='2026-10-17T12:12:00Z';
const row={tripId:'test:fallback',displayName:'Test',realTime:true,
  place:{scheduledArrival:planned,scheduledDeparture:planned,arrival:predicted,departure:predicted,scheduledTrack:'1',track:'2'}};
const original=structuredClone(row);
const result=await loadStationBoardWithFallback(async mode=>mode==='REALTIME'?[]:[row]);
assert.equal(result.fallback,true);
assert.equal(result.stopTimes[0].realTime,false,'OFF fallback rows must never advertise realtime to board or radar');
assert.equal(result.stopTimes[0].place.arrival,planned,'Fallback must expose the scheduled arrival');
assert.equal(result.stopTimes[0].place.departure,planned,'Fallback must expose the scheduled departure');
assert.equal(result.stopTimes[0].place.track,'1','Fallback must not present an unconfirmed platform change');
const call=stationCalls(result.stopTimes,result.stopTimes).get(row.tripId);
assert.equal(call.arrivalRealtime,false);
assert.equal(call.departureRealtime,false);
assert.equal(call.arrival,Date.parse(planned));
assert.equal(call.departure,Date.parse(planned));
assert.deepEqual(row,original,'Normalization must not mutate the provider response');
const live=await loadStationBoardWithFallback(async()=>[row]);
assert.equal(live.stopTimes[0].realTime,true,'Confirmed primary data must remain intact');
assert.equal(live.stopTimes[0].place.arrival,predicted);
const bare={tripId:'test:bare',place:{departure:planned}};
const bareResult=await loadStationBoardWithFallback(async mode=>mode==='REALTIME'?[]:[bare]);
assert.equal(bareResult.stopTimes[0].place.departure,planned,'OFF-only provider timetable without duplicate scheduled field remains usable');
console.log('Fallback provenance: scheduled times/platforms, consumer flags, immutability and primary realtime passed');
