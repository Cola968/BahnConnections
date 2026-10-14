/** Normalised journey details provided by Transitous; never derived from a guessed route. */
export type TrainStop = {
  name: string;
  lat?:number;
  lon?:number;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  platform?: string;
  cancelled: boolean;
  realtime: boolean;
};
type RawStop={name?:string;lat?:number;lon?:number;arrival?:string;departure?:string;scheduledArrival?:string;scheduledDeparture?:string;track?:string;cancelled?:boolean};
type RawLeg={mode?:string;realTime?:boolean;cancelled?:boolean;from?:RawStop;to?:RawStop;intermediateStops?:RawStop[]};
const RAIL_MODES=new Set(["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL","REGIONAL_FAST_RAIL","REGIONAL_RAIL","SUBURBAN","SUBWAY","TRAM"]);
const validatedTime=(value?:string):string|undefined=>typeof value==="string"&&Number.isFinite(Date.parse(value))?value:undefined;

export function normaliseTrainStops(legs:RawLeg[]):TrainStop[] {
  const result:TrainStop[]=[];
  for(const leg of legs){
    if(!leg || typeof leg!=="object")continue;
    if(!RAIL_MODES.has(leg.mode??""))continue;
    for(const [index,raw] of [leg.from,...(Array.isArray(leg.intermediateStops)?leg.intermediateStops:[]),leg.to].entries()){
      // Invalid realtime strings must never hide valid scheduled times or
      // flow into RealtimeTime, share exports or countdowns.
      const stop=raw?{...raw,arrival:validatedTime(raw.arrival),departure:validatedTime(raw.departure),
        scheduledArrival:validatedTime(raw.scheduledArrival),scheduledDeparture:validatedTime(raw.scheduledDeparture)}:undefined;
      if(typeof stop?.name!=="string" || !stop.name)continue;
      const time=stop.arrival??stop.departure??stop.scheduledArrival??stop.scheduledDeparture;
      const previous=result.at(-1);
      if(previous?.name===stop.name && (index===0 || (previous.arrival??previous.departure??previous.scheduledArrival??previous.scheduledDeparture)===time)){
        previous.arrival??=stop.arrival;
        previous.departure=stop.departure??previous.departure;
        previous.scheduledArrival??=stop.scheduledArrival;
        previous.scheduledDeparture=stop.scheduledDeparture??previous.scheduledDeparture;
        previous.platform=stop.track??previous.platform;
        previous.realtime=previous.realtime&&Boolean(leg.realTime);
        previous.cancelled=previous.cancelled||Boolean(stop.cancelled||leg.cancelled);
        continue;
      }
      result.push({name:stop.name,lat:stop.lat,lon:stop.lon,arrival:stop.arrival,departure:stop.departure,scheduledArrival:stop.scheduledArrival,scheduledDeparture:stop.scheduledDeparture,platform:stop.track,cancelled:Boolean(stop.cancelled||leg.cancelled),realtime:Boolean(leg.realTime)});
    }
  }
  return result;
}
const stopTime=(value?:string):number|null=>{
  const time=Date.parse(value??"");
  return Number.isFinite(time)?time:null;
};
/** A stop remains relevant until departure. Arrival alone must not skip a train
 * that is scheduled to be standing at the platform. */
export function nextTrainStopIndex(stops:TrainStop[],now:number):number {
  if(!Number.isFinite(now))return -1;
  return stops.findIndex(stop=>{
    if(stop.cancelled)return false;
    const arrival=stopTime(stop.arrival)??stopTime(stop.scheduledArrival);
    const departure=stopTime(stop.departure)??stopTime(stop.scheduledDeparture);
    const end=departure!==null&&(arrival===null||departure>=arrival)?departure:arrival;
    return end!==null&&end>=now-60_000;
  });
}
/** Keep the full route accessible while letting passengers hide already passed stops.
 * Never infer which stops have passed from an expired timetable snapshot. */
export function relevantTrainStops(stops:TrainStop[],now:number,onlyRemaining:boolean,fresh:boolean):{stops:TrainStop[];hidden:number}{
  if(!onlyRemaining||!fresh)return {stops,hidden:0};
  const index=nextTrainStopIndex(stops,now);
  return index>0?{stops:stops.slice(index),hidden:index}:{stops,hidden:0};
}

/** A timetable-based phase, not proof of a measured train position or door status. */
export function trainStopPhase(stop:TrainStop,now:number):"approaching"|"at-stop"|"departed"|"unknown" {
  if(stop.cancelled||!Number.isFinite(now))return "unknown";
  const arrival=stopTime(stop.arrival)??stopTime(stop.scheduledArrival);
  const departure=stopTime(stop.departure)??stopTime(stop.scheduledDeparture);
  if(arrival!==null&&departure!==null&&departure>=arrival){
    if(now<arrival)return "approaching";
    return now<=departure?"at-stop":"departed";
  }
  // If the provider sends an impossible departure-before-arrival order, use
  // the arrival as the fallback rather than claiming the train has departed.
  const at=arrival!==null&&departure!==null&&departure<arrival?arrival:departure??arrival;
  return at===null?"unknown":now<=at?"approaching":"departed";
}
export function headingDegrees(before:[number,number]|null,after:[number,number]|null):number|null{
  if(!before||!after)return null;
  if(![...before,...after].every(Number.isFinite))return null;
  const east=(after[1]-before[1])*Math.cos((after[0]+before[0])*Math.PI/360);
  const north=after[0]-before[0];
  if(Math.abs(east)+Math.abs(north)<1e-8)return null;
  return (Math.atan2(east,north)*180/Math.PI+360)%360;
}
export function cardinalDirection(degrees:number|null):string {
  if(degrees===null||!Number.isFinite(degrees))return "Unbekannt";
  return ["N","NO","O","SO","S","SW","W","NW"][Math.round(degrees/45)%8];
}
export function sourceFreshness(updatedAt:Date|null,now:number,inRadar:boolean):"current"|"old"|"missing" {
  if(!inRadar||!updatedAt)return "missing";
  const age=now-updatedAt.getTime();
  return Number.isFinite(age)&&age>=-10_000&&age<=90_000 ? "current":"old";
}
