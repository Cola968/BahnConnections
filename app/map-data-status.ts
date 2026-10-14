export type RadarFeedState="loading"|"ready"|"stale"|"error";
export type RadarDataStatus={tone:"neutral"|"good"|"warning";label:string;detail:string};

/** A position estimated from timetable data is never described as measured GPS. */
export function mapDataStatus(enabled:boolean,state:RadarFeedState,visibleTrains:number,realtimeTrains:number):RadarDataStatus{
 if(!enabled)return {tone:"neutral",label:"Kartenübersicht",detail:"Zugradar ausgeschaltet"};
 if(state==="loading")return {tone:"neutral",label:"Radar lädt",detail:"Zugmeldungen werden geladen"};
 if(state==="error")return {tone:"warning",label:"Radar nicht erreichbar",detail:"Keine aktuelle Zugauswahl verfügbar"};
 if(state==="stale")return {tone:"warning",label:"Datenstand veraltet",detail:"Alte Positionen werden nicht als live ausgegeben"};
 if(visibleTrains<=0)return {tone:"neutral",label:"Keine Züge im Ausschnitt",detail:"Kein bestätigter Zug in der aktuellen Auswahl"};
 if(realtimeTrains<=0)return {tone:"neutral",label:`${visibleTrains} Züge · Fahrplan`,detail:"Positionen sind modelliert, nicht per GPS erfasst"};
 return {tone:"good",label:`${visibleTrains} Züge im Radar`,detail:`${Math.min(realtimeTrains,visibleTrains)} mit Echtzeitdaten · Positionen geschätzt`};
}
