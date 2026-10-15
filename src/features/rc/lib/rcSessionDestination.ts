import { isSittingReturn } from '@/lib/practiceTestRunner';
import type { RcSessionStatus } from './rcTypes';

export function inProgressRcDestination(search: string): string {
  const params = new URLSearchParams(search);
  params.delete('review');
  const query = params.toString();
  return `/rc/drill${query ? `?${query}` : ''}`;
}

export function rcReviewRedirect(status: RcSessionStatus, reviewOnly: boolean, _search: string): string | null {
  if (!reviewOnly || status === 'completed') return null;
  if (status === 'in_progress') throw new Error('This drill is still in progress. Return to Practice and choose Resume to continue. Review has not started, and the clock remains paused.');
  throw new Error('This drill is not available for review.');
}

export function completedRcDestination(
  sessionId: string,
  returnTo: string | null,
  practiceTestRunId?: string,
): string {
  if (practiceTestRunId) return `/testing/test/${encodeURIComponent(practiceTestRunId)}`;
  if (isSittingReturn(returnTo)) return returnTo!;
  const results = `/rc/results/${encodeURIComponent(sessionId)}`;
  return returnTo ? `${results}?returnTo=${encodeURIComponent(returnTo)}` : results;
}
