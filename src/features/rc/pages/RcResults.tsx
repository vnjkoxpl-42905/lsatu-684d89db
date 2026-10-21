import * as React from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Flag,
  XCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import ScoreRing from '@/components/drill/ScoreRing';
import {
  createSession,
  getSession,
  getSessionAttempts,
  setSessionExcluded,
} from '../api/rcProgress';
import { loadPassages } from '../lib/rcBank';
import { buildItems, type RcSessionItem } from '../lib/rcSession';
import {
  RC_SECONDS_PER_QUESTION_BUDGET,
  type RcAttempt,
  type RcDrillSession,
  type RcPassage,
} from '../lib/rcTypes';
import '../rc.css';

/** m:ss. Results show real recorded time, never an estimate. */
function clock(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function signedClock(ms: number): string {
  return (ms >= 0 ? '+' : '-') + clock(Math.abs(ms));
}

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
}

export default function RcResults() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  /**
   * Set when this section was one leg of something larger — a practice test.
   * Same-origin paths only; it arrives on the query string.
   */
  const returnToParam = searchParams.get('returnTo');
  const returnTo =
    returnToParam && returnToParam.startsWith('/') && !returnToParam.startsWith('//')
      ? returnToParam
      : null;

  const [session, setSession] = React.useState<RcDrillSession | null>(null);
  const [passages, setPassages] = React.useState<RcPassage[]>([]);
  const [attempts, setAttempts] = React.useState<RcAttempt[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [excluded, setExcluded] = React.useState(false);
  const [expandedRows, setExpandedRows] = React.useState<Set<number>>(new Set());
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [showAllTypes, setShowAllTypes] = React.useState(false);

  // Force dark mode, as the drill pages do. This route is mounted outside
  // Drill.tsx, so without it a student on the light theme would get a light
  // results screen while the LR one stays dark.
  React.useEffect(() => {
    const root = document.documentElement;
    const wasLight = root.classList.contains('light');
    root.classList.remove('light');
    return () => {
      if (wasLight) root.classList.add('light');
    };
  }, []);

  React.useEffect(() => {
    if (!sessionId) return;
    let cancelled = false;
    (async () => {
      try {
        const s = await getSession(sessionId);
        if (!s) throw new Error('That drill could not be found.');
        const [ps, as] = await Promise.all([
          loadPassages(s.passageIds),
          getSessionAttempts(sessionId),
        ]);
        if (cancelled) return;
        setSession(s);
        setExcluded(s.excludedFromAnalytics);
        setPassages(ps);
        setAttempts(as);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  const items = React.useMemo(() => buildItems(passages), [passages]);

  /** Scoring uses first attempts only, so a review re-answer never inflates it. */
  const firstAttempts = React.useMemo(() => {
    const map = new Map<number, RcAttempt>();
    for (const a of attempts) if (a.isFirstAttempt) map.set(a.questionId, a);
    return map;
  }, [attempts]);

  /** Accuracy per question type, weakest first — the same rollup LR uses. */
  const allFocusAreas: FocusArea[] = React.useMemo(() => {
    const by = new Map<string, { correct: number; total: number }>();
    for (const item of items) {
      const qtype = item.question.questionType || 'Unclassified';
      const row = by.get(qtype) ?? { correct: 0, total: 0 };
      row.total += 1;
      if (firstAttempts.get(item.question.questionId)?.isCorrect === true) row.correct += 1;
      by.set(qtype, row);
    }
    return [...by.entries()]
      .map(([qtype, r]) => ({
        qtype,
        ...r,
        accuracy: r.total > 0 ? Math.round((r.correct / r.total) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [items, firstAttempts]);

  if (error) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mx-auto max-w-2xl space-y-4 pt-16 text-center">
          <h1 className="text-2xl font-bold">Results</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={() => navigate('/rc')}>Go to Reading Comprehension</Button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading your results…</p>
      </div>
    );
  }

  const total = items.length;
  const correct = items.filter(
    (i) => firstAttempts.get(i.question.questionId)?.isCorrect === true,
  ).length;
  const answered = items.filter((i) => firstAttempts.get(i.question.questionId)?.selected).length;
  const totalMs = [...firstAttempts.values()].reduce((n, a) => n + a.timeMs, 0);
  const percent = total > 0 ? Math.round((correct / total) * 100) : 0;
  const avgMs = answered > 0 ? totalMs / answered : 0;
  const isTimed = session.config.timing.mode === 'per_passage_budget';

  const perPassage = passages.map((p) => {
    const own = items.filter((i) => i.passage.passageId === p.passageId);
    const right = own.filter(
      (i) => firstAttempts.get(i.question.questionId)?.isCorrect === true,
    ).length;
    const ms = own.reduce((n, i) => n + (firstAttempts.get(i.question.questionId)?.timeMs ?? 0), 0);
    return { passage: p, count: own.length, right, ms, avgMs: own.length ? ms / own.length : 0 };
  });

  const focusAreas = allFocusAreas.slice(0, 3);

  const difficultyDist = items.reduce(
    (acc, i) => {
      const d = i.question.difficulty ?? 0;
      if (d <= 2) acc.easy += 1;
      else if (d <= 4) acc.medium += 1;
      else acc.hard += 1;
      return acc;
    },
    { easy: 0, medium: 0, hard: 0 },
  );

  const visibleItems = items.filter((i) => {
    if (!activeFilter) return true;
    if (activeFilter.startsWith('qtype:')) {
      return (i.question.questionType || 'Unclassified') === activeFilter.slice(6);
    }
    const d = i.question.difficulty ?? 0;
    if (activeFilter === 'easy') return d <= 2;
    if (activeFilter === 'medium') return d >= 3 && d <= 4;
    if (activeFilter === 'hard') return d >= 5;
    return true;
  });

  const missedPassageIds = [
    ...new Set(
      items
        .filter((i) => firstAttempts.get(i.question.questionId)?.isCorrect === false)
        .map((i) => i.passage.passageId),
    ),
  ];

  const drillMisses = async () => {
    const fresh = await createSession({ ...session.config, source: 'manual' }, missedPassageIds);
    navigate('/rc/drill?sessionId=' + fresh.id);
  };

  const toggleExcluded = async () => {
    const next = !excluded;
    setExcluded(next);
    await setSessionExcluded(session.id, next);
  };

  const toggleRow = (id: number) =>
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleFilter = (key: string) =>
    setActiveFilter((prev) => (prev === key ? null : key));

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-20 border-b bg-card shadow-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => navigate('/rc')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Reading Comprehension
            </Button>
            <h1 className="text-2xl font-bold">Drill Results</h1>
            <div className="w-24" />
          </div>

          {/* Score. No PrepTest-equivalent and no percentile: we do not have the
              cohort data those would need. */}
          <div className="mb-8 flex items-center justify-center gap-12">
            <div className="flex flex-col items-center gap-3">
              <ScoreRing value={correct} total={total} tooltip={`${correct} / ${total}`} />
              <div className="text-center">
                <div className="text-xl font-bold">{percent}%</div>
                <div className="text-xs text-muted-foreground">Score</div>
              </div>
            </div>
            <div className="h-24 w-px bg-border" />
            <div className="flex flex-col items-center gap-3">
              <ScoreRing
                value={passages.length}
                total={passages.length}
                arcClassName="text-muted-foreground/40"
              >
                <div className="text-3xl font-bold">{passages.length}</div>
                <div className="text-sm text-muted-foreground">
                  passage{passages.length === 1 ? '' : 's'}
                </div>
              </ScoreRing>
              <div className="text-center">
                <div className="text-xl font-bold">{isTimed ? 'Timed' : 'Untimed'}</div>
                <div className="text-xs text-muted-foreground">Conditions</div>
              </div>
            </div>
          </div>

          {/* Stat chips */}
          <div className="mb-6 flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-sm font-medium">{clock(totalMs)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{clock(avgMs)}</div>
              <div className="text-xs text-muted-foreground">Avg per Q</div>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{total - answered}</div>
              <div className="text-xs text-muted-foreground">Unanswered</div>
            </div>
          </div>

          {/* Top 3 Focus Areas */}
          {focusAreas.length > 0 && (
            <div className="mb-6">
              <div className="mb-3 text-center text-xs text-muted-foreground">
                Top {focusAreas.length} Focus Area{focusAreas.length === 1 ? '' : 's'}
              </div>
              <div className="flex items-center justify-center gap-6">
                {focusAreas.map((area) => (
                  <button
                    key={`top-${area.qtype}`}
                    onClick={() => toggleFilter(`qtype:${area.qtype}`)}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-lg p-3 transition-colors',
                      activeFilter === `qtype:${area.qtype}`
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-accent/30',
                    )}
                  >
                    <ScoreRing
                      value={area.accuracy}
                      total={100}
                      radius={28}
                      strokeWidth={4}
                      arcClassName={area.accuracy < 50 ? 'text-destructive' : 'text-primary'}
                      tooltip={`${area.correct} / ${area.total}`}
                      compact
                    >
                      <div className="text-sm font-bold">{area.accuracy}%</div>
                    </ScoreRing>
                    <div className="max-w-[9rem] truncate text-xs font-medium">{area.qtype}</div>
                    <div className="text-xs text-muted-foreground">
                      {area.correct}/{area.total}
                    </div>
                  </button>
                ))}
              </div>

              {allFocusAreas.length > 3 && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setShowAllTypes((v) => !v)}
                    aria-expanded={showAllTypes}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {showAllTypes ? 'Hide' : 'Show all types'}
                    {showAllTypes ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>

                  {showAllTypes && (
                    <div className="mx-auto mt-3 max-w-xl divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                      {allFocusAreas.map((area) => (
                        <button
                          key={`all-${area.qtype}`}
                          onClick={() => toggleFilter(`qtype:${area.qtype}`)}
                          className={cn(
                            'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                            activeFilter === `qtype:${area.qtype}`
                              ? 'bg-primary/10 ring-1 ring-inset ring-primary'
                              : 'hover:bg-accent/40',
                          )}
                        >
                          <span className="min-w-0 flex-1 truncate text-sm font-medium">
                            {area.qtype}
                          </span>
                          <span className="font-mono text-xs tabular-nums text-muted-foreground">
                            {area.correct}/{area.total}
                          </span>
                          <span
                            className={cn(
                              'w-10 text-right text-xs font-semibold tabular-nums',
                              area.accuracy < 50 && 'text-destructive',
                            )}
                          >
                            {area.accuracy}%
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Difficulty distribution */}
          <div>
            <div className="mb-3 text-center text-xs text-muted-foreground">By difficulty</div>
            <div className="mx-auto flex max-w-xl items-center gap-3">
              {(
                [
                  ['easy', 'Easy', difficultyDist.easy, 'bg-green-900/30 ring-2 ring-green-600'],
                  ['medium', 'Medium', difficultyDist.medium, 'bg-yellow-900/30 ring-2 ring-yellow-600'],
                  ['hard', 'Hard', difficultyDist.hard, 'bg-red-900/30 ring-2 ring-red-600'],
                ] as const
              ).map(([key, label, count, activeClass]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={cn(
                    'flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
                    activeFilter === key ? activeClass : 'bg-muted hover:bg-accent',
                  )}
                >
                  {label}: {count}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* By passage */}
      <div className="mx-auto mt-6 max-w-7xl px-6">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">By passage</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {perPassage.map((p) => (
            <Card key={p.passage.passageId} className="p-4">
              <div className="mb-2 font-semibold">{p.passage.title}</div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {p.passage.topic && (
                  <Badge variant="outline" className="text-xs">
                    {p.passage.topic}
                  </Badge>
                )}
                {p.passage.format && (
                  <Badge variant="outline" className="text-xs">
                    {p.passage.format}
                  </Badge>
                )}
                {p.passage.frameworks.map((f) => (
                  <Badge variant="outline" className="text-xs" key={f}>
                    {f}
                  </Badge>
                ))}
              </div>
              <div className="text-sm text-muted-foreground">
                {p.right} / {p.count} · difficulty {p.passage.difficulty ?? '—'} ·{' '}
                {clock(p.avgMs)} per question
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Every question */}
      <div className="mx-auto mt-8 max-w-7xl space-y-2 px-6">
        <h2 className="mb-3 text-xs uppercase tracking-wide text-muted-foreground">
          Every question
          {activeFilter && (
            <button
              onClick={() => setActiveFilter(null)}
              className="ml-2 font-medium normal-case text-primary hover:underline"
            >
              clear filter
            </button>
          )}
        </h2>

        {visibleItems.map((item: RcSessionItem) => {
          const a = firstAttempts.get(item.question.questionId);
          const isExpanded = expandedRows.has(item.question.questionId);
          const deltaMs = a ? a.timeMs - RC_SECONDS_PER_QUESTION_BUDGET * 1000 : 0;
          const picked = a?.selected ?? '—';
          const isRight = a?.isCorrect === true;

          return (
            <Card
              key={item.question.questionId}
              className={cn('overflow-hidden transition-all', isExpanded && 'ring-2 ring-primary')}
            >
              <button
                onClick={() => toggleRow(item.question.questionId)}
                className="flex w-full items-center gap-4 px-4 py-3 text-left transition-colors hover:bg-accent/30"
              >
                <div className="w-12 flex-shrink-0 font-mono text-sm font-bold">
                  Q{item.number}
                </div>
                <div className="w-40 flex-shrink-0">
                  <div className="truncate text-sm font-medium">{item.question.questionType}</div>
                  <div className="text-xs text-muted-foreground">
                    Level {item.question.difficulty ?? '—'}
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full font-mono text-sm',
                    isRight
                      ? 'border-green-600 bg-green-900/30 text-green-400'
                      : picked === '—'
                        ? 'bg-muted'
                        : 'border-red-600 bg-red-900/30 text-red-400',
                  )}
                >
                  {picked}
                </Badge>
                <Badge
                  variant="outline"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-muted font-mono text-sm"
                >
                  {item.question.correctAnswer}
                </Badge>
                {isRight ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" />
                )}
                <div className="min-w-0 flex-1 font-mono text-sm">
                  {a ? clock(a.timeMs) : '—'}
                  {a && isTimed && (
                    <span
                      className={cn(
                        'ml-2 text-xs',
                        deltaMs > 0 ? 'text-destructive' : 'text-green-600',
                      )}
                    >
                      {signedClock(deltaMs)}
                    </span>
                  )}
                </div>
                {a?.flagged && <Flag className="h-4 w-4 text-amber-600" />}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </button>

              {isExpanded && (
                <div className="space-y-2 border-t bg-accent/10 px-4 py-3 text-xs">
                  <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <span className="text-muted-foreground">
                      Passage:{' '}
                      <span className="font-semibold text-foreground">{item.passage.title}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Your answer: <span className="font-mono font-semibold">{picked}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Credited:{' '}
                      <span className="font-mono font-semibold">
                        {item.question.correctAnswer}
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      Time: <span className="font-mono font-semibold">{a ? clock(a.timeMs) : '—'}</span>
                    </span>
                  </div>
                  {/* Response shares are only shown where the source published
                      them; a missing percentage is left out, never guessed. */}
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
                    {item.question.choices
                      .filter((c) => c.percent != null)
                      .map((c) => (
                        <span key={c.letter}>
                          {c.letter}: <span className="tabular-nums">{c.percent}%</span>
                        </span>
                      ))}
                  </div>
                  <button
                    onClick={() =>
                      navigate(
                        `/rc/drill?sessionId=${session.id}&review=1&q=${item.question.questionId}`,
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                  >
                    Review this question
                  </button>
                </div>
              )}
            </Card>
          );
        })}

        {visibleItems.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Nothing matches that filter.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="mx-auto mt-8 flex max-w-7xl flex-wrap gap-3 px-6">
        {/* Inside a practice test the sitting is not over, so getting back to it
            is the primary action and everything else waits until the end. */}
        {returnTo && (
          <Button onClick={() => navigate(returnTo)}>Back to your practice test</Button>
        )}
        <Button
          variant={returnTo ? 'outline' : 'default'}
          onClick={() => navigate(`/rc/drill?sessionId=${session.id}&review=1`)}
        >
          Review all
        </Button>
        <Button
          variant="outline"
          disabled={missedPassageIds.length === 0}
          title={
            missedPassageIds.length === 0 ? 'You did not miss anything in this drill' : undefined
          }
          onClick={drillMisses}
        >
          Drill your misses
        </Button>
        <Button variant="outline" onClick={() => navigate('/rc')}>
          New drill
        </Button>
        <Button
          variant={excluded ? 'secondary' : 'ghost'}
          aria-pressed={excluded}
          onClick={toggleExcluded}
        >
          {excluded ? 'Counted in your progress' : 'Exclude from analytics'}
        </Button>
      </div>
    </div>
  );
}
