/** Shared, provider-independent fallback for every station board and direction.
 * The provider's real-time timetable may fail or return no calls while its
 * regular timetable still works. Never relabel timetable results as live.
 */
import {validTransitousBoardRows,type TransitousBoardRow} from "./board-verification.ts";
export type StoptimesMode = "REALTIME" | "OFF";
export type StationBoardResult = {
  stopTimes:TransitousBoardRow[];
  mode:StoptimesMode;
  fallback:boolean;
  warning?:string;
};
export async function loadStationBoardWithFallback(
  request:(mode:StoptimesMode)=>Promise<unknown>
):Promise<StationBoardResult>{
  let primaryError:unknown=null;
  try{
    const raw=await request("REALTIME");
    if(!Array.isArray(raw))throw new Error("Invalid real-time stopTimes array");
    const rows=validTransitousBoardRows(raw);
    if(rows.length)return {stopTimes:rows,mode:"REALTIME",fallback:false};
  }catch(error){primaryError=error;}
  try{
    const raw=await request("OFF");
    if(!Array.isArray(raw))throw new Error("Invalid scheduled stopTimes array");
    const rows=validTransitousBoardRows(raw);
    if(!rows.length&&primaryError)throw primaryError;
    return {stopTimes:rows,mode:"OFF",fallback:true,
      warning:"Echtzeit-Tafel unvollständig. Gezeigt werden ausschließlich vom Anbieter gelieferte Fahrplandaten."};
  }catch(error){
    throw primaryError ?? error;
  }
}
