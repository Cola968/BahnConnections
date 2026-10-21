import {assessRawTransitTrip,type RawTripEvidenceLeg,type RouteValidity} from './journey-validity.ts';
import {transitAlerts} from './transit-alerts.ts';

type Row={tripId?:string;mode?:string;displayName?:string;routeShortName?:string;place?:RawTripEvidenceLeg['from'];alerts?:unknown};
/** Runs before JSON/streaming/fallback rows leave the server, regardless of station ID or verification option. */
export function assessStationRows<T>(input:readonly T[]){
  const stopTimes:(T&{routeValidity:RouteValidity})[]=[];
  const blockedTrips:{tripId:string;reason:string}[]=[];
  const warnings=new Set<string>();let blockedCount=0;
  for(const candidate of input){
    if(!candidate||typeof candidate!=='object')continue;
    const row=candidate as Row;
    const place=row.place;
    const arrival=place?.scheduledArrival??place?.arrival??place?.scheduledDeparture??place?.departure;
    const departure=place?.departure??place?.scheduledDeparture??place?.arrival??place?.scheduledArrival;
    const assessment=assessRawTransitTrip([{mode:row.mode??'TRANSIT',displayName:row.displayName??row.routeShortName,
      from:place,to:place,startTime:arrival,endTime:departure,scheduledStartTime:arrival,scheduledEndTime:place?.scheduledDeparture??arrival,
      alerts:transitAlerts(row.alerts)}]);
    if(assessment.conflict){blockedCount++;warnings.add(assessment.conflict);if(row.tripId)blockedTrips.push({tripId:row.tripId,reason:assessment.conflict});}
    else stopTimes.push({...candidate,routeValidity:assessment.validity});
  }
  return {stopTimes,blockedTrips,warnings:[...warnings],routeValidity:{status:blockedCount?'partial':'unverified',blockedCount,
    coverage:'provider-reported alerts and documented operator rules; no independent nationwide operator coverage'}};
}
