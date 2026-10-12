export type RailNotice={key:string;kind:"construction"|"cancellation"|"incident";headline:string;lines:string[];detail:string;plannedTime?:string};
type Alert={header?:string;headerText?:{translation?:{text?:string}[]};descriptionText?:{translation?:{text?:string}[]}};
export type NoticeStopTime={tripId?:string;displayName?:string;routeShortName?:string;headsign?:string;place?:{departure?:string;arrival?:string;scheduledDeparture?:string;scheduledArrival?:string;cancelled?:boolean};cancelled?:boolean;tripCancelled?:boolean;alerts?:Alert[]};
function asText(v:unknown){return typeof v==="string"?v.trim().replace(/\s+/g," ").slice(0,450):"";}
function alertText(alert:Alert){const title=asText(alert.header)||asText(alert.headerText?.translation?.find(item=>asText(item.text))?.text);const detail=asText(alert.descriptionText?.translation?.find(item=>asText(item.text))?.text);return {title,detail};}
function kindFor(title:string,detail:string):RailNotice["kind"] {const input=(title+" "+detail).toLocaleLowerCase("de");return /bauarbeit|baustell|bauphase|gleisbau|sperrung wegen bau|instandhaltungsarbeit/.test(input)?"construction":/ausfall|entfällt|ersatzverkehr|abgesagt/.test(input)?"cancellation":"incident";}
export function extractStationNotices(entries:NoticeStopTime[],limit=35):RailNotice[]{
 const unique=new Map<string,RailNotice>();
 for(const item of entries){
  if(!item||typeof item!=="object")continue;
  const line=asText(item.displayName)||asText(item.routeShortName)||"Fahrt";
  const when=item.place?.departure??item.place?.arrival??item.place?.scheduledDeparture??item.place?.scheduledArrival;
  const alerts=Array.isArray(item.alerts)?item.alerts:[];
  for(const a of alerts){
    if(!a||typeof a!=="object")continue;
    const {title,detail}=alertText(a);
    if(!title&&!detail)continue;
    const headline=title||detail;
    const key=(headline+"|"+detail).toLocaleLowerCase("de");
    const current=unique.get(key);
    if(current){if(!current.lines.includes(line)&&current.lines.length<7)current.lines.push(line);continue;}
    unique.set(key,{key,kind:kindFor(headline,detail),headline,detail:title?detail:"",lines:[line],plannedTime:when});
  }
  if(item.tripCancelled||item.cancelled||item.place?.cancelled){
    const key="cancellation|"+(item.tripId??(line+"|"+(when??"")));
    if(!unique.has(key))unique.set(key,{key,kind:"cancellation",headline:"Fahrt oder Halt entfällt",detail:"Der Ausfall wird für diese Fahrt in der Bahnhofsquelle gemeldet.",lines:[line],plannedTime:when});
  }
 }
 const priority={construction:0,cancellation:1,incident:2};
 return [...unique.values()].sort((a,b)=>priority[a.kind]-priority[b.kind]||(Date.parse(a.plannedTime??"")||0)-(Date.parse(b.plannedTime??"")||0)).slice(0,limit);
}
