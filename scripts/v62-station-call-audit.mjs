import assert from "node:assert/strict";
import { stationCallPresentation, browseStationCalls } from "../app/station-call-presentation.ts";

const now=Date.parse("2026-10-23T12:00:00+02:00");
const at=(minutes)=>now+minutes*60_000;
const fixture={name:"ICE 100",destination:"Hamburg",arrival:at(12),scheduledArrival:at(2),arrivalRealtime:true,arrivalTrack:"8",arrivalScheduledTrack:"7",
  departure:at(16),scheduledDeparture:at(6),departureRealtime:true,departureTrack:"8",departureScheduledTrack:"7",realtime:true};
const inbound=stationCallPresentation(fixture,"inbound",true);
assert.equal(inbound.eventTime,at(12));
assert.equal(inbound.status,"forecast");
assert.equal(inbound.delayMinutes,10);
assert.equal(inbound.platform,"8");
assert.equal(inbound.plannedPlatform,"7");
assert.equal(inbound.platformChanged,true);
const stale=stationCallPresentation(fixture,"inbound",false);
assert.equal(stale.eventTime,at(2),"Stale predictions MUST fall back to the actual timetable");
assert.equal(stale.status,"schedule");
assert.equal(stale.delayMinutes,null,"Stale +10 must never appear as current");
assert.equal(stale.platform,"7","Stale changed track cannot be shown as confirmed");
assert.equal(stale.platformChanged,false);
const onlyPrediction={arrival:at(12),arrivalRealtime:true,arrivalTrack:"8"};
assert.equal(stationCallPresentation(onlyPrediction,"inbound",false).eventTime,null,"Stale prediction without timetable is unknown");
assert.equal(stationCallPresentation(onlyPrediction,"inbound",false).status,"unconfirmed");
assert.equal(stationCallPresentation(onlyPrediction,"inbound",false).platform,undefined);
assert.equal(stationCallPresentation({arrival:at(2),arrivalRealtime:false,arrivalTrack:"9"},"inbound",false).eventTime,at(2),"Non-realtime reported schedule remains valid");
assert.equal(stationCallPresentation(fixture,"outbound",true).eventTime,at(16),"Direction-specific departures must stay distinct");
const calls=new Map([
 ["later", {...fixture,arrival:at(85),scheduledArrival:at(80),departure:at(89),scheduledDeparture:at(84),arrivalTrack:"3",arrivalScheduledTrack:"3",departureTrack:"3",departureScheduledTrack:"3"}],
 ["late", fixture],
 ["plain", {name:"RE 1",destination:"Berlin",arrival:at(25),scheduledArrival:at(25),arrivalRealtime:false}],
 ["unknown", {name:"ICE 201",arrival:at(18),arrivalRealtime:true}],
 ["old", {name:"IC 50",arrival:at(-80),scheduledArrival:at(-80),arrivalRealtime:false}],
 ["cancelled", {...fixture,cancelled:true}],
]);
assert.deepEqual(browseStationCalls(calls,"inbound","", "next-hour",now,true).map(x=>x.tripId),["late","unknown","plain"]);
assert.deepEqual(browseStationCalls(calls,"inbound","", "late",now,true).map(x=>x.tripId),["late","later"]);
assert.deepEqual(browseStationCalls(calls,"inbound","", "platform-change",now,true).map(x=>x.tripId),["late"]);
assert.deepEqual(browseStationCalls(calls,"inbound","", "late",now,false).map(x=>x.tripId),[],"Stale delayed filter must never show a false-positive");
assert.deepEqual(browseStationCalls(calls,"inbound","", "platform-change",now,false).map(x=>x.tripId),[]);
assert.deepEqual(browseStationCalls(calls,"inbound","ice","all",now,false).map(x=>x.tripId),["late","later"],"No current-only phantom ride if stale timetable is missing");
assert.deepEqual(browseStationCalls(calls,"outbound","", "next-hour",now,true).map(x=>x.tripId),["late","later"].filter(id=>id==="late"));
assert.equal(stationCallPresentation({arrival:NaN,arrivalRealtime:true,scheduledArrival:Infinity},"inbound",true).eventTime,null);
console.log("V62 station calls: schedule freshness, changed platforms, direction, filters, no phantom prediction and cancellations passed.");
