/** A malformed percent escape must return a client error, never a server 500. */
export function decodeRouteSegment(value:string):string|null {
  try { return decodeURIComponent(value); } catch { return null; }
}
