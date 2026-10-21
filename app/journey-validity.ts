import {journeyIntegrityConflict} from './journey-integrity.ts';
import {transitAlertContent,type TransitAlert} from './transit-alerts.ts';

/** One policy for every station, provider and presentation. Absence of alerts is not operator verification. */
export const ROUTE_VALIDITY_POLICY='2026-10-22.1';
export type RouteValidity={
  status:'unverified'|'blocked'; reason:string|null; warnings:string[];
  checkedAt:string; validUntil:string; policyVersion:string;
};
export type RouteEvidenceStop={
  name:string;arrival?:string;departure?:string;
  scheduledArrival?:string;scheduledDeparture?:string;alerts?:readonly TransitAlert[];
};
export type RouteEvidenceAlert=TransitAlert&{header:string};
export type RouteEvidenceLeg={
  category:string;name:string;from?:RouteEvidenceStop;to?:RouteEvidenceStop;
  startTime:string;endTime:string;scheduledStartTime:string;scheduledEndTime:string;
  stops:readonly RouteEvidenceStop[];alerts:readonly RouteEvidenceAlert[];
};
export type RouteEvidenceJourney={transitLegs:readonly RouteEvidenceLeg[]};
const time=(value:string|undefined)=>{
  if(!value||!/(?:Z|[+-]\d{2}:\d{2})$/i.test(value))return null;
  const stamp=Date.parse(value);return Number.isFinite(stamp)?stamp:null;
};
function normalized(value:string){
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/ß/g,'ss').toLocaleLowerCase('de-DE');
}
export function routeChronologyConflict(journey:RouteEvidenceJourney):string|null{
  for(const leg of journey.transitLegs){
    if([leg.startTime,leg.endTime,leg.scheduledStartTime,leg.scheduledEndTime].some(value=>value&&time(value)===null))
      return `Ungültige Fahrzeit oder fehlende Zeitzone für ${leg.name}.`;
    const start=time(leg.scheduledStartTime),end=time(leg.scheduledEndTime);
    const actualStart=time(leg.startTime),actualEnd=time(leg.endTime);
    if((start!==null&&end!==null&&end<start)||(actualStart!==null&&actualEnd!==null&&actualEnd<actualStart))
      return `Ungültige Zeitreihenfolge für ${leg.name}. Die Route wurde nicht ausgegeben.`;
    let last:number|null=null;
    for(const stop of leg.stops){
      const arrival=time(stop.scheduledArrival),departure=time(stop.scheduledDeparture);
      if(arrival!==null&&departure!==null&&departure<arrival)
        return `Ungültige Haltezeit für ${leg.name}: Abfahrt vor Ankunft.`;
      const current=arrival??departure;
      if(current!==null&&last!==null&&current<last)
        return `Die Fahrplan-Haltefolge für ${leg.name} enthält rückwärts laufende Zeiten. Die Route wurde nicht ausgegeben.`;
      if(departure!==null||arrival!==null)last=departure??arrival;
    }
  }
  return null;
}
// GTFS-RT Alert.Effect values: NO_SERVICE=1, DETOUR=4, MODIFIED_SERVICE=7, STOP_MOVED=9.
export function routeChangingAlert(alert:TransitAlert):boolean{
  const effect=typeof alert.effect==='number'?alert.effect:Number(alert.effect);
  if([1,4,7,9].includes(effect))return true;
  if(typeof alert.effect==='string'&&['DETOUR','STOP_MOVED','MODIFIED_SERVICE','NO_SERVICE'].includes(alert.effect.toUpperCase()))return true;
  const text=transitAlertContent(alert),body=normalized(text.header+' '+text.detail);
  return /\b(umleitung|umgeleitet|umgeleitete|streckenfuhrung|streckenanderung|halte entfallen|haltestelle entfallt|ersatzverkehr|schienenersatzverkehr|ersatzbus|detour|diversion|stop moved|stop closed)\b/.test(body)
    && !/\b(keine umleitung|umleitung aufgehoben|umleitung beendet|no detour)\b/.test(body);
}
function epoch(value:unknown):number|null{
  if(value===undefined||value===null)return null;
  const stamp=typeof value==='number'||(typeof value==='string'&&/^\d+$/.test(value))?Number(value)*1000:typeof value==='string'?Date.parse(value):NaN;
  return Number.isFinite(stamp)?stamp:NaN;
}
/** Match the actual event window, not the fetch date or only the trip's start. End is exclusive. */
export function alertApplies(alert:TransitAlert,start:string|undefined,end=start):boolean{
  const periods=alert.activePeriods??alert.activePeriod??alert.active_period;
  if(periods===undefined)return true;
  if(!Array.isArray(periods))return true; // malformed scope cannot establish safety
  if(!periods.length)return true; // GTFS: no periods = active while present in feed
  const from=time(start),to=time(end)??from;
  if(from===null||to===null)return true;
  return periods.some(period=>{
    if(!period||typeof period!=='object')return true;
    const a=epoch(period.start),b=epoch(period.end);
    if(Number.isNaN(a)||Number.isNaN(b)||(a!==null&&b!==null&&b<=a))return true;
    return (a===null||to>=a)&&(b===null||from<b);
  });
}
function activeRouteAlerts(leg:RouteEvidenceLeg):TransitAlert[]{
  const times=[leg.scheduledStartTime,leg.startTime,leg.scheduledEndTime,leg.endTime,
    ...leg.stops.flatMap(stop=>[stop.scheduledArrival,stop.scheduledDeparture,stop.arrival,stop.departure])]
    .filter((v):v is string=>typeof v==='string'&&time(v)!==null).sort((a,b)=>Date.parse(a)-Date.parse(b));
  return [
    ...leg.alerts.filter(alert=>routeChangingAlert(alert)&&alertApplies(alert,times[0],times.at(-1))),
    ...leg.stops.flatMap(stop=>(stop.alerts??[]).filter(alert=>routeChangingAlert(alert)&&alertApplies(alert,
      stop.scheduledArrival??stop.arrival??stop.scheduledDeparture??stop.departure??times[0],
      stop.departure??stop.scheduledDeparture??stop.arrival??stop.scheduledArrival??times.at(-1))))
  ];
}
export function routeDetourWarnings(journey:RouteEvidenceJourney):string[]{
  const affected=journey.transitLegs.filter(leg=>activeRouteAlerts(leg).length).map(leg=>leg.name);
  if(!affected.length)return [];
  return [`Betriebshinweis zu ${[...new Set(affected)].slice(0,4).join(', ')}: Umleitung oder geänderte Bedienung gemeldet. Der tatsächliche Fahrweg ist nicht unabhängig bestätigt. Bitte beim Verkehrsunternehmen gegenprüfen.`];
}
export function assessJourneyValidity(input:RouteEvidenceJourney,now=Date.now()):RouteValidity{
  const journey={transitLegs:input.transitLegs.map(leg=>({...leg,stops:leg.stops??[leg.from,leg.to].filter((stop):stop is RouteEvidenceStop=>Boolean(stop)),alerts:leg.alerts??[]}))};
  const integrity=journeyIntegrityConflict({transitLegs:journey.transitLegs.map(leg=>({...leg,
    from:leg.stops[0]??{name:''},to:leg.stops.at(-1)??{name:''}}))});
  const chronology=routeChronologyConflict(journey);
  const warnings=routeDetourWarnings(journey);
  const reason=integrity??chronology??(warnings.length?'Aktive Änderung der Bedienung: Der gelieferte Fahrtverlauf ist nicht gesichert. '+warnings.join(' '):null);
  return {status:reason?'blocked':'unverified',reason,warnings:reason?[...new Set([reason,...warnings])]:[],
    checkedAt:new Date(now).toISOString(),validUntil:new Date(now+30_000).toISOString(),policyVersion:ROUTE_VALIDITY_POLICY};
}
export class RouteValidityError extends Error{
  readonly validity:RouteValidity;
  constructor(validity:RouteValidity){super(validity.reason??'Fahrtverlauf gesperrt');this.name='RouteValidityError';this.validity=validity;}
}
export function requireUsableJourney(journey:RouteEvidenceJourney):RouteValidity{
  const previous=(journey as RouteEvidenceJourney&{routeValidity?:RouteValidity}).routeValidity;
  const validity=previous?.status==='blocked'?previous:assessJourneyValidity(journey);
  if(validity.status==='blocked')throw new RouteValidityError(validity);
  return validity;
}
export type RawTripPlace=RouteEvidenceStop&{stopId?:string;lat?:number;lon?:number};
export type RawTripEvidenceLeg={
  mode?:string;displayName?:string;tripShortName?:string;routeShortName?:string;
  startTime?:string;endTime?:string;scheduledStartTime?:string;scheduledEndTime?:string;
  from?:RawTripPlace;to?:RawTripPlace;intermediateStops?:RawTripPlace[];
  alerts?:TransitAlert[];
};
export function assessRawTransitTrip(input:readonly RawTripEvidenceLeg[]){
  const legs:RouteEvidenceLeg[]=input.filter(leg=>leg.mode&&leg.mode!=='WALK').map(leg=>{
    const stops=[leg.from,...(leg.intermediateStops??[]),leg.to].filter((s):s is RawTripPlace=>Boolean(s));
    // Keep stop alerts scoped to the stop. Flattening them broadens their active windows.
    const alerts=(leg.alerts??[]).map(alert=>({...alert,header:transitAlertContent(alert).header||'Betriebshinweis'}));
    return {category:leg.mode==='TRAM'?'tram':leg.mode!,name:leg.displayName||leg.tripShortName||leg.routeShortName||'Fahrt',
      startTime:leg.startTime??'',endTime:leg.endTime??'',scheduledStartTime:leg.scheduledStartTime??leg.startTime??'',
      scheduledEndTime:leg.scheduledEndTime??leg.endTime??'',stops,alerts};
  });
  const validity=assessJourneyValidity({transitLegs:legs});
  return {conflict:validity.reason,warnings:validity.warnings,validity};
}

