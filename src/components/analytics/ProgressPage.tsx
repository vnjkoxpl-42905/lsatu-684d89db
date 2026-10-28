import { useCallback } from 'react';
import ProgressPresenter, { type ProgressView } from '@/components/analytics/prototype/ProgressPrototype';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';

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
  // Explicit valid URL window wins, then the stored choice, then 30 days. Changes replace history.
  const [window, setWindow] = useProgressWindow(true);
  const data = useFirstAnswerProgress(window, undefined, { revalidateOnMount: true });
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
    loading={!error && (data.loading || !hasLedger)}
    error={error}
    onRetry={onRefresh}
    checkedAt={data.dataUpdatedAt}
    fetching={data.fetching}
    refreshError={data.refreshError ? 'We could not refresh your saved answers.' : null}
    onRefresh={onRefresh}
  />;
}
