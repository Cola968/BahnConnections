import type { Station } from './network-data';
import { requireTransitousStopId } from './transitous.ts';

export type StationRadarDirection = 'all' | 'inbound' | 'outbound';
export type StationCall = {arrival?:number;departure?:number;scheduledArrival?:number;scheduledDeparture?:number;arrivalRealtime?:boolean;departureRealtime?:boolean;name?:string;destination?:string;arrivalTrack?:string;arrivalScheduledTrack?:string;departureTrack?:string;departureScheduledTrack?:string;cancelled?:boolean;realtime?:boolean};
type Row = {tripId?:unknown;cancelled?:boolean;tripCancelled?:boolean;realTime?:boolean;displayName?:string;routeShortName?:string;headsign?:string;tripTo?:{name?:string};place?:{cancelled?:boolean;arrival?:string;departure?:string;scheduledArrival?:string;scheduledDeparture?:string;track?:string;scheduledTrack?:string}};
const safeLabel=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim().slice(0,120):undefined;
const safeTrack=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim().slice(0,24):undefined;
const timestamp = (value?: string) => { const n=Date.parse(value??''); return Number.isFinite(n)?n:undefined; };

/** Membership comes from the selected stop's timetable, never map proximity or a line name. */
export function stationCalls(arrivals: Row[], departures: Row[]): Map<string,StationCall> {
  const calls=new Map<string,StationCall>();
  for(const [rows,kind] of [[arrivals,'arrival'],[departures,'departure']] as const){
    for(const row of rows){
      if(!row || typeof row.tripId!=='string' || !row.tripId || row.tripId.length>500 || !row.place)continue;
      const predicted=timestamp(row.place[kind]);
      const scheduled=timestamp(kind==='arrival'?row.place.scheduledArrival:row.place.scheduledDeparture);
      // Provider fields can contain a prediction even when realTime is false.
      // Never prefer that value over a known timetable unless it is confirmed.
      const actual=row.realTime===true?predicted:undefined;
      const at=actual??scheduled??predicted;
      if(at===undefined)continue;
      const call=calls.get(row.tripId)??{};
      call[kind]=at;
      if(kind==='arrival'){
        call.scheduledArrival=scheduled??call.scheduledArrival;
        call.arrivalRealtime=Boolean(row.realTime===true&&actual!==undefined);
        call.arrivalScheduledTrack=safeTrack(row.place.scheduledTrack)??call.arrivalScheduledTrack;
        call.arrivalTrack=safeTrack(row.place.track)??call.arrivalTrack;
      }else{
        call.scheduledDeparture=scheduled??call.scheduledDeparture;
        call.departureRealtime=Boolean(row.realTime===true&&actual!==undefined);
        call.departureScheduledTrack=safeTrack(row.place.scheduledTrack)??call.departureScheduledTrack;
        call.departureTrack=safeTrack(row.place.track)??call.departureTrack;
      }
      call.name??=safeLabel(row.displayName)??safeLabel(row.routeShortName);
      call.destination??=safeLabel(row.headsign)??safeLabel(row.tripTo?.name);
      call.cancelled=Boolean(call.cancelled||row.cancelled||row.tripCancelled||row.place.cancelled);
      call.realtime=Boolean(call.realtime||(row.realTime===true&&actual!==undefined));
      calls.set(row.tripId,call);
    }
  }
  return calls;
}

export function matchesStationCall(call:StationCall|undefined,direction:StationRadarDirection,now=Date.now()):boolean{
  if(!call||call.cancelled)return false;
  if(direction==='all')return true;
  // Once the station has been served, the vehicle is outbound. A future call is inbound.
  // At the platform it belongs to both directions; terminal origins have no arrival.
  if(call.arrival!==undefined && call.departure!==undefined && call.arrival<=now+60_000 && call.departure>=now-60_000)return true;
  if(direction==='inbound')return call.arrival!==undefined && call.arrival>=now-60_000;
  return call.departure!==undefined && call.departure<=now+60_000;
}

/** Every timetable call is browsable, whether or not map geometry is available. */
export function listStationCalls(calls:Map<string,StationCall>,direction:StationRadarDirection,query=''){
  const needle=query.trim().toLocaleLowerCase('de');
  const at=(call:StationCall)=>direction==='inbound'?call.arrival??Infinity:direction==='outbound'?call.departure??Infinity:Math.min(call.arrival??Infinity,call.departure??Infinity);
  return [...calls.entries()].filter(([id,call])=>
    (direction==='all'||(direction==='inbound'?call.arrival!==undefined:call.departure!==undefined))
    &&(!needle||[id,call.name,call.destination].some(value=>value?.toLocaleLowerCase('de').includes(needle))))
    .sort(([idA,a],[idB,b])=>at(a)-at(b)||idA.localeCompare(idB,'de'))
    .map(([tripId,call])=>({tripId,call}));
}

/** Both sources are attempted independently: one failed direction must not hide
 * every valid railway call for the entire station. A partial result is labelled. */
export function combineStationCallResults(
 arrivals:PromiseSettledResult<Row[]>,departures:PromiseSettledResult<Row[]>
):{calls:Map<string,StationCall>;coverage:'complete'|'partial'}{
 if(arrivals.status==='rejected'&&departures.status==='rejected')throw new Error("Bahnhofshalte nicht erreichbar");
 return {
   calls:stationCalls(arrivals.status==='fulfilled'?arrivals.value:[],departures.status==='fulfilled'?departures.value:[]),
   coverage:arrivals.status==='fulfilled'&&departures.status==='fulfilled'?'complete':'partial',
 };
}

export async function fetchStationCallSnapshot(station:Station,signal:AbortSignal){
  const id=await requireTransitousStopId(station,signal);
  const time=new Date(Date.now()-45*60_000).toISOString();
  const fetchBoard=async(kind:'arrival'|'departure')=>{
    // An eight-hour horizon is meaningful to passengers; 5000 events per
    // direction every 45 seconds overloaded busy stations and the provider.
    // MOTIS 'window' guarantees horizon coverage while n is only a minimum.
    const query=new URLSearchParams({kind,time,n:'80',window:'32400',verify:'0'});
    const response=await fetch(`/api/stations/${encodeURIComponent(id)}/board?${query}`,{signal:AbortSignal.any([signal,AbortSignal.timeout(20_000)]),cache:'no-store'});
    if(!response.ok)throw Error('Bahnhofshalte nicht erreichbar');
    const data=await response.json() as {stopTimes?:unknown};
    if(!Array.isArray(data.stopTimes))throw Error('Ungültige Bahnhofshalte');
    return data.stopTimes as Row[];
  };
  const [arrivals,departures]=await Promise.allSettled([fetchBoard('arrival'),fetchBoard('departure')]);
  signal.throwIfAborted();
  return combineStationCallResults(arrivals,departures);
}
export async function fetchStationCalls(station:Station,signal:AbortSignal):Promise<Map<string,StationCall>>{
  return (await fetchStationCallSnapshot(station,signal)).calls;
}
