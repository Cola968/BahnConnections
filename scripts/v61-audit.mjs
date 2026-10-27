import assert from "node:assert/strict";
import {APP_VERSION} from "../app/app-version.ts";
import {readFileSync} from "node:fs";
import {listStationCalls,stationCalls} from "../app/station-radar-data.ts";

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const minute=(value)=>new Date(Date.parse("2026-10-16T10:00:00Z")+value*60_000).toISOString();

// Every provider trip can be found independently of map geometry or current viewport.
const calls=stationCalls([
 {tripId:"a",displayName:"ICE 100",headsign:"Hamburg Hbf",realTime:true,place:{arrival:minute(20),scheduledArrival:minute(19)}},
 {tripId:"b",displayName:"RE 1",headsign:"Brandenburg Hbf",place:{scheduledArrival:minute(35)}},
 {tripId:"c",displayName:"ICE 1205",headsign:"München Hbf",place:{scheduledArrival:minute(10)}},
],[
 {tripId:"a",displayName:"ICE 100",headsign:"Hamburg Hbf",realTime:true,place:{departure:minute(22),scheduledDeparture:minute(21)}},
 {tripId:"c",displayName:"ICE 1205",headsign:"München Hbf",place:{scheduledDeparture:minute(15)}},
 {tripId:"d",displayName:"RB 12",headsign:"Oranienburg",tripCancelled:true,place:{scheduledDeparture:minute(5)}},
]);
assert.equal(calls.size,4,"Do not filter out trips lacking map markers or polyline geometry");
assert.deepEqual(listStationCalls(calls,"all").map(item=>item.tripId),["c","a","b"],"Calls sorted by stop event time");
assert.deepEqual(listStationCalls(calls,"inbound").map(item=>item.tripId),["c","a","b"]);
assert.deepEqual(listStationCalls(calls,"outbound").map(item=>item.tripId),["c","a"]);
assert.deepEqual(listStationCalls(calls,"all","ice 100").map(item=>item.tripId),["a"],"Case-insensitive train search");
assert.deepEqual(listStationCalls(calls,"all","HAMBURG").map(item=>item.tripId),["a"],"Destination search");
assert.equal(listStationCalls(calls,"all","nicht vorhanden").length,0,"No fabricated results");
assert.equal(calls.get("a")?.arrivalRealtime,true,"Realtime stays separate from scheduled timestamps");
assert.equal(calls.get("b")?.arrivalRealtime,false,"Timetable must not be labelled live");
assert.equal(calls.get("d")?.cancelled,true,"Cancellation must remain visible in list");

const page=read("app/page.tsx"),panel=read("app/station-calls-browser.tsx");
const css=read("app/styles/v61-station-calls.css"),layout=read("app/layout.tsx");
assert.match(page,/liveVisible \|\| stationCallsOpen/,"Load provider calls on demand even with map radar disabled");
assert.match(page,/StationCallsBrowser key=\{\`calls-/,"Station list belongs to selected station");
assert.match(panel,/listStationCalls\(snapshot.calls,direction,query\)/,"Use the actual shared provider call list");
assert.match(panel,/type="search"/);
assert.match(panel,/onClick=\{\(\)=>\{setDirection/);
assert.match(panel,/rows.slice\(0,limit\)/,"Bound DOM work for busy stations");
assert.match(panel,/setLimit\(value=>value\+40\)/,"Offer explicit pagination");
assert.match(panel,/snapshot.status==="stale"/);
assert.match(panel,/snapshot.coverage!=="complete"/);
assert.match(panel,/realtime\?"Prognose":"Fahrplan"/,"Never mark timetable as realtime");
assert.match(panel,/Es werden keine Zugpositionen berechnet|es werden keine Zugpositionen berechnet|keine Zugpositionen berechnet|keine Zugpositionen/);
assert.match(panel,/Transitous \/ MOTIS/);
assert.doesNotMatch(panel,/navigator.geolocation|estimatedPosition|fakeGps/i);
assert.match(layout,/v61-station-calls.css/);
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/data-motion="reduced"/);
assert.match(css,/focus-visible/);
assert.match(APP_VERSION,/^(?:61|62|63)\.\d+(?:\.\d+)?$/); // Keep V61 regression mandatory through V63; use the matching versioned release checklist.
assert.match(read(`docs/releases/V${APP_VERSION}-RELEASE-CHECKLIST.md`),/#67/);
assert.match(read(`docs/releases/V${APP_VERSION}-RELEASE-CHECKLIST.md`),/#66/);
assert.match(read(`docs/releases/V${APP_VERSION}-RELEASE-CHECKLIST.md`),/#77/);
assert.match(read(`docs/releases/V${APP_VERSION}-RELEASE-CHECKLIST.md`),/#78/);
console.log("V61 regression: scoped station calls, filtering, honesty, responsive CSS and unresolved gates passed.");
