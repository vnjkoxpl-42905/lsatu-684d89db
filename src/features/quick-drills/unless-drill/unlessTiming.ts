/** Lock-in at the deadline is too late, even if the animation frame has not fired yet. */
export function unlessLockTiming(startedAt: number, now: number, limit: number, timedOut = false) {
  const expired = timedOut || now - startedAt >= limit;
  return { timedOut: expired, seconds: expired ? limit / 1000 : (now - startedAt) / 1000 };
}
