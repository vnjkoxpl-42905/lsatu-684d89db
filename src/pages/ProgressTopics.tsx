import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressWindowControl from '@/components/analytics/ProgressWindowControl';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import { firstAnswerDetails } from '@/lib/firstAnswerDetails';

/** Only LR question types persisted with a graded first answer are grouped. */
export default function ProgressTopics({ studentId, hideWindowControl = false }: { studentId?: string; hideWindowControl?: boolean } = {}) {
  const [window, setWindow] = useProgressWindow();
  const { ledger, asOf, loading, error, resolution, refresh } = useFirstAnswerProgress(window, studentId);
  const [search, setSearch] = useState('');
  const details = useMemo(() => ledger
    ? firstAnswerDetails(ledger.answers, window, asOf ?? new Date().toISOString())
    : null, [ledger, window, asOf]);
  const topics = details?.topics.filter((row) => row.topic.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const denominator = details?.topics.reduce((sum, row) => sum + row.denominator, 0) ?? 0;
  const partialLr = ledger?.coverage.missingSources.some((item) => ['lr_attempts', 'lr_section_history', 'practice_test_runs'].includes(item.source)) ?? false;

  return (
    <section data-motion-item data-motion-ready={loading ? "false" : "true"} className="min-w-0 space-y-5" aria-labelledby="progress-topics-heading">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="progress-topics-heading" className="text-xl font-semibold text-foreground">Logical Reasoning topics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each question counts once, from its first saved graded answer. RC has no comparable saved topic label here.</p>
        </div>
        {!hideWindowControl && <ProgressWindowControl value={window} onChange={setWindow} />}
      </header>

      {loading ? <p className="text-sm text-muted-foreground" role="status">Loading saved topics…</p>
        : resolution.state === 'denied' ? <p className="text-sm text-muted-foreground">Topics are unavailable to this account.</p>
        : error || !ledger || ledger.coverage.includedSources.length === 0 ? (
          <div className="text-sm text-muted-foreground" role="alert"><p>Saved topics could not be loaded.</p><button type="button" className="mt-2 underline" onClick={() => void refresh()}>Retry</button></div>
        ) : (
          <>
            {ledger.coverage.missingSources.length > 0 && (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-foreground" role="status">Partial data: {ledger.coverage.missingSources.map((item) => item.source.replace(/_/g, ' ')).join(', ')} unavailable. Topic counts use available sources only.</p>
            )}
            <p className="text-xs text-muted-foreground">{denominator} {partialLr ? 'candidate first LR answers from available sources' : 'first LR answers'} have a saved question type in this window. {details?.untypedFirstAnswers ?? 0} more {partialLr ? 'candidate first LR answers' : 'first LR answers'} have no saved type and are excluded from topic rows. {partialLr && 'Topic accuracy is withheld because an unavailable source may contain earlier answers.'}</p>
            <label className="block text-xs text-muted-foreground">Find a topic <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="ml-2 w-full max-w-72 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground sm:w-auto" placeholder="Search question type" /></label>
            {topics.length === 0 ? <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No saved topic results match this window and search.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {topics.map((topic) => (
                  <li key={topic.topic} className="min-w-0 rounded-xl border border-border bg-card p-4">
                    <h3 className="break-words font-semibold text-foreground">{topic.topic}</h3>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{partialLr || topic.percent === null ? '—' : `${topic.percent}%`}</p>
                    <p className="text-xs text-muted-foreground">{topic.correct} correct of {topic.denominator} {partialLr ? 'candidate first answers; earlier source answers may be missing' : 'distinct first answers'}{partialLr ? '' : topic.percent === null ? ' · fewer than 3, no percentage yet' : topic.denominator < 10 ? ' · early signal' : ''}</p>
                    <details className="mt-3 text-xs"><summary className="cursor-pointer">Show topic records</summary><ul className="mt-2 max-h-40 overflow-y-auto space-y-1">{topic.evidenceAttemptIds.map((id) => <li key={id} className="break-all font-mono">{id}</li>)}</ul></details>
                    {!partialLr && topic.denominator >= 3 && <p className="mt-2 text-xs text-muted-foreground">{topic.denominator - topic.correct} saved first-answer {topic.denominator - topic.correct === 1 ? 'miss' : 'misses'} to revisit. This evidence does not replace Joshua's prescribed priority.</p>}
                  </li>
                ))}
              </ul>
            )}
            {!studentId && <div className="flex flex-wrap gap-4 text-xs font-medium"><Link to="/review/to-review" className="text-foreground underline">Review answers</Link><Link to="/practice/drills" className="text-foreground underline">Practice questions</Link></div>}
          </>
        )}
    </section>
  );
}
