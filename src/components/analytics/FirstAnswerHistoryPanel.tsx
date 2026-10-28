import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { filterProgressHistory, type HistorySort } from '@/lib/progressHistory';
import { useFirstAnswerProgress } from '@/hooks/useFirstAnswerProgress';
import { firstAnswerDetails } from '@/lib/firstAnswerDetails';
import type { ProgressWindow } from '@/lib/firstAnswerProgress';
import { StudentIdentityUnavailableError } from '@/lib/studentAccountScope';

type AreaFilter = 'all' | 'LR' | 'RC';
type ResultFilter = 'all' | 'correct' | 'missed';
type AnswerFilter = 'all' | 'first' | 'repeat';

export default function FirstAnswerHistoryPanel({ window, studentId }: { window: ProgressWindow; studentId?: string }) {
  const { ledger, asOf, loading, error, resolution, refresh } = useFirstAnswerProgress(window, studentId);
  const [params, setParams] = useSearchParams();
  const [dense, setDense] = useState(() => ['question', 'source'].includes(params.get('historySort') ?? ''));
  const area = (['LR', 'RC'].includes(params.get('historyArea') ?? '') ? params.get('historyArea') : 'all') as AreaFilter;
  const result = (['correct', 'missed'].includes(params.get('historyResult') ?? '') ? params.get('historyResult') : 'all') as ResultFilter;
  const answer = (['first', 'repeat'].includes(params.get('historyAnswer') ?? '') ? params.get('historyAnswer') : 'all') as AnswerFilter;
  const source = params.get('historySource') || 'all';
  const mode = params.get('historyMode') || 'all';
  const topic = params.get('historyTopic') || 'all';
  const search = params.get('historySearch') || '';
  const sort = (['oldest', 'question', 'source'].includes(params.get('historySort') ?? '') ? params.get('historySort') : 'newest') as HistorySort;
  const isTable = dense || ['question', 'source'].includes(sort);
  const setFilter = (key: string, value: string) => {
    if (key === 'historySort' && ['question', 'source'].includes(value)) setDense(true);
    setParams((current) => {
    const next = new URLSearchParams(current);
    if (!value || value === 'all' || (key === 'historySort' && value === 'newest')) next.delete(key);
    else next.set(key, value);
    return next;
    }, { replace: true });
  };
  const details = useMemo(() => ledger
    ? firstAnswerDetails(ledger.answers, window, asOf ?? new Date().toISOString())
    : null, [ledger, window, asOf]);
  const filtered = useMemo(() => filterProgressHistory(details?.history ?? [], { area, result, answer, source, mode, topic, search, sort }),
    [details, area, result, answer, source, mode, topic, search, sort]);
  const options = (field: 'source' | 'mode' | 'topic') => [...new Set((details?.history ?? []).map((row) => row[field]).filter(Boolean))].sort();
  const partialAreas = ['LR', 'RC'].filter((area) => ledger?.coverage.missingSources.some((item) =>
    (area === 'LR' ? ['lr_attempts', 'lr_section_history', 'practice_test_runs'] : ['rc_attempts', 'rc_sessions', 'practice_test_runs']).includes(item.source)));
  const answerLabel = (row: { area: string; isFirst: boolean }) => row.isFirst
    ? partialAreas.includes(row.area) ? 'First available answer' : 'First answer'
    : 'Repeat';
  const dateGroups = useMemo(() => {
    const groups: { key: string; label: string; rows: typeof filtered }[] = [];
    for (const row of filtered) {
      const date = new Date(row.gradedAt);
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      const existing = groups.find((group) => group.key === key);
      if (existing) {
        existing.rows.push(row);
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
    <section data-motion-item data-motion-ready={loading ? "false" : "true"} className="mb-7 min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5" aria-labelledby="saved-answer-history-title">
      <h2 id="saved-answer-history-title" className="text-lg font-semibold text-foreground">Saved answer history</h2>
      <p className="mt-1 text-xs text-muted-foreground">Completed, graded LR and RC answers in this window. Repeats appear here but do not enter first-answer accuracy.</p>
      {loading ? <p className="mt-4 text-sm text-muted-foreground" role="status">Loading saved answers…</p>
        : resolution.state === 'denied' ? <p className="mt-4 text-sm text-muted-foreground">History is unavailable to this account.</p>
        : error || !ledger || ledger.coverage.includedSources.length === 0 ? (
          <div className="mt-4 text-sm text-muted-foreground" role="alert">
            <p>{error instanceof StudentIdentityUnavailableError ? error.message : 'Saved answer history could not be loaded.'}</p>
            <button type="button" className="mt-2 underline" onClick={() => void refresh()}>Retry</button>
          </div>
        ) : (
          <>
            {ledger.coverage.missingSources.length > 0 && (
              <p className="mt-3 text-xs text-foreground" role="status">Partial history: {ledger.coverage.missingSources.map((item) => item.source.replace(/_/g, ' ')).join(', ')} unavailable. {partialAreas.join(' and ')} first/repeat labels refer to available records; an earlier answer may be missing.</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="text-xs text-muted-foreground">Area <select aria-label="History area" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={area} onChange={(event) => setFilter('historyArea', event.target.value)}><option value="all">All</option><option value="LR">LR</option><option value="RC">RC</option></select></label>
              <label className="text-xs text-muted-foreground">Result <select aria-label="History result" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={result} onChange={(event) => setFilter('historyResult', event.target.value)}><option value="all">All</option><option value="correct">Correct</option><option value="missed">Missed</option></select></label>
              <label className="text-xs text-muted-foreground">Answer <select aria-label="History answer" className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" value={answer} onChange={(event) => setFilter('historyAnswer', event.target.value)}><option value="all">First and repeats</option><option value="first">First only</option><option value="repeat">Repeats only</option></select></label>
              {(['source', 'mode', 'topic'] as const).map((field) => <label key={field} className="text-xs capitalize text-muted-foreground">{field}<select aria-label={`History ${field}`} value={{ source, mode, topic }[field]} onChange={(event) => setFilter(`history${field[0].toUpperCase()}${field.slice(1)}`, event.target.value)} className="ml-1 max-w-56 rounded border border-border bg-background px-2 py-1 text-foreground"><option value="all">All</option>{({ source, mode, topic }[field] !== 'all' && !options(field).includes({ source, mode, topic }[field])) && <option value={{ source, mode, topic }[field]}>{{ source, mode, topic }[field]} (no rows in this window)</option>}{options(field).map((value) => <option key={value} value={value}>{value?.replace(/[_-]/g, ' ')}</option>)}</select></label>)}
              <label className="text-xs text-muted-foreground">Find question or record<input aria-label="History search" value={search} onChange={(event) => setFilter('historySearch', event.target.value)} className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground" type="search" /></label>
              <label className="text-xs text-muted-foreground">Order<select aria-label="History order" value={sort} onChange={(event) => setFilter('historySort', event.target.value)} className="ml-1 rounded border border-border bg-background px-2 py-1 text-foreground"><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="question">Question</option><option value="source">Source</option></select></label>
              <button type="button" aria-pressed={isTable} onClick={() => { if (isTable && ['question', 'source'].includes(sort)) setFilter('historySort', 'newest'); setDense(!isTable); }} className="rounded border border-border px-3 py-1 text-xs text-foreground">{isTable ? 'Grouped list' : 'Detailed table'}</button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">Filters use the same saved ledger as accuracy. Difficulty, reasoning tags, blind answers, time, flags, notes and assignment links are not available in this ledger. Filtering does not change which answer was first.</p>
            <p className="mt-3 text-xs text-muted-foreground">{filtered.length} saved {filtered.length === 1 ? 'answer' : 'answers'} match these filters.</p>
            {filtered.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No saved answers match this window and these filters.</p> : isTable ? (
              <div className="mt-2 max-h-96 overflow-auto rounded-lg border border-border" tabIndex={0} aria-label="Saved answer table"><table className="w-full text-left text-xs"><caption className="sr-only">Saved graded answers and their source records</caption><thead className="sticky top-0 bg-muted"><tr>{['Graded date', 'Question', 'Source', 'Mode', 'Type', 'Result', 'Answer', 'Evidence record'].map((label) => <th key={label} scope="col" className="px-3 py-2 whitespace-nowrap">{label}</th>)}</tr></thead><tbody>{filtered.map((row) => <tr key={row.attemptId} className="border-t border-border"><td className="px-3 py-2 whitespace-nowrap">{new Date(row.gradedAt).toLocaleString()}</td><td className="px-3 py-2">{row.questionKey}</td><td className="px-3 py-2">{row.source.replace(/_/g, ' ')}</td><td className="px-3 py-2">{row.mode.replace(/-/g, ' ')}</td><td className="px-3 py-2">{row.topic || 'Not saved'}</td><td className="px-3 py-2">{row.correct ? 'Correct' : 'Missed'}</td><td className="px-3 py-2">{answerLabel(row)}</td><td className="px-3 py-2 break-all">{row.attemptId}</td></tr>)}</tbody></table></div>
            ) : (
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
                          <span className="text-muted-foreground">{row.correct ? 'Correct' : 'Missed'} · {answerLabel(row)}</span>
                        </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>
            )}
            <div className="mt-4 flex flex-wrap gap-3 text-xs font-medium">
              <Link className="text-foreground underline" to={studentId ? '../review' : '/review/to-review'}>Open Review</Link>
              {!studentId && <Link className="text-foreground underline" to="/practice/drills">Practice questions</Link>}
            </div>
          </>
        )}
    </section>
  );
}
