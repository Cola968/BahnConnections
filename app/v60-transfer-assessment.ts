import type { LiveJourney, LiveJourneyLeg } from "./live-journey";

export type TransferStatus="unknown"|"cancelled"|"missed"|"tight"|"caution"|"sufficient";
export type TransferSource="realtime"|"partial"|"timetable";
export type TransferAssessment={
 status:TransferStatus;source:TransferSource;tone:"risk"|"medium"|"good";
 waitMinutes:number|null;walkMinutes:number;bufferMinutes:number|null;
 arrivalRealtime:boolean;departureRealtime:boolean;walkProvided:boolean;
 label:string;detail:string;
};
const when=(value?:string|null):number|null=>{
 const parsed=Date.parse(value??"");
 return Number.isFinite(parsed)?parsed:null;
};
const sourceFresh=(journey:LiveJourney,now:number)=>{
 const stamp=when(journey.updatedAt);
 return stamp!==null&&Number.isFinite(now)&&now-stamp>=-10_000&&now-stamp<=180_000;
};
/** Count only walking segments between the two transit legs, never access/egress walks. */
function transferWalk(journey:LiveJourney,previous:LiveJourneyLeg,next:LiveJourneyLeg):{minutes:number;provided:boolean;valid:boolean}{
 const before=journey.legs.indexOf(previous),after=journey.legs.indexOf(next);
 if(before<0||after<=before)return {minutes:0,provided:false,valid:false};
 const walking=journey.legs.slice(before+1,after).filter(leg=>leg.category==="walk");
 if(walking.some(leg=>!Number.isFinite(leg.durationSeconds)||leg.durationSeconds<0))return {minutes:0,provided:true,valid:false};
 const seconds=walking.reduce((sum,leg)=>sum+leg.durationSeconds,0);
 return {minutes:Math.ceil(seconds/60),provided:walking.length>0,valid:true};
}
/** A distant change of stations cannot be treated as a zero-minute transfer. */
function differentStations(previous:LiveJourneyLeg,next:LiveJourneyLeg):boolean{
 const a=previous.to,b=next.from;
 if(![a.lat,a.lon,b.lat,b.lon].every(Number.isFinite)||(!a.lat&&!a.lon)||(!b.lat&&!b.lon))return false;
 const rad=Math.PI/180;
 const dLat=(a.lat-b.lat)*rad,dLon=(a.lon-b.lon)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
 return 12742000*Math.asin(Math.sqrt(Math.min(1,h)))>400;
}
const empty=():TransferAssessment=>({
 status:"unknown",source:"timetable",tone:"medium",
 waitMinutes:null,walkMinutes:0,bufferMinutes:null,arrivalRealtime:false,departureRealtime:false,walkProvided:false,label:"Umstiegszeit unbekannt",
 detail:"Ankunft oder Abfahrt fehlt beziehungsweise ist ungültig. Anschluss bitte selbst prüfen.",
});
/** A calculated connection buffer is not a prediction of catching a train.
 * Predicted times are used only while the itinerary data are fresh.
 */
export function assessTransfer(journey:LiveJourney,index:number,now=Date.now()):TransferAssessment{
 const previous=journey.transitLegs[index],next=journey.transitLegs[index+1];
 if(!previous||!next)return empty();
 const walk=transferWalk(journey,previous,next);
 const walkMinutes=walk.minutes;
 if(!walk.valid||(!walk.provided&&differentStations(previous,next))){
  return {...empty(),status:"unknown",walkProvided:walk.provided,
    label:"Fußweg für diesen Umstieg unbekannt",
    detail:"Haltestellenwechsel oder ungültige Gehzeit ohne berechenbaren Fußweg. Anschluss beim Betreiber prüfen."};
 }
 if(journey.cancelled||previous.cancelled||next.cancelled||previous.to.cancelled||next.from.cancelled){
  return { ...empty(),walkMinutes,walkProvided:walk.provided,status:"cancelled",tone:"risk",label:"Anschluss durch Ausfall betroffen",
   detail:"Mindestens ein betroffener Fahrtabschnitt oder Halt fällt aus. Verbindung und Alternativen prüfen." };
 }
 const fresh=sourceFresh(journey,now);
 const arrivingLive=Boolean(fresh&&previous.realtime&&when(previous.endTime)!==null);
 const departingLive=Boolean(fresh&&next.realtime&&when(next.startTime)!==null);
 const arrival=arrivingLive?when(previous.endTime):when(previous.scheduledEndTime)??(!previous.realtime?when(previous.endTime):null);
 const departure=departingLive?when(next.startTime):when(next.scheduledStartTime)??(!next.realtime?when(next.startTime):null);
 const source:TransferSource=arrivingLive&&departingLive?"realtime":arrivingLive||departingLive?"partial":"timetable";
 if(arrival===null||departure===null)return {...empty(),source,walkMinutes,walkProvided:walk.provided,arrivalRealtime:arrivingLive,departureRealtime:departingLive};
 const waitMinutes=Math.floor((departure-arrival)/60_000);
 const bufferMinutes=waitMinutes-walkMinutes;
 const status:TransferStatus=bufferMinutes<0?"missed":bufferMinutes<=3?"tight":bufferMinutes<=6?"caution":"sufficient";
 const tone:TransferAssessment["tone"]=status==="missed"||status==="tight"?"risk":status==="caution"||!walk.provided?"medium":"good";
 const provenance=source==="realtime"?"aktuellen Prognosen":source==="partial"?"teils Prognosen, teils Fahrplan":"Fahrplandaten";
 const label=status==="missed"?"Anschluss zeitlich nicht erreichbar":walk.provided?
  `${bufferMinutes} Min. rechnerischer Umstiegspuffer`:`${waitMinutes} Min. bis zur Abfahrt (Gleisweg unbekannt)`;
 const detail=`${waitMinutes} Min. zwischen Ankunft und Abfahrt · ${walk.provided?`${walkMinutes} Min. gemeldeter Fußweg berücksichtigt`:"Fußweg/Gleisweg nicht angegeben"} · Berechnung aus ${provenance}. Kein garantierter Anschluss; Wege und Störungen können abweichen.`;
 return {status,source,tone,waitMinutes,walkMinutes,bufferMinutes,label,detail,walkProvided:walk.provided,arrivalRealtime:arrivingLive,departureRealtime:departingLive};
}
export function assessJourneyTransfers(journey:LiveJourney,now=Date.now()):TransferAssessment[]{
 return journey.transitLegs.slice(0,-1).map((_,index)=>assessTransfer(journey,index,now));
}

/** A sort key, never a probability or promise that a passenger can catch a train. */
export function minimumTransferBuffer(journey:LiveJourney,now=Date.now()):number|null{
 const transfers=assessJourneyTransfers(journey,now);
 if(!transfers.length||transfers.some(item=>item.bufferMinutes===null||item.status==="cancelled"||item.status==="unknown"))return null;
 return Math.min(...transfers.map(item=>item.bufferMinutes!));
}
