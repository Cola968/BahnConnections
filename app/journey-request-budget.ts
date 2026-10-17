/** Prevent a stalled upstream from consuming the whole journey API deadline.
 * A caller abort must still cancel all associated work immediately.
 */
export function boundedJourneySignal(parent?:AbortSignal, timeoutMs=14_000):AbortSignal {
  const deadline=AbortSignal.timeout(timeoutMs);
  return parent ? AbortSignal.any([parent,deadline]) : deadline;
}
