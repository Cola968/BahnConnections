import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extractStationNotices} from "../app/station-disruptions-data.ts";
const alerts=[
 {tripId:"r1",displayName:"RE1",place:{departure:"2026-10-12T17:00:00Z"},alerts:[{header:"Bauarbeiten zwischen Berlin und Potsdam",descriptionText:{translation:[{text:"Fahrtzeit verlängert"}]}}]},
 {tripId:"r2",displayName:"RE2",alerts:[{header:"Bauarbeiten zwischen Berlin und Potsdam",descriptionText:{translation:[{text:"Fahrtzeit verlängert"}]}}]},
 {tripId:"ic1",displayName:"ICE 9",cancelled:true},
 {tripId:"rt",displayName:"S7",alerts:[{header:"Signalstörung"}]}
];
const notices=extractStationNotices(alerts);
assert.equal(notices.length,3,"Duplicate identical alert text must be grouped, not counted as separate incidents.");
assert.equal(notices[0].kind,"construction");
assert.deepEqual(notices[0].lines,["RE1","RE2"]);
assert.ok(notices.some(item=>item.kind==="cancellation"));
assert.ok(notices.some(item=>item.kind==="incident"));
assert.deepEqual(extractStationNotices([{tripId:"only",displayName:"S2"}]),[],"No incidents without source alerts/cancellations.");
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx"), filter=read("app/live-board.tsx"),settings=read("app/settings-dialog.tsx");
assert.match(page,/StationDisruptions/);
assert.match(filter,/board-filter-apply/);
assert.match(filter,/board-status-pills/);
assert.match(filter,/name="search"/);
assert.match(settings,/initialTab/);
assert.match(settings,/\/changelog/);
assert.match(page,/header-avatar/);
assert.match(read("app/changelog/page.tsx"),/Vorschau/);
console.log("V56 station notices, direct filters, Changelog and avatar integration OK.");
