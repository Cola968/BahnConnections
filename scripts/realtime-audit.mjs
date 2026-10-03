import assert from "node:assert/strict";
import { deriveRealtimePresentation as derive, derivePlatformPresentation, formatRealtimeTime, realtimeAccessibleLabel, realtimeStatusLabel } from "../app/realtime-presentation.ts";

const scheduled = "2026-10-01T23:28:00+02:00";
const at = minutes => new Date(new Date(scheduled).getTime() + minutes * 60_000).toISOString();
const checks = [];
for (const [delay, kind, tone] of [[-3,"early","success"],[0,"on-time","success"],[1,"minor-delay","warning"],[3,"minor-delay","warning"],[5,"minor-delay","warning"],[6,"delay","warning"],[10,"major-delay","danger"],[11,"major-delay","danger"],[14,"major-delay","danger"],[15,"major-delay","danger"],[24,"major-delay","danger"],[30,"major-delay","danger"],[45,"major-delay","danger"]]) {
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
console.log(JSON.stringify({ checkedAt:new Date().toISOString(), checks, unknownAndSchedule:true, cancellations:true, midnightAndDst:true, platforms:true },null,2));
