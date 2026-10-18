import type { RcDrillSession } from './rcTypes';

/** Full-test children need separate owner-scoped parent release proof. */
export function canRevealRcResults(session: Pick<RcDrillSession, 'status' | 'config'>, parentReleased = false): boolean {
  if (session.status !== 'completed') return false;
  if (session.config.practiceTestRunId) return parentReleased === true;
  if (session.config.timedSectionSittingId) return true;
  return typeof session.config.resultsRevealedAt === 'string'
    && Number.isFinite(Date.parse(session.config.resultsRevealedAt));
}
