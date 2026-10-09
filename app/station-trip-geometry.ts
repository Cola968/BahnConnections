import { decodePolyline } from './live-trains.ts';
import { splitRailGeometry, type RailPoint } from './rail-geometry.ts';
import { trimRepeatedStationLoop } from './trip-trimming.ts';
import type { BoardMapTrip } from './live-board';

export type StationTripInput = {
  tripId:string; name:string; category:BoardMapTrip['category']; realtime:boolean;
  color?:string; textColor?:string; time?:string;
  station:{name:string; lat:number; lon:number};
  legs:{realTime?:boolean; routeColor?:string; routeTextColor?:string;
    from?:BoardMapTrip['stops'][number]; to?:BoardMapTrip['stops'][number];
    intermediateStops?:BoardMapTrip['stops']; legGeometry?:{points?:string; precision?:number}}[];
};

/** Simplify each already validated segment to a five-metre corridor. Never bridge gaps. */
export function simplifyPreview(points:RailPoint[], toleranceMetres=5):RailPoint[] {
  if(points.length<3) return points;
  // Equatorial scale is an upper bound at every latitude: error stays below 5 m.
  const longitudeScale=111_320;
  const keep=new Uint8Array(points.length);keep[0]=keep[points.length-1]=1;
  const stack=[0,points.length-1];
  while(stack.length) {
    const end=stack.pop()!,start=stack.pop()!,a=points[start],b=points[end];
    const dx=(b[1]-a[1])*longitudeScale,dy=(b[0]-a[0])*111_320,length=dx*dx+dy*dy;
    let furthest=-1,maxDistance=toleranceMetres*toleranceMetres;
    for(let i=start+1;i<end;i++) {
      const x=(points[i][1]-a[1])*longitudeScale,y=(points[i][0]-a[0])*111_320;
      const t=length?Math.max(0,Math.min(1,(x*dx+y*dy)/length)):0;
      const distance=(x-t*dx)**2+(y-t*dy)**2;
      if(distance>maxDistance){maxDistance=distance;furthest=i;}
    }
    if(furthest>=0){keep[furthest]=1;stack.push(start,furthest,furthest,end);}
  }
  return points.filter((_,i)=>keep[i]);
}

export function prepareStationTrip(input:StationTripInput):BoardMapTrip {
  const stops:BoardMapTrip['stops']=[],segments:RailPoint[][]=[];
  for(const leg of input.legs) {
    if(leg.legGeometry?.points) {
      const points=decodePolyline(leg.legGeometry.points,leg.legGeometry.precision??6);
      if(points.length>1)segments.push(points);
    }
    for(const stop of [leg.from,...(leg.intermediateStops??[]),leg.to]) {
      if(!stop?.name)continue;
      const previous=stops.at(-1);
      if(previous?.name===stop.name&&(previous.departure??previous.arrival)===(stop.departure??stop.arrival))continue;
      stops.push(stop);
    }
  }
  const selected=trimRepeatedStationLoop(stops,segments.flat(),input.station,input.time);
  // If a loop was trimmed, never fall back to the full, untrimmed loop.
  const selectedPoints=new Set(selected.points);
  const exact=selected.trimmed?segments.map(segment=>segment.filter(point=>selectedPoints.has(point))).filter(segment=>segment.length>1):segments;
  const valid=exact.flatMap(segment=>splitRailGeometry(segment));
  return {tripId:input.tripId,name:input.name,category:input.category,
    realtime:input.realtime||input.legs.some(leg=>leg.realTime),
    color:input.color??input.legs.find(leg=>leg.routeColor)?.routeColor,
    textColor:input.textColor??input.legs.find(leg=>leg.routeTextColor)?.routeTextColor,
    points:selected.points,segments:valid,previewSegments:valid.map(segment=>simplifyPreview(segment)),stops:selected.stops};
}
