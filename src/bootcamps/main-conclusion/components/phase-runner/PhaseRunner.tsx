/**
 * PhaseRunner — drives a phased lesson session.
 *
 * Phases run in declared order. The student cannot skip a phase that requires
 * action: the Attempt phase only releases "Continue" once the labeling task has
 * been submitted. Reveal/Coach are read-then-continue. Checkpoint requires a pick.
 *
 * Bottom of the page renders a thin progress strip + Next button. A back link
 * lets the student step backward through phases (read again, retry an attempt).
 */

import { useMemo, useState, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { RoleLabeler } from '@/bootcamps/main-conclusion/components/role-labeler/RoleLabeler';
import { IndicatorTagger } from '@/bootcamps/main-conclusion/components/indicator-tagger/IndicatorTagger';
import { ConclusionPicker } from '@/bootcamps/main-conclusion/components/conclusion-picker/ConclusionPicker';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import type { Phase, Role } from '@/bootcamps/main-conclusion/content/lessons-phased.source';

interface Props {
  /** Lesson title rendered in the page hero (no internal IDs). */
  studentEyebrow: string;
  title: string;
  hook: string;
  phases: Phase[];
  /** Whether the student has already marked this lesson complete. */
  completed: boolean;
  /** Called when student finishes the last phase. */
  onComplete: () => void | Promise<void>;
  /** Optional back-to-lessons slot. */
  backHref?: string;
}

const PHASE_LABEL: Record<Phase['kind'], string> = {
  briefing: 'Briefing',
  demo: 'Demo',
  attempt: 'Your turn',
  reveal: 'Reveal',
  coach: "Coach's note",
  checkpoint: 'Checkpoint',
};

const ROLE_DEMO_CLASS: Record<Role, string> = {
  conclusion:
    'bg-[rgb(var(--role-conclusion)/0.16)] border-l-4 border-l-[rgb(var(--role-conclusion))]',
  premise: 'bg-[rgb(var(--role-premise)/0.14)] border-l-4 border-l-[rgb(var(--role-premise))]',
  background:
    'bg-[rgb(var(--role-background)/0.10)] border-l-4 border-l-[rgb(var(--role-background))]',
};

const ROLE_DEMO_TAG: Record<Role, string> = {
  conclusion: 'text-[rgb(var(--role-conclusion))]',
  premise: 'text-[rgb(var(--role-premise))]',
  background: 'text-[rgb(var(--role-background))]',
};

export function PhaseRunner({
  studentEyebrow,
  title,
  hook,
  phases,
  completed,
  onComplete,
  backHref,
}: Props): JSX.Element {
  const [phaseIndex, setPhaseIndex] = useState(0);
  // Per-phase gates: a phase can be locked from advancing until it reports done.
  const [attemptDone, setAttemptDone] = useState<Record<number, boolean>>({});
  const [checkpointPick, setCheckpointPick] = useState<Record<number, string | null>>({});

  const phase = phases[phaseIndex]!;
  const isLast = phaseIndex === phases.length - 1;
  const phaseLabel = PHASE_LABEL[phase.kind];

  const canAdvance = useMemo(() => {
    if (phase.kind === 'attempt') return !!attemptDone[phaseIndex];
    if (phase.kind === 'checkpoint') return !!checkpointPick[phaseIndex];
    return true;
  }, [phase, phaseIndex, attemptDone, checkpointPick]);

  async function next() {
    if (!canAdvance) return;
    if (isLast) {
      await onComplete();
      return;
    }
    setPhaseIndex((i) => i + 1);
  }

  function back() {
    if (phaseIndex === 0) return;
    setPhaseIndex((i) => i - 1);
  }

  return (
    <article
      className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[840px] mx-auto"
      data-lesson-number={phases.length > 0 ? title : undefined}
    >
      <Hero studentEyebrow={studentEyebrow} title={title} hook={hook} completed={completed} />

      <PhaseStrip phases={phases} index={phaseIndex} />

      <section className="mt-8">
        <PhaseLabel label={phaseLabel} />
        <div className="mt-3">
          <PhaseBody
            phase={phase}
            phaseIndex={phaseIndex}
            attemptDone={!!attemptDone[phaseIndex]}
            onAttemptComplete={() =>
              setAttemptDone((m) => ({ ...m, [phaseIndex]: true }))
            }
            checkpointPick={checkpointPick[phaseIndex] ?? null}
            onCheckpointPick={(id) =>
              setCheckpointPick((m) => ({ ...m, [phaseIndex]: id }))
            }
          />
        </div>
      </section>

      <Footer
        phaseIndex={phaseIndex}
        total={phases.length}
        isLast={isLast}
        canAdvance={canAdvance}
        onBack={back}
        onNext={next}
        backHref={backHref}
        completed={completed}
      />
    </article>
  );
}

function Hero({
  studentEyebrow,
  title,
  hook,
  completed,
}: {
  studentEyebrow: string;
  title: string;
  hook: string;
  completed: boolean;
}): JSX.Element {
  return (
    <header className="relative isolate mb-8">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-30 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(232 208 139 / 0.20), transparent 70%)' }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
            />
            {studentEyebrow}
          </div>
          {completed ? (
            <Badge tone="success" dot>
              completed
            </Badge>
          ) : null}
        </div>
        <h1 className="font-mc-serif text-display font-semibold mt-3 text-ink leading-[1.05]">
          {title}
        </h1>
        <p className="font-mc-serif text-h3 mt-4 text-ink-soft italic border-l-2 border-l-[color:var(--border-accent-strong)] pl-4 leading-relaxed">
          {hook}
        </p>
      </div>
    </header>
  );
}

