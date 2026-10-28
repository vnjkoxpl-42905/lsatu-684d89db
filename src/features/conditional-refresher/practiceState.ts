export type Rating = 'again' | 'needs' | 'got';
export interface PracticeRun {
  version: 2; fingerprint: string; attempt: number; queue: string[]; index: number; step: number;
  ratings: Record<string, Rating>; retried: string[];
  results: Record<string, { tries: number; firstCorrect: boolean; resolved: boolean }>;
  left: string[]; right: string[]; side: 'left' | 'right'; feedback: 'none' | 'hint' | 'correct' | 'reveal';
}
export function validRatings(value: unknown, ids: string[]): Record<string, Rating> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter(([id, rating]) => ids.includes(id) && ['again', 'needs', 'got'].includes(String(rating)))) as Record<string, Rating>;
}
export function freshRun(ids: string[], fingerprint: string, ratings: Record<string, Rating> = {}, attempt = 1): PracticeRun {
  return { version: 2, fingerprint, attempt, queue: [...ids], index: 0, step: 1, ratings, retried: [], results: {}, left: [], right: [], side: 'left', feedback: 'none' };
}
export function restoreRun(value: unknown, ids: string[], fingerprint: string): PracticeRun | null {
  if (!value || typeof value !== 'object') return null;
  const run = value as PracticeRun;
  const integer = (v: unknown, min: number, max: number) => Number.isInteger(v) && Number(v) >= min && Number(v) <= max;
  if (run.version !== 2 || run.fingerprint !== fingerprint || !integer(run.attempt, 1, Number.MAX_SAFE_INTEGER)
    || !Array.isArray(run.queue) || run.queue.length > ids.length * 2 || run.queue.some(id => !ids.includes(id))
    || ids.some(id => run.queue.filter(v => v === id).length > 2)
    || !integer(run.index, 0, run.queue.length) || !integer(run.step, 1, 4)
    || !Array.isArray(run.retried) || run.retried.some(id => !ids.includes(id)) || new Set(run.retried).size !== run.retried.length
    || run.queue.some(id => run.queue.filter(v => v === id).length === 2 && !run.retried.includes(id))
    || !['left', 'right'].includes(run.side) || !['none', 'hint', 'correct', 'reveal'].includes(run.feedback)
    || !Array.isArray(run.left) || !Array.isArray(run.right) || [...run.left, ...run.right].some(v => typeof v !== 'string' || v.length > 100)
    || run.left.length > 12 || run.right.length > 12 || !run.results || typeof run.results !== 'object') return null;
  for (const [id, result] of Object.entries(run.results)) {
    if (!ids.includes(id) || !result || !integer(result.tries, 0, 10000) || typeof result.firstCorrect !== 'boolean' || typeof result.resolved !== 'boolean') return null;
  }
  return { ...run, ratings: validRatings(run.ratings, ids) };
}
export function rateCard(run: PracticeRun, rating: Rating): PracticeRun {
  const id = run.queue[run.index];
  const queue = [...run.queue], retried = [...run.retried];
  if (rating === 'again' && !retried.includes(id)) {
    // Leave at least one intervening card where the round still has one.
    queue.splice(Math.min(run.index + 3, queue.length), 0, id);
    retried.push(id);
  }
  return { ...run, queue, retried, ratings: { ...run.ratings, [id]: rating }, index: run.index + 1, step: 1 };
}
