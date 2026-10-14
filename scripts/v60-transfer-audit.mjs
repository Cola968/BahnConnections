import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { assessTransfer, assessJourneyTransfers, minimumTransferBuffer } from "../app/v60-transfer-assessment.ts";
import {sortJourneys} from "../app/journey-tools.ts";

const base=Date.parse("2026-10-14T12:00:00Z");
const at=minute=>new Date(base+minute*60_000).toISOString();
const leg=(name,start,end,extras={})=>({
  name,category:"regional",startTime:at(start),endTime:at(end),
  scheduledStartTime:at(start),scheduledEndTime:at(end),durationSeconds:(end-start)*60,
  realtime:true,cancelled:false,from:{name:"A",cancelled:false},to:{name:"B",cancelled:false},...extras
});
const route=(prev,next,walk=0,extra={})=>{
  const walking=walk?[{category:"walk",durationSeconds:walk*60,name:"Fußweg",startTime:prev.endTime,endTime:next.startTime}]:[];
  return {id:"test",updatedAt:at(60),sourceLabel:"Test",transfers:1,cancelled:false,
    transitLegs:[prev,next],legs:[prev,...walking,next],...extra};
};
const current=base+61*60_000;
const prev=leg("RE 1",0,10),next=leg("ICE 2",20,40);
const spacious=assessTransfer(route(prev,next,3),0,current);
assert.equal(spacious.status,"sufficient");
assert.equal(spacious.waitMinutes,10);
assert.equal(spacious.walkMinutes,3);
assert.equal(spacious.bufferMinutes,7);
assert.equal(spacious.walkProvided,true);
const unreportedWalk=assessTransfer(route(prev,next,0),0,current);
assert.equal(unreportedWalk.walkProvided,false);
assert.equal(unreportedWalk.tone,"medium","No platform walk estimate is not proof of a comfortable transfer");
assert.match(unreportedWalk.detail,/nicht angegeben|unbekannt/i);
assert.doesNotMatch(unreportedWalk.detail,/0 Min. Fußweg berücksichtigt/);
const distantPrev={...prev,to:{name:"Berlin Hbf",lat:52.525,lon:13.369, cancelled:false}};
const distantNext={...next,from:{name:"Potsdam Hbf",lat:52.391,lon:13.067,cancelled:false}};
assert.equal(assessTransfer(route(distantPrev,distantNext),0,current).status,"unknown","Different stations need an actual walking connection");
const impossibleWalk={...leg("Fußweg",10,16,{category:"walk",durationSeconds:Number.NaN})};
const badWalkRoute={...route(prev,next),legs:[prev,impossibleWalk,next]};
assert.equal(assessTransfer(badWalkRoute,0,current).status,"unknown","Invalid walking duration must never be assumed to be zero");
assert.equal(spacious.source,"realtime");
assert.equal(spacious.arrivalRealtime,true);
assert.equal(spacious.departureRealtime,true);
assert.match(spacious.label,/7 Min/);
assert.equal(assessTransfer(route(prev,next,7),0,current).status,"tight");
assert.equal(assessTransfer(route(prev,next,11),0,current).status,"missed","Walking longer than transfer is impossible");
assert.equal(assessTransfer(route(prev,next,15),0,current).bufferMinutes,-5);
const late={...prev,endTime:at(25),scheduledEndTime:at(10)};
const missed=assessTransfer(route(late,next,3),0,current);
assert.equal(missed.status,"missed");
assert.equal(missed.bufferMinutes,-8,"Negative transfer interval must remain negative");
assert.match(missed.label,/nicht erreichbar|negativ/);
assert.equal(assessTransfer(route(prev,{...next,cancelled:true},0),0,current).status,"cancelled");
assert.equal(assessTransfer(route(prev,{...next,from:{name:"A",cancelled:true}},0),0,current).status,"cancelled");
const schedule=assessTransfer(route({...prev,realtime:false}, {...next,realtime:false},0),0,current);
assert.equal(schedule.source,"timetable");
assert.doesNotMatch(schedule.label,/gesichert|garantiert|bestätigt/i);
const stale=assessTransfer(route(late,next,0,{updatedAt:at(0)}),0,current);
assert.equal(stale.source,"timetable","Stale real-time prediction must never be used as fresh");
assert.equal(stale.arrivalRealtime,false);
assert.equal(stale.departureRealtime,false);
assert.equal(stale.waitMinutes,10);
const missing=assessTransfer(route({...prev,endTime:"bad",scheduledEndTime:"bad"},next),0,current);
assert.equal(missing.status,"unknown");
const invalid=assessTransfer(route(prev,{...next,startTime:"bad",scheduledStartTime:"bad"}),0,current);
assert.equal(invalid.status,"unknown");
const mixed=assessTransfer(route({...prev,realtime:false},next,0),0,current);
assert.equal(mixed.source,"partial");
assert.equal(assessTransfer(route(prev,next),4,current).status,"unknown","No unrelated transfer pairing");
assert.equal(assessJourneyTransfers(route(prev,next,2),current).length,1);
assert.equal(assessJourneyTransfers({...route(prev,next),transitLegs:[prev]},current).length,0);
assert.equal(assessTransfer(route(prev,next,0),0,Number.NaN).source,"timetable","Unreliable device clock cannot authenticate live estimates");
const dayBoundary=assessTransfer(route(leg("IC",0,59),leg("RB",67,80),2),0,current);
assert.equal(dayBoundary.bufferMinutes,6);

