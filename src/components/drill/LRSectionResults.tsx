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
  emailSectionReport,
  logSectionWrongAnswers,
  persistSectionResults,
  wajQidsForSection,
  UNANSWERED,
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
  /**
   * Opens the read-only walk over the whole section. Omit it and the control
   * is not rendered — a surface with no review walk should not offer one.
   */
  onReviewSection?: () => void;
}

type QuestionStat = SectionQuestionStat;

interface FocusArea {
  qtype: string;
  correct: number;
  total: number;
  accuracy: number;
  avgTimeMs: number;
}

/** m:ss, which is how a question's clock is read everywhere on this screen. */
const formatClock = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
};

/**
 * One question's time, drawn rather than spelled.
 *
 * The track is the section's own scale, so every row is comparable at a
 * glance. On it: a tick at the pace this student owed the question — their
 * section clock divided by its questions, so a student with time and a half
 * is measured against 2:01 and not against 1:21 — and a marker at every
 * choice they put down, in order. Two markers mean they changed their mind,
 * and where the second one sits says how long that cost. The last marker is
 * the answer that was scored, so it carries the verdict colour; the ones
 * before it are the thinking, and stay quiet.
 */
function AnswerTimeline({
  stat,
  scaleMs,
  targetMs,
}: {
  stat: QuestionStat;
  scaleMs: number;
  targetMs: number | null;
}) {
  // Sections sat before the trail was recorded still have one answer and one
  // time, so they draw a single marker at the end of their run rather than an
  // empty track that reads as unanswered.
  const trail =
    stat.answerTrail && stat.answerTrail.length > 0
      ? stat.answerTrail
      : stat.initialAnswer && stat.initialAnswer !== UNANSWERED
        ? [{ answer: stat.initialAnswer, atMs: stat.timeMs }]
        : [];
  // The clock the markers sit on. A trail can run past the recorded total when
  // a question was revisited, and a marker outside its own track would be a
  // lie about the section rather than a rounding.
  const runMs = Math.max(stat.timeMs, trail.length ? trail[trail.length - 1].atMs : 0);
  const span = Math.max(scaleMs, 1);
  const pct = (ms: number) => Math.min(100, Math.max(0, (ms / span) * 100));

  return (
    <div className="flex-1 min-w-[8rem] flex items-center gap-3">
      <div className="relative flex-1 h-7">
        {/* Track */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-muted" />
        {/* Time actually spent */}
        <div
          className={cn(
            'absolute left-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full',
            stat.initialCorrect ? 'bg-primary/50' : 'bg-destructive/40',
          )}
          style={{ width: `${Math.max(pct(runMs), runMs > 0 ? 1.5 : 0)}%` }}
        />
        {/* Pace tick. Absent under an unlimited clock, which owes nothing. */}
        {targetMs !== null && targetMs > 0 && targetMs <= span && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-4 w-px bg-foreground/30"
            style={{ left: `${pct(targetMs)}%` }}
            title={`Pace: ${formatClock(targetMs)} per question`}
          />
        )}
        {/* Every choice, where it was made */}
        {trail.map((entry, i) => {
          const isFinal = i === trail.length - 1;
          return (
            <div
              key={`${entry.atMs}-${entry.answer}-${i}`}
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
              style={{ left: `${pct(entry.atMs)}%` }}
              title={`${entry.answer} at ${formatClock(entry.atMs)}`}
            >
              <div
                className={cn(
                  'w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-mono font-bold',
                  isFinal
                    ? stat.initialCorrect
                      ? 'bg-green-600 border-green-600 text-white'
                      : 'bg-destructive border-destructive text-white'
                    : 'bg-background border-border text-muted-foreground line-through',
                )}
              >
                {entry.answer}
              </div>
            </div>
          );
        })}
      </div>
      <div className="w-12 flex-shrink-0 text-sm font-mono tabular-nums text-right">
        {formatClock(stat.timeMs)}
      </div>
    </div>
  );
}

