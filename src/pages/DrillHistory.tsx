/**
 * Full practice log across drills, bootcamps, Reading Comp, Abstract
 * Reasoning, and Causation Station. The selected window applies to this log;
 * the saved first-answer history uses its own graded source ledger.
 * Two views over the log:
 *
 *   Timeline    — an ordered, day-grouped list of attempts (newest first),
 *                 with the attempt number for that question ("Attempt #3").
 *   By question — a per-question rollup: attempts, accuracy, average and
 *                 total time, and the latest result.
 *
 * Data comes from the `drill_history` security-invoker view, so the student
 * only ever sees their own rows.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  SOURCE_LABELS,
  attemptNumbers,
  fetchDrillHistory,
  formatDurationMs,
  rollupByQuestion,
  type DrillHistoryRow,
  type DrillHistorySource,
} from '@/lib/drillHistory';
import { fetchSectionHistory, type SectionHistoryRow } from '@/lib/sectionHistory';
import SectionHistoryList from '@/components/history/SectionHistoryList';
import { Check, ListFilter, Loader2, Minus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import FirstAnswerHistoryPanel from '@/components/analytics/FirstAnswerHistoryPanel';
import ProgressWindowControl from '@/components/analytics/ProgressWindowControl';
import { useProgressWindow } from '@/hooks/useProgressWindow';
import { inProgressWindow } from '@/lib/firstAnswerDetails';

type ViewMode = 'timeline' | 'by-question' | 'sections';

const VIEW_LABELS: Record<ViewMode, string> = {
  timeline: 'Timeline',
  'by-question': 'By question',
  sections: 'Sections',
};
type ResultFilter = 'all' | 'correct' | 'missed';
type SourceFilter = 'all' | DrillHistorySource;

const SOURCE_ORDER: DrillHistorySource[] = ['lr', 'intro-lr', 'rc', 'abstract', 'causation'];

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, today)) return 'Today';
  if (same(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function ResultMark({ correct }: { correct: boolean | null }) {
  if (correct === null) {
    return (
      <span
        className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-muted-foreground"
        title="Ungraded work"
      >
        <Minus className="h-3.5 w-3.5" />
      </span>
    );
  }
  return correct ? (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-success/15 text-success" title="Correct">
      <Check className="h-3.5 w-3.5" />
    </span>
  ) : (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-destructive/15 text-destructive" title="Missed">
      <X className="h-3.5 w-3.5" />
    </span>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const DrillHistory: React.FC = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<DrillHistoryRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<ViewMode>('timeline');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('all');
  const [search, setSearch] = useState('');
  const [sections, setSections] = useState<SectionHistoryRow[] | null>(null);
  const [window, setWindow] = useProgressWindow();
  const windowRows = useMemo(() => rows?.filter((row) => inProgressWindow(row.attempted_at, window, new Date().toISOString())) ?? null, [rows, window]);

  // Sections load alongside the attempts rather than on tab entry: the count
  // belongs on the tab, and a student who lands here should not watch a second
  // spinner to find out whether they have sat any.
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchSectionHistory(user.id)
      .then((data) => {
        if (!cancelled) setSections(data);
      })
      .catch(() => {
        // A section-history failure must not take down the attempts view, which
        // is the page's main job. An empty list is the honest fallback.
        if (!cancelled) setSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    fetchDrillHistory(user.id)
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Could not load drill history');
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (!windowRows) return [];
    const q = search.trim().toLowerCase();
    return windowRows.filter((row) => {
      if (sourceFilter !== 'all' && row.source !== sourceFilter) return false;
      if (resultFilter === 'correct' && row.correct !== true) return false;
      if (resultFilter === 'missed' && row.correct !== false) return false;
      if (
        q &&
        !row.question_ref.toLowerCase().includes(q) &&
        !(row.detail ?? '').toLowerCase().includes(q) &&
        !(row.mode ?? '').toLowerCase().includes(q)
      )
        return false;
      return true;
    });
  }, [windowRows, sourceFilter, resultFilter, search]);

  const numbers = useMemo(() => (rows ? attemptNumbers(rows) : new Map()), [rows]);
  const rollups = useMemo(() => rollupByQuestion(filtered), [filtered]);

  const stats = useMemo(() => {
    if (!windowRows) return null;
    const graded = windowRows.filter((r) => r.correct !== null);
    const correct = graded.filter((r) => r.correct).length;
    const totalTime = windowRows.reduce((sum, r) => sum + (r.time_ms ?? 0), 0);
    const unique = new Set(windowRows.map((r) => `${r.source}|${r.question_key}`)).size;
    return {
      attempts: windowRows.length,
      accuracy: graded.length > 0 ? Math.round((correct / graded.length) * 100) : null,
      totalTime,
      unique,
    };
  }, [windowRows]);

  const dayGroups = useMemo(() => {
    const groups: { label: string; rows: DrillHistoryRow[] }[] = [];
    for (const row of filtered) {
      const label = dayLabel(row.attempted_at);
      const last = groups[groups.length - 1];
      if (last && last.label === label) last.rows.push(row);
      else groups.push({ label, rows: [row] });
    }
    return groups;
  }, [filtered]);

  const presentSources = useMemo(() => {
    if (!windowRows) return [];
    const set = new Set(windowRows.map((r) => r.source));
    return SOURCE_ORDER.filter((s) => set.has(s));
  }, [windowRows]);

  if (error) {
    return (
      <div className="mx-auto min-h-full max-w-5xl min-w-0 bg-background px-4 py-8">
        <ProgressWindowControl value={window} onChange={setWindow} />
        <div className="mt-5"><FirstAnswerHistoryPanel window={window} /></div>
        <div className="rounded-xl border border-destructive/30 bg-card p-6">
          <p className="font-medium text-foreground">The full practice log could not be loaded.</p>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  if (!rows || !stats) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl px-4 py-8">
        <header className="mb-6">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">History</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            See your saved graded answers and your broader practice log.
          </p>
        </header>

        <ProgressWindowControl value={window} onChange={setWindow} />
        <FirstAnswerHistoryPanel window={window} />
        <h2 className="mb-2 text-lg font-semibold text-foreground">Full practice log</h2>
        <p className="mb-4 text-xs text-muted-foreground">This log includes graded and ungraded attempts across drills, bootcamps, and practice. Its accuracy counts every graded attempt, including repeats. Sections below show all time.</p>

        {/* The attempt tiles describe questions, not sittings. The Sections view
            brings its own, so they are swapped rather than stacked. */}
        <section
          className={cn(
            'mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4',
            view === 'sections' && 'hidden',
          )}
        >
          <StatCard label="Attempts" value={stats.attempts.toLocaleString()} />
          <StatCard
            label="Accuracy"
            value={stats.accuracy === null ? '—' : `${stats.accuracy}%`}
            sub={stats.accuracy === null ? 'No graded attempts yet' : 'All graded attempts, including repeats'}
          />
          <StatCard label="Time practiced" value={formatDurationMs(stats.totalTime)} />
          <StatCard label="Questions seen" value={stats.unique.toLocaleString()} />
        </section>

        <section className="mb-4 flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {(['timeline', 'by-question', 'sections'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setView(m)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  view === m ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {VIEW_LABELS[m]}
                {m === 'sections' && sections !== null && sections.length > 0 && (
                  <span className="ml-1.5 tabular-nums opacity-60">{sections.length}</span>
                )}
              </button>
            ))}
          </div>

          {/* Source, result and free text all filter attempts. None of them
              means anything against a list of sittings, so they leave with it. */}
          {view !== 'sections' && (
            <>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
            <ListFilter className="ml-2 h-3.5 w-3.5 text-muted-foreground" />
            {(['all', ...presentSources] as SourceFilter[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  sourceFilter === s
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'all' ? 'All' : SOURCE_LABELS[s]}
              </button>
            ))}
          </div>

          <div className="flex rounded-lg border border-border bg-card p-0.5">
            {(['all', 'correct', 'missed'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setResultFilter(r)}
                className={cn(
                  'rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors',
                  resultFilter === r
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {r === 'all' ? 'All results' : r === 'correct' ? 'Correct' : 'Missed'}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search question or type…"
            className="min-w-40 flex-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
            </>
          )}
        </section>

        {view === 'sections' ? (
          sections === null ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <SectionHistoryList rows={sections} />
          )
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="font-medium text-foreground">
              {rows.length === 0 ? 'No attempts recorded yet.' : 'Nothing matches this window and these filters.'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {rows.length === 0
                ? 'Complete a drill or bootcamp question and it will show up here.'
                : 'Try another date window, source, result, or search.'}
            </p>
          </div>
        ) : view === 'timeline' ? (
          <div className="space-y-6">
            {dayGroups.map((group) => (
              <section key={group.label}>
                <h2 className="mb-2 flex items-baseline gap-2 text-sm font-semibold text-foreground">
                  {group.label}
                  <span className="text-xs font-normal text-muted-foreground">
                    {group.rows.length} attempt{group.rows.length === 1 ? '' : 's'}
                  </span>
                </h2>
                <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
                  {group.rows.map((row, i) => (
                    <li key={`${row.question_key}-${row.attempted_at}-${i}`} className="flex items-center gap-3 px-4 py-3">
                      <ResultMark correct={row.correct} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-foreground">{row.question_ref}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {SOURCE_LABELS[row.source]}
                          {row.detail ? ` · ${row.detail}` : ''}
                          {row.mode ? ` · ${row.mode}` : ''}
                          {row.selected_answer ? ` · answered ${row.selected_answer}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium text-foreground">
                          Attempt #{numbers.get(row) ?? '—'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDurationMs(row.time_ms)} · {timeLabel(row.attempted_at)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              </section>
            ))}
          </div>
        ) : (
          <ol className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {rollups.map((q) => (
              <li key={`${q.source}|${q.questionKey}`} className="flex items-center gap-3 px-4 py-3">
                <ResultMark correct={q.lastCorrect} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{q.questionRef}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {SOURCE_LABELS[q.source]}
                    {q.detail ? ` · ${q.detail}` : ''} · last {new Date(q.lastAttemptedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs">
                  <p className="font-medium text-foreground">
                    {q.attempts} attempt{q.attempts === 1 ? '' : 's'}
                    {q.accuracy !== null && ` · ${Math.round(q.accuracy * 100)}%`}
                  </p>
                  <p className="text-muted-foreground">
                    avg {formatDurationMs(q.avgTimeMs)} · total {formatDurationMs(q.totalTimeMs)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
};

export default DrillHistory;
