import {decodeRouteSegment} from '../../../decode-route-segment';
import {chooseStationMatch} from '../../../../station-match';
import {transitousRequestHeaders} from '../../../../transitous';
import {supplementalNoticeRows} from '../../../../supplemental-notices';

type Place={name?:string;lat?:number;lon?:number;country?:string};
type Location={id?:string;name?:string;type?:string;location?:{latitude?:number;longitude?:number}};
async function json(url:URL,signal:AbortSignal):Promise<unknown>{
 const response=await fetch(url,{signal,headers:transitousRequestHeaders(),cache:'no-store'});
 if(!response.ok)throw new Error(`${url.hostname}: HTTP ${response.status}`);
 return response.json();
}
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const id=decodeRouteSegment((await context.params).id);
 if(!id||id.length>500)return Response.json({stopTimes:[],warnings:['Ungültige Haltestellen-ID']},{status:400});
 const signal=AbortSignal.any([request.signal,AbortSignal.timeout(14_000)]);
 try{
  const stopUrl=new URL('https://api.transitous.org/api/v6/stop');
  stopUrl.searchParams.set('stopId',id);stopUrl.searchParams.set('language','de');
  const stop=await json(stopUrl,signal) as {place?:Place};
  const place=stop?.place;
  if(!place?.name||!Number.isFinite(place.lat)||!Number.isFinite(place.lon))throw new Error('Haltestellenlage fehlt');
  const point={name:place.name,lat:place.lat!,lon:place.lon!};
  // Regional VBB coverage; never send a foreign station to a German stop lookup.
  const vbb=point.lat>=51.3&&point.lat<=53.6&&point.lon>=11.2&&point.lon<=14.8;
  const germany=point.lat>=47.2&&point.lat<=55.2&&point.lon>=5.8&&point.lon<=15.3;
  if((place.country&&place.country!=='DE')||!germany)return Response.json({stopTimes:[],warnings:[],source:'Transitous (keine ergänzende regionale Quelle)',supported:false},{headers:{'Cache-Control':'no-store'}});
  let origin='https://v6.db.transport.rest';
  let match:(Location&{lat:number;lon:number})|null=null;
  for(const candidateOrigin of vbb?['https://v6.vbb.transport.rest',origin]:[origin]){
   try{
    const locationsUrl=new URL('/locations',candidateOrigin);
    locationsUrl.search=new URLSearchParams({query:point.name,results:'10',stops:'true',addresses:'false',poi:'false',language:'de'}).toString();
    const raw=await json(locationsUrl,AbortSignal.any([signal,AbortSignal.timeout(4500)]));
    const candidates=(Array.isArray(raw)?raw:[]).filter((item):item is Location=>Boolean(item&&typeof item==='object'&&item.type==='stop'&&typeof item.id==='string'&&typeof item.name==='string'&&Number.isFinite(item.location?.latitude)&&Number.isFinite(item.location?.longitude)))
     .map(item=>({...item,lat:item.location!.latitude!,lon:item.location!.longitude!}));
    match=chooseStationMatch(point,candidates);
    if(match){origin=candidateOrigin;break;}
   }catch{if(signal.aborted)throw new Error('Quellenabfrage abgebrochen');}
  }
  const source=origin.includes('.vbb.')?'VBB transport.rest':'DB transport.rest';
  if(!match?.id)throw new Error('Keine eindeutige Haltestelle in der ergänzenden Quelle');
  const kinds=['departure','arrival'] as const;
  const results=await Promise.allSettled(kinds.map(async kind=>{
   const url=new URL(`/stops/${encodeURIComponent(match.id!)}/${kind==='arrival'?'arrivals':'departures'}`,origin);
   url.search=new URLSearchParams({duration:'120',results:'175',remarks:'true',language:'de',bus:'false',ferry:'false',taxi:'false',includeRelatedStations:'false'}).toString();
   const payload=await json(url,signal) as Record<string,unknown>;
   const rows=Array.isArray(payload)?payload:payload?.[kind==='arrival'?'arrivals':'departures'];
   if(!Array.isArray(rows))throw new Error('Ungültige Hinweisantwort');
   return supplementalNoticeRows(rows,kind);
  }));
  const available=results.filter((result):result is PromiseFulfilledResult<ReturnType<typeof supplementalNoticeRows>>=>result.status==='fulfilled');
  if(!available.length)throw new Error(`${source} nicht erreichbar`);
  return Response.json({stopTimes:available.flatMap(result=>result.value),source,updatedAt:new Date().toISOString(),warnings:available.length<2?[`${source}: Ankunfts- oder Abfahrtshinweise fehlen.`]:[]},{headers:{'Cache-Control':'no-store'}});
 }catch{
  return Response.json({stopTimes:[],warnings:['Ergänzende regionale Störungsquelle nicht erreichbar. Die Ansicht kann unvollständig sein.']},{status:502,headers:{'Cache-Control':'no-store'}});
 }
}
