import assert from "node:assert/strict";
import {formatIncidentDigest} from "../app/incident-digest.ts";
const input={stationName:"Berlin Hbf",retrievedAt:"2026-10-14T08:30:00Z",warning:"Teilansicht: Anbieter nicht erreichbar",notices:[
 {key:"1",kind:"construction",headline:"Bauarbeiten",detail:"Ersatzverkehr",lines:["RE1"],direction:"Potsdam",plannedTime:"2026-10-14T08:40:00Z"},
 {key:"2",kind:"cancellation",headline:"Zug fällt aus",detail:"",lines:["ICE 4"]}
]};
const report=formatIncidentDigest(input);
assert.match(report,/Berlin Hbf/);
assert.match(report,/14\.10\.2026/);
assert.match(report,/Teilansicht/);
assert.match(report,/keine vollständige Netzabdeckung/);
assert.match(report,/Linien: RE1/);
assert.match(report,/Zug fällt aus/);
assert.match(report,/Richtung: Potsdam/);
const many=formatIncidentDigest({...input,notices:Array.from({length:30},(_,i)=>({...input.notices[0],key:String(i)}))});
assert.match(many,/5 weitere Meldungen nicht im Export enthalten/);
assert.equal((many.match(/Bauarbeiten – Bauarbeiten/g)||[]).length,25);
assert.ok(!formatIncidentDigest({...input,stationName:"Bad\u0000Name"}).includes("\u0000"));
assert.match(formatIncidentDigest({...input,retrievedAt:"bad",notices:[]}),/Zeit nicht verfügbar/);
console.log("Incident export audit passed");
