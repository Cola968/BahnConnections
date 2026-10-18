import assert from "node:assert/strict";
import {routeChronologyConflict,routeDetourWarnings,assessRawTransitTrip} from "../app/journey-validity.ts";

const t=(hour)=>`2026-10-18T${hour}:00+02:00`;
function section({city="Wedemark",line="S4",alert=null,from="Bennemühlen",to="Mellendorf",start=t("12:00"),end=t("12:12")}={}){
  return {category:"sbahn",name:line,startTime:start,endTime:end,
    scheduledStartTime:start,scheduledEndTime:end,
    stops:[{name:`${city} ${from}`,scheduledDeparture:start},{name:`${city} ${to}`,scheduledArrival:end}],
    alerts:alert?[alert]:[]};
}
const trip=leg=>({transitLegs:[leg]});
const places=["Wedemark","Berlin","Dresden","Hamburg","München","Köln","Leipzig","Stuttgart","Düsseldorf","Bremen"];
for(const city of places){
  const valid=section({city});
  assert.equal(routeChronologyConflict(trip(valid)),null,`${city}: valid journey stays available`);
  assert.equal(routeDetourWarnings(trip(valid)).length,0,`${city}: no invented incident`);
  assert.match(routeChronologyConflict(trip({...valid,startTime:t("12:20")})),/Zeitreihenfolge/,
    `${city}: impossible actual arrival detected`);
  assert.match(routeChronologyConflict(trip({...valid,stops:[
    {name:city+" A",scheduledDeparture:t("12:05")},
    {name:city+" B",scheduledArrival:t("12:03")},
  ]})),/Haltefolge/,`${city}: backward scheduled intermediate stops rejected`);
  assert.equal(routeDetourWarnings(trip({...valid,alerts:[{header:"Wegen Bauarbeiten Umleitung über andere Halte"}]})).length,1,
    `${city}: explicit reported detour must warn`);
  assert.equal(routeDetourWarnings(trip({...valid,alerts:[{header:"Keine Umleitung mehr"}]})).length,0,
    `${city}: resolved detour must not warn`);
}
const raw={mode:"SUBURBAN",displayName:"S4",startTime:t("12:00"),endTime:t("12:12"),
  from:{name:"Wedemark Bennemühlen",scheduledDeparture:t("12:00")},
  to:{name:"Wedemark Mellendorf",scheduledArrival:t("12:12")},
  intermediateStops:[{name:"Wedemark Bissendorf",scheduledArrival:t("12:06")}],
  alerts:[{effect:"DETOUR",headerText:"Linienumleitung aufgrund Bauarbeiten"}]};
assert.equal(assessRawTransitTrip([raw]).conflict,null);
assert.equal(assessRawTransitTrip([raw]).warnings.length,1);
assert.match(assessRawTransitTrip([{...raw,intermediateStops:[{name:"Wedemark Bissendorf",scheduledArrival:t("11:58")}]}]).conflict,/Haltefolge/);
assert.equal(assessRawTransitTrip([{...raw,alerts:[{headerText:"Regelbetrieb"}]}]).warnings.length,0);
assert.equal(assessRawTransitTrip([{...raw,startTime:undefined,endTime:undefined}]).conflict,null,
  "An incomplete provider trip is not necessarily chronologically impossible");
const effected=section({alert:{header:"Betriebshinweis",effect:"STOP_MOVED"}});
assert.equal(routeDetourWarnings(trip(effected)).length,1);
assert.equal(routeDetourWarnings(trip(section({alert:{header:"Keine Umleitung nötig"}}))).length,0);
assert.equal(routeDetourWarnings(trip(section({alert:{header:"Planmäßige Ankunft"}}))).length,0);
console.log("Nationwide journey validity audit passed: operator alerts, impossible times, resolved alerts and 10 cities.");
