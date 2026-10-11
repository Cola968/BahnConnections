import assert from "node:assert/strict";
import { compareBoardRows, normaliseBoardLine } from "../app/board-verification.ts";
import { compactStationLabel } from "../app/transit-style.ts";

const start = new Date("2026-09-03T10:00:00+02:00");
const at = (minutes) => new Date(start.getTime() + minutes * 60_000).toISOString();
const primary = Array.from({ length:10 }, (_, index) => ({ displayName:index === 0 ? "S 15" : `ICE ${100 + index}`, place:{ scheduledDeparture:at(index * 10) } }));
const matching = primary.map((row, index) => ({ line:{ name:index === 0 ? "S15" : row.displayName }, plannedWhen:at(index * 10 + (index % 2 ? 2 : 0)) }));
const confirmed = compareBoardRows(primary, matching, false, start);
if (normaliseBoardLine("U 2") !== "U2" || confirmed.status !== "matched" || confirmed.matchedRows !== 10 || confirmed.matchRate !== 100) throw new Error(`Bestätigungsfall fehlerhaft: ${JSON.stringify(confirmed)}`);

const divergent = matching.map((row, index) => index < 2 ? row : { ...row, line:{ name:`RE ${index}` } });
const difference = compareBoardRows(primary, divergent, false, start);
if (difference.status !== "different" || difference.matchedRows !== 2 || difference.matchRate !== 20) throw new Error(`Abweichungsfall fehlerhaft: ${JSON.stringify(difference)}`);

const duplicate = compareBoardRows([primary[0], { ...primary[0] }], [matching[0]], false, start);
if (duplicate.matchedRows !== 1 || duplicate.comparedRows !== 2 || duplicate.status !== "inconclusive") throw new Error(`Doppelte Gegenprüfungszeile wurde mehrfach verwendet: ${JSON.stringify(duplicate)}`);

const insufficient = compareBoardRows(primary, matching.slice(0,1), false, start);
assert.equal(insufficient.status, "inconclusive", "One DB trip cannot verify ten Transitous trips");
assert.equal(insufficient.matchRate, 10, "Coverage must use all Transitous trips as denominator");
const empty = compareBoardRows([], [], false, start);
assert.equal(empty.status, "inconclusive", "An empty board is not independently verified");
assert.equal(empty.matchRate, 0);
const partlyMatched = compareBoardRows(primary, matching.map((item,index) => index < 7 ? item : { ...item, line:{name:"UNKNOWN"} }), false, start);
assert.equal(partlyMatched.status, "inconclusive", "Unclear agreement cannot be advertised as verified");
const arrival = compareBoardRows([{ displayName:"U2", place:{ scheduledArrival:at(15), arrival:at(30) } }], [{ line:{ name:"U 2" }, plannedWhen:at(15), when:at(30) }], true, start);
if (arrival.matchedRows !== 1) throw new Error(`Ankunft vergleicht nicht die getrennte Sollzeit: ${JSON.stringify(arrival)}`);
if (compactStationLabel("München Hauptbahnhof – Zugang über den Bahnhofsvorplatz") !== "München Hbf") throw new Error("Technischer Zugangszusatz wurde nicht entfernt");
if (compactStationLabel("Berlin Hauptbahnhof, Zugang via Europaplatz") !== "Berlin Hbf") throw new Error("Via-Zugangszusatz wurde nicht entfernt");

console.log(JSON.stringify({ checkedAt:new Date().toISOString(), checks:[
  { name:"Liniennummer-Normalisierung", ok:true },
  { name:"Bestätigte Tafel", ok:true, ...confirmed },
  { name:"Erkannte Quellenabweichung", ok:true, ...difference },
  { name:"Keine Doppelverwendung", ok:true },
  { name:"Unzureichende Stichprobe und leere Tafel werden nicht bestätigt", ok:true },
  { name:"Unklare Quellenübereinstimmung bleibt offen", ok:true },
  { name:"Soll-/Ist-Zeit getrennt", ok:true },
  { name:"Öffentliche Bahnhofsnamen ohne Zugangszusätze", ok:true },
] }, null, 2));
