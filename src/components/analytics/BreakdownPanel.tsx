import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';
import {
  buildBreakdown,
  groupOrder,
  type AttemptLike,
  type BreakdownKind,
} from '@/lib/analyticsBreakdowns';
import BreakdownTable from '@/components/analytics/BreakdownTable';
import { cn } from '@/lib/utils';

/**
 * The tabbed breakdown block on /analytics.
 *
 * Four of the tabs are the same table over a different tag vocabulary; the
 * fifth counts misses instead of attempts. All five are computed from the
 * student's real `attempts` rows joined to the question bank, so nothing here
 * is estimated.
 *
 * Deliberately absent: an adaptive-drilling tab. Showing a per-type skill
 * rating against the pool's difficulty distribution needs a rating model that
 * does not exist in this codebase yet, and inventing one would put a number on
 * screen that traces to nothing.
 */

const TABS: { id: BreakdownKind; label: string }[] = [
  { id: 'qtype', label: 'Question Types' },
  { id: 'reasoningType', label: 'Reasoning Types' },
  { id: 'questionFeature', label: 'Question Features' },
  { id: 'difficulty', label: 'Question Difficulty' },
  { id: 'wrongByQtype', label: 'Wrong Answers' },
];

function useAttempts() {
  const { user } = useAuth();
  return useQuery<AttemptLike[]>({
    queryKey: ['analytics:attempts', user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attempts')
        .select('qid, qtype, correct, time_ms')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data ?? []) as AttemptLike[];
    },
  });
}

/** The bank is lazy-loaded; this re-renders once it is ready. */
function useBankReady() {
  const [ready, setReady] = React.useState(questionBank.isReady());
  React.useEffect(() => {
    if (ready) return;
    let cancelled = false;
    void questionBank.load().then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [ready]);
  return ready;
}

export default function BreakdownPanel() {
  const [tab, setTab] = React.useState<BreakdownKind>('qtype');
  const { data: attempts, isLoading, error } = useAttempts();
  const bankReady = useBankReady();

  const rows = React.useMemo(
    () => (bankReady && attempts ? buildBreakdown(tab, attempts) : []),
    [bankReady, attempts, tab],
  );

  const totals = React.useMemo(() => {
    if (!attempts) return null;
    const correct = attempts.filter((a) => a.correct).length;
    return { correct, total: attempts.length };
  }, [attempts]);

  return (
    <section data-motion-item data-motion-ready={isLoading || !bankReady ? "false" : "true"} className="w-full min-w-0 max-w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="min-w-0 border-b border-border px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-serif text-2xl font-semibold text-foreground">Logical Reasoning</h2>
          {totals && totals.total > 0 ? (
            <p className="text-sm tabular-nums text-muted-foreground">
              {totals.correct} correct of {totals.total} ·{' '}
              <span className="font-semibold text-foreground">
                {Math.round((totals.correct / totals.total) * 100)}%
              </span>
            </p>
          ) : null}
        </div>

        <nav aria-label="Analytics breakdowns" className="-mb-5 mt-4 flex w-full min-w-0 max-w-full gap-1 overflow-x-auto">
          {TABS.map((t) => {
            const active = t.id === tab;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'whitespace-nowrap border-b-2 px-3 pb-3 pt-1 text-sm transition-colors',
                  active
                    ? 'border-primary font-semibold text-foreground'
                    : 'border-transparent font-medium text-muted-foreground hover:text-foreground',
                )}
              >
                {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <div className="min-w-0 px-4 pb-6 sm:px-6">
        {error ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Could not load your attempt history.
          </p>
        ) : isLoading || !bankReady ? (
          <p className="py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : (
          <div className="w-full min-w-0 overflow-x-auto" role="region" aria-label="Logical Reasoning breakdown table" tabIndex={0}>
            <div className="min-w-[36rem]">
              <BreakdownTable
                rows={rows}
                groups={groupOrder(tab)}
                showDifficulty={tab !== 'difficulty'}
                countLabel={
                  tab === 'wrongByQtype'
                    ? (r) => `${r.attempted} missed of ${r.poolCount} in the pool`
                    : undefined
                }
                emptyMessage={
                  tab === 'wrongByQtype'
                    ? 'No wrong answers recorded yet.'
                    : 'Nothing here yet. Answer some questions and this fills in.'
                }
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
