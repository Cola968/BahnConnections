/** Converts station-board counters to factual UI labels; never calls a timestamp GPS. */
export type BoardHealthInput={
 total:number;realtime:number;updatedAt?:string;
 realtimeStatus?:"live"|"schedule"|"stale";warnings?:string[];
};
export type BoardHealthResult={
 state:"live"|"schedule"|"stale"|"unknown";
 label:string;detail:string;realtimeCount:number;totalCount:number;percentage:number;
 sourceTime:string|null;warningCount:number;
};
const count=(v:number)=>Number.isFinite(v)?Math.max(0,Math.floor(v)):0;
export function assessBoardHealth(board:BoardHealthInput|null,now=Date.now()):BoardHealthResult{
 const unknown=(detail:string):BoardHealthResult=>({state:"unknown",label:"Datenstand unbekannt",detail,realtimeCount:0,totalCount:0,percentage:0,sourceTime:null,warningCount:0});
 if(!board)return unknown("Noch keine Abfahrtsdaten geladen.");
 const totalCount=count(board.total),realtimeCount=Math.min(totalCount,count(board.realtime));
 const time=typeof board.updatedAt==="string"?Date.parse(board.updatedAt):NaN;
 const sourceTime=Number.isFinite(time)?new Date(time).toISOString():null;
 const warningCount=Array.isArray(board.warnings)?board.warnings.filter(x=>typeof x==="string"&&x.trim()).length:0;
 const percentage=totalCount?Math.round(100*realtimeCount/totalCount):0;
 const common={totalCount,realtimeCount,percentage,sourceTime,warningCount};
 if(!totalCount)return {state:"unknown",label:"Keine Tafeldaten",detail:"Für den gewählten Zeitraum liegen keine auswertbaren Fahrten vor.",...common};
 if(!Number.isFinite(time)||!Number.isFinite(now)||time-now>60_000)
  return {state:"unknown",label:"Datenzeit unbekannt",detail:"Der letzte Abruf hat keinen plausiblen Zeitstempel.",...common};
 if(board.realtimeStatus==="stale"||now-time>180_000)
  return {state:"stale",label:"Daten möglicherweise veraltet",detail:"Letzter erfolgreicher Tafelsnapshot ist älter als drei Minuten oder als veraltet markiert.",...common};
 if(board.realtimeStatus==="live"&&realtimeCount>0)
  return {state:"live",label:"Echtzeitangaben vorhanden",detail:"Ein Teil der Fahrten hat eine vom Datenanbieter gemeldete Prognose – keine Fahrzeugortung.",...common};
 if(realtimeCount===0||board.realtimeStatus==="schedule")
  return {state:"schedule",label:"Nur Fahrplan / keine aktuelle Prognose",detail:"Die angezeigten Zeiten sind nicht als bestätigte Echtzeit-Prognosen ausgewiesen.",...common};
 return {state:"unknown",label:"Echtzeitstatus unklar",detail:"Die Quelle liefert keine eindeutige Angabe zur Aktualität.",...common};
}
