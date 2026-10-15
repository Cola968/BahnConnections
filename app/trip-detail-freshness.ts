/** A station-board refresh is not evidence that a cached trip was refreshed. */
export function tripDetailFresh(fetchedAt:number|null|undefined,now:number){
  if(!Number.isFinite(fetchedAt)||!fetchedAt||!Number.isFinite(now))return false;
  const age=now-fetchedAt;
  return age>=-10_000&&age<=150_000;
}
