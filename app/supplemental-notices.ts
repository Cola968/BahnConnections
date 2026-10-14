import type {NoticeStopTime} from './station-disruptions-data.ts';
import type {TransitAlert} from './transit-alerts.ts';
const railProducts=new Set(['suburban','subway','tram','regional','regionalExpress','national','nationalExpress','express']);
const text=(value:unknown)=>typeof value==='string'?value.trim():'';
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};
/** Supplement station notices only; these provider trip IDs never enter the map radar. */
export function supplementalNoticeRows(input:unknown,kind:'arrival'|'departure',now=Date.now()):NoticeStopTime[]{
 if(!Array.isArray(input))return [];
 return input.flatMap(raw=>{
  const row=record(raw),line=record(row.line),product=text(line.product);
  if(!railProducts.has(product))return [];
  const alerts:TransitAlert[]=[],stationAlerts:TransitAlert[]=[];
  for(const value of Array.isArray(row.remarks)?row.remarks:[]){
   const remark=record(value),header=text(remark.summary)||text(remark.text),detail=text(remark.text);
   if(!header||!['warning','status'].includes(text(remark.type)))continue;
   const end=Date.parse(text(remark.validUntil));
   if(Number.isFinite(end)&&end<=now)continue;
   const products=record(remark.products),specified=Object.keys(products).length>0;
   const accessible=/aufzug|fahrtreppe|barriere|elevator|lift|escalator|accessib/i.test(header+' '+detail);
   const alert={headerText:header,descriptionText:detail,effect:accessible?'ACCESSIBILITY_ISSUE':remark.type==='warning'?'OTHER_EFFECT':'UNKNOWN_EFFECT'};
   // Providers can attach a station lift warning to every line at that stop.
   // Keep the station warning without claiming that every line is disrupted.
   if(specified&&products[product]!==true){if(accessible)stationAlerts.push(alert);continue;}
   alerts.push(alert);
  }
  const time=text(row.plannedWhen)||text(row.when);
  const place=kind==='arrival'?{scheduledArrival:time,arrival:text(row.when)}:{scheduledDeparture:time,departure:text(row.when)};
  const result:NoticeStopTime[]=[];
  if(alerts.length||row.cancelled===true)result.push({tripId:'supplement:'+text(row.tripId),displayName:text(line.name),headsign:text(row.direction),cancelled:row.cancelled===true,place,alerts});
  if(stationAlerts.length)result.push({stationNotice:true,place:{},alerts:stationAlerts});
  return result;
 });
}
