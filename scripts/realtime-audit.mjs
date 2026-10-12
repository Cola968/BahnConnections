import assert from "node:assert/strict";
import { boardEventTime,boardDisplayActual,boardDisplayPlatform,boardPredictionFresh } from "../app/board-time.ts";

import { deriveRealtimePresentation as derive, derivePlatformPresentation, formatRealtimeTime, realtimeAccessibleLabel, realtimeStatusLabel } from "../app/realtime-presentation.ts";

const scheduled = "2026-10-01T23:28:00+02:00";
const at = minutes => new Date(new Date(scheduled).getTime() + minutes * 60_000).toISOString();
const checks = [];
for (const [delay, kind, tone] of [[-3,"early","success"],[0,"on-time","success"],[1,"minor-delay","warning"],[3,"minor-delay","warning"],[4,"minor-delay","warning"],[5,"delay","warning"],[6,"delay","warning"],[10,"delay","warning"],[11,"major-delay","danger"],[14,"major-delay","danger"],[15,"major-delay","danger"],[24,"major-delay","danger"],[30,"major-delay","danger"],[45,"major-delay","danger"]]) {
  const state = derive({ scheduled, actual:at(delay), realtime:true });
  assert.equal(state.kind, kind);
  assert.equal(state.tone, tone);
  assert.equal(state.delayMinutes, delay);
  assert.equal(state.changed, delay !== 0);
  assert.equal(state.severe, delay >= 30);
  assert.equal(realtimeStatusLabel(state), delay < 0 ? "3 Min. früher" : delay === 0 ? "pünktlich" : `+${delay} Min.`);
  checks.push({ delay, kind, tone, ok:true });
}
for (const input of [{},{scheduled, realtime:true},{actual:at(10), realtime:true},{scheduled:"invalid",actual:at(0),realtime:true},{scheduled,actual:"invalid",realtime:true}]) {
  const state = derive(input);
  assert.equal(state.kind, "unknown");
  assert.equal(state.tone, "neutral");
  assert.equal(state.delayMinutes, null);
  assert.equal(state.changed, false);
  assert.ok(!realtimeAccessibleLabel(state).includes("pünktlich"));
}
const schedule = derive({ scheduled, actual:at(24) });
assert.equal(schedule.kind, "schedule");
assert.equal(schedule.tone, "neutral");
assert.equal(schedule.delayMinutes, null);
assert.ok(realtimeAccessibleLabel(schedule).startsWith("23:28 Uhr"));
const cancelled = derive({ scheduled, actual:at(24), realtime:true, cancelled:true });
assert.equal(cancelled.actual, null);
assert.equal(cancelled.kind, "cancelled");
assert.equal(cancelled.tone, "danger");
assert.equal(realtimeAccessibleLabel(cancelled), "Planmäßig 23:28 Uhr. Halt entfällt.");
assert.equal(realtimeAccessibleLabel(cancelled,"Fahrtabschnitt entfällt"), "Planmäßig 23:28 Uhr. Fahrtabschnitt entfällt.");
assert.equal(realtimeAccessibleLabel(derive({scheduled,actual:at(10),realtime:true})), "Planmäßig 23:28 Uhr, aktuell 23:38 Uhr, 10 Minuten Verspätung.");
// Absolute instants, not clock strings: midnight and DST offsets must remain correct.
assert.equal(derive({scheduled:"2026-10-01T23:58:00+02:00",actual:"2026-10-02T00:08:00+02:00",realtime:true}).delayMinutes,10);
assert.equal(derive({scheduled:"2026-10-25T02:58:00+02:00",actual:"2026-10-25T02:08:00+01:00",realtime:true}).delayMinutes,10);
assert.equal(formatRealtimeTime("invalid"), "–");
assert.equal(formatRealtimeTime(scheduled), "23:28");
assert.deepEqual(derivePlatformPresentation("4","7"), {scheduled:"4",actual:"7",changed:true,label:"Planmäßig Gleis 4, aktuell Gleis 7."});
assert.equal(derivePlatformPresentation(" 4 ","4").changed,false);
assert.equal(derivePlatformPresentation("4",null).actual,"4");
assert.equal(derivePlatformPresentation(null,null).label,"Gleis nicht verfügbar.");

const knownAt=new Date("2026-10-12T07:00:00Z");
assert.equal(boardPredictionFresh(knownAt,knownAt.getTime()+120_000,false),true);
assert.equal(boardPredictionFresh(knownAt,knownAt.getTime()+160_000,false),false,"Expired data cannot carry current times");
assert.equal(boardPredictionFresh(knownAt,knownAt.getTime()+5_000,true),false,"Failed refresh invalidates realtime");
assert.equal(boardPredictionFresh(null,knownAt.getTime(),false),false);
const departure={plannedWhen:"2026-10-12T10:05:00+02:00",when:"2026-10-12T10:12:00+02:00",realtime:true};
assert.equal(new Date(boardEventTime(departure,true)).toISOString(),"2026-10-12T08:12:00.000Z","Fresh prediction controls chronological order");
assert.equal(new Date(boardEventTime(departure,false)).toISOString(),"2026-10-12T08:05:00.000Z","Stale forecast reverts to planned departure");
assert.equal(boardDisplayActual(departure,false),undefined,"Stale forecast cannot show the former actual time");
assert.equal(boardDisplayActual(departure,true),departure.when);
assert.equal(boardEventTime({...departure,plannedWhen:null},false),null,"No schedule must not be substituted with stale prediction");
assert.equal(new Date(boardEventTime({...departure,realtime:false},false)).toISOString(),"2026-10-12T08:05:00.000Z");
assert.equal(boardEventTime({plannedWhen:"not-date",when:"bad",realtime:true},true),null);
assert.equal(boardEventTime({plannedWhen:"2026-10-25T02:30:00+02:00",when:"2026-10-25T02:30:00+01:00",realtime:true},true),Date.parse("2026-10-25T01:30:00Z"),"DST hour must sort as absolute instant");
const platform={plannedPlatform:"3",platform:"7",realtime:true};
assert.equal(boardDisplayPlatform(platform,true),"7","Fresh platform change must remain visible");
assert.equal(boardDisplayPlatform(platform,false),"3","Expired realtime platform falls back to planned track, never the old prediction");
assert.equal(boardDisplayPlatform({...platform,realtime:false},false),"7","Scheduled platform remains visible without realtime");
assert.equal(boardDisplayPlatform({platform:"7",realtime:true},false),undefined,"Unknown timetable platform cannot become verified old actual");


console.log(JSON.stringify({ checkedAt:new Date().toISOString(), checks, unknownAndSchedule:true, cancellations:true, midnightAndDst:true, platforms:true },null,2));
