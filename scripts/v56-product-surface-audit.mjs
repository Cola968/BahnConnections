import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extractStationNotices,filterStationNotices,noticeCategoryCounts,combineStationNoticeFeeds,affectedNoticeLines} from "../app/station-disruptions-data.ts";
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
assert.deepEqual(extractStationNotices([{displayName:'S1',alerts:[{header:'Fahrradmitnahme möglich'},{header:'Keine aktuellen Störungen'},{header:'Signalstörung',effect:'NO_EFFECT'}]}]),[], 'Informational and explicitly unaffected lines are excluded');
assert.equal(extractStationNotices([{displayName:'S1',alerts:[{header:'Betriebsänderung',effect:'DETOUR'}]}]).length,1,'Structured disruption effects are preserved without keyword guesses');
const shared=extractStationNotices(Array.from({length:12},(_,i)=>({displayName:'RE'+i,tripFrom:{name:'Start'+i},tripTo:{name:'Ziel'+i},headsign:'Ziel'+i,alerts:[{header:'Signalstörung'}]})));
assert.equal(shared[0].lines.length,12,'All affected lines remain available');
assert.equal(shared[0].journey,undefined,'Shared report cannot assign the first route to every line');
assert.equal(shared[0].direction,undefined,'Shared report cannot assign the first destination to every line');
const longDetail='Signalstörung. '+ 'Weitere Informationen zur Umleitung. '.repeat(30)+'Ersatzhalt am Bahnhofsvorplatz.';
assert.equal(extractStationNotices([{displayName:'RE1',alerts:[{header:'Signalstörung',descriptionText:{translation:[{text:longDetail}]}}]}])[0].detail,longDetail,'Expanded reports must preserve longer provider details, including the replacement stop');
const counts=noticeCategoryCounts(notices);
assert.deepEqual(counts,{all:3,construction:1,cancellation:1,incident:1},"Category totals must use unique notices");
assert.equal(filterStationNotices(notices,"construction","re2").length,1,"Search must match all grouped rail lines, not only the first");
assert.equal(filterStationNotices(notices,"cancellation","").length,1);
assert.equal(filterStationNotices(notices,"incident","signal").length,1);
assert.equal(filterStationNotices(notices,"all","Keine passende Störung").length,0);
assert.equal(filterStationNotices(notices,"all","  ").length,3,"Blank search must not hide reports");
const complete=combineStationNoticeFeeds([
 {status:"fulfilled",value:{stopTimes:alerts.slice(0,2),warnings:[]}},
 {status:"fulfilled",value:{stopTimes:alerts.slice(2),warnings:[]}}
]);
assert.equal(complete.entries.length,4,"Departure and arrival notice sources must be combined");
assert.equal(complete.partial,false);
assert.equal(extractStationNotices(complete.entries).length,3,"Duplicate alerts must still be grouped across both feeds");
const half=combineStationNoticeFeeds([
 {status:"fulfilled",value:{stopTimes:alerts.slice(0,2),warnings:["Unvollständig"]}},
 {status:"rejected",reason:new Error("Arrival service timed out")}
]);
assert.equal(half.entries.length,2);
assert.equal(half.partial,true,"Partial source failure must be disclosed");
assert.equal(half.successful,1);
assert.equal(combineStationNoticeFeeds([{status:"rejected",reason:"Offline"}]).successful,0);


