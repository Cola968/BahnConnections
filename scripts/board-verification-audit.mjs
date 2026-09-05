import { compareBoardRows, normaliseBoardLine } from "../app/board-verification.ts";

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
if (duplicate.matchedRows !== 1 || duplicate.comparedRows !== 1) throw new Error(`Doppelte Gegenprüfungszeile wurde mehrfach verwendet: ${JSON.stringify(duplicate)}`);

const arrival = compareBoardRows([{ displayName:"U2", place:{ scheduledArrival:at(15), arrival:at(30) } }], [{ line:{ name:"U 2" }, plannedWhen:at(15), when:at(30) }], true, start);
if (arrival.matchedRows !== 1) throw new Error(`Ankunft vergleicht nicht die getrennte Sollzeit: ${JSON.stringify(arrival)}`);

console.log(JSON.stringify({ checkedAt:new Date().toISOString(), checks:[
  { name:"Liniennummer-Normalisierung", ok:true },
  { name:"Bestätigte Tafel", ok:true, ...confirmed },
  { name:"Erkannte Quellenabweichung", ok:true, ...difference },
  { name:"Keine Doppelverwendung", ok:true },
  { name:"Soll-/Ist-Zeit getrennt", ok:true },
] }, null, 2));
