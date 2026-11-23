import { cn } from '@/lib/utils';
import { UNANSWERED, type SectionQuestionStat } from '@/lib/sectionHistorySave';

/** m:ss, which is how a question's clock is read everywhere on the report. */
export const formatClock = (ms: number) => {
  const totalSec = Math.floor(ms / 1000);
  return `${Math.floor(totalSec / 60)}:${(totalSec % 60).toString().padStart(2, '0')}`;
};

/**
 * One question's time, drawn rather than spelled.
 *
 * The track is the section's own scale, so every row is comparable at a
 * glance. On it: a tick at the pace this student owed the question and a
 * marker at every choice they put down, in order.
 */
export function AnswerTimeline({
  stat,
  scaleMs,
  targetMs,
}: {
  stat: SectionQuestionStat;
  scaleMs: number;
  targetMs: number | null;
}) {
  const trail =
    stat.answerTrail && stat.answerTrail.length > 0
      ? stat.answerTrail
      : stat.initialAnswer && stat.initialAnswer !== UNANSWERED
        ? [{ answer: stat.initialAnswer, atMs: stat.timeMs }]
        : [];
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
