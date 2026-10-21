import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import ProgressWindowControl from '@/components/analytics/ProgressWindowControl';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import { firstAnswerDetails } from '@/lib/firstAnswerDetails';

/** Only LR question types persisted with a graded first answer are grouped. */
export default function ProgressTopics() {
  const [window, setWindow] = useProgressWindow();
  const { ledger, loading, error, resolution, refresh } = useFirstAnswerProgress(window);
  const [search, setSearch] = useState('');
  const details = useMemo(() => ledger
    ? firstAnswerDetails(ledger.answers, window, new Date().toISOString())
    : null, [ledger, window]);
  const topics = details?.topics.filter((row) => row.topic.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  const denominator = details?.topics.reduce((sum, row) => sum + row.denominator, 0) ?? 0;

  return (
    <section className="min-w-0 space-y-5" aria-labelledby="progress-topics-heading">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id="progress-topics-heading" className="text-xl font-semibold text-foreground">Logical Reasoning topics</h2>
          <p className="mt-1 text-sm text-muted-foreground">Each question counts once, from its first saved graded answer. RC has no comparable saved topic label here.</p>
        </div>
        <ProgressWindowControl value={window} onChange={setWindow} />
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
            <p className="text-xs text-muted-foreground">{denominator} first LR answers have a saved question type in this window. {details?.untypedFirstAnswers ?? 0} more first LR answers have no saved type and are excluded from topic rows.</p>
            <label className="block text-xs text-muted-foreground">Find a topic <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="ml-2 w-full max-w-72 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground sm:w-auto" placeholder="Search question type" /></label>
            {topics.length === 0 ? <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">No saved topic results match this window and search.</p> : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {topics.map((topic) => (
                  <li key={topic.topic} className="min-w-0 rounded-xl border border-border bg-card p-4">
                    <h3 className="break-words font-semibold text-foreground">{topic.topic}</h3>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{topic.percent === null ? '—' : `${topic.percent}%`}</p>
                    <p className="text-xs text-muted-foreground">{topic.correct} correct of {topic.denominator} distinct first answers{topic.percent === null ? ' · fewer than 3, no percentage yet' : topic.denominator < 10 ? ' · early signal' : ''}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-4 text-xs font-medium"><Link to="/review/to-review" className="text-foreground underline">Review answers</Link><Link to="/practice/drills" className="text-foreground underline">Practice questions</Link></div>
          </>
        )}
    </section>
  );
}
