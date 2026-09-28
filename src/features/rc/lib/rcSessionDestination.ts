import { isSittingReturn } from '@/lib/practiceTestRunner';

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
