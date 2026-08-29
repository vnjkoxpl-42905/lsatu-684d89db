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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import ScoreRing from '@/components/drill/ScoreRing';
import { questionBank } from '@/lib/questionLoader';
import { useAuth } from '@/contexts/AuthContext';
import {
  buildSectionStats,
  buildSectionTotals,
  logSectionWrongAnswers,
  persistSectionResults,
  wajQidsForSection,
  type SectionQuestionStat,
} from '@/lib/sectionHistorySave';
import type { DrillSession, BlindReviewResult } from '@/types/drill';
import { toast } from 'sonner';

interface LRSectionResultsProps {
  session: DrillSession;
  brResults?: BlindReviewResult[];
  classId: string;
  onBack: () => void;
  /**
   * What the back control says. A section sat inside a practice test is not
   * over when this screen appears, so "Back to Home" would be a lie about
   * where that button goes.
   */
  backLabel?: string;
  /**
   * What the student guessed before seeing the score, if they guessed. Shown
   * beside the real number, because the gap between the two is the point of
   * having asked.
   */
  predictedScore?: number | null;
}

type QuestionStat = SectionQuestionStat;

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTimeMs: number;
}

export function LRSectionResults({ session, brResults, classId, onBack, backLabel = 'Back to Home', predictedScore }: LRSectionResultsProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expandedRows, setExpandedRows] = React.useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = React.useState<string | null>(null);
  const savedRef = React.useRef(false);
  const [showAllTypes, setShowAllTypes] = React.useState(false);

  // Built by the shared helper so this screen and the practice-test closeout can
  // never disagree about what the section scored.
  const stats: QuestionStat[] = React.useMemo(
    () => buildSectionStats(session, brResults),
    [session, brResults],
  );

  const {
    initialScore,
    initialTotal,
    initialPercent,
    brScore,
    brPercent,
    delta,
    totalTimeMs,
    avgTimeMs,
    unansweredCount,
  } = React.useMemo(
    () => buildSectionTotals(stats, brResults),
    [stats, brResults],
  );

  // Per-question-type breakdown, sorted by lowest accuracy first so the
  // weakest areas surface at the top of "Show all types".
  const allFocusAreas: FocusArea[] = React.useMemo(() => {
    const byType = new Map<string, { correct: number; total: number; timeMs: number }>();

    stats.forEach((s) => {
      if (!byType.has(s.qtype)) {
        byType.set(s.qtype, { correct: 0, total: 0, timeMs: 0 });
      }
      const data = byType.get(s.qtype)!;
      data.total++;
      data.timeMs += s.timeMs;
      if (s.initialCorrect) data.correct++;
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

  // Difficulty distribution
  const difficultyDist = React.useMemo(() => {
    const dist = { easy: 0, medium: 0, hard: 0 };
    stats.forEach(s => {
      if (s.difficulty <= 2) dist.easy++;
      else if (s.difficulty <= 4) dist.medium++;
      else dist.hard++;
    });
    return dist;
  }, [stats]);

  // Save to database
  React.useEffect(() => {
    const saveHistory = async () => {
      if (!user || savedRef.current) return;
      savedRef.current = true;

      try {
        await persistSectionResults({
          session,
          stats,
          brResults,
          classId,
          userId: user.id,
        });

        // Every question that was not answered correctly, answered or not. On the
        // standalone path nothing else journals this section, so the whole set
        // belongs here.
        await logSectionWrongAnswers({
          stats,
          qids: wajQidsForSection(stats),
          classId,
        });
      } catch (error) {
        toast.error('Failed to save section results. Please try again.');
        console.error('Failed to save section history:', error);
      }
    };

    saveHistory();
  }, []);

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  const toggleRow = (qid: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(qid)) {
      newExpanded.delete(qid);
    } else {
      newExpanded.add(qid);
    }
    setExpandedRows(newExpanded);
  };

  // Filter stats
  let displayStats = [...stats];
  if (activeFilter) {
    if (activeFilter.startsWith('qtype:')) {
      const qtype = activeFilter.split(':')[1];
      displayStats = displayStats.filter(s => s.qtype === qtype);
    } else if (activeFilter === 'easy') {
      displayStats = displayStats.filter(s => s.difficulty <= 2);
    } else if (activeFilter === 'medium') {
      displayStats = displayStats.filter(s => s.difficulty >= 3 && s.difficulty <= 4);
    } else if (activeFilter === 'hard') {
      displayStats = displayStats.filter(s => s.difficulty === 5);
    }
  }

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-6">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              {backLabel}
            </Button>
            <h1 className="text-2xl font-bold">Section Results</h1>
            <div className="w-24" />
          </div>

          {/* Rings */}
          <div className="flex items-center justify-center gap-12 mb-8">
            {/* Initial Score Ring */}
            <div className="flex flex-col items-center gap-3">
              <ScoreRing
                value={initialScore}
                total={initialTotal}
                tooltip={`${initialScore} / ${initialTotal}`}
              />
              <div className="text-center">
                <div className="text-xl font-bold">{initialPercent}%</div>
                <div className="text-xs text-muted-foreground">Initial Score</div>
                {typeof predictedScore === 'number' && (
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
                )}
              </div>
            </div>

            {/* BR Score Ring (if BR was done) */}
            {brScore !== null && (
              <>
                <div className="w-px h-24 bg-border" />
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

                {/* Delta Ring */}
                <div className="w-px h-24 bg-border" />
                <div className="flex flex-col items-center gap-3">
                  <div className="relative w-32 h-32">
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <div className={cn(
                        "text-3xl font-bold",
                        delta! > 0 ? "text-green-600" : delta! < 0 ? "text-destructive" : ""
                      )}>
                        {delta! > 0 ? '+' : ''}{delta}
                      </div>
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl font-bold">
                      {delta! > 0 ? '+' : ''}{delta}
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
              <div className="text-sm font-medium">{formatTime(totalTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Total Time</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{formatTime(avgTimeMs)}</div>
              <div className="text-xs text-muted-foreground">Avg per Q</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-sm font-medium">{unansweredCount}</div>
              <div className="text-xs text-muted-foreground">Unanswered</div>
            </div>
          </div>

          {/* Top 3 Focus Areas */}
          <div className="mb-6">
            <div className="text-xs text-muted-foreground mb-3 text-center">Top 3 Focus Areas</div>
            <div className="flex items-center justify-center gap-6">
              {focusAreas.map((area) => (
                <button
                  key={`top-${area.qtype}`}
                  onClick={() => setActiveFilter(activeFilter === `qtype:${area.qtype}` ? null : `qtype:${area.qtype}`)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-lg transition-colors",
                    activeFilter === `qtype:${area.qtype}`
                      ? "bg-primary/10 ring-2 ring-primary"
                      : "hover:bg-accent/30"
                  )}
                >
                  <ScoreRing
                    value={area.accuracy}
                    total={100}
                    radius={28}
                    strokeWidth={4}
                    arcClassName={area.accuracy < 50 ? "text-destructive" : "text-primary"}
                    tooltip={`${area.correct} / ${area.total}`}
                    compact
                  >
                    <div className="text-sm font-bold">{area.accuracy}%</div>
                  </ScoreRing>
                  <div className="text-xs font-medium">{area.qtype}</div>
                  <div className="text-xs text-muted-foreground">{area.correct}/{area.total}</div>
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
                  {showAllTypes ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                          : 'hover:bg-accent/40'
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
                          area.accuracy < 50 ? 'text-destructive' : 'text-foreground'
                        )}
                      >
                        {area.accuracy}%
                      </div>
                      <div className="text-xs text-muted-foreground tabular-nums w-12 text-right">
                        {formatTime(area.avgTimeMs)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Difficulty Distribution */}
          <div>
            <div className="text-xs text-muted-foreground mb-3 text-center">Difficulty Distribution</div>
            <div className="flex items-center gap-3 max-w-xl mx-auto">
              <button
                onClick={() => setActiveFilter(activeFilter === 'easy' ? null : 'easy')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'easy' 
                    ? "bg-green-100 dark:bg-green-900/30 ring-2 ring-green-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Easy: {difficultyDist.easy}
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'medium' ? null : 'medium')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'medium' 
                    ? "bg-yellow-100 dark:bg-yellow-900/30 ring-2 ring-yellow-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Medium: {difficultyDist.medium}
              </button>
              <button
                onClick={() => setActiveFilter(activeFilter === 'hard' ? null : 'hard')}
                className={cn(
                  "flex-1 px-4 py-2 rounded-lg transition-colors text-sm font-medium",
                  activeFilter === 'hard' 
                    ? "bg-red-100 dark:bg-red-900/30 ring-2 ring-red-600" 
                    : "bg-muted hover:bg-accent"
                )}
              >
                Hard: {difficultyDist.hard}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Question Table */}
      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-2">
        {displayStats.map((stat) => {
          const isExpanded = expandedRows.has(stat.qid);
          
          return (
            <Card
              key={stat.qid}
              className={cn(
                "overflow-hidden transition-all",
                isExpanded && "ring-2 ring-primary"
              )}
            >
              {/* Main Row */}
              <button
                onClick={() => toggleRow(stat.qid)}
                className="w-full flex items-center gap-4 px-4 py-3 hover:bg-accent/30 transition-colors text-left"
              >
                {/* Q# */}
                <div className="w-12 flex-shrink-0 text-sm font-mono font-bold">
                  Q{stat.qnum}
                </div>

                {/* Type & Difficulty */}
                <div className="w-32 flex-shrink-0">
                  <div className="text-sm font-medium">{stat.qtype}</div>
                  <div className="text-xs text-muted-foreground">
                    Level {stat.difficulty}
                  </div>
                </div>

                {/* Initial Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm",
                      stat.initialCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-600" : 
                      stat.initialAnswer === '—' ? "bg-muted" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-600"
                    )}
                  >
                    {stat.initialAnswer}
                  </Badge>
                </div>

                {/* Correct Answer */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                  >
                    {stat.correctAnswer}
                  </Badge>
                </div>

                {/* Result */}
                <div className="flex-shrink-0">
                  {stat.initialCorrect ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-destructive" />
                  )}
                </div>

                {/* Time */}
                <div className="flex-1 min-w-0 text-sm font-mono">
                  {formatTime(stat.timeMs)}
                </div>

                {/* Flag */}
                <div className="flex-shrink-0">
                  {stat.flagged && <Flag className="w-4 h-4 text-amber-600" />}
                </div>

                {/* Switches */}
                <div className="w-16 flex-shrink-0 text-sm text-muted-foreground text-right">
                  {stat.switchCount > 0 && `${stat.switchCount}×`}
                </div>

                {/* Expand Icon */}
                <div className="flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </div>
              </button>

              {/* BR Sub-row (if answer changed) */}
              {stat.brChanged && stat.brAnswer && (
                <div className="px-4 py-2 bg-accent/20 border-t flex items-center gap-4 text-sm">
                  <div className="w-12 flex-shrink-0 text-xs text-muted-foreground">BR</div>
                  <div className="w-32 flex-shrink-0" />
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge
                      variant="outline"
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm",
                        stat.brCorrect ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-600" : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-600"
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
                    {stat.brTimeMs ? formatTime(stat.brTimeMs) : '—'}
                  </div>

                  <div className="flex-shrink-0 text-xs">
                    Changed: {stat.initialAnswer} → {stat.brAnswer}
                  </div>
                </div>
              )}

              {/* Expanded Details */}
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
                      Time: <span className="font-mono">{formatTime(stat.timeMs)}</span>
                    </div>
                    <div>Switches: {stat.switchCount}</div>
                  </div>
                  <div className="pt-1">
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
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}