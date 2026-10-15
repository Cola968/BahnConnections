import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {loadStationBoardWithFallback,StationSourceThrottledError} from "../app/station-board-fallback.ts";
import {combineStationCallResults,listStationCalls,matchesStationCall,stationCalls} from "../app/station-radar-data.ts";
import {STATIONS} from "../app/network-data.ts";
import {failedStationRadarSnapshot} from "../app/station-radar-state.ts";
import {stationMarkerHierarchy} from "../app/station-marker.ts";
import {chooseStationMatch,stationNameKey} from "../app/station-match.ts";
const station= (name,id) => ({name,id});
const at = (minute) => new Date(Date.parse("2026-10-14T21:00:00Z")+minute*60000).toISOString();
const cases=[station("Berlin Hermannstraße","de:test:hermannstr"),station("Berlin Hbf","de:test:hbf"),station("Hamburg Hbf","de:test:hamburg"),station("Lübeck Hbf","de:test:luebeck"),station("Dresden Hbf","de:test:dresden")];
for(const s of cases){
 const rows=[{tripId:s.id+":1",displayName:"S9",place:{scheduledDeparture:at(5)}},{tripId:s.id+":2",displayName:"RE1",place:{scheduledDeparture:at(20)}}];
 const requested=[];
 const live=await loadStationBoardWithFallback(async mode=>{requested.push(mode);return rows});
 assert.deepEqual(requested,["REALTIME"],s.name);
 assert.equal(live.stopTimes.length,2,s.name);
 assert.equal(live.fallback,false,s.name);
 const recovered=await loadStationBoardWithFallback(async mode=>{if(mode==="REALTIME")throw new Error("503");return rows});
 assert.equal(recovered.mode,"OFF",s.name);
 assert.equal(recovered.stopTimes.length,2,s.name);
 assert.match(recovered.warning,/Fahrplandaten/,s.name);
 const emptyLive=await loadStationBoardWithFallback(async mode=>mode==="REALTIME"?[]:rows);
 assert.equal(emptyLive.stopTimes.length,2,s.name);
 assert.equal(emptyLive.fallback,true,s.name);
 await assert.rejects(loadStationBoardWithFallback(async()=>{throw Error("failed")}),/failed/,s.name);
}
// HTTP 429 must not cause a second (timetable-only) call that amplifies load.
let throttledAttempts=0;
await assert.rejects(loadStationBoardWithFallback(async()=>{
 throttledAttempts++;
 throw new StationSourceThrottledError("429");
}),StationSourceThrottledError);
assert.equal(throttledAttempts,1,"Respect 429; do not immediately retry the throttled provider");
const confirmed={tripId:'ICE-452',place:{scheduledArrival:at(5),scheduledDeparture:at(8)}};
const success={status:'fulfilled',value:[confirmed]},failure={status:'rejected',reason:new Error('API 503')};
assert.deepEqual(combineStationCallResults(success,failure).coverage,'partial');
assert.equal(combineStationCallResults(success,failure).calls.size,1);
assert.deepEqual(combineStationCallResults(success,success).coverage,'complete');
assert.throws(()=>combineStationCallResults(failure,failure),/nicht erreichbar/);
const callRows=stationCalls([
 {tripId:"ice-100",displayName:"ICE 100",headsign:"Hamburg",realTime:true,place:{arrival:at(10),scheduledArrival:at(9)}},
 {tripId:"cancelled",displayName:"RE 8",headsign:"Lübeck",cancelled:true,place:{scheduledArrival:at(20)}}
],[{tripId:"ice-100",place:{scheduledDeparture:at(12)}},{tripId:"regional-20",displayName:"RB 20",place:{scheduledDeparture:at(30)}}]);
assert.equal(callRows.size,3,"provider calls cannot be limited by map viewport");
assert.equal(callRows.get("ice-100")?.arrival,Date.parse(at(10)));
assert.equal(callRows.get("ice-100")?.scheduledArrival,Date.parse(at(9)),"Original planned time must survive alongside the prediction");
assert.equal(callRows.get("ice-100")?.arrivalRealtime,true);
assert.equal(callRows.get("ice-100")?.departure,Date.parse(at(12)));
assert.equal(callRows.get("ice-100")?.departureRealtime,false,"Scheduled departures must not inherit an unrelated arrival prediction");
assert.equal(callRows.get("ice-100")?.realtime,true);
assert.equal(callRows.get("cancelled")?.cancelled,true);
assert.equal(matchesStationCall(callRows.get("cancelled"),"all"),false);
assert.deepEqual(listStationCalls(callRows,"all").map(row=>row.tripId),["ice-100","cancelled","regional-20"]);
assert.deepEqual(listStationCalls(callRows,"outbound").map(row=>row.tripId),["ice-100","regional-20"]);
assert.deepEqual(listStationCalls(callRows,"all","lübeck").map(row=>row.tripId),["cancelled"]);
assert.deepEqual(listStationCalls(callRows,"inbound","ICE").map(row=>row.tripId),["ice-100"]);
const oldSnapshot={key:"berlin",calls:callRows,status:"ready",updatedAt:Date.parse(at(0)),coverage:"complete"};
const staleSnapshot=failedStationRadarSnapshot(oldSnapshot,"berlin");
assert.equal(staleSnapshot.status,"stale","Failed refresh must preserve an existing station list");
assert.equal(staleSnapshot.calls.size,3);
assert.equal(staleSnapshot.updatedAt,oldSnapshot.updatedAt,"Old timestamp must remain visible");
const switchedSnapshot=failedStationRadarSnapshot(oldSnapshot,"hamburg");
assert.equal(switchedSnapshot.status,"error");
assert.equal(switchedSnapshot.calls.size,0,"Never reuse another station's calls");
// Provider stop-name normalization: S+U prefixes and omitted city prefixes
// must not turn a real rail station into an unreachable board.
const hermann={name:"Berlin Hermannstraße",lat:52.468,lon:13.43};
const legitimate={id:"same-stop",name:"S+U Hermannstraße",lat:52.4682,lon:13.4302};
assert.equal(stationNameKey("S+U Hermannstraße"),"hermannstrasse");
assert.equal(chooseStationMatch(hermann,[legitimate])?.id,"same-stop","City-prefix provider names must resolve");
assert.equal(chooseStationMatch(hermann,[{...legitimate,lat:52.475}]),null,"Do not match different nearby stations merely by a name suffix");
assert.equal(chooseStationMatch({name:"Berlin Hbf",lat:52.525,lon:13.369},[{name:"Hbf",lat:52.525,lon:13.369}]),null,"Never accept generic Hbf abbreviations without city");
assert.equal(chooseStationMatch({name:"Berlin Südkreuz",lat:52.4759,lon:13.3656},[{name:"S+U Südkreuz",lat:52.4758,lon:13.3657}])?.name,"S+U Südkreuz");
// One algorithm must work for EVERY curated station, not only Berlin fixtures.
// Dynamically discovered DB stops use the same marker/board code paths.
const ids=new Set();
for(const st of STATIONS){
 assert.ok(st.id && !ids.has(st.id),"duplicate or missing station id: "+st.id);ids.add(st.id);
 assert.ok(Number.isFinite(st.lat)&&Number.isFinite(st.lon),"invalid coordinates: "+st.id);
 const hierarchy=stationMarkerHierarchy({hub:st.hub,passengerBand:st.passengerBand});
 assert.ok(hierarchy.radius>0 && hierarchy.minimumZoom>=0,"unrenderable marker: "+st.name);
}
assert.ok(STATIONS.length>50,"Expected nationwide station sample, not only Berlin fixtures");
const file=(name)=>readFileSync(new URL("../"+name,import.meta.url),"utf8");
const backend=file("app/api/stations/[id]/board/route.ts");
assert.match(backend,/loadStationBoardWithFallback/);
assert.match(backend,/realtimeMode/);
assert.match(backend,/StationSourceThrottledError/);
assert.match(backend,/stopId/);
assert.ok(backend.includes('url.searchParams.set("window"'),"Station board API must pass bounded MOTIS windows");
assert.match(file("app/station-radar-data.ts"),/window:'32400'/,"A bounded scope must replace unlimited 5000-event fetches");
assert.doesNotMatch(file("app/station-radar-data.ts"),/n:'5000'/);
const board=file("app/live-board.tsx");
assert.match(board,/windowMinutes, setWindowMinutes.*500/);
assert.match(board,/Weitere 120 Fahrten anzeigen/);
assert.match(board,/\bboardScope\b/);
const page=file("app/page.tsx");
assert.match(page,/stationMarkerHierarchy/);
assert.match(page,/station-tap-target/);
assert.match(page,/StationRadarTripList key=\{selected.id\}/);
assert.match(page,/className="station-radar-in-sheet"/,"Trip list must stay reachable when the floating card hides");
assert.match(page,/useStationRadar\(selected,liveVisible \|\| stationPanel==="live"\)/,"Station tab must work when train markers are disabled");
assert.match(file("app/station-radar-trip-list.tsx"),/EventTime call=\{call\} kind="arrival"/);
assert.match(file("app/station-radar-trip-list.tsx"),/EventTime call=\{call\} kind="departure"/);
assert.match(file("app/styles/v57-station-radar.css"),/station-radar-in-sheet/);
assert.match(file("app/station-radar-trip-list.tsx"),/api\/trips\/transitous/);
assert.match(file("app/station-radar-trip-list.tsx"),/Aktualisieren/);
assert.match(file("app/station-radar-trip-list.tsx"),/Alter Abruf/);
console.log("Station-wide timetable and UI regression: "+STATIONS.length+" curated stations + 5 station-provider scenarios + fallback/partial direction/touch tests passed.");
