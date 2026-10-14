import type { Station } from './network-data';
import { requireTransitousStopId } from './transitous.ts';

export type StationRadarDirection = 'all' | 'inbound' | 'outbound';
export type StationCall = { arrival?: number; departure?: number };
type Row = { tripId?: unknown; cancelled?: boolean; tripCancelled?: boolean; place?: { cancelled?: boolean; arrival?: string; departure?: string; scheduledArrival?: string; scheduledDeparture?: string } };
const timestamp = (value?: string) => { const n=Date.parse(value??''); return Number.isFinite(n)?n:undefined; };

/** Membership comes from the selected stop's timetable, never map proximity or a line name. */
export function stationCalls(arrivals: Row[], departures: Row[]): Map<string,StationCall> {
  const calls=new Map<string,StationCall>();
  for(const [rows,kind] of [[arrivals,'arrival'],[departures,'departure']] as const){
    for(const row of rows){
      if(!row || typeof row.tripId!=='string' || !row.tripId || row.tripId.length>500 || row.cancelled || row.tripCancelled || !row.place || row.place.cancelled)continue;
      const at=timestamp(row.place[kind])??timestamp(kind==='arrival'?row.place.scheduledArrival:row.place.scheduledDeparture);
      if(at===undefined)continue;
      const call=calls.get(row.tripId)??{};
      call[kind]=at;calls.set(row.tripId,call);
    }
  }
  return calls;
}

export function matchesStationCall(call:StationCall|undefined,direction:StationRadarDirection,now=Date.now()):boolean{
  if(!call)return false;
  if(direction==='all')return true;
  // Once the station has been served, the vehicle is outbound. A future call is inbound.
  // At the platform it belongs to both directions; terminal origins have no arrival.
  if(call.arrival!==undefined && call.departure!==undefined && call.arrival<=now+60_000 && call.departure>=now-60_000)return true;
  if(direction==='inbound')return call.arrival!==undefined && call.arrival>=now-60_000;
  return call.departure!==undefined && call.departure<=now+60_000;
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
    const query=new URLSearchParams({kind,time,n:'5000',verify:'0'});
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
