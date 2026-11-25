import * as React from 'react';
import './sectionFinishPalette.css';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  X,
  Flag,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { UNANSWERED } from '@/lib/sectionAnswer';
import ScoreRing from '@/components/drill/ScoreRing';
import { AnswerTimeline, formatClock } from './AnswerTimeline';
import { SectionDiagnosisBlock } from './SectionDiagnosisBlock';
import type { SectionReportData } from './sectionReportModel';

const reviewActionClass = 'bg-[var(--section-review-action)] font-serif font-semibold text-white hover:bg-[var(--section-review-action-hover)] focus-visible:ring-[var(--section-review-action)]';

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTimeMs: number;
}

export function PredictionRetryBanner({
  predictedScore,
  retrying = false,
  onRetry,
}: {
  predictedScore: number;
  retrying?: boolean;
  onRetry: () => void;
}) {
  return (
    <div
      role="status"
      className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm flex flex-wrap items-center justify-between gap-3 text-left"
    >
      <span>
        Your prediction ({predictedScore}) did not save yet. Your section is safe.
      </span>
      <button
        type="button"
        disabled={retrying}
        onClick={onRetry}
        className="font-medium underline underline-offset-4 hover:text-foreground disabled:opacity-50"
      >
        {retrying ? 'Retrying...' : 'Retry saving prediction'}
      </button>
    </div>
  );
}

export interface SectionReportViewProps {
  data: SectionReportData;
  onBack: () => void;
  backLabel?: string;
  /** Opens the read-only review walk (optionally starting at a specific qid). */
  onReviewSection?: (qid?: string) => void;
  /** Opens blind review for a section that does not have one yet. */
  onStartBlindReview?: () => void;
  /** Starts the next fresh sitting generation for a standalone section. */
  onStartOver?: () => void;
  /** Non-blocking retry state when initial prediction save failed (F11). */
  pendingPrediction?: number | null;
  retryingPrediction?: boolean;
  onRetryPrediction?: () => void;
  title?: string;
}

