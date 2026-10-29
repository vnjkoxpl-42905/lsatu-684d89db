import type { GradedQuestionAnswer, ProgressCoverage } from '@/lib/firstAnswerProgress';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import ProgressPrototype from './ProgressPrototype';

const EMPTY_ANSWERS: GradedQuestionAnswer[] = [];
const EMPTY_COVERAGE: ProgressCoverage = { includedSources: [], missingSources: [], excludedRows: {} };

/** DEV-only comparison harness over real answers. Production uses ProgressPage. */
export default function LiveProgressPrototype() {
  const [window] = useProgressWindow();
  const data = useFirstAnswerProgress(window);
  const error = data.resolution.state === 'denied' ? 'This account cannot view this progress.' : data.error ? 'Could not load your saved answers.' : null;
  return <ProgressPrototype answers={data.ledger?.answers ?? EMPTY_ANSWERS} coverage={data.ledger?.coverage ?? EMPTY_COVERAGE} asOf={data.asOf ?? new Date(0).toISOString()} loading={data.loading} error={error} onRetry={() => void data.refresh()} />;
}
