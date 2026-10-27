import {assessRawTransitTrip,type RawTripEvidenceLeg} from '../../journey-validity';
import {transitousRequestHeaders} from '../../transitous';

type Segment={trips?:{tripId?:string;displayName?:string}[];from?:{name?:string};to?:{name?:string};departure?:string;arrival?:string;mode?:string};
/** Radar has the same trip gate as details. Missing/failed trip evidence never produces a model position. */
export async function GET(request:Request){
  const query=new URL(request.url).searchParams;
  const lat=Number(query.get('lat')),lon=Number(query.get('lon'));
  const headers={'Cache-Control':'no-store'};
  if(!query.has('lat')||!query.has('lon')||!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>89.9||Math.abs(lon)>179.9)
    return Response.json({segments:[],warnings:['Ungültiger Kartenausschnitt']},{status:400,headers});
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(12_000)]);
  const now=Date.now(),url=new URL('https://api.transitous.org/api/v6/map/trips');
  url.search=new URLSearchParams({zoom:'11',min:`${(lat-.04).toFixed(4)},${(lon-.06).toFixed(4)}`,max:`${(lat+.04).toFixed(4)},${(lon+.06).toFixed(4)}`,
    startTime:new Date(now-45_000).toISOString(),endTime:new Date(now+45_000).toISOString(),precision:'4',language:'de'}).toString();
  try{
    const response=await fetch(url,{signal,headers:transitousRequestHeaders(),cache:'no-store'});
    if(!response.ok)throw new Error('Kartenquelle nicht erreichbar');
    const raw:unknown=await response.json();
    if(!Array.isArray(raw))throw new Error('Ungültige Kartenantwort');
    const candidates=(raw as Segment[]).filter(s=>s&&typeof s==='object'&&s.trips?.[0]?.tripId);
    const ids=[...new Set(candidates.map(s=>s.trips![0].tripId!))].slice(0,180);
    const confirmed=new Map<string,RawTripEvidenceLeg[]>();
    let cursor=0;
    await Promise.all(Array.from({length:Math.min(6,ids.length)},async()=>{
      while(cursor<ids.length&&!signal.aborted){
        const id=ids[cursor++];
        try{
          const tripUrl=new URL('https://api.transitous.org/api/v6/trip');
          tripUrl.search=new URLSearchParams({tripId:id,withAlerts:'true',withScheduledSkippedStops:'true',detailedLegs:'true',language:'de'}).toString();
          const result=await fetch(tripUrl,{signal,headers:transitousRequestHeaders(),cache:'no-store'});
          if(!result.ok)continue;
          const trip=await result.json() as {legs?:RawTripEvidenceLeg[]};
          if(!Array.isArray(trip.legs)||!trip.legs.length||trip.legs.some(leg=>!leg.from||!leg.to||!leg.startTime||!leg.endTime))continue;
          if(!assessRawTransitTrip(trip.legs).conflict)confirmed.set(id,trip.legs);
        }catch{/* A failed or cancelled validation hides this candidate. */}
      }
    }));
    const segments=candidates.filter(segment=>{
      const legs=confirmed.get(segment.trips![0].tripId!);if(!legs)return false;
      // Do not draw a stale map segment whose endpoints no longer occur in this direction.
      return legs.some(leg=>{
        if(leg.mode!==segment.mode)return false;
        const stops=[leg.from,...(leg.intermediateStops??[]),leg.to];
        const from=stops.findIndex(stop=>stop?.name===segment.from?.name);
        const to=stops.findIndex((stop,index)=>index>from&&stop?.name===segment.to?.name);
        return from>=0&&to>from&&Number.isFinite(Date.parse(segment.departure??''))&&Number.isFinite(Date.parse(segment.arrival??''))
          &&Date.parse(segment.departure!)>=Date.parse(leg.startTime!)&&Date.parse(segment.arrival!)<=Date.parse(leg.endTime!);
      });
    }).map(segment=>({...segment,trips:[segment.trips![0]]}));
    return Response.json({segments,warnings:segments.length<candidates.length?['Fahrten ohne aktuell prüfbaren Verlauf wurden ausgeblendet.']:[],
      routeValidity:{status:'unverified',checkedTrips:confirmed.size,omittedSegments:candidates.length-segments.length}}, {headers});
  }catch{
    return Response.json({segments:[],warnings:['Radar-Fahrtverläufe derzeit nicht prüfbar.']},{status:502,headers});
  }
}
