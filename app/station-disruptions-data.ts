import {transitAlerts,transitAlertContent,type TransitAlert} from './transit-alerts.ts';
export type RailNotice={key:string;kind:"construction"|"cancellation"|"incident";headline:string;lines:string[];detail:string;plannedTime?:string;direction?:string;journey?:string};
export type RailNoticeFilter="all"|"construction"|"cancellation"|"incident";

/** Counts are calculated on deduplicated notice records, before user filtering. */
export function noticeCategoryCounts(items:readonly RailNotice[]):Record<RailNoticeFilter,number>{
 const counts={all:items.length,construction:0,cancellation:0,incident:0};
 for(const item of items)counts[item.kind]+=1;
 return counts;
}
function searchKey(text:string){
 return text.normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("de-DE").replace(/\s+/g," ").trim();
}
export type RailNoticeSort="recommended"|"time"|"line";
/** Station-wide notices have no attributed rail line and must not inflate affected-line filters. */
export function affectedNoticeLines(items:readonly RailNotice[]):string[]{
 return [...new Set(items.flatMap(item=>item.lines).map(line=>line.trim()).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"de",{numeric:true}));
}

/** Searches alerts, route names and all grouped rail lines, never just a headline. */
export function filterStationNotices(items:readonly RailNotice[],filter:RailNoticeFilter,query:string,line="all",sort:RailNoticeSort="recommended"):RailNotice[]{
 const term=searchKey(query.slice(0,100));
 const filtered=items.filter(item=>(filter==="all"||item.kind===filter)
   &&(line==="all"||item.lines.includes(line))
   &&(!term||searchKey([
    item.headline,item.detail,item.lines.join(" "),item.direction??"",item.journey??""
   ].join(" ")).includes(term)));
 if(sort==="time")return [...filtered].sort((a,b)=>{
  const ta=Date.parse(a.plannedTime??"");
  const tb=Date.parse(b.plannedTime??"");
  return (Number.isFinite(ta)?ta:Number.POSITIVE_INFINITY)-(Number.isFinite(tb)?tb:Number.POSITIVE_INFINITY);
 });
 if(sort==="line")return [...filtered].sort((a,b)=>
  (a.lines[0]??"ZZZZ").localeCompare(b.lines[0]??"ZZZZ","de",{numeric:true}));
 return filtered;
}

