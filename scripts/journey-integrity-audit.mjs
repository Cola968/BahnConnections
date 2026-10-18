import assert from "node:assert/strict";
import {journeyIntegrityConflict} from "../app/journey-integrity.ts";

const stop=(name)=>({name});
const safe=["Straßburger Platz","Georg-Arnhold-Bad","Lennéplatz","Hauptbahnhof Nord","Prager Straße","Postplatz"];
const broken=["Dresden Straßburger Platz","Dresden Deutsches Hygiene-Museum","Dresden Pirnaischer Platz","Dresden Altmarkt","Dresden Postplatz"];
function journey(names,{line="1",start="2026-10-18T14:00:00+02:00",category="tram"}={}){
  const stops=names.map(stop);
  return {transitLegs:[{category,name:line,startTime:start,scheduledStartTime:start,
    from:stops[0],to:stops.at(-1),stops}]};
}
for(const line of ["1","2","9","Linie 1"]){
  assert.match(journeyIntegrityConflict(journey(broken,{line})),/Umleitung/,line+" must reject obsolete stops");
  assert.equal(journeyIntegrityConflict(journey(safe,{line})),null,line+" must keep documented diversion");
  assert.equal(journeyIntegrityConflict(journey([...safe].reverse(),{line})),null,line+" reverse must be allowed");
  assert.match(journeyIntegrityConflict(journey(["Straßburger Platz","Postplatz"],{line})),/muss/,line+" must reject incomplete direct routing");
  assert.match(journeyIntegrityConflict(journey(["Dresden Altmarkt","Dresden Postplatz"],{line})),/bedient/,line+" must reject affected partial segment");
}
assert.equal(journeyIntegrityConflict(journey(broken,{line:"10"})),null,"Only affected tram lines");
assert.equal(journeyIntegrityConflict(journey(broken,{category:"regional"})),null,"Tram guard must not affect trains");
assert.equal(journeyIntegrityConflict(journey(broken,{start:"2026-10-09T19:59:59+02:00"})),null,"Before diversion window");
assert.match(journeyIntegrityConflict(journey(broken,{start:"2026-10-09T20:00:00+02:00"})),/Umleitung/,"Inclusive start");
assert.match(journeyIntegrityConflict(journey(broken,{start:"2026-10-24T03:29:59+02:00"})),/Umleitung/,"Within diversion end");
assert.equal(journeyIntegrityConflict(journey(broken,{start:"2026-10-24T03:30:00+02:00"})),null,"Expired rules must not linger");
assert.equal(journeyIntegrityConflict(journey(["Altmarkt","Rathaus"],{line:"1"})),null,"Never block another city's Altmarkt");
assert.equal(journeyIntegrityConflict({transitLegs:[]}),null,"Empty itinerary has no diversion contradiction");
console.log("Journey disruption integrity audit passed: 24 checks.");
