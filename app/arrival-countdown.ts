/** An expired forecast does not prove that a train has arrived. */
export function remainingArrivalMinutes(time:string|null|undefined,now:number,current:boolean):number|null {
  if (!current || !time || !Number.isFinite(now)) return null;
  const arrival=Date.parse(time);
  if (!Number.isFinite(arrival) || arrival < now) return null;
  return Math.ceil((arrival-now)/60_000);
}
