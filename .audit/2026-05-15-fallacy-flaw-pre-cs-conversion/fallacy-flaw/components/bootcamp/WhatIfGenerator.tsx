

import { useState } from 'react';
import { cn } from '../../lib/utils';

/**
 * Triple-Shot What-If Generator. Day 2's earned-interaction beat.
 * Student writes 3 what-ifs on a single stimulus, locks the trio,
 * self-grades each shot against Commandments I and II, then reveals
 * the canonical loopholes side-by-side.
 *
 * No regex grading. No auto-judgment. The student does the work and
 * grades themselves; the reveal is the teaching beat.
 */
interface ShotState {
  text: string;
  violatedI: boolean;
  violatedII: boolean;
}

const EMPTY: ShotState = { text: '', violatedI: false, violatedII: false };

export function WhatIfGenerator({
  stimulus,
  canonicalAnswers,
  closingBeat,
}: {
  stimulus: string;
  canonicalAnswers: [string, string, string];
  closingBeat: string;
}) {
  const [shots, setShots] = useState<ShotState[]>([EMPTY, EMPTY, EMPTY]);
  const [locked, setLocked] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const setShot = (i: number, patch: Partial<ShotState>) =>
    setShots((s) => s.map((sh, idx) => (idx === i ? { ...sh, ...patch } : sh)));

  const filledCount = shots.filter((s) => s.text.trim().length >= 6).length;
  const canLock = !locked && filledCount >= 1;

  const verdictForShot = (i: number): 'valid' | 'rework' | null => {
    if (!locked) return null;
    const s = shots[i];
    if (s.text.trim().length < 6) return null;
    return s.violatedI || s.violatedII ? 'rework' : 'valid';
  };

  const validCount = shots.filter((_, i) => verdictForShot(i) === 'valid').length;

  return (
    <figure
      aria-label="Triple-Shot What-If Generator"
      className="my-10 border-2 border-ink bg-paper"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-ink bg-paper-bright px-6 py-3">
        <span className="protocol text-ink">
          The Triple-Shot Generator · Day 02
        </span>
        <span className="protocol text-ink-mute">
          Three loopholes. One stimulus. Self-graded.
        </span>
      </header>

      {/* Stimulus */}
      <div className="border-b border-rule px-6 py-5">
        <div className="protocol text-ink-mute">Stimulus</div>
        <blockquote className="mt-2 max-w-prose font-display text-lg italic leading-snug text-ink">
          {stimulus}
        </blockquote>
      </div>

      {/* Three slots */}
      <ol className="divide-y divide-rule">
        {shots.map((shot, i) => {
          const verdict = verdictForShot(i);
          return (
            <li key={i} className="px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="protocol text-ink">
                  Shot {String(i + 1).padStart(2, '0')}
                </span>
                {verdict && (
                  <span
                    className={cn(
                      'protocol text-xs',
                      verdict === 'valid'
                        ? 'text-verdigris-deep'
                        : 'text-strike',
                    )}
                  >
                    {verdict === 'valid' ? 'VALID' : 'REWORK'}
                  </span>
                )}
              </div>

              <textarea
                value={shot.text}
                onChange={(e) => setShot(i, { text: e.target.value })}
                disabled={locked}
                rows={2}
                placeholder={`What if...`}
                aria-label={`What-if slot ${i + 1}`}
                className={cn(
                  'mt-2 w-full resize-y border bg-paper-bright px-3 py-2 font-serif text-[0.98rem] leading-relaxed text-ink outline-none',
                  locked
                    ? 'border-rule-soft text-ink-soft'
                    : 'border-rule focus:border-ink',
                )}
              />

              {locked && shot.text.trim().length >= 6 && (
                <div className="mt-3 grid gap-2 md:grid-cols-2">
                  <label className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
                    <input
                      type="checkbox"
                      checked={shot.violatedI}
                      onChange={(e) =>
                        setShot(i, { violatedI: e.target.checked })
                      }
                      disabled={revealed}
                      className="mt-1 h-4 w-4 accent-strike"
                    />
                    <span>
                      <span className="protocol text-strike">CMD I </span>
                      I attacked a premise.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-sm leading-snug text-ink-soft">
                    <input
                      type="checkbox"
                      checked={shot.violatedII}
                      onChange={(e) =>
                        setShot(i, { violatedII: e.target.checked })
                      }
                      disabled={revealed}
                      className="mt-1 h-4 w-4 accent-strike"
                    />
                    <span>
                      <span className="protocol text-strike">CMD II </span>
                      I just negated the conclusion.
                    </span>
                  </label>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {/* Action bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t-2 border-ink bg-paper-bright px-6 py-4">
        {!locked && (
          <>
            <span className="protocol text-ink-mute">
              {filledCount} of 3 slots filled. Minimum 1 to lock.
            </span>
            <button
              type="button"
              onClick={() => setLocked(true)}
              disabled={!canLock}
              className={cn(
                'protocol border px-4 py-2 text-xs transition-colors',
                canLock
                  ? 'border-ink bg-ink text-paper hover:bg-ink-soft'
                  : 'cursor-not-allowed border-rule text-ink-mute',
              )}
            >
              Lock my three shots
            </button>
          </>
        )}
        {locked && !revealed && (
          <>
            <span className="protocol text-ink-mute">
              Self-grade honestly. The reveal is yours when you&apos;re done.
            </span>
            <button
              type="button"
              onClick={() => setRevealed(true)}
              className="protocol border border-verdigris-deep bg-verdigris px-4 py-2 text-xs text-paper transition-colors hover:bg-verdigris-deep"
            >
              Reveal canonical loopholes
            </button>
          </>
        )}
        {revealed && (
          <span className="protocol text-verdigris-deep">
            {validCount} of {filledCount} self-graded VALID. Compare below.
          </span>
        )}
      </div>

      {/* Reveal panel */}
      {revealed && (
        <section className="border-t border-rule bg-paper px-6 py-6">
          <div className="flex items-baseline justify-between">
            <h3 className="display-title text-2xl text-ink">
              Side by side
            </h3>
            <span className="protocol text-ink-mute">
              Yours · Canonical
            </span>
          </div>
          <ol className="mt-5 space-y-6">
            {shots.map((shot, i) => (
              <li key={i} className="grid gap-3 md:grid-cols-[auto_1fr]">
                <div className="display-title text-3xl italic text-ink-mute md:text-4xl">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="protocol text-ink-mute">
                      Your shot
                    </div>
                    <p className="mt-1 leading-relaxed text-ink">
                      {shot.text.trim() || (
                        <em className="text-ink-mute">(left blank)</em>
                      )}
                    </p>
                  </div>
                  <hr className="border-rule-soft" />
                  <div>
                    <div className="protocol text-verdigris-deep">
                      Canonical
                    </div>
                    <p className="mt-1 leading-relaxed text-verdigris-deep">
                      {canonicalAnswers[i]}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-8 max-w-prose font-display text-lg italic leading-snug text-ink">
            {closingBeat}
          </p>
        </section>
      )}
    </figure>
  );
}
