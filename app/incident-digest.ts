import type {RailNotice} from "./station-disruptions-data.ts";
const safe=(value:unknown,max=300)=>typeof value==="string"?value.replace(/[\u0000-\u001F\u007F]/g," ").replace(/\s+/g," ").trim().slice(0,max):"";
export function formatIncidentDigest(input:{
 stationName:string;retrievedAt:string;notices:readonly RailNotice[];warning?:string;
}):string{
 const title=safe(input.stationName,120)||"Bahnhof unbekannt";
 const timestamp=Date.parse(input.retrievedAt);
 const updated=Number.isFinite(timestamp)?new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"}).format(new Date(timestamp)):"Zeit nicht verfügbar";
 const out=["BahnConnections – Betriebslage",title,"Daten abgerufen: "+updated,
  "Nur Meldungen des geladenen Fahrplanfensters, keine vollständige Netzabdeckung."];
 if(input.warning)out.push("Quellenhinweis: "+safe(input.warning,350));
 out.push(input.notices.length+" ausgewählte Meldung(en).");
 for(const [index,item] of input.notices.slice(0,25).entries()){
  out.push("");
  out.push((index+1)+". "+(item.kind==="cancellation"?"Ausfall":item.kind==="construction"?"Bauarbeiten":"Störung")+" – "+safe(item.headline,360));
  out.push(item.lines.length?"Linien: "+item.lines.map(line=>safe(line,32)).filter(Boolean).join(", "):"Allgemeiner Bahnhofshinweis");
  if(item.direction)out.push("Richtung: "+safe(item.direction,100));
  if(item.plannedTime&&Number.isFinite(Date.parse(item.plannedTime)))out.push("Fahrtzeit: "+new Intl.DateTimeFormat("de-DE",{timeZone:"Europe/Berlin",hour:"2-digit",minute:"2-digit"}).format(new Date(item.plannedTime))+" Uhr");
  if(item.detail&&item.detail!==item.headline)out.push(safe(item.detail,800));
 }
 if(input.notices.length>25)out.push("… "+(input.notices.length-25)+" weitere Meldungen nicht im Export enthalten.");
 return out.join("\n");
}
