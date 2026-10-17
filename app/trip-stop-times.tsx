import {RealtimeTime} from "./realtime-time";

type StopTimes={arrival?:string;departure?:string;scheduledArrival?:string;scheduledDeparture?:string;realtime?:boolean;cancelled?:boolean};

/** Keep both station events; an arrival prediction never implies a departure. */
export function TripStopTimes({stop,fresh}:{stop:StopTimes;fresh:boolean}){
  return <span className="trip-stop-times">
    {([['arrival','scheduledArrival','Ank.'],['departure','scheduledDeparture','Abf.']] as const).map(([actual,scheduled,label])=>
      stop[actual]||stop[scheduled]?<span className="trip-stop-event" key={actual}>
        <small>{label}</small><RealtimeTime scheduled={stop[scheduled]} actual={fresh||!stop.realtime?stop[actual]:undefined}
          realtime={fresh&&stop.realtime} cancelled={stop.cancelled} compact />
      </span>:null)}
  </span>;
}
