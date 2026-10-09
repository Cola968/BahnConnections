import { prepareStationTrip, type StationTripInput } from './station-trip-geometry';

onmessage=(event:MessageEvent<{id:number;input:StationTripInput}>)=>{
  try { postMessage({id:event.data.id,trip:prepareStationTrip(event.data.input)}); }
  catch(error) { postMessage({id:event.data.id,error:error instanceof Error?error.message:'Fahrtgeometrie nicht verfügbar'}); }
};
