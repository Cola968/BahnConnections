/** Provider-agnostic journey evidence checks. Never infer an alternative departure. */
export type RouteEvidenceStop={
  name:string;arrival?:string;departure?:string;
  scheduledArrival?:string;scheduledDeparture?:string;
};
export type RouteEvidenceAlert={
  header:string;description?:string;effect?:string|number;
};
export type RouteEvidenceLeg={
  category:string;name:string;
  startTime:string;endTime:string;scheduledStartTime:string;scheduledEndTime:string;
  stops:readonly RouteEvidenceStop[];alerts:readonly RouteEvidenceAlert[];
};
export type RouteEvidenceJourney={transitLegs:readonly RouteEvidenceLeg[]};

const time=(value:string|undefined)=>{
  if(!value)return null;
  const stamp=Date.parse(value);
  return Number.isFinite(stamp)?stamp:null;
};

function normalized(value:string){
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/ß/g,"ss").toLocaleLowerCase("de-DE");
}

/** Only reject physically impossible chronological evidence, not unverified data. */
export function routeChronologyConflict(journey:RouteEvidenceJourney):string|null{
  for(const leg of journey.transitLegs){
    const start=time(leg.scheduledStartTime),end=time(leg.scheduledEndTime);
    const actualStart=time(leg.startTime),actualEnd=time(leg.endTime);
    if(start===null||end===null||actualStart===null||actualEnd===null)
      return `Unvollständige Fahrzeiten für ${leg.name}. Die Route wurde nicht ausgegeben.`;
    if(end<start||actualEnd<actualStart)
      return `Ungültige Zeitreihenfolge für ${leg.name}. Die Route wurde nicht ausgegeben.`;
    let last:number|null=null;
    for(const stop of leg.stops){
      const current=time(stop.scheduledDeparture??stop.scheduledArrival);
      if(current===null)continue; // Lack of evidence is not evidence of impossibility.
      if(last!==null&&current<last){
        return `Die Fahrplan-Haltefolge für ${leg.name} enthält rückwärts laufende Zeiten. Die Route wurde nicht ausgegeben.`;
      }
      last=current;
    }
  }
  return null;
}

export function routeDetourWarnings(journey:RouteEvidenceJourney):string[]{
  const affected=journey.transitLegs.filter(leg=>leg.alerts.some(alert=>{
    const effect=typeof alert.effect==="string"?alert.effect.toUpperCase():"";
    if(["DETOUR","STOP_MOVED","MODIFIED_SERVICE","NO_SERVICE"].includes(effect))return true;
    const body=normalized([alert.header,alert.description??""].join(" "));
    return /\b(umleitung|umgeleitet|umgeleitete|streckenfuhrung|streckenanderung|halte entfallen|haltestelle entfallt|detour|diversion|stop moved)\b/.test(body)
      && !/\b(keine umleitung|umleitung aufgehoben|umleitung beendet|no detour)\b/.test(body);
  })).map(leg=>leg.name));
  if(!affected.length)return [];
  return [`Betriebshinweis zu ${[...new Set(affected)].slice(0,4).join(", ")}: Umleitung oder geänderte Bedienung gemeldet. Der tatsächliche Fahrweg ist nicht unabhängig bestätigt. Bitte beim Verkehrsunternehmen gegenprüfen.`];
}
