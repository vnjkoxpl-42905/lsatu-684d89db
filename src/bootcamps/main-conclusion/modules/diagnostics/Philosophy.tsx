/**
 * MC-DIA-6.1 · Philosophy.
 * Voice register 2 (whimsical/parodic) for the prose; Register 1 for the verdicts.
 */

import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';

export function Philosophy() {
  return (
    <article className="px-6 py-10 max-w-prose mx-auto space-y-5">
      <header>
        <div className="font-mc-mono text-mono uppercase tracking-wider text-ink-faint">MC-DIA-6.1</div>
        <h1 className="font-mc-serif text-h1 font-semibold mt-1">Philosophy</h1>
        <p className="font-mc-serif text-body-prose text-ink-soft italic mt-4 border-l-2 border-l-[rgb(var(--accent)/0.40)] pl-3">
          A diagnostic is a mirror, not a prison. It tells you what you are doing. It does not tell you
          who you are.
        </p>
      </header>

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

      <p className="font-mc-mono text-mono text-ink-faint border-t border-[rgb(var(--border)/0.08)] pt-4 mt-6">
        source: spec.html §6 + Joshua’s diagnostic worldview
      </p>
    </article>
  );
}
