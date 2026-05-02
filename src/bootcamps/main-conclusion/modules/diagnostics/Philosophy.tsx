/**
 * MC-DIA-6.1 · Philosophy.
 * Voice register 2 (whimsical/parodic) for the prose; Register 1 for the verdicts.
 */

import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

export function Philosophy() {
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-prose mx-auto space-y-5">
      <PageHeader
        eyebrow="Diagnostics"
        title="Philosophy"
        description={
          <span className="italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-3 inline-block">
            A diagnostic is a mirror, not a prison. It tells you what you are doing. It does not tell you
            who you are.
          </span>
        }
      />

      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
        Most prep apps gatekeep first. They ask you a question on day one, run a number on you, and tell
        you that you are a 156-scorer. The student feels the number sit on them like a weather system.
        For the next month, every question is filtered through the question of whether the score is moving.
      </p>

      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
        We refuse this. The dashboard you are about to see does not produce a number until you have done
        the work to make a number meaningful. The first time it has anything to say is after the M1.13
        capstone — which sits at the end of teaching, not the front. We calibrate after we have taught
        you the thing. Not before.
      </p>

      <Card variant="elev" className="border-l-4 border-l-[rgb(var(--accent)/0.50)]">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">What the dashboard shows</div>
        <ul className="mt-2 space-y-1 list-disc pl-5 font-mc-serif text-body-prose text-ink marker:text-ink-faint">
          <li>Module progress rings — how much of each module you have completed.</li>
          <li>Trait heatmap — which of the seven traps you fall for most.</li>
          <li>Mistake profile — patterns underneath your wrong answers.</li>
          <li>SRS queue — items due for spaced review.</li>
          <li>Recommendations — targeted drills, ranked by leverage.</li>
        </ul>
      </Card>

      <Card variant="elev" className="border-l-4 border-l-[rgb(var(--warn)/0.50)]">
        <div className="font-mc-mono text-mono uppercase tracking-wider text-[rgb(var(--warn))]">What it does not show</div>
        <ul className="mt-2 space-y-1 list-disc pl-5 font-mc-serif text-body-prose text-ink marker:text-ink-faint">
          <li>A score-band prediction. We won’t tell you "your projected LSAT is X" — that is fortune-telling.</li>
          <li>Streaks, gold stars, or anything else that converts learning into a slot machine.</li>
          <li>Comparisons to other students. The variable that matters is you-this-week vs you-last-week.</li>
        </ul>
      </Card>

      <p className="font-mc-serif text-body-prose text-ink leading-relaxed">
        Read the diagnostic. Argue with it. Override it when it’s wrong about you. The mirror is honest;
        the conclusions you draw are yours.
      </p>
</article>
  );
}