export function LRSectionResults({ session, brResults, classId, onBack, backLabel = 'Back to Home', predictedScore, onReviewSection }: LRSectionResultsProps) {
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
        const sectionHistoryId = await persistSectionResults({
          session,
          stats,
          brResults,
          classId,
          userId: user.id,
        });

        // The teacher's copy: every question, then the diagnosis. Not awaited —
        // the sitting is saved and the student is already reading their score,
        // and a mail server having a bad minute must not read as a lost section.
        void emailSectionReport(sectionHistoryId);

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

  /**
   * What this student owed each question: the clock they actually sat divided
   * by the questions in the section. Read off the session's own timer, so
   * extra time is already in it — 70 minutes over 26 questions is 2:41, and
   * nothing on this screen measures an accommodated student against 1:21.
   * Unlimited owes nothing, so it draws no tick.
   */
  /**
   * The score under the real clock, when the section ran past it.
   *
   * A section carried into overtime has two scores and only one of them
   * predicts a test day. Stating both is the point of allowing overtime at
   * all; stating only the total would quietly inflate every section a student
   * chose to finish.
   */
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

  const sectionClock = React.useMemo(() => {
    const timer = session.fullSectionConfig?.timer;
    if (!timer || timer.mode === 'unlimited' || stats.length === 0) return null;
    const minutes =
      timer.mode === 'custom' ? (timer.customMinutes ?? 0) : Number(timer.mode);
    if (!minutes || Number.isNaN(minutes)) return null;
    // Named the way the clock was chosen, not as a percentage of somebody
    // else's: a student on time and a half sat 52:30, and that is the whole
    // label. Only the section time is stated — the per-question figure is the
    // tick's position on every bar, and does not need spelling out too.
    const label =
      minutes === 35
        ? 'Standard'
        : minutes === 52.5
          ? 'Time and a half'
          : minutes === 70
            ? 'Double time'
            : null;
    return {
      totalMs: minutes * 60_000,
      perQuestionMs: (minutes * 60_000) / stats.length,
      label,
    };
  }, [session.fullSectionConfig, stats.length]);
  const targetMsPerQuestion = sectionClock?.perQuestionMs ?? null;

  // The shared scale every row is drawn on. Taken from what is on screen, so a
  // filtered view compares the questions it is showing; the pace tick is kept
  // inside the track so it never falls off the end of a fast section.
  const slowestTimeMs = displayStats.reduce(
    (max, s) => Math.max(max, s.timeMs, s.answerTrail?.[s.answerTrail.length - 1]?.atMs ?? 0),
    0,
  );
  const timelineScaleMs = Math.max(slowestTimeMs, (targetMsPerQuestion ?? 0) * 1.1, 1);

  return (
    <div className="min-h-screen bg-background pb-12">
      {/* The only thing that stays pinned: the two controls off this screen,
          the title, and the score. Everything under it — rings, chips, focus
          areas, difficulty — is a summary you read once and then scroll past.
          Pinning the whole summary made it a ~600px lid: the questions, which
          are what a student actually works through, scrolled underneath it
          through a slot a few rows tall. */}
      <div className="sticky top-0 z-20 bg-card/95 backdrop-blur border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
          <div className="flex items-baseline gap-3 min-w-0">
            <h1 className="text-lg font-bold truncate">Section Results</h1>
            {/* The score rides along, so scrolling into the question list
                never loses the number the list is about. */}
            <span className="text-sm text-muted-foreground tabular-nums whitespace-nowrap">
              {initialScore}/{initialTotal} · {initialPercent}%
            </span>
          </div>
          {/* The way back INTO the section. Reviewing used to mean re-serving
              one question as a fresh drill and answering it again; this walks
              the whole thing without touching the record. */}
          {onReviewSection ? (
            <Button variant="outline" size="sm" onClick={onReviewSection}>
              Review section
            </Button>
          ) : (
            <div className="w-24" />
          )}
        </div>
      </div>

      {/* Summary. Scrolls away with the page. */}
      <div className="bg-card border-b">
        <div className="max-w-7xl mx-auto px-6 py-6">

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

          {/* What the clock actually covered. Only when it was exceeded. */}
          {regulationSplit && (
            <div className="mb-6 mx-auto max-w-xl rounded-lg border border-border bg-background/50 px-4 py-3 text-center text-sm">
              <span className="font-medium">
                At time: {regulationSplit.correct}/{regulationSplit.answered} on the{' '}
                {regulationSplit.answered} questions you reached.
              </span>{' '}
              <span className="text-muted-foreground">
                The other {regulationSplit.overtimeCount} were answered after the clock ran
                out ({regulationSplit.overtimeCorrect} right). The score above counts all{' '}
                {regulationSplit.total}.
              </span>
            </div>
          )}

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

      {/* Question Table. The questions are the screen, so the rows carry the
          weight the summary used to: a bigger number, a bigger type, and a bar
          per question so the section's time reads as a shape rather than
          twenty-six identical mm:ss strings. */}
      <div className="max-w-7xl mx-auto px-6 mt-6 space-y-2">
        {/* One line, once, so the timeline needs no explaining per row. */}
        <div className="flex items-center justify-end gap-4 pb-1 text-xs text-muted-foreground">
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
                "overflow-hidden transition-all",
                isExpanded && "ring-2 ring-primary"
              )}
            >
              {/* Main Row */}
              <button
                onClick={() => toggleRow(stat.qid)}
                className="w-full flex items-center gap-4 px-4 py-4 hover:bg-accent/30 transition-colors text-left"
              >
                {/* Q# */}
                <div className="w-14 flex-shrink-0 text-base font-mono font-bold">
                  Q{stat.qnum}
                </div>

                {/* Type & Difficulty */}
                <div className="w-40 flex-shrink-0">
                  <div className="text-base font-semibold leading-tight">{stat.qtype}</div>
                  <div className="text-xs text-muted-foreground">
                    Level {stat.difficulty}
                    {stat.answeredInOvertime && (
                      <span className="ml-1.5 text-amber-600" title="Answered after time">
                        · overtime
                      </span>
                    )}
                  </div>
                </div>

                {/* The answer that was right. The answers the student gave
                    are on the timeline, coloured — repeating the last of them
                    in a badge beside it said the same thing twice. */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="w-8 h-8 rounded-full flex items-center justify-center font-mono text-sm bg-muted"
                    title={`Correct answer: ${stat.correctAnswer}`}
                  >
                    {stat.correctAnswer}
                  </Badge>
                </div>

                {/* Time, drawn: the pace owed, and every answer they put down. */}
                <AnswerTimeline
                  stat={stat}
                  scaleMs={timelineScaleMs}
                  targetMs={targetMsPerQuestion}
                />

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