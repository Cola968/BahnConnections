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
assert.match(read("app/changelog/page.tsx"),/Aktuelle Version:.*APP_VERSION_LABEL/);
const cancel=extractStationNotices([{tripId:"ICE-208",displayName:"ICE 208 (48444)",headsign:"Hamburg Hbf",tripFrom:{name:"Berlin Hbf"},tripTo:{name:"Hamburg Hbf"},place:{scheduledDeparture:"2026-10-12T19:20:00Z",cancelled:true}}]);
assert.equal(cancel[0].lines[0],"ICE 208");
assert.equal(cancel[0].direction,"Hamburg Hbf");
assert.equal(cancel[0].journey,"Berlin Hbf → Hamburg Hbf");
const renderer=read("app/live-map-renderer.ts"),search=read("app/journey-search.tsx"),css=read("app/styles/v56-1-interactions.css");
assert.match(renderer,/current\.members\.length===1/,"Single-train clusters should open inspector on tap");
assert.match(renderer,/iconSize:item\.trip\?\[40,40\]/,"Train taps must have a usable touch target");
assert.match(renderer,/--train-heading/,"Train heading must be taken from course geometry");
assert.match(page,/openRouteAt\(anchor\)/,"Tapping a model line label must show useful station information");
assert.match(page,/map-filters-v57/);
assert.match(page,/setLiveVisible\(true\);setLiveView\("trains"\)/,"Selecting filters must activate the radar");
assert.match(search,/planner-origin-location/,"Location entry must live inside the planner");
assert.doesNotMatch(page,/className="walking-card"/,"No intrusive floating walking popup");
assert.match(settings,/bahnconnections-language|onLanguage/,"Language selector must be operable");
assert.match(css,/@keyframes bc-clock-turn/);
assert.match(css,/prefers-reduced-motion/);
console.log("V56 station notices, direct filters, Changelog and avatar integration OK.");
