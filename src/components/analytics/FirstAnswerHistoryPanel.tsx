import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { firstAnswerDetails } from '@/lib/firstAnswerDetails';
import type { ProgressWindow } from '@/lib/firstAnswerProgress';

type AreaFilter = 'all' | 'LR' | 'RC';
type ResultFilter = 'all' | 'correct' | 'missed';
type AnswerFilter = 'all' | 'first' | 'repeat';

export default function FirstAnswerHistoryPanel({ window }: { window: ProgressWindow }) {
  const { ledger, loading, error, resolution, refresh } = useFirstAnswerProgress(window);
  const [area, setArea] = useState<AreaFilter>('all');
  const [result, setResult] = useState<ResultFilter>('all');
  const [answer, setAnswer] = useState<AnswerFilter>('all');
  const details = useMemo(() => ledger
    ? firstAnswerDetails(ledger.answers, window, new Date().toISOString())
    : null, [ledger, window]);
  const filtered = useMemo(() => (details?.history ?? []).filter((row) =>
    (area === 'all' || row.area === area)
    && (result === 'all' || row.correct === (result === 'correct'))
    && (answer === 'all' || row.isFirst === (answer === 'first')),
  ), [details, area, result, answer]);
  const dateGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: typeof filtered }[] = [];
    for (const row of filtered) {
      const date = new Date(row.gradedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const previous = groups[groups.length - 1];
      if (previous?.key === key) {
        previous.rows.push(row);
      } else {
        groups.push({
          key,
          label: date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
          rows: [row],
        });
      }
    }
    return groups;
  }, [filtered]);

  return (
    <section className="mb-7 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="saved-answer-history-title">
      <h2 id="saved-answer-history-title" className="text-lg font-semibold text-foreground">Saved answer history</h2>
      <p className="mt-1 text-xs text-muted-foreground">Completed, graded LR and RC answers in this window. Repeats appear here but do not enter first-answer accuracy.</p>
      {loading ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading saved answers…</p>
        : resolution.state === 'denied' ? <p className="mt-4 text-sm text-muted-foreground">History is unavailable to this account.</p>
        : error || !ledger || ledger.coverage.includedSources.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground" role="alert">
            <p>Saved answer history could not be loaded.</p>
            <button type="button" className="mt-2 underline" onClick={() => void refresh()}>Retry</button>
          </div>
        ) : (
          <>
            {ledger.coverage.missingSources.length > 0 && (
              <p className="mt-3 text-xs text-amber-700" role="status">Partial history: {ledger.coverage.missingSources.map((item) => item.source.replace(/_/g, ' ')).join(', ')} unavailable.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="text-xs text-muted-foreground">Area <select aria-label="History area" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={area} onChange={(event) => setArea(event.target.value as AreaFilter)}><option value="all">All</option><option value="LR">LR</option><option value="RC">RC</option></select></label>
              <label className="text-xs text-muted-foreground">Result <select aria-label="History result" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={result} onChange={(event) => setResult(event.target.value as ResultFilter)}><option value="all">All</option><option value="correct">Correct</option><option value="missed">Missed</option></select></label>
              <label className="text-xs text-muted-foreground">Answer <select aria-label="History answer" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={answer} onChange={(event) => setAnswer(event.target.value as AnswerFilter)}><option value="all">First and repeats</option><option value="first">First only</option><option value="repeat">Repeats only</option></select></label>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{filtered.length} saved {filtered.length === 1 ? 'answer' : 'answers'} match these filters.</p>
            {filtered.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No saved answers match this window and these filters.</p> : (
              <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border">
                {dateGroups.map((group) => (
                  <section key={group.key} aria-label={group.label}>
                    <h3 className="sticky top-0 border-b border-border bg-muted px-3 py-2 text-xs font-semibold text-foreground">{group.label}</h3>
                    <ol className="divide-y divide-border">
                      {group.rows.map((row) => (
                        <li key={row.attemptId} className="flex min-w-0 flex-wrap items-center justify-between gap-2 p-3 text-xs">
                          <div className="min-w-0">
                            <strong className="block break-all text-foreground">{row.questionKey.replace(':', ' · ')}</strong>
                            <span className="text-muted-foreground">{row.topic ? `${row.topic} · ` : ''}{row.mode.replace(/-/g, ' ')}</span>
                          </div>
                          <span className="text-muted-foreground">{row.correct ? 'Correct' : 'Missed'} · {row.isFirst ? 'First answer' : 'Repeat'}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
              <Link className="text-foreground underline" to="/review/to-review">Open Review</Link>
              <Link className="text-foreground underline" to="/practice/drills">Practice questions</Link>
            </div>
          </>
        )}
    </section>
  );
}
