import type { PlannerCategory } from "./live-journey";

export type SharedPlannerSearch = {
  from:string; to:string; departure:string; arriveBy:boolean;
  maxChanges:0|1|2|3|4|5; transferMinutes:number;
  wheelchair:boolean; bike:boolean; categories:PlannerCategory[];
};
const ALL:PlannerCategory[]=["fern","regional","sbahn","ubahn","tram"];
function safeId(value:string|null):string|null {
  return value && value.length<=150 && /^[\w:.-]+$/.test(value) ? value : null;
}
function validLocalDate(value:string|null):value is string {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)
    && Number.isFinite(new Date(value!).getTime()));
}
export function buildPlannerLink(origin:string,search:SharedPlannerSearch):string {
  const url=new URL("/",origin);
  if(!safeId(search.from)||!safeId(search.to)||!validLocalDate(search.departure))throw new Error("Ungültige Reisedaten");
  url.searchParams.set("from",search.from);
  url.searchParams.set("to",search.to);
  url.searchParams.set("at",search.departure);
  if(search.arriveBy)url.searchParams.set("arrive","1");
  if(search.maxChanges!==5)url.searchParams.set("changes",String(search.maxChanges));
  if(search.transferMinutes!==0)url.searchParams.set("buffer",String(search.transferMinutes));
  if(search.bike)url.searchParams.set("bike","1");
  if(search.wheelchair)url.searchParams.set("stepfree","1");
  if(search.categories.length!==5)url.searchParams.set("modes",search.categories.join(","));
  return url.toString();
}
export function parsePlannerLink(input:string):SharedPlannerSearch|null {
  let url:URL;
  try {url=new URL(input);} catch {return null;}
  const p=url.searchParams;
  const from=safeId(p.get("from")),to=safeId(p.get("to")),departure=p.get("at");
  if(!from||!to||!validLocalDate(departure))return null;
  const changes=Number(p.get("changes")??"5"),buffer=Number(p.get("buffer")??"0");
  if(!Number.isInteger(changes)||changes<0||changes>5||!Number.isInteger(buffer)||buffer<0||buffer>60)return null;
  const raw=p.get("modes");
  const modes=raw===null?ALL:raw.split(",").filter((item):item is PlannerCategory=>ALL.includes(item as PlannerCategory));
  if(!modes.length||modes.length>5||new Set(modes).size!==modes.length||(raw!==null&&modes.join(",")!==raw))return null;
  return {from,to,departure,arriveBy:p.get("arrive")==="1",maxChanges:changes as SharedPlannerSearch["maxChanges"],
    transferMinutes:buffer,wheelchair:p.get("stepfree")==="1",bike:p.get("bike")==="1",categories:modes};
}
