// Live evidence only: no mock replies, geographic stop merging or completeness
// claim. Run explicitly; a failed provider must produce a failing audit.
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {STATIONS} from '../app/network-data.ts';
import {requireTransitousStopId,BOARD_MODES,transitousRequestHeaders} from '../app/transitous.ts';
import {validTransitousBoardRows} from '../app/board-verification.ts';
import {boardDedupeKey} from '../app/board-dedup.ts';
import {stationCalls,listStationCalls} from '../app/station-radar-data.ts';

const output=resolve(process.argv[2]??'work/station-complex-provider');
await mkdir(output,{recursive:true});
const dbStations=JSON.parse(await readFile(new URL('../data/quarantined/db-stations.json',import.meta.url),'utf8')).stations;
const rural=dbStations.find(station=>station.name==='Erdeborn'&&station.source==='db');
if(!rural)throw Error('Official DB station fixture is missing');
const stations=[...['berlin','hamburg','muenchen','leipzig'].map(id=>STATIONS.find(s=>s.id===id)),
  {id:'audit-hermann',name:'Berlin Hermannstraße',lat:52.468,lon:13.43},
  {id:'audit-gesund',name:'Berlin Gesundbrunnen',lat:52.5486,lon:13.3884},
  rural];
const report={startedAt:new Date().toISOString(),referenceTime:new Date().toISOString(),
  scope:'60-minute provider window; n=50 is a minimum and may extend beyond it',
  method:'Default MOTIS parent/child/equivalence expansion; no radius; original stop IDs retained',
  completenessVerified:false,stations:[]};
let throttled=false;
for(const station of stations){
  const result={name:station.name,id:station.id,directions:[],completenessVerified:false};
  report.stations.push(result);
  try{
    if(throttled)throw Error('Skipped after provider HTTP 429; no immediate retries');
    const signal=AbortSignal.timeout(35_000);
    result.providerStopId=await requireTransitousStopId(station,signal);
    const payloads={};
    for(const kind of ['arrival','departure']){
      const url=new URL('https://api.transitous.org/api/v6/stoptimes');
      url.search=new URLSearchParams({stopId:result.providerStopId,time:report.referenceTime,
        n:'50',window:'3600',direction:'LATER',arriveBy:String(kind==='arrival'),mode:BOARD_MODES,realtimeMode:'REALTIME'});
      const response=await fetch(url,{signal,headers:transitousRequestHeaders()});
      if(response.status===429)throttled=true;
      if(!response.ok)throw Error('Provider HTTP '+response.status);
      const payload=await response.json();
      await writeFile(resolve(output,station.id+'-'+kind+'.json'),JSON.stringify({url:String(url),retrievedAt:new Date().toISOString(),payload},null,2));
      if(!Array.isArray(payload.stopTimes))throw Error('Invalid stopTimes response');
      payloads[kind]=payload.stopTimes;
      const rows=validTransitousBoardRows(payload.stopTimes);
      const event=kind==='arrival'?'scheduledArrival':'scheduledDeparture';
      const actual=kind==='arrival'?'arrival':'departure';
      const keys=rows.map(row=>boardDedupeKey({kind,tripId:row.tripId,plannedWhen:row.place[event],when:row.place[actual],
        plannedPlatform:row.place.scheduledTrack,platform:row.place.track,direction:row.headsign??row.tripTo?.name,
        provenance:row.tripFrom?.name,line:{name:row.displayName??row.routeShortName,routeId:row.routeId}}));
      result.directions.push({kind,raw:payload.stopTimes.length,valid:rows.length,deduplicated:new Set(keys).size,
        returnedStopIds:[...new Set(rows.map(row=>row.place.stopId).filter(Boolean))],
        returnedParentIds:[...new Set(rows.map(row=>row.place.parentId).filter(Boolean))],
        modes:[...new Set(rows.map(row=>row.mode).filter(Boolean))],
        realtimeRows:rows.filter(row=>row.realTime===true).length});
    }
    const calls=stationCalls(payloads.arrival,payloads.departure);
    result.radarCalls=calls.size;
    result.radarListRows=listStationCalls(calls,'all').length;
    result.browserVisibleRows=null; // A source audit cannot prove rendered UI.
    result.status='observed';
  }catch(error){result.status='failed';result.error=error.message;process.exitCode=1;}
  await writeFile(resolve(output,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({name:result.name,status:result.status,error:result.error,
    rows:result.directions.map(d=>({kind:d.kind,raw:d.raw,unique:d.deduplicated,stops:d.returnedStopIds.length,parents:d.returnedParentIds.length})),radarCalls:result.radarCalls}));
}
