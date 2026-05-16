

import { useState, useMemo } from 'react';
import type {
  BootcampDay,
  CalibrationItem,
  GenerativeItem,
  RecognitionItem,
} from '../../content/bootcamp/days';
import { isGenerative } from '../../content/bootcamp/days';
import { useModuleStore, type DayId } from '../../lib/store';
import { cn } from '../../lib/utils';
import { VerdictScreen } from './VerdictScreen';

/**
 * End-of-day calibration. Sequential, one item at a time.
 *
 * Item kinds:
 *   • recognition / application — multiple-choice; correctness is mechanical.
 *   • generative                — student writes a what-if, self-grades two
 *                                  Commandment checkboxes, then sees canonical
 *                                  answers. Self-grade drives correctness.
 *
 * Locking is permanent within the run. Wrong answers do not block.
 * Design principle: "Calibrate, never gatekeep."
 */
export function CalibrationDrill({ day }: { day: BootcampDay }) {
  const [index, setIndex] = useState(0);
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  /** Generative-item state: textarea content + self-grade ticks. */
  const [genText, setGenText] = useState<Record<string, string>>({});
  const [genLocked, setGenLocked] = useState<Record<string, boolean>>({});
  const [genTick, setGenTick] = useState<
    Record<string, { violatedI: boolean; violatedII: boolean; revealed: boolean }>
  >({});

  const recordDayCalibration = useModuleStore((s) => s.recordDayCalibration);
  const seedFromMisses = useModuleStore((s) => s.seedFromMisses);

  const items = day.calibration;
  const current = items[index];

  /** Has the student "completed" the current item? */
  const itemDone = (q: CalibrationItem): boolean => {
    if (isGenerative(q)) {
      const t = genTick[q.id];
      return Boolean(genLocked[q.id] && t?.revealed);
    }
    return picks[q.id] !== undefined;
  };

  /** Did the student pass this item? */
  const itemOk = (q: CalibrationItem): boolean => {
    if (isGenerative(q)) {
      const t = genTick[q.id];
      return Boolean(t && !t.violatedI && !t.violatedII);
    }
    return picks[q.id] === q.correct;
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps -- itemOk reads picks/genTick which are already deps
  const correctCount = useMemo(
    () => items.reduce((n, q) => n + (itemOk(q) ? 1 : 0), 0),
    [items, picks, genTick],
  );

  if (submitted) {
    return (
      <VerdictScreen
        day={day}
        correct={correctCount}
        total={items.length}
        results={items.map((q) => ({ id: q.id, ok: itemOk(q), prompt: q.prompt }))}
      />
    );
  }

  const onAdvance = () => {
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
    } else {
      recordDayCalibration(day.id as DayId, correctCount, items.length);

      // Seed spaced-repetition queue from misses that carry a flawSlug
      // (Day 06 live-fire is the canonical seeder, per the pedagogical-flow rule).
      const seeds = items
        .filter((q) => !itemOk(q) && q.flawSlug)
        .map((q) => ({
          flawSlug: q.flawSlug as string,
          questionId: `${day.id}:${q.id}`,
        }));
      if (seeds.length > 0) seedFromMisses(seeds);

      setSubmitted(true);
    }
  };

  return (
    <section
      aria-label="End-of-day calibration drill"
      className="mx-auto max-w-3xl border-t border-rule px-6 py-12"
    >
      <DrillHeader index={index} total={items.length} kind={current.kind} />

      <div className="mt-6 border border-rule bg-paper-bright/70 p-6">
        {isGenerative(current) ? (
          <GenerativeCard
            item={current}
            text={genText[current.id] ?? ''}
            setText={(t) =>
              setGenText((s) => ({ ...s, [current.id]: t }))
            }
            locked={genLocked[current.id] ?? false}
            onLock={() =>
              setGenLocked((s) => ({ ...s, [current.id]: true }))
            }
            tick={
              genTick[current.id] ?? {
                violatedI: false,
                violatedII: false,
                revealed: false,
              }
            }
            setTick={(t) =>
              setGenTick((s) => ({ ...s, [current.id]: t }))
            }
          />
        ) : (
          <RecognitionCard
            item={current}
            picked={picks[current.id]}
            onPick={(id) =>
              setPicks((p) =>
                p[current.id] !== undefined ? p : { ...p, [current.id]: id },
              )
            }
          />
        )}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="protocol text-ink-mute">
          {itemDone(current)
            ? 'Locked. No takebacks.'
            : isGenerative(current)
            ? 'Write, lock, self-grade, then reveal. Honestly.'
            : 'Pick one. The lock holds.'}
        </span>
        <button
          type="button"
          onClick={onAdvance}
          disabled={!itemDone(current)}
          className={cn(
            'protocol border px-4 py-2 text-xs transition-colors',
            itemDone(current)
              ? 'border-ink bg-ink text-paper hover:bg-ink-soft'
              : 'cursor-not-allowed border-rule text-ink-mute',
          )}
        >
          {index < items.length - 1 ? 'Next item →' : 'Submit calibration'}
        </button>
      </div>
    </section>
  );
}

