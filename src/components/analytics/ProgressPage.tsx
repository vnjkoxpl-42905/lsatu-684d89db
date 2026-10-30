import { useCallback, useMemo } from 'react';
import ProgressPresenter, { type ProgressView } from '@/components/analytics/prototype/ProgressPrototype';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';
import { useReviewProgressSnapshot } from '@/components/review/ReviewProgressSnapshotBoundary';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useJournalEntries } from '@/hooks/useJournalEntries';
import type { ProgressReviewAccess } from '@/lib/progressReviewCapability';
import { PROGRESS_POLICY_EVIDENCE } from '@/lib/progressPolicyEvidence';

// Stable fallbacks so an unloaded read never changes the presenter's inputs.
const NO_ANSWERS: GradedQuestionAnswer[] = [];
const NO_COVERAGE: ProgressCoverage = { includedSources: [], missingSources: [], excludedRows: {} };
const NO_TIME = new Date(0).toISOString();

/**
 * The signed-in student's Progress. Reads the saved first-answer ledger, hands one
 * validated window and one read time to the presenter, and says plainly when a read
 * is loading, partial, refreshing or failed. Nothing here writes.
 */
export default function ProgressPage({ view }: { view: ProgressView }) {
  // Each view keeps its date window in its own URL.
  const [window, setWindow] = useProgressWindow();
  const shared = useReviewProgressSnapshot();
  const local = useFirstAnswerProgress(window, undefined, { revalidateOnMount: true, enabled: !shared });
  const data = shared ?? local;
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const actorId = user?.id ?? null;
  const ownerId = data.ledger?.ownerId ?? null;
  const accessReady = Boolean(authReady && actorId && ownerId === actorId
    && !permissions.loading && permissions.resolved && permissions.resolvedFor === actorId);
  const canReadJournal = accessReady && (permissions.is_admin || permissions.has_journal_access);
  const journal = useJournalEntries(canReadJournal, ownerId ?? undefined);
  const reviewAccess = useMemo<ProgressReviewAccess>(() => ({
    actorId,
    ownerId,
    resolved: accessReady,
    isAdmin: accessReady && permissions.is_admin,
    analytics: accessReady && permissions.has_analytics_access,
    classroom: accessReady && permissions.has_classroom_access,
    drill: accessReady && permissions.has_drill_access,
    practice: accessReady && permissions.has_practice_access,
    journal: canReadJournal,
    journalQuestionIds: new Set(canReadJournal && journal.classId === ownerId
      ? (journal.data ?? []).map((entry) => entry.qid) : []),
    journalState: !canReadJournal ? 'ready'
      : journal.isError ? 'error'
        : journal.isLoading || journal.classId !== ownerId ? 'pending' : 'ready',
    // Current live policies and the tested downstream guards are recorded in POLICY-EVIDENCE.md.
    exactRcPolicyVerified: PROGRESS_POLICY_EVIDENCE.rc,
    exactPtPolicyVerified: PROGRESS_POLICY_EVIDENCE.practiceTest,
  }), [actorId, ownerId, accessReady, canReadJournal, permissions.is_admin,
    permissions.has_analytics_access, permissions.has_classroom_access,
    permissions.has_drill_access, permissions.has_practice_access,
    journal.classId, journal.data, journal.isError, journal.isLoading]);
  const { refresh } = data;
  const onRefresh = useCallback(() => { void refresh(); }, [refresh]);
  const hasLedger = !!data.ledger;
  const error = data.resolution.state === 'denied' ? 'This account cannot view this progress.'
    : data.error && !hasLedger ? (data.error instanceof StudentIdentityUnavailableError ? data.error.message : 'Could not load your saved answers.')
    : null;
  return <ProgressPresenter
    production
    view={view}
    window={window}
    onWindowChange={setWindow}
    answers={data.ledger?.answers ?? NO_ANSWERS}
    coverage={data.ledger?.coverage ?? NO_COVERAGE}
    asOf={data.asOf ?? NO_TIME}
    reviewAccess={reviewAccess}
    loading={!error && (data.loading || !hasLedger)}
    error={error}
    onRetry={onRefresh}
    checkedAt={data.dataUpdatedAt}
    fetching={data.fetching}
    refreshError={data.refreshError ? 'We could not refresh your saved answers.' : null}
    onRefresh={onRefresh}
  />;
}