function PhaseStrip({ phases, index }: { phases: Phase[]; index: number }): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3 px-3 py-2.5',
        'bg-[image:var(--grad-surface-soft)]',
        'border border-[rgb(var(--border)/0.08)]',
      )}
      role="progressbar"
      aria-valuenow={index + 1}
      aria-valuemin={1}
      aria-valuemax={phases.length}
      aria-label="Lesson phase"
    >
      <ol className="flex flex-wrap items-center gap-1.5">
        {phases.map((p, i) => {
          const status = i < index ? 'done' : i === index ? 'active' : 'upcoming';
          return (
            <li key={i} className="flex items-center">
              <span
                className={cn(
                  'relative inline-flex h-6 items-center gap-1.5 rounded-full px-2.5',
                  'font-mc-mono text-[10.5px] uppercase tracking-wider transition-colors duration-150 ease-eased',
                  status === 'done' &&
                    'bg-[rgb(var(--accent)/0.14)] text-mc-accent border border-[color:var(--border-accent-soft)]',
                  status === 'active' &&
                    'bg-[image:var(--grad-accent-strong)] text-mc-accent border border-[color:var(--border-accent-strong)] shadow-[var(--glow-accent-soft)]',
                  status === 'upcoming' &&
                    'bg-[rgb(var(--surface-elev))] text-ink-faint border border-[rgb(var(--border)/0.10)]',
                )}
              >
                {status === 'done' ? (
                  <Check className="h-3 w-3" strokeWidth={2.6} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" className="font-semibold">
                    {i + 1}
                  </span>
                )}
                <span>{PHASE_LABEL[p.kind]}</span>
              </span>
              {i < phases.length - 1 ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    'mx-0.5 h-px w-3',
                    status === 'done' ? 'bg-[color:var(--border-accent-soft)]' : 'bg-[rgb(var(--border)/0.10)]',
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PhaseLabel({ label }: { label: string }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
      <span
        aria-hidden="true"
        className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
      />
      {label}
    </div>
  );
}

function PhaseBody({
  phase,
  phaseIndex,
  attemptDone,
  onAttemptComplete,
  checkpointPick,
  onCheckpointPick,
}: {
  phase: Phase;
  phaseIndex: number;
  attemptDone: boolean;
  onAttemptComplete: () => void;
  checkpointPick: string | null;
  onCheckpointPick: (id: string) => void;
}): JSX.Element {
  switch (phase.kind) {
    case 'briefing':
      return (
        <Card variant="surface">
          <div className="font-mc-mono text-mono uppercase tracking-wider text-mc-accent">
            What you'll do
          </div>
          <p className="mt-2 font-mc-serif text-h3 text-ink leading-snug">{phase.goal}</p>
          <p className="mt-3 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
            {phase.body}
          </p>
          {phase.primer ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full px-3 py-1 bg-[image:var(--grad-accent-soft)] border border-[color:var(--border-accent-soft)] text-mc-accent font-mc-mono text-mono uppercase tracking-wider">
              <span
                aria-hidden="true"
                className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
              />
              Hold this in mind: {phase.primer}
            </div>
          ) : null}
        </Card>
      );

    case 'demo':
      return (
        <Card variant="surface">
          <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.title}</h2>
          <p className="mt-2 font-mc-serif text-body-prose text-ink-soft leading-relaxed">{phase.body}</p>
          {phase.exampleSegments && phase.exampleSegments.length > 0 ? (
            <ol className="mt-4 space-y-2">
              {phase.exampleSegments.map((seg, i) => (
                <li
                  key={i}
                  className={cn('rounded-2 px-4 py-3', ROLE_DEMO_CLASS[seg.role])}
                >
                  <div className={cn('font-mc-mono text-mono uppercase tracking-wider', ROLE_DEMO_TAG[seg.role])}>
                    {seg.role}
                  </div>
                  <p className="mt-1 font-mc-serif text-body-prose text-ink leading-relaxed">{seg.text}</p>
                  {seg.whisper ? (
                    <p className="mt-1 font-mc-serif text-body text-ink-faint italic">{seg.whisper}</p>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : null}
        </Card>
      );

    case 'attempt':
      return (
        <div className="space-y-4">
          <Card variant="surface">
            <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.title}</h2>
            <p className="mt-2 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
              {phase.prompt}
            </p>
          </Card>
          {phase.task.kind === 'role-label' ? (
            <RoleLabeler
              key={`attempt-${phaseIndex}-rl`}
              segments={phase.task.segments}
              allowedRoles={phase.task.allowedRoles}
              rationale={phase.task.rationale}
              onComplete={() => onAttemptComplete()}
            />
          ) : phase.task.kind === 'indicator-tag' ? (
            <IndicatorTagger
              key={`attempt-${phaseIndex}-it`}
              sentence={phase.task.sentence}
              targets={phase.task.targets}
              allowedCategories={phase.task.allowedCategories}
              onComplete={() => onAttemptComplete()}
            />
          ) : (
            <ConclusionPicker
              key={`attempt-${phaseIndex}-cp`}
              stimulus={phase.task.stimulus}
              candidates={phase.task.candidates}
              onComplete={() => onAttemptComplete()}
            />
          )}
        </div>
      );

    case 'reveal':
      return (
        <Card variant="surface" accent>
          <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.title}</h2>
          <p className="mt-3 font-mc-serif text-body-prose text-ink leading-relaxed">{phase.body}</p>
        </Card>
      );

    case 'coach':
      return (
        <Card variant="elev" className="border-l-4 border-l-[color:var(--border-accent-strong)]">
          <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.title}</h2>
          <CoachRow label="Structure map" body={phase.structure_map} />
          <CoachRow label="Core move" body={phase.core_move} />
          <CoachRow label="Why it matters" body={phase.why_it_matters} />
        </Card>
      );

    case 'checkpoint':
      return <CheckpointPhase phase={phase} pick={checkpointPick} onPick={onCheckpointPick} />;
  }
}

function CoachRow({ label, body }: { label: string; body: string }): JSX.Element {
  return (
    <section className="mt-4">
      <h3 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">{label}</h3>
      <p className="mt-1.5 font-mc-serif text-body-prose text-ink leading-relaxed">{body}</p>
    </section>
  );
}

function CheckpointPhase({
  phase,
  pick,
  onPick,
}: {
  phase: Extract<Phase, { kind: 'checkpoint' }>;
  pick: string | null;
  onPick: (id: string) => void;
}): JSX.Element {
  const picked = phase.options.find((o) => o.id === pick) ?? null;
  return (
    <Card variant="surface">
      <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.prompt}</h2>
      <ul className="mt-4 space-y-2" role="radiogroup" aria-label="Checkpoint options">
        {phase.options.map((opt) => {
          const isPicked = pick === opt.id;
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="radio"
                aria-checked={isPicked}
                onClick={() => onPick(opt.id)}
                className={cn(
                  'group/opt w-full text-left rounded-3 border px-4 py-3',
                  'transition-[border-color,background,box-shadow] duration-180 ease-eased',
                  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2',
                  !isPicked &&
                    'border-[rgb(var(--border)/0.10)] bg-[image:var(--grad-surface-soft)] hover:border-[color:var(--border-accent-soft)]',
                  isPicked && opt.correct &&
                    'border-[rgb(var(--success)/0.50)] bg-[rgb(var(--success)/0.08)]',
                  isPicked && !opt.correct &&
                    'border-[rgb(var(--error)/0.50)] bg-[rgb(var(--error)/0.08)]',
                )}
              >
                <div className="flex items-baseline gap-3">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-full font-mc-mono text-[10.5px] font-semibold uppercase',
                      isPicked && opt.correct &&
                        'bg-[rgb(var(--success)/0.18)] text-[rgb(var(--success))] border border-[rgb(var(--success)/0.50)]',
                      isPicked && !opt.correct &&
                        'bg-[rgb(var(--error)/0.18)] text-[rgb(var(--error))] border border-[rgb(var(--error)/0.50)]',
                      !isPicked &&
                        'bg-[rgb(var(--surface-elev))] text-ink-soft border border-[rgb(var(--border)/0.10)]',
                    )}
                  >
                    {opt.id}
                  </span>
                  <span className="font-mc-serif text-body-prose text-ink leading-relaxed flex-1">
                    {opt.text}
                  </span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      {picked ? (
        <div
          className={cn(
            'mt-4 rounded-3 px-4 py-3 border-l-4',
            picked.correct
              ? 'bg-[rgb(var(--success)/0.06)] border-l-[rgb(var(--success))]'
              : 'bg-[rgb(var(--error)/0.06)] border-l-[rgb(var(--error))]',
          )}
        >
          <div
            className={cn(
              'font-mc-mono text-mono uppercase tracking-wider',
              picked.correct ? 'text-[rgb(var(--success))]' : 'text-[rgb(var(--error))]',
            )}
          >
            {picked.correct ? 'Correct' : 'Not quite'}
          </div>
          <p className="mt-1 font-mc-serif text-body-prose text-ink leading-relaxed">{picked.reveal}</p>
        </div>
      ) : null}
    </Card>
  );
}

function Footer({
  phaseIndex,
  total,
  isLast,
  canAdvance,
  onBack,
  onNext,
  backHref,
  completed,
}: {
  phaseIndex: number;
  total: number;
  isLast: boolean;
  canAdvance: boolean;
  onBack: () => void;
  onNext: () => void;
  backHref?: string;
  completed: boolean;
}): JSX.Element {
  const nextLabel = isLast ? (completed ? 'Mark complete again' : 'Mark lesson complete') : 'Continue';
  return (
    <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <Button
          variant="subtle"
          size="sm"
          leftIcon={<ArrowLeft className="h-3.5 w-3.5" strokeWidth={2.2} />}
          onClick={onBack}
          disabled={phaseIndex === 0}
        >
          Back
        </Button>
        <span className="font-mc-mono text-mono text-ink-faint">
          Phase {phaseIndex + 1} of {total}
        </span>
      </div>
      <div className="flex items-center gap-3">
        {backHref ? (
          <a
            href={backHref}
            className="font-mc-mono text-mono text-ink-soft hover:text-mc-accent transition-colors duration-150 ease-eased focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2 px-1"
          >
            Back to Lessons
          </a>
        ) : null}
        <Button
          onClick={onNext}
          disabled={!canAdvance}
          rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}
        >
          {nextLabel}
        </Button>
      </div>
    </div>
  );
}

// Export types so other surfaces (e.g. tests) can import them in one place.
export type { Phase, Role };

// Re-export for convenience to satisfy any prop-types future consumers may import.
export type PhaseRunnerProps = Props;

// Type guard helper kept here so we don't grow another file just for it.
export function isPhasedNumber(num: string, registry: Record<string, unknown>): boolean {
  return Object.prototype.hasOwnProperty.call(registry, num);
}

// (Unused inside this file; exported because Lesson.tsx wants the helper.)
export const __PHASE_RUNNER_VERSION__ = 1;

// no-op default to keep the file tidy if tree-shaken differently later
export default PhaseRunner;

// Suppress unused "ReactNode" if linter complains about the import
type _Unused = ReactNode;