const malformedNotices=extractStationNotices([{tripId:"faulty",displayName:"S7",alerts:[
  null,{headerText:{translation:"wrong"}},{headerText:{translation:[null, {text:123}, {text:" Signalstörung "}]}},
  {descriptionText:{translation:[]}},
]}]);
assert.equal(malformedNotices.length,1,"Bad alerts cannot hide a valid disruption");
assert.equal(malformedNotices[0].headline,"Signalstörung");
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx"), filter=read("app/live-board.tsx"),settings=read("app/settings-dialog.tsx");
assert.match(page,/StationDisruptions/);
const incidentPage=read("app/station-disruptions.tsx");
assert.match(incidentPage,/placeholder="Linie, Störung oder Ziel suchen"/,"Incident search needs an accessible text field");
assert.match(incidentPage,/filterStationNotices\(items,filter,query\)/,"Filters must actually change the visible incidents");
assert.match(incidentPage,/noticeCategoryCounts\(items\)/,"Category counts must come from current source data");
assert.match(incidentPage,/new VisibilityPoller\(/,"Visible disruption feed should refresh without needing a page reload");
assert.match(incidentPage,/const kinds=\["departure","arrival"\] as const/,"Incident view must include arrivals, not departures only");
assert.match(incidentPage,/Promise\.allSettled\(requests\)/,"One missing feed must not lose all incidents");
assert.match(incidentPage,/combineStationNoticeFeeds\(results\)/,"Partial notices require an explicit, testable merge");

assert.match(incidentPage,/Letzte erfolgreiche Abfrage/,"Stale last-known reports must disclose their source freshness");

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
assert.match(renderer,/iconSize:\[44,44\]/,"Train taps must have a usable touch target");
assert.match(renderer,/--train-heading/,"Train heading must be taken from course geometry");
assert.match(page,/openRouteAt\(anchor\)/,"Tapping a model line label must show useful station information");
assert.match(page,/map-filters-v57/);
assert.match(page,/setLiveVisible\(true\);setLiveView\("trains"\)/,"Selecting filters must activate the radar");
assert.match(search,/planner-origin-location/,"Location entry must live inside the planner");
assert.doesNotMatch(page,/className="walking-card"/,"No intrusive floating walking popup");
assert.match(settings,/bahnconnections-language|onLanguage/,"Language selector must be operable");
const navigation=read("app/desktop-navigation.tsx");
assert.match(navigation,/const displayLabel=/,"Mobile navigation needs a visible locale-aware label");
assert.match(navigation,/mobile-nav-label">{displayLabel}/,"Displayed tab label should match accessible language");
assert.match(css,/@keyframes bc-clock-turn/);
assert.match(css,/prefers-reduced-motion/);
console.log("V56 station notices, direct filters, Changelog and avatar integration OK.");

// V57.2: line-specific incident focus and chronology are user-facing commitments.
const scopedNotices=extractStationNotices([
 {tripId:'scope-s1',displayName:'S1',alerts:[{header:'Signalstörung zwischen Gesundbrunnen und Pankow'}],place:{departure:'2026-10-14T11:40:00Z'}},
 {tripId:'scope-re',displayName:'RE1',alerts:[{header:'Bauarbeiten am Gleis'}],place:{departure:'2026-10-14T10:20:00Z'}},
 {tripId:'scope-cancel',displayName:'ICE 42',tripCancelled:true,place:{departure:'2026-10-14T12:10:00Z'}},
 {displayName:'Bahnhof',stationNotice:true,place:{alerts:[{header:'Aufzug außer Betrieb',effect:'ACCESSIBILITY_ISSUE'}]}}
]);
assert.deepEqual(affectedNoticeLines(scopedNotices),['ICE 42','RE1','S1'],'Focus choices must contain only genuinely attributed rail lines.');
assert.equal(filterStationNotices(scopedNotices,'all','','S1').length,1,'Line focus must match exactly, not S10 or shared notices without train attribution.');
assert.equal(filterStationNotices(scopedNotices,'all','','S1')[0].lines[0],'S1');
assert.equal(filterStationNotices(scopedNotices,'all','','S3').length,0,'Unlisted selected lines must not return all messages.');
assert.equal(filterStationNotices(scopedNotices,'cancellation','','ICE 42').length,1,'Line and category filters must compose.');
assert.equal(filterStationNotices(scopedNotices,'all','baUARBEITEN','RE1').length,1,'Normalized search, category and line focus must compose.');
assert.deepEqual(filterStationNotices(scopedNotices,'all','','all','time').filter(item=>item.plannedTime).map(item=>item.lines[0]),['RE1','S1','ICE 42'],'Chronological sorting must use actual planned event time.');
assert.equal(extractStationNotices([{displayName:'S2',alerts:[{header:'Fahrt fällt aus wegen Bauarbeiten'}]}])[0].kind,'cancellation','Train cancellations must not hide in construction category.');
