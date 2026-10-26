import {test} from "node:test";
import assert from "node:assert/strict";
import {compareStationBoard,stationComparisonVerdict} from "../app/station-compare-core.ts";

const start=Date.parse("2026-10-27T10:00:00.000Z");
const base={source:"Transitous / MOTIS",updatedAt:"2026-10-27T10:00:00.000Z",realtimeStatus:"live"};
const row=(id,planned,actual=planned,extra={})=>({tripId:id,mode:"REGIONAL_RAIL",realTime:true,place:{scheduledDeparture:planned,departure:actual},...extra});
const frame=(payload)=>compareStationBoard(payload,start,60,start+1000);

test("same absolute UTC window counts only included departures",()=>{
  const snapshot=frame({...base,stopTimes:[row("a","2026-10-27T10:00:00Z"),row("b","2026-10-27T10:59:59Z"),row("c","2026-10-27T11:00:00Z"),row("d","2026-10-27T09:59:59Z")]});
  assert.equal(snapshot.total,2);assert.equal(snapshot.realtimeCount,2);
});
test("duplicate provider rows do not double count",()=>{
  const trip=row("a","2026-10-27T10:03:00Z");
  assert.equal(frame({...base,stopTimes:[trip,trip]}).total,1);
});
test("unrelated trains sharing departure time remain separate",()=>{
  assert.equal(frame({...base,stopTimes:[row("a","2026-10-27T10:03:00Z"),row("b","2026-10-27T10:03:00Z")]}).total,2);
});
test("expired realtime is never counted as a realtime delay",()=>{
  const snapshot=compareStationBoard({...base,updatedAt:"2026-10-27T09:55:00Z",stopTimes:[row("a","2026-10-27T10:02:00Z","2026-10-27T10:20:00Z")]},start,60,start);
  assert.deepEqual([snapshot.total,snapshot.freshness,snapshot.realtimeCount,snapshot.delayed6],[1,"stale",0,0]);
});
test("predicted-only trip without timetable is not promoted to a confirmed scheduled departure",()=>{
  assert.equal(frame({...base,stopTimes:[{tripId:"a",realTime:true,place:{departure:"2026-10-27T10:10:00Z"}}]}).total,0);
});
test("canceled trip remains visible but is not a delay sample",()=>{
  const snapshot=frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z","2026-10-27T10:25:00Z",{cancelled:true})]});
  assert.deepEqual([snapshot.cancelled,snapshot.delayed6,snapshot.validDelaySamples],[1,0,0]);
});
test("late threshold uses only current real-time samples with a schedule",()=>{
  const snapshot=frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z","2026-10-27T10:11:00Z"),row("b","2026-10-27T10:07:00Z","2026-10-27T10:10:00Z"),row("c","2026-10-27T10:08:00Z","2026-10-27T10:20:00Z",{realTime:false})]});
  assert.deepEqual([snapshot.total,snapshot.realtimeCount,snapshot.validDelaySamples,snapshot.delayed6],[3,2,2,1]);
});
test("partial provider response prevents unrestricted comparison",()=>{
  const first=frame({...base,routeValidity:{status:"partial",blockedCount:1},stopTimes:[row("a","2026-10-27T10:05:00Z")]});
  const second=frame({...base,stopTimes:[row("b","2026-10-27T10:05:00Z")]});
  assert.equal(stationComparisonVerdict(first,second).comparable,false);
});
test("fresh comparable sample is not confused with nationwide coverage",()=>{
  const first=frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z")]});
  const second=frame({...base,stopTimes:[row("b","2026-10-27T10:05:00Z")]});
  assert.deepEqual(stationComparisonVerdict(first,second),{comparable:true,reasons:[]});
});

test("six equal time buckets include each unique service exactly once",()=>{
  const result=frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z"),row("b","2026-10-27T10:15:00Z"),row("c","2026-10-27T10:55:00Z")]});
  assert.deepEqual(result.departuresByBucket,[1,1,0,0,0,1]);
});
test("largest observed gap is between reported services, never a claimed missing departure",()=>{
  const result=frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z"),row("b","2026-10-27T10:15:00Z"),row("c","2026-10-27T10:55:00Z")]});
  assert.equal(result.longestObservedGapMinutes,40);
});
test("one train has no meaningful inter-departure gap",()=>{
  assert.equal(frame({...base,stopTimes:[row("a","2026-10-27T10:05:00Z")]}).longestObservedGapMinutes,null);
});

test("realtime flag alone without departure forecast is never counted as a usable prediction",()=>{
  const result=frame({...base,stopTimes:[{tripId:"no-forecast",realTime:true,mode:"SUBURBAN",place:{scheduledDeparture:"2026-10-27T10:15:00Z"}}]});
  assert.equal(result.total,1);
  assert.equal(result.realtimeCount,0);
  assert.equal(result.validDelaySamples,0);
});
