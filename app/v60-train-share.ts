/** A shareable, bounded train timetable snapshot. Never represents a booking or live GPS feed. */
export type TrainShareStop={
 name:string;scheduledArrival?:string;scheduledDeparture?:string;
 arrival?:string;departure?:string;realtime?:boolean;cancelled?:boolean;
};
export type TrainShareInput={
 name:string;from:string;to:string;
 plannedDeparture?:string;plannedArrival?:string;
 actualDeparture?:string;actualArrival?:string;
 realtime:boolean;fresh:boolean;updatedAt?:Date|null;
 stops:readonly TrainShareStop[];
};
const formatter=new Intl.DateTimeFormat("de-DE",{
 timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit",
});
const safe=(text:string,limit=100)=>text.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim().slice(0,limit);
const clock=(value?:string):string=>{
 const time=Date.parse(value??"");
 return Number.isFinite(time)?formatter.format(time):"nicht verfügbar";
};
export function formatTrainShare(input:TrainShareInput):string{
 const fresh=Boolean(input.fresh&&input.updatedAt&&Number.isFinite(input.updatedAt.getTime()));
 const prediction=fresh&&input.realtime;
 const lines=[
  "BahnConnections · Zugfahrt (Momentaufnahme)",
  `Zug: ${safe(input.name)}`,
  `Strecke: ${safe(input.from)} → ${safe(input.to)}`,
  `Abfahrt planmäßig: ${clock(input.plannedDeparture)}`,
  ...(prediction&&Number.isFinite(Date.parse(input.actualDeparture??""))?[`Abfahrt Prognose: ${clock(input.actualDeparture)}`]:[]),
  `Ankunft planmäßig: ${clock(input.plannedArrival)}`,
  ...(prediction&&Number.isFinite(Date.parse(input.actualArrival??""))?[`Ankunft Prognose: ${clock(input.actualArrival)}`]:[]),
  `Datenstand: ${fresh?`Prognosen zum Abruf ${formatter.format(input.updatedAt!)}`:"Keine aktuelle Prognose – nur Fahrplanangaben"}`,
  "",
  ...(input.stops.length?["Gemeldete Halte (Auszug):",...input.stops.slice(0,20).map(stop=>{
    if(stop.cancelled)return `${safe(stop.name,80)} · Halt entfällt`;
    const planned=stop.scheduledArrival??stop.scheduledDeparture;
    const actual=stop.arrival??stop.departure;
    const time=fresh&&stop.realtime&&Number.isFinite(Date.parse(actual??""))?
      `Prognose ${clock(actual)}`:`Fahrplan ${clock(planned)}`;
    return `${safe(stop.name,80)} · ${time}`;
  }),...(input.stops.length>20?[`${input.stops.length-20} weitere Halte nicht im Auszug.`]:[]),""]:[]),
  "Quelle: Transitous / MOTIS · Beim Teilen keine laufende Aktualisierung.",
  "Positionen auf der Karte sind geschätzt, keine GPS-Messungen. Angaben vor der Reise beim Betreiber prüfen.",
 ];
 return lines.join("\n");
}
