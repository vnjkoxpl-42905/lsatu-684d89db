import { useMemo } from 'react';
import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import ProgressPrototype from './ProgressPrototype';

const EMPTY_ANSWERS: GradedQuestionAnswer[] = [];
const EMPTY_COVERAGE: ProgressCoverage = { includedSources: [], missingSources: [], excludedRows: {} };

/** Mounted only behind the DEV boundary in Analytics; no legacy rollup requests. */
export default function LiveProgressPrototype() {
  const [window] = useProgressWindow(false);
  const data = useFirstAnswerProgress(window);
  const asOf = useMemo(() => new Date().toISOString(), [data.ledger]);
  const error = data.resolution.state === 'denied' ? 'This account cannot view this progress.' : data.error ? 'Could not load your saved answers.' : null;
  return <ProgressPrototype answers={data.ledger?.answers ?? EMPTY_ANSWERS} coverage={data.ledger?.coverage ?? EMPTY_COVERAGE} asOf={asOf} loading={data.loading} error={error} onRetry={() => void data.refresh()} />;
}
