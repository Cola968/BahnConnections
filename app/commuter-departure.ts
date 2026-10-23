/** Query a saved commute from the next five-minute boundary, not a previous planner state.
 * ISO is retained across DST: Berlin's duplicated autumn 02:00 cannot be
 * resolved reliably if converted back from local text. */
export function commuterDepartureTime(nowMs:number):{local:string;iso:string}{
  if(!Number.isFinite(nowMs))throw new RangeError("A finite timestamp is required");
  const searchAt=Math.ceil((nowMs+5*60_000)/(5*60_000))*(5*60_000);
  const d=new Date(searchAt);
  if(!Number.isFinite(d.getTime()))throw new RangeError("Invalid commuter timestamp");
  const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{
    timeZone:"Europe/Berlin",year:"numeric",month:"2-digit",day:"2-digit",
    hour:"2-digit",minute:"2-digit",hourCycle:"h23",
  }).formatToParts(d).filter(x=>x.type!=="literal").map(x=>[x.type,x.value]));
  return {local:`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`,iso:d.toISOString()};
}