assert.equal(minimumTransferBuffer(route(prev,next,3),current),7);
assert.equal(minimumTransferBuffer(route(late,next,3),current),-8);
assert.equal(minimumTransferBuffer(route(prev,next,11),current),-1);
assert.equal(minimumTransferBuffer({...route(prev,next),transitLegs:[prev]},current),null,"Direct journeys have no transfer buffer");
const journeys=[{...route(prev,next,11),id:"bad"},{...route(prev,next,1),id:"good"},{...route(prev,next,7),id:"tight"}];
assert.deepEqual(sortJourneys(journeys,"transfer",current).map(item=>item.id),["good","tight","bad"],"Sort by genuinely computed transfer buffer");
assert.deepEqual(journeys.map(item=>item.id),["bad","good","tight"],"Sorting cannot change provider order");

console.log("V60 transfer audit: source freshness, footpath, cancellations, negative transfer and boundary cases passed.");

const read=(path)=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const page=read("app/page.tsx");
const alternatives=read("app/journey-alternatives.tsx");
const board=read("app/live-board.tsx");
const journey=read("app/live-journey.ts");
assert.match(page,/assessJourneyTransfers\(journey\)/);
assert.match(alternatives,/assessTransfer\(journey,index\)/);
assert.match(alternatives,/checked=\{excludeCancelled\}/);
assert.match(alternatives,/arrivalRealtime\?previous\.endTime/);
assert.match(alternatives,/departureRealtime\?next\.startTime/);
assert.match(alternatives,/Mehr Umstiegspuffer/);
assert.match(alternatives,/Nur Verbindungen ohne gemeldeten Ausfall/);
assert.doesNotMatch(page,/occupancyForecast\(/,"No invented occupancy in itinerary");
assert.doesNotMatch(board,/occupancyForecast\(/,"No invented occupancy in station board");
assert.doesNotMatch(journey,/Math\.max\(0, Math\.round\(\(new Date\(next\.startTime/,"Negative transfer must not be clamped");
assert.match(journey,/Number\.isFinite\(arrival\)/,"Invalid transfer timestamps need checking");
console.log("V60 UI wiring audit: actual transfer buffer, alternative cancellation filter and no invented occupancy.");

assert.equal(existsSync(new URL("../app/occupancy.ts",import.meta.url)),false,"Misleading time-based occupancy heuristic must not remain in app source");
