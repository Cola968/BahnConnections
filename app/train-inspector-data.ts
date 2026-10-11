/** Normalised journey details provided by Transitous; never derived from a guessed route. */
export type TrainStop = {
  name: string;
  arrival?: string;
  departure?: string;
  scheduledArrival?: string;
  scheduledDeparture?: string;
  platform?: string;
  cancelled: boolean;
  realtime: boolean;
};
type RawStop={name?:string;arrival?:string;departure?:string;scheduledArrival?:string;scheduledDeparture?:string;track?:string;cancelled?:boolean};
type RawLeg={mode?:string;realTime?:boolean;cancelled?:boolean;from?:RawStop;to?:RawStop;intermediateStops?:RawStop[]};
const RAIL_MODES=new Set(["HIGHSPEED_RAIL","LONG_DISTANCE","NIGHT_RAIL","REGIONAL_FAST_RAIL","REGIONAL_RAIL","SUBURBAN","SUBWAY","TRAM"]);

export function normaliseTrainStops(legs:RawLeg[]):TrainStop[] {
  const result:TrainStop[]=[];
  for(const leg of legs){
    if(!RAIL_MODES.has(leg.mode??""))continue;
    for(const stop of [leg.from,...leg.intermediateStops??[],leg.to]){
      if(!stop?.name)continue;
      const time=stop.arrival??stop.departure??stop.scheduledArrival??stop.scheduledDeparture;
      const previous=result.at(-1);
      if(previous?.name===stop.name && (previous.arrival??previous.departure??previous.scheduledArrival??previous.scheduledDeparture)===time){
        previous.realtime=previous.realtime&&Boolean(leg.realTime);
        previous.cancelled=previous.cancelled||Boolean(stop.cancelled||leg.cancelled);
        continue;
      }
      result.push({name:stop.name,arrival:stop.arrival,departure:stop.departure,scheduledArrival:stop.scheduledArrival,scheduledDeparture:stop.scheduledDeparture,platform:stop.track,cancelled:Boolean(stop.cancelled||leg.cancelled),realtime:Boolean(leg.realTime)});
    }
  }
  return result.slice(0,150);
}
export function nextTrainStopIndex(stops:TrainStop[],now:number):number {
  return stops.findIndex(stop=>{
    if(stop.cancelled)return false;
    const at=Date.parse(stop.arrival??stop.departure??stop.scheduledArrival??stop.scheduledDeparture??"");
    return Number.isFinite(at)&&at>=now-60_000;
  });
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
  return Number.isFinite(age)&&age>=0&&age<=90_000 ? "current":"old";
}
