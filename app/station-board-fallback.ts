/** Shared, provider-independent fallback for every station board and direction.
 * The provider's real-time timetable may fail or return no calls while its
 * regular timetable still works. Never relabel timetable results as live.
 */
import {validTransitousBoardRows,type TransitousBoardRow} from "./board-verification.ts";
export type StoptimesMode = "REALTIME" | "OFF";
/** A throttled provider must not be hammered with an immediate second request. */
export class StationSourceThrottledError extends Error { readonly status=429; }
export type StationBoardResult = {
  stopTimes:TransitousBoardRow[];
  mode:StoptimesMode;
  fallback:boolean;
  warning?:string;
};
const isCallerAbort=(error:unknown)=>error instanceof Error && error.name==="AbortError";
export async function loadStationBoardWithFallback(
  request:(mode:StoptimesMode)=>Promise<unknown>
):Promise<StationBoardResult>{
  let primaryError:unknown=null;
  try{
    const raw=await request("REALTIME");
    if(!Array.isArray(raw))throw new Error("Invalid real-time stopTimes array");
    const rows=validTransitousBoardRows(raw);
    if(rows.length)return {stopTimes:rows,mode:"REALTIME",fallback:false};
  }catch(error){
    if(error instanceof StationSourceThrottledError||isCallerAbort(error))throw error;
    primaryError=error;
  }
  try{
    const raw=await request("OFF");
    if(!Array.isArray(raw))throw new Error("Invalid scheduled stopTimes array");
    const rows=validTransitousBoardRows(raw);
    if(!rows.length&&primaryError)throw primaryError;
    // Consumers inspect per-row flags, not just the response status. Enforce
    // OFF provenance here so neither the board nor radar can promote a stray
    // provider prediction to live data. Keep the original response untouched.
    const scheduledRows=rows.map(row=>({...row,realTime:false,place:{...row.place,
      arrival:row.place?.scheduledArrival??row.place?.arrival,
      departure:row.place?.scheduledDeparture??row.place?.departure,
      track:row.place?.scheduledTrack??row.place?.track,
    }}));
    return {stopTimes:scheduledRows,mode:"OFF",fallback:true,
      warning:"Echtzeit-Tafel unvollständig. Gezeigt werden ausschließlich vom Anbieter gelieferte Fahrplandaten."};
  }catch(error){
    // A newer provider throttle/caller cancellation takes precedence over an
    // earlier service error; the route must preserve 429 + Retry-After.
    if(error instanceof StationSourceThrottledError||isCallerAbort(error))throw error;
    throw primaryError ?? error;
  }
}
