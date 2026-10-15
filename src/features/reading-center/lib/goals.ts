/**
 * Spreeder goal maths (recommended-goals-result + reading-test, shipped bundle).
 */

/** Reading test speed: floor(60 * words / seconds), rounded to 10. */
export function readingTestWpm(words: number, seconds: number): number {
  if (seconds <= 0) return 0;
  return 10 * Math.round(Math.floor((60 * words) / seconds) / 10);
}

/** Recommended speed goal for a measured speed, on a scale whose max is `max` WPM. */
export function recommendedGoal(speed: number, max = 2000): number {
  const L = max;
  const S = speed;
  let z: number;
  if (S <= 0.01 * L) z = 0.05 * L;
  else if (S <= 0.025 * L) z = 0.05 * L + ((0.05 * L) / (0.015 * L)) * (S - 0.01 * L);
  else if (S <= 0.1 * L) z = 0.1 * L + ((0.2 * L) / (0.075 * L)) * (S - 0.025 * L);
  else if (S <= 0.25 * L) z = 0.3 * L + ((0.2 * L) / (0.15 * L)) * (S - 0.1 * L);
  else if (S <= 0.5 * L) z = 0.5 * L + (S - 0.25 * L);
  else if (S <= 0.8 * L) z = 0.75 * L + ((0.25 * L) / (0.3 * L)) * (S - 0.5 * L);
  else z = L;
  return 10 * Math.round(Math.min(z, L) / 10);
}
