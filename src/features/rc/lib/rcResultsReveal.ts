import type { RcDrillSession } from './rcTypes';

/** Protected reports retain their existing backend release authority. */
export function canRevealRcResults(session: Pick<RcDrillSession, 'status' | 'config'>): boolean {
  if (session.status !== 'completed') return false;
  if (session.config.timedSectionSittingId || session.config.practiceTestRunId) return true;
  return typeof session.config.resultsRevealedAt === 'string'
    && Number.isFinite(Date.parse(session.config.resultsRevealedAt));
}
