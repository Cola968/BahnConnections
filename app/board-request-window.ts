/** Parse a MOTIS window, in seconds. null means unset; undefined means invalid.
 * Do not allow arbitrary query strings to reach the public timetable provider.
 */
export function boardRequestWindow(value:string|null):number|null|undefined{
  if(value===null)return null;
  if(!/^\d{1,6}$/.test(value))return undefined;
  const seconds=Number(value);
  return Number.isSafeInteger(seconds)&&seconds<=86_400?seconds:undefined;
}
