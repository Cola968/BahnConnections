import type { LiveJourney, LiveJourneyLeg } from "./live-journey";

export type TransferStatus="unknown"|"cancelled"|"missed"|"tight"|"caution"|"sufficient";
export type TransferSource="realtime"|"partial"|"timetable";
export type TransferAssessment={
 status:TransferStatus;source:TransferSource;tone:"risk"|"medium"|"good";
 waitMinutes:number|null;walkMinutes:number;bufferMinutes:number|null;
 arrivalRealtime:boolean;departureRealtime:boolean;
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
function transferWalkingMinutes(journey:LiveJourney,previous:LiveJourneyLeg,next:LiveJourneyLeg):number{
 const before=journey.legs.indexOf(previous),after=journey.legs.indexOf(next);
 if(before<0||after<=before)return 0;
 const seconds=journey.legs.slice(before+1,after)
  .filter(leg=>leg.category==="walk")
  .reduce((sum,leg)=>sum+(Number.isFinite(leg.durationSeconds)?Math.max(0,leg.durationSeconds):0),0);
 return Math.ceil(seconds/60);
}
const empty=():TransferAssessment=>({
 status:"unknown",source:"timetable",tone:"medium",
 waitMinutes:null,walkMinutes:0,bufferMinutes:null,arrivalRealtime:false,departureRealtime:false,label:"Umstiegszeit unbekannt",
 detail:"Ankunft oder Abfahrt fehlt beziehungsweise ist ungültig. Anschluss bitte selbst prüfen.",
});
/** A calculated connection buffer is not a prediction of catching a train.
 * Predicted times are used only while the itinerary data are fresh.
 */
export function assessTransfer(journey:LiveJourney,index:number,now=Date.now()):TransferAssessment{
 const previous=journey.transitLegs[index],next=journey.transitLegs[index+1];
 if(!previous||!next)return empty();
 const walkMinutes=transferWalkingMinutes(journey,previous,next);
 if(journey.cancelled||previous.cancelled||next.cancelled||previous.to.cancelled||next.from.cancelled){
  return { ...empty(),walkMinutes,status:"cancelled",tone:"risk",label:"Anschluss durch Ausfall betroffen",
   detail:"Mindestens ein betroffener Fahrtabschnitt oder Halt fällt aus. Verbindung und Alternativen prüfen." };
 }
 const fresh=sourceFresh(journey,now);
 const arrivingLive=Boolean(fresh&&previous.realtime&&when(previous.endTime)!==null);
 const departingLive=Boolean(fresh&&next.realtime&&when(next.startTime)!==null);
 const arrival=arrivingLive?when(previous.endTime):when(previous.scheduledEndTime)??(!previous.realtime?when(previous.endTime):null);
 const departure=departingLive?when(next.startTime):when(next.scheduledStartTime)??(!next.realtime?when(next.startTime):null);
 const source:TransferSource=arrivingLive&&departingLive?"realtime":arrivingLive||departingLive?"partial":"timetable";
 if(arrival===null||departure===null)return {...empty(),source,walkMinutes,arrivalRealtime:arrivingLive,departureRealtime:departingLive};
 const waitMinutes=Math.floor((departure-arrival)/60_000);
 const bufferMinutes=waitMinutes-walkMinutes;
 const status:TransferStatus=bufferMinutes<0?"missed":bufferMinutes<=3?"tight":bufferMinutes<=6?"caution":"sufficient";
 const tone:TransferAssessment["tone"]=status==="missed"||status==="tight"?"risk":status==="caution"?"medium":"good";
 const provenance=source==="realtime"?"aktuellen Prognosen":source==="partial"?"teils Prognosen, teils Fahrplan":"Fahrplandaten";
 const label=status==="missed"?"Anschluss zeitlich nicht erreichbar":`${bufferMinutes} Min. rechnerischer Umstiegspuffer`;
 const detail=`${waitMinutes} Min. zwischen Ankunft und Abfahrt · ${walkMinutes} Min. Fußweg berücksichtigt · Berechnung aus ${provenance}. Kein garantierter Anschluss; Gleisweg und Störungen können abweichen.`;
 return {status,source,tone,waitMinutes,walkMinutes,bufferMinutes,label,detail,arrivalRealtime:arrivingLive,departureRealtime:departingLive};
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