/** Do not allow a warning-free duplicate from a second interface to overrule a known route conflict. */
export function assessRouteCandidates<T extends RouteEvidenceJourney>(candidates:readonly T[]){
  const assessments=candidates.map(journey=>({journey,validity:assessJourneyValidity(journey)}));
  const blockedLegs=candidates.flatMap(journey=>journey.transitLegs.filter(leg=>assessJourneyValidity({transitLegs:[leg]}).status==='blocked'));
  const sameService=(left:RouteEvidenceLeg,right:RouteEvidenceLeg)=>{
    const a=time(left.scheduledStartTime),b=time(right.scheduledStartTime);
    return normalized(left.name).replace(/[^a-z0-9]/g,'')===normalized(right.name).replace(/[^a-z0-9]/g,'')&&a!==null&&b!==null&&Math.abs(a-b)<=120_000
      &&left.stops.length>0&&right.stops.length>0
      &&normalized(left.stops[0].name)===normalized(right.stops[0].name)
      &&normalized(left.stops.at(-1)!.name)===normalized(right.stops.at(-1)!.name);
  };
  const admissible:T[]=[],rejected:string[]=[];
  for(const {journey,validity} of assessments){
    const duplicate=journey.transitLegs.some(leg=>blockedLegs.some(blocked=>sameService(leg,blocked)));
    if(validity.reason||duplicate)rejected.push(validity.reason??'Eine andere Quelle meldet einen nicht aufgelösten Routenkonflikt für dieselbe Fahrt.');
    else admissible.push(journey);
  }
  return {admissible,rejected};
}
