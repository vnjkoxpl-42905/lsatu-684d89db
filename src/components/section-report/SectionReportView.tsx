import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Flag,
  ChevronDown,
  ChevronUp,
  Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ScoreRing from '@/components/drill/ScoreRing';
import { AnswerTimeline, formatClock } from './AnswerTimeline';
import { SectionDiagnosisBlock } from './SectionDiagnosisBlock';
import type { SectionReportData } from './sectionReportModel';

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTimeMs: number;
}

export interface SectionReportViewProps {
  data: SectionReportData;
  onBack: () => void;
  backLabel?: string;
  /** Opens the read-only review walk (optionally starting at a specific qid). */
  onReviewSection?: (qid?: string) => void;
  /** Opens blind review for a section that does not have one yet. */
  onStartBlindReview?: () => void;
  title?: string;
}

export function SealedSectionReportView({
  pt,
  section,
  reason,
  onBack,
  backLabel = 'Back to Home',
  onStartBlindReview,
}: {
  pt?: number;
  section?: number;
  reason: 'blind-review' | 'practice-test';
  onBack: () => void;
  backLabel?: string;
  onStartBlindReview?: () => void;
}) {
  const sectionName =
    typeof pt === 'number' && pt > 0 && typeof section === 'number' && section > 0
      ? `PT${pt}.S${section}`
      : 'Timed section';

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <h1 className="text-base sm:text-lg font-bold truncate">{sectionName}</h1>
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
              {onStartBlindReview && (
                <div className="pt-2">
                  <Button onClick={onStartBlindReview}>Do blind review</Button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Your answers are saved. This section unlocks once the full practice test is finished.
            </p>
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
  title,
}: SectionReportViewProps) {
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const [showAllTypes, setShowAllTypes] = React.useState(false);

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
    const inOvertime = stats.filter((s) => s.answeredInOvertime);
    if (inOvertime.length === 0) return null;
    const inTime = stats.filter((s) => !s.answeredInOvertime);
    return {
      answered: inTime.length,
      correct: inTime.filter((s) => s.initialCorrect).length,
      overtimeCount: inOvertime.length,
      overtimeCorrect: inOvertime.filter((s) => s.initialCorrect).length,
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
    } else if (activeFilter === 'easy') {
      displayStats = displayStats.filter((s) => s.difficulty <= 2);
    } else if (activeFilter === 'medium') {
      displayStats = displayStats.filter((s) => s.difficulty >= 3 && s.difficulty <= 4);
    } else if (activeFilter === 'hard') {
      displayStats = displayStats.filter((s) => s.difficulty === 5);
    }
  }

  const targetMsPerQuestion = sectionClock?.perQuestionMs ?? null;
  const slowestTimeMs = displayStats.reduce(
    (max, s) => Math.max(max, s.timeMs, s.answerTrail?.[s.answerTrail.length - 1]?.atMs ?? 0),
    0,
  );
  const timelineScaleMs = Math.max(slowestTimeMs, (targetMsPerQuestion ?? 0) * 1.1, 1);

  return (
    <div className="min-h-screen bg-background pb-12">
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-base sm:text-lg font-bold truncate">{heading}</h1>
            <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
              {initialScore}/{initialTotal} · {initialPercent}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            {!brUsed && onStartBlindReview && hasDetail && (
              <Button variant="secondary" size="sm" onClick={onStartBlindReview}>
                Do blind review
              </Button>
            )}
            {onReviewSection && hasDetail ? (
              <Button variant="outline" size="sm" onClick={() => onReviewSection()}>
                Open review walk
              </Button>
            ) : (
              <div className="w-4 sm:w-20" />
            )}
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          {/* Rings */}
          <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-12 mb-8">
            <div className="flex flex-col items-center gap-3">
              <ScoreRing
                value={initialScore}
                total={initialTotal}
                tooltip={`${initialScore} / ${initialTotal}`}
              />
              <div className="text-center">
                <div className="text-xl font-bold">{initialPercent}%</div>
                <div className="text-xs text-muted-foreground">Initial Score</div>
                {typeof predictedScore === 'number' ? (
                  <div className="mt-1 text-xs text-muted-foreground">
                    You guessed {predictedScore}
                    {predictedScore !== initialScore && (
                      <>
                        {' · '}
                        {predictedScore > initialScore ? 'over' : 'under'} by{' '}
                        {Math.abs(predictedScore - initialScore)}
                      </>
                    )}
                  </div>
                ) : showPredictionStatus ? (
                  <div className="mt-1 text-xs text-muted-foreground">No prediction saved</div>
                ) : null}
              </div>
            </div>

            {brScore !== null && (
              <>
                <div className="hidden sm:block w-px h-24 bg-border" />
                <div className="flex flex-col items-center gap-3">
                  <ScoreRing
                    value={brScore}
                    total={initialTotal}
                    tooltip={`${brScore} / ${initialTotal}`}
                  />
                  <div className="text-center">
                    <div className="text-xl font-bold">{brPercent}%</div>
                    <div className="text-xs text-muted-foreground">Blind Review</div>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-24 bg-border" />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div
                        className={cn(
                          'text-3xl font-bold',
                          delta !== null && delta > 0
                            ? 'text-green-600'
                            : delta !== null && delta < 0
                              ? 'text-destructive'
                              : '',
                        )}
                      >
                        {delta !== null && delta > 0 ? '+' : ''}
                        {delta}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {delta !== null && delta > 0 ? '+' : ''}
                      {delta}
                    </div>
                    <div className="text-xs text-muted-foreground">Delta</div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Stat Chips */}
          <div className="flex items-center justify-center gap-6 mb-6">
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
            <div className="mb-6 mx-auto max-w-xl rounded-lg border border-border bg-background/50 px-4 py-3 text-center text-sm">
              <span className="font-medium">
                At time: {regulationSplit.correct}/{regulationSplit.answered} on the{' '}
                {regulationSplit.answered} questions you reached.
              </span>{' '}
              <span className="text-muted-foreground">
                The other {regulationSplit.overtimeCount} were answered after the clock ran out (
                {regulationSplit.overtimeCorrect} right). The score above counts all{' '}
                {regulationSplit.total}.
              </span>
            </div>
          )}

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
                      setActiveFilter(
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
                          setActiveFilter(isActive ? null : `qtype:${area.qtype}`)
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
                  onClick={() => setActiveFilter(activeFilter === 'easy' ? null : 'easy')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'easy'
                      ? 'bg-green-100 dark:bg-green-900/30 ring-2 ring-green-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Easy: {difficultyDist.easy}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'medium' ? null : 'medium')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'medium'
                      ? 'bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Medium: {difficultyDist.medium}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter(activeFilter === 'hard' ? null : 'hard')}
                  className={cn(
                    'flex-1 px-3 sm:px-4 py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium',
                    activeFilter === 'hard'
                      ? 'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-600'
                      : 'bg-muted hover:bg-accent',
                  )}
                >
                  Hard: {difficultyDist.hard}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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

      {/* Question Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-6 space-y-2">
        {!hasDetail ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            The question-by-question record was not kept for this section. The score and timing above are everything that was saved.
          </Card>
        ) : (
          <>
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
                        {stat.answeredInOvertime && (
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
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-600'
                              : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-600',
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
    </div>
  );
}