/* ──────────────────────────────────────────────────────────────────── */

function DrillHeader({
  index,
  total,
  kind,
}: {
  index: number;
  total: number;
  kind?: CalibrationItem['kind'];
}) {
  const label =
    kind === 'application'
      ? 'Application'
      : kind === 'generative'
      ? 'Generative · self-graded'
      : 'Recognition';
  return (
    <header className="flex items-baseline justify-between">
      <div>
        <div className="protocol text-ink-mute">End-of-day calibration</div>
        <h2 className="mt-1 display-title text-2xl text-ink">
          Item {String(index + 1).padStart(2, '0')}{' '}
          <span className="text-ink-mute">/ {String(total).padStart(2, '0')}</span>
        </h2>
      </div>
      <div className="protocol text-ink-mute">
        {label} · calibration not gatekeeping
      </div>
    </header>
  );
}

function RecognitionCard({
  item,
  picked,
  onPick,
}: {
  item: RecognitionItem;
  picked: string | undefined;
  onPick: (id: string) => void;
}) {
  const locked = picked !== undefined;
  return (
    <>
      <p className="text-[1.05rem] leading-relaxed text-ink">{item.prompt}</p>
      {item.context && (
        <p className="mt-2 protocol text-ink-mute">{item.context}</p>
      )}

      <ol className="mt-5 space-y-2">
        {item.options.map((opt) => {
          const isPicked = picked === opt.id;
          const isCorrect = opt.id === item.correct;
          const showVerdict = locked && (isPicked || isCorrect);
          return (
            <li key={opt.id}>
              <button
                type="button"
                onClick={() => onPick(opt.id)}
                disabled={locked}
                className={cn(
                  'flex w-full items-start gap-3 border px-4 py-3 text-left text-[0.98rem] leading-snug transition-colors',
                  !locked &&
                    'border-rule bg-paper hover:border-ink hover:bg-paper-bright',
                  locked && !showVerdict && 'border-rule-soft text-ink-mute',
                  showVerdict && isCorrect &&
                    'border-verdigris bg-verdigris-tint text-verdigris-deep',
                  showVerdict && !isCorrect && isPicked &&
                    'border-strike bg-strike-tint text-ink',
                )}
              >
                <span className="protocol text-xs">{opt.id.toUpperCase()}</span>
                <span className="flex-1">{opt.label}</span>
                {showVerdict && isCorrect && (
                  <span className="protocol text-xs text-verdigris-deep">
                    VERDICT
                  </span>
                )}
                {showVerdict && !isCorrect && isPicked && (
                  <span className="protocol text-xs text-strike">
                    OBJECTION
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ol>

      {locked && (
        <div className="mt-5 border-t border-rule-soft pt-4">
          <div className="protocol text-ink-mute">Why</div>
          <p className="mt-2 leading-relaxed text-ink-soft">{item.rationale}</p>
        </div>
      )}
    </>
  );
}

function GenerativeCard({
  item,
  text,
  setText,
  locked,
  onLock,
  tick,
  setTick,
}: {
  item: GenerativeItem;
  text: string;
  setText: (t: string) => void;
  locked: boolean;
  onLock: () => void;
  tick: { violatedI: boolean; violatedII: boolean; revealed: boolean };
  setTick: (t: { violatedI: boolean; violatedII: boolean; revealed: boolean }) => void;
}) {
  const canLock = !locked && text.trim().length >= 8;
  const canReveal = locked && !tick.revealed;
  const isOk = !tick.violatedI && !tick.violatedII;

  return (
    <>
      <p className="text-[1.05rem] leading-relaxed text-ink">{item.prompt}</p>

      <blockquote className="mt-4 border border-rule-soft bg-paper px-4 py-3 italic leading-relaxed text-ink-soft">
        {item.stimulus}
      </blockquote>

      <label className="mt-5 block">
        <span className="protocol text-ink-mute">Your what-if</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={locked}
          rows={3}
          placeholder="What if..."
          className={cn(
            'mt-2 w-full resize-y border bg-paper px-3 py-2 font-serif text-[0.98rem] leading-relaxed text-ink outline-none',
            locked
              ? 'border-rule-soft text-ink-soft'
              : 'border-rule focus:border-ink',
          )}
        />
      </label>

      {!locked && (
        <button
          type="button"
          onClick={onLock}
          disabled={!canLock}
          className={cn(
            'mt-3 protocol border px-4 py-2 text-xs transition-colors',
            canLock
              ? 'border-ink bg-ink text-paper hover:bg-ink-soft'
              : 'cursor-not-allowed border-rule text-ink-mute',
          )}
        >
          Lock my answer
        </button>
      )}

      {locked && (
        <div className="mt-6 border-t border-rule-soft pt-4">
          <div className="protocol text-ink-mute">Self-grade · against the Commandments</div>
          <ol className="mt-3 space-y-2">
            <li>
              <label className="flex items-start gap-3 text-[0.98rem] leading-snug text-ink-soft">
                <input
                  type="checkbox"
                  checked={tick.violatedI}
                  onChange={(e) =>
                    setTick({ ...tick, violatedI: e.target.checked })
                  }
                  disabled={tick.revealed}
                  className="mt-1 h-4 w-4 accent-strike"
                />
                <span>
                  <span className="protocol text-strike">CMD I </span>
                  I attacked a premise (e.g. wrote &quot;what if that premise
                  isn&apos;t true&quot;).
                </span>
              </label>
            </li>
            <li>
              <label className="flex items-start gap-3 text-[0.98rem] leading-snug text-ink-soft">
                <input
                  type="checkbox"
                  checked={tick.violatedII}
                  onChange={(e) =>
                    setTick({ ...tick, violatedII: e.target.checked })
                  }
                  disabled={tick.revealed}
                  className="mt-1 h-4 w-4 accent-strike"
                />
                <span>
                  <span className="protocol text-strike">CMD II </span>
                  I just negated the conclusion without showing why.
                </span>
              </label>
            </li>
          </ol>

          {canReveal && (
            <button
              type="button"
              onClick={() => setTick({ ...tick, revealed: true })}
              className="mt-4 protocol border border-verdigris-deep bg-verdigris px-4 py-2 text-xs text-paper transition-colors hover:bg-verdigris-deep"
            >
              Reveal canonical answers
            </button>
          )}
        </div>
      )}

      {tick.revealed && (
        <div className="mt-6 border-t border-rule pt-4">
          <div className="flex items-center justify-between">
            <div className="protocol text-ink-mute">Canonical loopholes</div>
            <span
              className={cn(
                'protocol text-xs',
                isOk ? 'text-verdigris-deep' : 'text-strike',
              )}
            >
              {isOk ? 'SELF-GRADED VALID' : 'SELF-GRADED REWORK'}
            </span>
          </div>
          <ol className="mt-3 space-y-3 text-[0.98rem] leading-relaxed text-ink-soft">
            {item.canonicalAnswers.map((a, i) => (
              <li key={i} className="flex gap-3">
                <span className="protocol text-ink-mute">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span>{a}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 border-t border-rule-soft pt-3">
            <div className="protocol text-ink-mute">Why</div>
            <p className="mt-2 leading-relaxed text-ink-soft">{item.rationale}</p>
          </div>
        </div>
      )}
    </>
  );
}