export function SealedSectionReportView({
  pt,
  section,
  reason,
  onBack,
  backLabel = 'Back to Home',
  onStartBlindReview,
  onRetryBlindReviewPreparation,
  pendingPrediction,
  retryingPrediction,
  onRetryPrediction,
}: {
  pt?: number;
  section?: number;
  reason: 'blind-review' | 'practice-test';
  onBack: () => void;
  backLabel?: string;
  onStartBlindReview?: () => void;
  onRetryBlindReviewPreparation?: () => void;
  pendingPrediction?: number | null;
  retryingPrediction?: boolean;
  onRetryPrediction?: () => void;
}) {
  const sectionName =
    typeof pt === 'number' && pt > 0 && typeof section === 'number' && section > 0
      ? `PT${pt}.S${section}`
      : 'Timed section';

  return (
    <div className="light section-finish-palette min-h-screen bg-background text-foreground pb-12">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <h1 className="font-serif text-xl font-semibold sm:text-2xl">{sectionName}</h1>
          <div className="w-20" />
        </div>
      </div>

      <div className="max-w-xl mx-auto px-4 sm:px-6 mt-12">
        <Card className="p-6 sm:p-8 text-center space-y-4">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <Lock className="w-5 h-5 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold">Section complete</h2>
          {reason === 'blind-review' ? (
            <>
              <p className="text-sm text-muted-foreground">
                Your answers are saved. Complete blind review to see your score, answers, and section report.
              </p>
              {onRetryBlindReviewPreparation && (
                <div className="space-y-2 pt-2">
                  <p role="alert" className="text-sm text-muted-foreground">
                    Your blind review questions could not load.
                  </p>
                  <Button onClick={onRetryBlindReviewPreparation}>Retry loading questions</Button>
                </div>
              )}
              {onStartBlindReview && (
                <div className="pt-2">
                  <Button className={reviewActionClass} onClick={onStartBlindReview}>Do blind review</Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your answers are saved. This section unlocks once the full practice test is finished.
            </p>
          )}
          {pendingPrediction != null && onRetryPrediction && (
            <PredictionRetryBanner
              predictedScore={pendingPrediction}
              retrying={retryingPrediction}
              onRetry={onRetryPrediction}
            />
          )}
        </Card>
      </div>
    </div>
  );
}

export function SectionReportView({
  data,
  onBack,
  backLabel = 'Back to Home',
  onReviewSection,
  onStartBlindReview,
  onStartOver,
  pendingPrediction,
  retryingPrediction,
  onRetryPrediction,
  title,
}: SectionReportViewProps) {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [showAllTypes, setShowAllTypes] = React.useState(false);
  const [sortByTime, setSortByTime] = React.useState(false);
  const questionHeading = React.useRef<HTMLHeadingElement>(null);

  const filterFromBreakdown = (filter: string | null) => {
    setActiveFilter(filter);
    questionHeading.current?.focus({ preventScroll: true });
    questionHeading.current?.scrollIntoView?.({ block: 'start' });
  };

  const {
    stats,
    initialScore,
    initialTotal,
    initialPercent,
    brScore,
    brPercent,
    brDelta: delta,
    totalTimeMs,
    avgTimeMs,
    unansweredCount,
    predictedScore,
    showPredictionStatus,
    analysis,
    analysisSource,
    brUsed,
    sectionClock,
    hasDetail,
  } = data;

  const heading =
    title ??
    (typeof data.pt === 'number' && data.pt > 0 && typeof data.section === 'number' && data.section > 0
      ? `PT${data.pt}.S${data.section} · Section Report`
      : 'Section Results');

  const allFocusAreas: FocusArea[] = React.useMemo(() => {
    const byType = new Map<string, { correct: number; total: number; timeMs: number }>();
    stats.forEach((s) => {
      if (!byType.has(s.qtype)) {
        byType.set(s.qtype, { correct: 0, total: 0, timeMs: 0 });
      }
      const entry = byType.get(s.qtype)!;
      entry.total++;
      entry.timeMs += s.timeMs;
      if (s.initialCorrect) entry.correct++;
    });

    return Array.from(byType.entries())
      .map(([qtype, { correct, total, timeMs }]) => ({
        qtype,
        correct,
        total,
        accuracy: Math.round((correct / total) * 100),
        avgTimeMs: total > 0 ? Math.round(timeMs / total) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy);
  }, [stats]);

  const focusAreas = allFocusAreas.slice(0, 3);

  const difficultyDist = React.useMemo(() => {
    const dist = { easy: 0, medium: 0, hard: 0 };
    stats.forEach((s) => {
      if (s.difficulty <= 2) dist.easy++;
      else if (s.difficulty <= 4) dist.medium++;
      else dist.hard++;
    });
    return dist;
  }, [stats]);

  const regulationSplit = React.useMemo(() => {
    if (!stats.some((s) => s.answeredInOvertime !== undefined)) return null;
    const answers = stats.filter((s) => s.initialAnswer && s.initialAnswer !== UNANSWERED);
    const inOvertime = answers.filter((s) => s.answeredInOvertime);
    const inTime = answers.filter((s) => !s.answeredInOvertime);
    return {
      answered: inTime.length,
      correct: inTime.filter((s) => s.initialCorrect).length,
      overtimeCount: inOvertime.length,
      overtimeCorrect: inOvertime.filter((s) => s.initialCorrect).length,
      unanswered: stats.length - answers.length,
      total: stats.length,
    };
  }, [stats]);

  const toggleRow = (qid: string) => {
    const next = new Set(expandedRows);
    if (next.has(qid)) next.delete(qid);
    else next.add(qid);
    setExpandedRows(next);
  };

  let displayStats = [...stats];
  if (activeFilter) {
    if (activeFilter.startsWith('qtype:')) {
      const qtype = activeFilter.split(':')[1];
      displayStats = displayStats.filter((s) => s.qtype === qtype);
    } else if (activeFilter === 'incorrect') {
      displayStats = displayStats.filter((s) => !s.initialCorrect && s.initialAnswer && s.initialAnswer !== UNANSWERED);
    } else if (activeFilter === 'unanswered') {
      displayStats = displayStats.filter((s) => !s.initialAnswer || s.initialAnswer === UNANSWERED);
    } else if (activeFilter === 'flagged') {
      displayStats = displayStats.filter((s) => s.flagged);
    } else if (activeFilter === 'easy') {
      displayStats = displayStats.filter((s) => s.difficulty <= 2);
    } else if (activeFilter === 'medium') {
      displayStats = displayStats.filter((s) => s.difficulty >= 3 && s.difficulty <= 4);
    } else if (activeFilter === 'hard') {
      displayStats = displayStats.filter((s) => s.difficulty === 5);
    }
  }

  displayStats.sort((a, b) => (sortByTime ? b.timeMs - a.timeMs : 0) || a.qnum - b.qnum);

  const outcomeFilters = [
    { value: null, label: 'All questions', count: stats.length },
    { value: 'incorrect', label: 'Incorrect', count: stats.filter((stat) => !stat.initialCorrect && stat.initialAnswer && stat.initialAnswer !== UNANSWERED).length },
    { value: 'unanswered', label: 'Unanswered', count: stats.filter((stat) => !stat.initialAnswer || stat.initialAnswer === UNANSWERED).length },
    { value: 'flagged', label: 'Flagged', count: stats.filter((stat) => stat.flagged).length },
  ];

  const activeFilterLabel = activeFilter?.startsWith('qtype:')
    ? `Type: ${activeFilter.slice('qtype:'.length)}`
    : activeFilter
      ? outcomeFilters.find(({ value }) => value === activeFilter)?.label
        ?? `Difficulty: ${activeFilter.charAt(0).toUpperCase()}${activeFilter.slice(1)}`
      : null;
  const canStartBlindReview = !brUsed && Boolean(onStartBlindReview) && hasDetail;

  const targetMsPerQuestion = sectionClock?.perQuestionMs ?? null;
  const slowestTimeMs = displayStats.reduce(
    (max, s) => Math.max(max, s.timeMs, s.answerTrail?.[s.answerTrail.length - 1]?.atMs ?? 0),
    0,
  );
  const timelineScaleMs = Math.max(slowestTimeMs, (targetMsPerQuestion ?? 0) * 1.1, 1);

  return (
    <div className="light section-finish-palette min-h-screen bg-background text-foreground pb-12">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <h1 className="min-w-0 font-serif text-xl font-semibold sm:text-2xl">{heading}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canStartBlindReview && (
              <Button size="sm" className={reviewActionClass} onClick={onStartBlindReview}>
                Do blind review
              </Button>
            )}
            {onStartOver && (
              <Button variant="outline" size="sm" onClick={onStartOver}>
                Start over
              </Button>
            )}
            {onReviewSection && hasDetail && (
              <Button variant={canStartBlindReview ? 'outline' : 'default'} size="sm"
                className={canStartBlindReview ? undefined : reviewActionClass}
                onClick={() => onReviewSection()}>
                Open review walk
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
          {pendingPrediction != null && onRetryPrediction && (
            <div className="mb-6">
              <PredictionRetryBanner
                predictedScore={pendingPrediction}
                retrying={retryingPrediction}
                onRetry={onRetryPrediction}
              />
            </div>
          )}
          <dl className={cn(
            'mb-4 grid overflow-hidden rounded-2xl border border-border bg-white',
            brScore !== null && 'grid-cols-3',
          )}>
            <div className="min-w-0 space-y-2 bg-[var(--section-finish-score)] px-3 py-4 sm:px-6">
              <dt className="text-sm font-medium text-muted-foreground">Initial Score</dt>
              <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                <span className="font-serif text-3xl font-semibold sm:text-4xl">{initialScore}<span className="ml-1 text-base font-normal sm:text-xl text-muted-foreground">/{initialTotal}</span></span>
                <span className="text-sm font-medium">{initialPercent}%</span>
              </dd>
              {typeof predictedScore === 'number' ? (
                <dd className="text-xs text-muted-foreground">
                  You guessed {predictedScore}
                  {predictedScore !== initialScore && (
                    <>
                      {' · '}
                      {predictedScore > initialScore ? 'over' : 'under'} by {Math.abs(predictedScore - initialScore)}
                    </>
                  )}
                </dd>
              ) : showPredictionStatus ? (
                <dd className="text-xs text-muted-foreground">No prediction saved</dd>
              ) : null}
            </div>
            {brScore !== null && (
              <>
                <div className="min-w-0 space-y-2 border-l border-border px-3 py-4 sm:px-6">
                  <dt className="text-sm font-medium text-muted-foreground">Blind Review</dt>
                  <dd className="flex flex-wrap items-baseline gap-x-3 gap-y-1 tabular-nums">
                    <span className="font-serif text-3xl font-semibold sm:text-4xl">{brScore}<span className="ml-1 text-base font-normal sm:text-xl text-muted-foreground">/{initialTotal}</span></span>
                    {brPercent !== null && <span className="text-sm font-medium">{brPercent}%</span>}
                  </dd>
                </div>
                <div className="min-w-0 space-y-2 border-l border-border px-3 py-4 sm:px-6">
                  <dt className="text-sm font-medium text-muted-foreground">Score change</dt>
                  <dd className="font-serif text-3xl font-semibold sm:text-4xl tabular-nums">
                    {delta === null ? '–' : `${delta > 0 ? '+' : ''}${delta}`}
                  </dd>
                </div>
              </>
            )}
          </dl>

          {/* Stat Chips */}
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-sm font-medium">{formatClock(totalTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{formatClock(avgTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Avg per Q</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{unansweredCount}</div>
              <div className="text-xs text-muted-foreground">Unanswered</div>
            </div>
          </div>

          {/* Regulation vs overtime split */}
          {regulationSplit && (
            <div className="mt-4 mx-auto max-w-xl rounded-lg border border-border bg-background/50 px-4 py-3 text-center text-sm">
              <span className="font-medium">
                At time: {regulationSplit.correct}/{regulationSplit.answered} on the{' '}
                {regulationSplit.answered} questions you answered.
              </span>{' '}
              <span className="text-muted-foreground">
                Overtime answers: {regulationSplit.overtimeCount}. Correct in overtime: {regulationSplit.overtimeCorrect}.{' '}
                Unanswered: {regulationSplit.unanswered}. The score above counts all{' '}
                {regulationSplit.total}.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-2">
        {!hasDetail ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            The question-by-question record was not kept for this section. The score and timing above are everything that was saved.
          </Card>
        ) : (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 ref={questionHeading} tabIndex={-1} className="scroll-mt-28 font-serif text-2xl font-semibold">Question review</h2>
              <label className="flex items-center gap-2 text-sm text-muted-foreground">
                Sort by
                <select
                  value={sortByTime ? 'time' : 'question'}
                  onChange={(event) => setSortByTime(event.currentTarget.value === 'time')}
                  className="rounded-md border border-border bg-card px-2 py-1.5 text-foreground"
                >
                  <option value="question">Question number</option>
                  <option value="time">Time spent</option>
                </select>
              </label>
            </div>
            <div role="group" aria-label="Filter questions" className="flex flex-wrap gap-2 py-2">
              {outcomeFilters.map(({ value, label, count }) => (
                <Button key={label} type="button" size="sm"
                  variant={activeFilter === value ? 'secondary' : 'outline'}
                  aria-pressed={activeFilter === value}
                  onClick={() => setActiveFilter(value)}>
                  {label} <span className="ml-1.5 tabular-nums text-muted-foreground">{count}</span>
                </Button>
              ))}
            </div>
            <div className="flex min-h-8 flex-wrap items-center gap-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">{displayStats.length} of {stats.length} questions</p>
              {activeFilterLabel && (
                <Button variant="outline" size="sm" className="h-auto rounded-full px-3 py-1 text-xs"
                  aria-label={`Clear filter: ${activeFilterLabel}`}
                  onClick={() => {
                    setActiveFilter(null);
                    questionHeading.current?.focus({ preventScroll: true });
                  }}>
                  {activeFilterLabel}<X className="ml-1.5 h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              )}
            </div>
            {displayStats.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No questions match this filter. Clear it to see all questions.</p>
            )}
            <div className="flex flex-wrap items-center justify-end gap-4 pb-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full border border-border bg-background" />
                answer changed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-green-600" />
                <span className="inline-block w-3.5 h-3.5 rounded-full bg-destructive" />
                answer scored
              </span>
              {sectionClock && (
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-px h-3.5 bg-foreground/40" />
                  pace · {formatClock(sectionClock.totalMs)} section
                  {sectionClock.label ? ` · ${sectionClock.label}` : ''}
                </span>
              )}
            </div>
            {displayStats.map((stat) => {
              const isExpanded = expandedRows.has(stat.qid);

              return (
                <Card
                  key={stat.qid}
                  className={cn(
                    'overflow-hidden transition-all',
                    isExpanded && 'ring-2 ring-primary',
                  )}
                >
                  <button
                    type="button"
                    onClick={() => toggleRow(stat.qid)}
                    aria-expanded={isExpanded}
                    className="w-full flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 py-4 hover:bg-accent/30 transition-colors text-left"
                  >
                    <div className="w-12 sm:w-14 flex-shrink-0 text-base font-mono font-bold">
                      Q{stat.qnum}
                    </div>

                    <div className="w-36 sm:w-40 flex-shrink-0">
                      <div className="text-sm sm:text-base font-semibold leading-tight">
                        {stat.qtype}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Level {stat.difficulty}
                        {stat.answeredInOvertime && stat.initialAnswer && stat.initialAnswer !== UNANSWERED && (
                          <span className="ml-1.5 text-amber-600" title="Answered after time">
                            · overtime
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                        title={`Correct answer: ${stat.correctAnswer}`}
                      >
                        {stat.correctAnswer}
                      </Badge>
                    </div>

                    <AnswerTimeline
                      stat={stat}
                      scaleMs={timelineScaleMs}
                      targetMs={targetMsPerQuestion}
                    />

                    <div className="flex-shrink-0">
                      {stat.flagged && <Flag className="w-4 h-4 text-amber-600" />}
                    </div>

                    <div className="w-12 sm:w-16 flex-shrink-0 text-sm text-muted-foreground text-right">
                      {stat.switchCount > 0 && `${stat.switchCount}×`}
                    </div>

                    <div className="flex-shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-muted-foreground" />
                      )}
                    </div>
                  </button>

                  {stat.brChanged && stat.brAnswer && (
                    <div className="px-4 py-2 bg-accent/20 border-t flex flex-wrap items-center gap-4 text-sm">
                      <div className="w-12 flex-shrink-0 text-xs text-muted-foreground">BR</div>
                      <div className="hidden sm:block w-32 flex-shrink-0" />

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm',
                            stat.brCorrect
                              ? 'bg-green-100 text-green-700 border-green-600'
                              : 'bg-red-100 text-red-700 border-red-600',
                          )}
                        >
                          {stat.brAnswer}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge
                          variant="outline"
                          className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                        >
                          {stat.correctAnswer}
                        </Badge>
                      </div>

                      <div className="flex-shrink-0">
                        {stat.brCorrect ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-destructive" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 text-sm font-mono text-muted-foreground">
                        {stat.brTimeMs ? formatClock(stat.brTimeMs) : '-'}
                      </div>

                      <div className="flex-shrink-0 text-xs">
                        Changed: {stat.initialAnswer} → {stat.brAnswer}
                      </div>
                    </div>
                  )}

                  {isExpanded && (
                    <div className="px-4 py-3 border-t bg-accent/10 text-xs space-y-2">
                      <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <div>
                          Your answer:{' '}
                          <span className="font-mono font-semibold">{stat.initialAnswer}</span>
                        </div>
                        <div>
                          Correct answer:{' '}
                          <span className="font-mono font-semibold">{stat.correctAnswer}</span>
                        </div>
                        <div>
                          Time: <span className="font-mono">{formatClock(stat.timeMs)}</span>
                        </div>
                        <div>Switches: {stat.switchCount}</div>
                      </div>
                      <div className="pt-1 flex flex-wrap gap-4">
                        {onReviewSection ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onReviewSection(stat.qid);
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Open in review walk
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/drill', {
                                state: {
                                  mode: 'type-drill',
                                  config: {
                                    qtypes: [],
                                    difficulties: [],
                                    pts: [],
                                    count: 1,
                                    selectedQids: [stat.qid],
                                  },
                                },
                              });
                            }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Review this question
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </>
        )}
      </div>

      {hasDetail && (
        <section aria-label="Section breakdown" className="mx-auto mt-8 max-w-7xl px-4 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          {/* Top 3 Focus Areas & by-type table */}
          {hasDetail && focusAreas.length > 0 && (
            <div className="mb-6">
              <div className="text-xs text-muted-foreground mb-3 text-center">Top 3 Focus Areas</div>
              <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
                {focusAreas.map((area) => (
                  <button
                    key={`top-${area.qtype}`}
                    type="button"
                    onClick={() =>
                      filterFromBreakdown(
                        activeFilter === `qtype:${area.qtype}` ? null : `qtype:${area.qtype}`,
                      )
                    }
                    className={cn(
                      'flex flex-col items-center gap-2 p-3 rounded-lg transition-colors',
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
                    <div className="text-xs font-medium">{area.qtype}</div>
                    <div className="text-xs text-muted-foreground">
                      {area.correct}/{area.total}
                    </div>
                  </button>
                ))}
              </div>

              {allFocusAreas.length > focusAreas.length && (
                <div className="mt-4 flex justify-center">
                  <button
                    type="button"
                    onClick={() => setShowAllTypes((v) => !v)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                    aria-expanded={showAllTypes}
                  >
                    {showAllTypes ? 'Hide' : 'Show all types'}
                    {showAllTypes ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              )}

              {showAllTypes && (
                <div className="mt-3 max-w-xl mx-auto divide-y divide-border rounded-lg border border-border bg-card overflow-hidden">
                  {allFocusAreas.map((area) => {
                    const isActive = activeFilter === `qtype:${area.qtype}`;
                    return (
                      <button
                        key={`all-${area.qtype}`}
                        type="button"
                        onClick={() =>
                          filterFromBreakdown(isActive ? null : `qtype:${area.qtype}`)
                        }
                        className={cn(
                          'w-full flex items-center gap-3 px-3 py-2 text-left transition-colors',
                          isActive
                            ? 'bg-primary/10 ring-1 ring-inset ring-primary'
                            : 'hover:bg-accent/40',
                        )}
                      >
                        <div className="flex-1 min-w-0 text-sm font-medium truncate">
                          {area.qtype}
                        </div>
                        <div className="text-xs font-mono text-muted-foreground tabular-nums">
                          {area.correct}/{area.total}
                        </div>
                        <div
                          className={cn(
                            'text-xs font-semibold tabular-nums w-10 text-right',
                            area.accuracy < 50 ? 'text-destructive' : 'text-foreground',
                          )}
                        >
                          {area.accuracy}%
                        </div>
                        <div className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                          {formatClock(area.avgTimeMs)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Difficulty Distribution */}
          {hasDetail && (
            <div>
              <div className="text-xs text-muted-foreground mb-3 text-center">
                Difficulty Distribution
              </div>
              <div className="flex items-center gap-3 max-w-xl mx-auto">
                <button
                  type="button"
                  onClick={() => filterFromBreakdown(activeFilter === 'easy' ? null : 'easy')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'easy'
                      ? 'bg-green-100 ring-2 ring-green-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Easy: {difficultyDist.easy}
                </button>
                <button
                  type="button"
                  onClick={() => filterFromBreakdown(activeFilter === 'medium' ? null : 'medium')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'medium'
                      ? 'bg-yellow-100 ring-2 ring-yellow-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Medium: {difficultyDist.medium}
                </button>
                <button
                  type="button"
                  onClick={() => filterFromBreakdown(activeFilter === 'hard' ? null : 'hard')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'hard'
                      ? 'bg-red-100 ring-2 ring-red-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Hard: {difficultyDist.hard}
                </button>
              </div>
            </div>
          )}
          </div>
        </section>
      )}
      {/* Diagnosis */}
      {analysis && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6">
          <SectionDiagnosisBlock
            analysis={analysis}
            analysisSource={analysisSource}
            brUsed={brUsed}
          />
        </div>
      )}
    </div>
  );
}
