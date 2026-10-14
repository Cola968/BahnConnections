import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { nextTrainStopIndex, normaliseTrainStops, relevantTrainStops, sourceFreshness, trainStopPhase } from "../app/train-inspector-data.ts";
const start=Date.parse("2026-10-14T10:00:00Z");
const at=(minute)=>new Date(start+minute*60_000).toISOString();
const stop=(name,arrival,departure,extra={})=>({
 name, arrival:arrival===null?undefined:at(arrival),departure:departure===null?undefined:at(departure),
 cancelled:false,realtime:true,...extra,
});
const stops=[stop("Berlin Hbf",0,8),stop("Berlin Ostbahnhof",20,22),stop("Erkner",40,41)];
assert.equal(nextTrainStopIndex(stops,start+4*60_000),0,"Train at platform must not skip to next station");
assert.equal(nextTrainStopIndex(stops,start+8*60_000),0,"Platform stop stays current through departure");
assert.equal(nextTrainStopIndex(stops,start+10*60_000),1,"Advance after departing");
assert.equal(nextTrainStopIndex(stops,Number.NaN),-1);
assert.equal(nextTrainStopIndex([stop("Canceled",4,5,{cancelled:true}),...stops],start),1);
assert.equal(nextTrainStopIndex([stop("Terminal",20,null)],start+5*60_000),0);
assert.equal(nextTrainStopIndex([{name:"Defekte Quellzeit",arrival:"broken",scheduledArrival:at(20),departure:"broken",scheduledDeparture:at(22),cancelled:false,realtime:true}],start),0,"Invalid provider forecasts must fall back to a valid planned stop time");
assert.equal(trainStopPhase(stops[0],start-60_000),"approaching");
assert.equal(trainStopPhase(stops[0],start+4*60_000),"at-stop");
assert.equal(trainStopPhase(stops[0],start+9*60_000),"departed");
assert.equal(trainStopPhase(stop("Cancelled",0,8,{cancelled:true}),start),"unknown");
assert.equal(trainStopPhase(stop("Unknown",null,null),start),"unknown");
assert.equal(sourceFreshness(new Date(start),start-5000,true),"current","Small clock skew should not make a fresh feed stale");
assert.equal(sourceFreshness(new Date(start),start-15_000,true),"old");
assert.equal(sourceFreshness(new Date(start),start+91_000,true),"old");
assert.equal(sourceFreshness(null,start,true),"missing");
const complete=relevantTrainStops(stops,start+21*60_000,false,true);
assert.deepEqual(complete,{stops,hidden:0});
const remaining=relevantTrainStops(stops,start+21*60_000,true,true);
assert.equal(remaining.hidden,1);
assert.deepEqual(remaining.stops.map(x=>x.name),["Berlin Ostbahnhof","Erkner"]);
assert.equal(relevantTrainStops(stops,start+21*60_000,true,false).hidden,0,"Never hide previous stops on stale data");
assert.equal(relevantTrainStops(stops,start+100*60_000,true,true).hidden,0,"Completed journey keeps accessible full route");
const dwell=normaliseTrainStops([
 {mode:"REGIONAL_RAIL",realTime:true,from:{name:"A",departure:at(0)},to:{name:"B",arrival:at(10)}},
 {mode:"REGIONAL_RAIL",realTime:true,from:{name:"B",departure:at(15)},to:{name:"C",arrival:at(30)}},
]);
assert.equal(dwell.length,3);
assert.equal(nextTrainStopIndex(dwell,start+12*60_000),1,"Merged train dwell must survive");
const inspector=readFileSync(new URL("../app/live-trip-inspector.tsx",import.meta.url),"utf8");
assert.match(inspector,/trainStopPhase\(nextStop,now\)/);
assert.match(inspector,/relevantTrainStops\(stops,now,onlyRemaining,detailFresh\)/);
assert.match(inspector,/aria-pressed=\{onlyRemaining\}/);
assert.match(inspector,/Aufenthalt laut/);
console.log("V60 passenger-regressions: next stop, dwell, time quality, remaining stops and inspector wiring passed.");
