import assert from "node:assert/strict";
import { trainFollowView } from "../app/train-follow-view.ts";

const fixture={
  departure:"2026-10-23T10:00:00Z",arrival:"2026-10-23T11:00:00Z",
  scheduledDeparture:"2026-10-23T09:55:00Z",scheduledArrival:"2026-10-23T10:55:00Z",
  realTime:true,delay:5,
};
const midpoint=Date.parse("2026-10-23T10:30:00Z");
const live=trainFollowView(fixture,midpoint,true);
assert.equal(live.progress,50);
assert.equal(live.etaLabel,"Ankunft in 30 min");
assert.equal(live.delayLabel,"+5 min");
assert.equal(live.timeType,"Prognose");
assert.match(live.evidenceLabel,/kein GPS/);
assert.equal(live.departureTime,"12:00");
const stale=trainFollowView(fixture,midpoint,false);
assert.equal(stale.progress,null);
assert.equal(stale.etaLabel,"Keine aktuelle ETA");
assert.equal(stale.delayTone,"neutral");
assert.equal(stale.timeType,"Fahrplan");
assert.equal(stale.departureTime,"11:55");
assert.equal(trainFollowView({...fixture,realTime:false},midpoint,true).progress,null);
assert.equal(trainFollowView({...fixture,arrival:"invalid"},midpoint,true).progress,null);
assert.equal(trainFollowView({...fixture,arrival:fixture.departure},midpoint,true).progress,null);
assert.equal(trainFollowView(fixture,midpoint+86_400_000,true).progress,null);
// The DST reset creates two distinct 02:30 instants. Absolute time still wins.
const dst=trainFollowView({...fixture,
  departure:"2026-10-25T02:30:00+02:00",arrival:"2026-10-25T02:30:00+01:00"},
  Date.parse("2026-10-25T01:00:00Z"),true);
assert.equal(dst.progress,50);
assert.equal(dst.etaLabel,"Ankunft in 30 min");
assert.equal(trainFollowView({...fixture,delay:35},midpoint,true).delayTone,"danger");
assert.equal(trainFollowView({...fixture,delay:0},midpoint,true).delayTone,"success");
console.log("Train follow: honest realtime vs schedule, ETA, delay, DST and no GPS passed.");