type Alert=TransitAlert;
export type NoticeStopTime={stationNotice?:boolean;tripId?:string;displayName?:string;routeShortName?:string;headsign?:string;tripFrom?:{name?:string};tripTo?:{name?:string};place?:{departure?:string;arrival?:string;scheduledDeparture?:string;scheduledArrival?:string;cancelled?:boolean;alerts?:Alert[]};cancelled?:boolean;tripCancelled?:boolean;alerts?:Alert[]};
type NoticeFeed={stopTimes:NoticeStopTime[];warnings:string[]};
/** Preserve usable disruption reports when arrivals or departures cannot be loaded. */
export function combineStationNoticeFeeds(results:readonly PromiseSettledResult<NoticeFeed>[]) {
 const fulfilled=results.filter((result):result is PromiseFulfilledResult<NoticeFeed>=>result.status==="fulfilled");
 const entries=fulfilled.flatMap(result=>result.value.stopTimes);
 const warnings=fulfilled.flatMap(result=>result.value.warnings)
   .filter((warning):warning is string=>typeof warning==="string").slice(0,3);
 return {entries,warnings,successful:fulfilled.length,partial:fulfilled.length<results.length};
}
function clean(v:unknown,max=360){return typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,max):"";}
function kindFor(title:string,detail:string):RailNotice["kind"]{const s=(title+" "+detail).toLocaleLowerCase("de");return /ausfall|fällt aus|entfällt|entfallen|abgesagt|cancel|no service/.test(s)?"cancellation":/bauarbeit|baustell|bauphase|gleisbau|instandhaltungsarbeit|bauzeit|baubedingt|engineering work|construction/.test(s)?"construction":/ersatzverkehr|replacement service/.test(s)?"cancellation":"incident";}
function isDisruption(alert:Alert,headline:string,detail:string){
 const text=(headline+' '+detail).toLocaleLowerCase('de');
 if(alert.effect==='NO_EFFECT'||alert.effect===7)return false;
 if(/^(?:keine (?:aktuellen )?störungen|störungsfrei|no (?:current )?disruptions)/.test(text))return false;
 return /störung|ausfall|fällt aus|entfällt|entfallen|abgesagt|ersatzverkehr|bauarbeit|baustell|bauphase|gleisbau|instandhaltung|bauzeit|baubedingt|verspät|verzöger|unterbroch|sperrung|gesperrt|umleitung|umgeleitet|gleiswechsel|gleisänder|abweich|einschränk|beeinträcht|verlängert|disrupt|cancel|suspend|closure|closed|delay|divert|engineering work|construction/.test(text)
  ||['NO_SERVICE','REDUCED_SERVICE','SIGNIFICANT_DELAYS','DETOUR','STOP_MOVED','MODIFIED_SERVICE','ACCESSIBILITY_ISSUE','OTHER_EFFECT'].includes(String(alert.effect))
  ||[1,2,3,4,6,9,11].includes(Number(alert.effect));
}
export function extractStationNotices(entries:NoticeStopTime[],limit=Number.POSITIVE_INFINITY):RailNotice[]{
 const unique=new Map<string,RailNotice>();
 for(const item of entries){
  if(!item||typeof item!=="object")continue;
  const full=clean(item.displayName)||clean(item.routeShortName)||"Fahrt";
  const line=full.replace(/\s*\([^)]*\)\s*$/,"").slice(0,32);
  const when=item.place?.departure??item.place?.arrival??item.place?.scheduledDeparture??item.place?.scheduledArrival;
  const direction=clean(item.headsign)||clean(item.tripTo?.name);
  const origin=clean(item.tripFrom?.name);
  const to=clean(item.tripTo?.name);
  const journey=origin&&to&&origin!==to?origin+" → "+to:undefined;
  const alerts=transitAlerts(item.alerts,item.place?.alerts);
  for(const alert of alerts){
   if(!alert||typeof alert!=="object")continue;
   const {header,detail}=transitAlertContent(alert);
   if(!header&&!detail)continue;
   if(!isDisruption(alert,header,detail))continue;
   const headline=header||detail;
   const key=(headline+"|"+detail).toLocaleLowerCase("de");
   const saved=unique.get(key);
   if(saved){
    if(!item.stationNotice&&!saved.lines.includes(line))saved.lines.push(line);
    // Shared alerts must not attribute the first train's journey to other lines.
    if(saved.direction!==direction)delete saved.direction;
    if(saved.journey!==journey)delete saved.journey;
    if(saved.plannedTime!==when)delete saved.plannedTime;
    continue;
   }
   unique.set(key,{key,kind:kindFor(headline,detail),headline,detail:header?detail:"",lines:item.stationNotice?[]:[line],direction,journey,plannedTime:when});
  }
  if(item.tripCancelled||item.cancelled||item.place?.cancelled){
   const key="cancellation|"+(item.tripId??(full+"|"+(when??"")));
   if(!unique.has(key))unique.set(key,{key,kind:"cancellation",headline:item.place?.cancelled&&!item.tripCancelled&&!item.cancelled?"Halt entfällt":"Zug fällt aus",detail:"",lines:[line],direction,journey,plannedTime:when});
  }
 }
 const priority={construction:0,cancellation:1,incident:2};
 return [...unique.values()].sort((a,b)=>priority[a.kind]-priority[b.kind]||(Date.parse(a.plannedTime??"")||0)-(Date.parse(b.plannedTime??"")||0)).slice(0,limit);
}
