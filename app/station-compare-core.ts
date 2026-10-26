/** A time-window sample of provider-reported departures, not network-wide punctuality. */
export type CompareBoardStop = {
  tripId?:string;routeId?:string;routeShortName?:string;displayName?:string;
  realTime?:boolean;cancelled?:boolean;tripCancelled?:boolean;mode?:string;
  place?:{departure?:string;scheduledDeparture?:string;cancelled?:boolean};
};
export type CompareBoardResponse = {
  stopTimes?:CompareBoardStop[];source?:string;updatedAt?:string;realtimeStatus?:string;
  warnings?:string[];routeValidity?:{status?:string;blockedCount?:number};
  verification?:{status?:string};
};
export type StationCompareSnapshot = {
  total:number;realtimeCount:number;validDelaySamples:number;delayed6:number;cancelled:number;
  departuresByBucket:number[];longestObservedGapMinutes:number|null;byMode:Record<string,number>;sampleCoverage:"reported"|"partial";
  freshness:"recent"|"stale"|"unknown";warnings:string[];source:string;updatedAt:string|null;
};
const validTime=(value:unknown):number|null=>{
  if(typeof value!=="string")return null;
  const timestamp=Date.parse(value);
  return Number.isFinite(timestamp)?timestamp:null;
};
const rowKey=(stop:CompareBoardStop,planned:number)=>
  JSON.stringify([stop.tripId??"",planned,stop.routeId??stop.routeShortName??stop.displayName??"",stop.place?.scheduledDeparture??stop.place?.departure??""]);

/** Compare the same absolute clock window; use scheduled time for membership.
 * Predictions must be fresh and supported by the actual row, never inferred from other stations.
 */
export function compareStationBoard(payload:CompareBoardResponse,windowStart:number,windowMinutes:number,clock:number):StationCompareSnapshot {
  if(!Number.isFinite(windowStart)||!Number.isFinite(windowMinutes)||windowMinutes<=0||!Number.isFinite(clock))
    throw new Error("Ungültiges Vergleichszeitfenster");
  const updated=validTime(payload.updatedAt);
  const age=updated===null?Infinity:clock-updated;
  const freshness:StationCompareSnapshot["freshness"]=updated===null||age < -10_000?"unknown":age<=150_000?"recent":"stale";
  const warnings=Array.isArray(payload.warnings)?payload.warnings.filter((value):value is string=>typeof value==="string"):[];
  const partial=payload.routeValidity?.status==="partial"||Boolean(payload.routeValidity?.blockedCount)||warnings.length>0;
  const trustedRealtime=freshness==="recent"&&payload.realtimeStatus==="live";
  const result:StationCompareSnapshot={
    total:0,realtimeCount:0,validDelaySamples:0,delayed6:0,cancelled:0,byMode:{},
    departuresByBucket:[0,0,0,0,0,0],longestObservedGapMinutes:null,
    sampleCoverage:partial?"partial":"reported",freshness,warnings,
    source:payload.source??"Transitous / MOTIS",updatedAt:updated===null?null:new Date(updated).toISOString()
  };
  const seen=new Set<string>();
  const reportedTimes:number[]=[];
  for(const stop of Array.isArray(payload.stopTimes)?payload.stopTimes:[]){
    if(!stop||typeof stop!=="object"||!stop.place)continue;
    const planned=validTime(stop.place.scheduledDeparture);
    const eventTime=planned??(stop.realTime===true?null:validTime(stop.place.departure));
    if(eventTime===null||eventTime<windowStart||eventTime>=windowStart+windowMinutes*60_000)continue;
    const id=rowKey(stop,eventTime);
    if(seen.has(id))continue;
    seen.add(id);result.total++;
    reportedTimes.push(eventTime);
    const bucket=Math.min(5,Math.floor((eventTime-windowStart)/(windowMinutes*60_000/6)));
    result.departuresByBucket[bucket]++;
    const mode=typeof stop.mode==="string"&&stop.mode?stop.mode:"Unbekannt";
    result.byMode[mode]=(result.byMode[mode]??0)+1;
    if(stop.cancelled===true||stop.tripCancelled===true||stop.place.cancelled===true){result.cancelled++;continue;}
    if(trustedRealtime&&stop.realTime===true){
      result.realtimeCount++;
      const actual=validTime(stop.place.departure);
      if(actual!==null&&planned!==null){
        result.validDelaySamples++;
        if(Math.round((actual-planned)/60_000)>=6)result.delayed6++;
      }
    }
  }
  reportedTimes.sort((a,b)=>a-b);
  if(reportedTimes.length>1){
    let longest=0;
    for(let i=1;i<reportedTimes.length;i++)longest=Math.max(longest,reportedTimes[i]-reportedTimes[i-1]);
    result.longestObservedGapMinutes=Math.round(longest/60_000);
  }
  return result;
}
export type StationComparisonVerdict={comparable:boolean;reasons:string[]};
export function stationComparisonVerdict(a:StationCompareSnapshot|null,b:StationCompareSnapshot|null):StationComparisonVerdict {
  const reasons:string[]=[];
  if(!a||!b)return {comparable:false,reasons:["Mindestens ein Bahnhof konnte nicht geladen werden."]};
  if(a.sampleCoverage==="partial"||b.sampleCoverage==="partial")reasons.push("Ein Datenanbieter meldet eine unvollständige oder eingeschränkte Antwort.");
  if(a.freshness!=="recent"||b.freshness!=="recent")reasons.push("Mindestens eine Datenantwort ist veraltet oder ohne überprüfbaren Zeitstempel.");
  if(!a.total||!b.total)reasons.push("Mindestens ein Bahnhof hat im gewählten Fenster keine bestätigten Fahrten.");
  if(a.validDelaySamples===0||b.validDelaySamples===0)reasons.push("Verspätungsquoten sind mangels auswertbarer Echtzeitprognosen nicht vergleichbar.");
  return {comparable:reasons.length===0,reasons};
}
