import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatTrainShare } from "../app/v60-train-share.ts";
const when="2026-10-14T12:00:00+02:00",late="2026-10-14T12:09:00+02:00";
const common={
 name:"RE 1",from:"Berlin Hbf",to:"Brandenburg Hbf",
 plannedDeparture:when,plannedArrival:"2026-10-14T13:00:00+02:00",
 actualDeparture:late,actualArrival:"2026-10-14T13:09:00+02:00",
 realtime:true,fresh:true,updatedAt:new Date("2026-10-14T09:59:00Z"),
 stops:[{name:"Berlin Hbf",scheduledDeparture:when,departure:late,realtime:true,cancelled:false},
   {name:"Brandenburg Hbf",scheduledArrival:"2026-10-14T13:00:00+02:00",arrival:"2026-10-14T13:09:00+02:00",realtime:true,cancelled:false}],
};
const live=formatTrainShare(common);
assert.match(live,/Momentaufnahme/);
assert.match(live,/Prognose/);
assert.match(live,/12:09/);
assert.match(live,/13:09/);
assert.match(live,/Transitous/);
const partial=formatTrainShare({...common,departureRealtime:false,arrivalRealtime:true});
assert.doesNotMatch(partial,/Abfahrt Prognose:/,"A different live leg cannot upgrade a schedule-only departure");
assert.match(partial,/Ankunft Prognose:/);
const timetable=formatTrainShare({...common,realtime:false});
assert.match(timetable,/Fahrplanstand/i);
assert.doesNotMatch(timetable,/Prognosen zum Abruf/i);
assert.doesNotMatch(timetable,/Abfahrt Prognose:/);
const stale=formatTrainShare({...common,fresh:false});
assert.doesNotMatch(stale,/12:09/);
assert.doesNotMatch(stale,/13:09/);
assert.match(stale,/keine aktuelle Prognose/i);
assert.match(stale,/12:00/);
const cancelled=formatTrainShare({...common,stops:[{name:"Potsdam",cancelled:true}]});
assert.match(cancelled,/Potsdam.*entfällt/);
const malicious=formatTrainShare({...common,name:"RE 1\nFALSCH: TICKETS GÜLTIG"});
assert.ok(!malicious.includes("\nFALSCH:"));
const lengthy=formatTrainShare({...common,stops:Array.from({length:75},(_,i)=>({name:"Halt "+i,cancelled:false}))});
assert.match(lengthy,/weitere.*Halte/i);
assert.ok(lengthy.length<6000);
const noDetail=formatTrainShare({...common,stops:[],fresh:false,plannedArrival:undefined});
assert.match(noDetail,/keine aktuelle Prognose/i);
assert.doesNotMatch(noDetail,/undefined|Invalid Date/);
const inspector=readFileSync(new URL("../app/live-trip-inspector.tsx",import.meta.url),"utf8");
assert.match(inspector,/formatTrainShare/);
assert.match(inspector,/Fahrt teilen/);
assert.match(inspector,/navigator\.share/);
assert.match(inspector,/navigator\.clipboard/);
console.log("V60 train sharing: source timestamp, stale fallback, cancellation, sanitation, bounded stop list and inspector action passed.");
