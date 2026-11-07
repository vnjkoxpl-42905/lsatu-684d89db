import { useMemo } from 'react';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { buildPrototypeModel } from '@/components/analytics/prototype/model';
import { EMPTY_STRENGTHS, summarizeModel, type StrengthsWeaknesses } from '@/lib/strengthsWeaknesses';

export type StrengthsStatus = 'loading' | 'ready' | 'error' | 'denied';

export interface StrengthsOverall {
  correct: number;
  denominator: number;
  /** Null until three first answers exist, or when a source is missing. */
  percent: number | null;
}

export interface StrengthsResult {
  status: StrengthsStatus;
  summary: StrengthsWeaknesses;
  overall: StrengthsOverall;
  asOf: string | null;
  refresh: () => void;
}

const NO_OVERALL: StrengthsOverall = { correct: 0, denominator: 0, percent: null };

/**
 * The signed-in student's strengths and weaknesses from their saved first answers.
 * Always the whole record ("all"), so a short window never hides a real pattern.
 * Pass the Review snapshot to share its one read; otherwise this reads its own.
 */
export function useStrengthsWeaknesses({
  enabled = true,
  snapshot = null,
}: {
  enabled?: boolean;
  snapshot?: ReturnType<typeof useFirstAnswerProgress> | null;
} = {}): StrengthsResult {
  const local = useFirstAnswerProgress('all', undefined, { enabled: enabled && !snapshot });
  const data = snapshot ?? local;
  const ledger = data.ledger;
  const asOf = data.asOf;
  const computed = useMemo(() => {
    if (!ledger || !asOf) return null;
    const model = buildPrototypeModel(ledger.answers, ledger.coverage, 'all', asOf);
    const lr = model.progress.LR;
    return {
      summary: summarizeModel(model),
      overall: { correct: lr.correct, denominator: lr.denominator, percent: lr.percent } as StrengthsOverall,
    };
  }, [ledger, asOf]);
  const denied = data.resolution.state === 'denied';
  const status: StrengthsStatus = denied
    ? 'denied'
    : computed
      ? 'ready'
      : data.error
        ? 'error'
        : 'loading';
  const { refresh } = data;
  return {
    status,
    summary: computed?.summary ?? EMPTY_STRENGTHS,
    overall: computed?.overall ?? NO_OVERALL,
    asOf: asOf ?? null,
    refresh: () => { void refresh(); },
  };
}
