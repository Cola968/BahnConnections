import type {StationCall, StationRadarDirection} from "./station-radar-data.ts";
export type CallKind="arrival"|"departure";
export type StationCallView={
  kind:CallKind;
  eventTime:number|null;
  plannedTime:number|null;
  status:"forecast"|"schedule"|"unconfirmed";
  delayMinutes:number|null;
  platform:string|undefined;
  plannedPlatform:string|undefined;
  platformChanged:boolean;
};
export type CallQuickFilter="all"|"next-hour"|"late"|"platform-change";
const finite=(v:number|undefined)=>typeof v==="number"&&Number.isFinite(v)?v:null;
const clean=(s:string|undefined)=>s?.trim()||undefined;

/** Presentation never upgrades a provider prediction or track change after the source expires. */
export function stationCallPresentation(call:StationCall,kind:CallKind,fresh:boolean):StationCallView {
  const predicted=finite(kind==="arrival"?call.arrival:call.departure);
  const planned=finite(kind==="arrival"?call.scheduledArrival:call.scheduledDeparture);
  const providerConfirmed=kind==="arrival"?call.arrivalRealtime===true:call.departureRealtime===true;
  const confirmed=fresh&&providerConfirmed&&predicted!==null;
  const eventTime=confirmed?predicted:planned??(providerConfirmed?null:predicted);
  const actualPlatform=clean(kind==="arrival"?call.arrivalTrack:call.departureTrack);
  const plannedPlatform=clean(kind==="arrival"?call.arrivalScheduledTrack:call.departureScheduledTrack);
  const platform=confirmed?actualPlatform??plannedPlatform:providerConfirmed?plannedPlatform:plannedPlatform??actualPlatform;
  const status:StationCallView["status"]=confirmed?"forecast":eventTime!==null?"schedule":"unconfirmed";
  return {
    kind,eventTime,plannedTime:planned,status,
    delayMinutes:confirmed&&planned!==null?Math.round((predicted!-planned)/60_000):null,
    platform,plannedPlatform,platformChanged:confirmed&&Boolean(actualPlatform&&plannedPlatform&&actualPlatform!==plannedPlatform),
  };
}

/** Browser sorts the displayed, evidence-valid event times—not stale predictions. */
export function browseStationCalls(calls:Map<string,StationCall>,direction:StationRadarDirection,query:string,
  quick:CallQuickFilter,now:number,fresh:boolean){
  const needle=query.trim().toLocaleLowerCase("de");
  return [...calls.entries()].flatMap(([tripId,call])=>{
    if(call.cancelled)return [];
    if(needle&&![tripId,call.name,call.destination].some(t=>t?.toLocaleLowerCase("de").includes(needle)))return [];
    const arrive=stationCallPresentation(call,"arrival",fresh),depart=stationCallPresentation(call,"departure",fresh);
    const presentation=direction==="inbound"?arrive:direction==="outbound"?depart:
      arrive.eventTime===null?depart:depart.eventTime===null?arrive:arrive.eventTime<=depart.eventTime?arrive:depart;
    const t=presentation.eventTime;
    if(t===null)return [];
    if(quick==="next-hour"&&(!Number.isFinite(now)||t<now-60_000||t>now+60*60_000))return [];
    if(quick==="late"&&!(presentation.status==="forecast"&&presentation.delayMinutes!==null&&presentation.delayMinutes>0))return [];
    if(quick==="platform-change"&&!presentation.platformChanged)return [];
    return [{tripId,call,view:presentation}];
  }).sort((a,b)=>a.view.eventTime!-b.view.eventTime!||a.tripId.localeCompare(b.tripId,"de"));
}
