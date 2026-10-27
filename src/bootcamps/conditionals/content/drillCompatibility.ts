import baseline from './fullCourseGradingBaseline.json';
import type { FullCourseItem } from './fullCourseTypes';

/** Only explanatory fields are presentation. Prompts, option text/order and models remain grading inputs. */
export function gradingSignature(items: FullCourseItem[]): string {
  return JSON.stringify(items, (key, value) => ['explanation', 'hint', 'sourceRefs'].includes(key) ? undefined : value);
}
export function knownLocalSignature(setId: string, prior: string, current: FullCourseItem[]): boolean {
  const sets = baseline.sets as unknown as Record<string, FullCourseItem[]>;
  const old = sets[setId];
  return !!old && prior === JSON.stringify(old) && gradingSignature(old) === gradingSignature(current);
}
export const DRILL_GRADING_REVISION = 'semantic-items-20261027-r1';

/** Appended practice cannot revoke a completion earned on unchanged questions. */
export function appendOnlyRevision(setId: string, prior: { version: number; signature: string; gradingRevision?: string }, current: FullCourseItem[]): number {
  const sets = baseline.sets as unknown as Record<string, FullCourseItem[]>;
  const old = sets[setId];
  let previous: FullCourseItem[] | undefined;
  if (prior.version === 1 && old && prior.signature === JSON.stringify(old)) previous = old;
  if (prior.version === 2 && prior.gradingRevision === DRILL_GRADING_REVISION) {
    try { const parsed = JSON.parse(prior.signature); if (Array.isArray(parsed)) previous = parsed; } catch { /* Unknown records stay recoverable, not credited. */ }
  }
  if (!previous?.length || current.length <= previous.length) return 0;
  return gradingSignature(previous) === gradingSignature(current.slice(0, previous.length)) ? previous.length : 0;
}
