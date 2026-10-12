/** A reached or expired scheduled time is not proof of a train's arrival. */
export function remainingArrivalMinutes(time:string|null|undefined,now:number,current:boolean):number|null {
  if(!current||!time||!Number.isFinite(now))return null;
  const arrival=Date.parse(time);
  if(!Number.isFinite(arrival)||arrival<now)return null;
  return Math.ceil((arrival-now)/60_000);
}
