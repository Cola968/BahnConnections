export type RailNotice={key:string;kind:"construction"|"cancellation"|"incident";headline:string;lines:string[];detail:string;plannedTime?:string;direction?:string;journey?:string};
type Alert={header?:string;headerText?:{translation?:{text?:string}[]};descriptionText?:{translation?:{text?:string}[]}};
export type NoticeStopTime={tripId?:string;displayName?:string;routeShortName?:string;headsign?:string;tripFrom?:{name?:string};tripTo?:{name?:string};place?:{departure?:string;arrival?:string;scheduledDeparture?:string;scheduledArrival?:string;cancelled?:boolean};cancelled?:boolean;tripCancelled?:boolean;alerts?:Alert[]};
function clean(v:unknown){return typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,360):"";}
function alertText(alert:Alert){const header=clean(alert.header)||clean(alert.headerText?.translation?.find(i=>clean(i.text))?.text);const detail=clean(alert.descriptionText?.translation?.find(i=>clean(i.text))?.text);return {header,detail};}
function kindFor(title:string,detail:string):RailNotice["kind"]{const s=(title+" "+detail).toLocaleLowerCase("de");return /bauarbeit|baustell|bauphase|gleisbau|instandhaltungsarbeit|bauzeit|baubedingt/.test(s)?"construction":/ausfall|entfällt|ersatzverkehr|abgesagt/.test(s)?"cancellation":"incident";}
export function extractStationNotices(entries:NoticeStopTime[],limit=35):RailNotice[]{
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
  const alerts=Array.isArray(item.alerts)?item.alerts:[];
  for(const alert of alerts){
   if(!alert||typeof alert!=="object")continue;
   const {header,detail}=alertText(alert);
   if(!header&&!detail)continue;
   const headline=header||detail;
   const key=(headline+"|"+detail).toLocaleLowerCase("de");
   const saved=unique.get(key);
   if(saved){if(!saved.lines.includes(line)&&saved.lines.length<9)saved.lines.push(line);continue;}
   unique.set(key,{key,kind:kindFor(headline,detail),headline,detail:header?detail:"",lines:[line],direction,journey,plannedTime:when});
  }
  if(item.tripCancelled||item.cancelled||item.place?.cancelled){
   const key="cancellation|"+(item.tripId??(full+"|"+(when??"")));
   if(!unique.has(key))unique.set(key,{key,kind:"cancellation",headline:item.place?.cancelled&&!item.tripCancelled&&!item.cancelled?"Halt entfällt":"Zug fällt aus",detail:"",lines:[line],direction,journey,plannedTime:when});
  }
 }
 const priority={construction:0,cancellation:1,incident:2};
 return [...unique.values()].sort((a,b)=>priority[a.kind]-priority[b.kind]||(Date.parse(a.plannedTime??"")||0)-(Date.parse(b.plannedTime??"")||0)).slice(0,limit);
}
