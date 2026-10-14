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

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Sparkles } from 'lucide-react';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { RoleLabeler } from '@/bootcamps/main-conclusion/components/role-labeler/RoleLabeler';
import { IndicatorTagger } from '@/bootcamps/main-conclusion/components/indicator-tagger/IndicatorTagger';
import { ConclusionPicker } from '@/bootcamps/main-conclusion/components/conclusion-picker/ConclusionPicker';
import { PronounUnpacker } from '@/bootcamps/main-conclusion/components/pronoun-unpacker/PronounUnpacker';
import { AbsoluteStatementsWalk } from '@/bootcamps/main-conclusion/components/absolute-statements/AbsoluteStatementsWalk';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';
import { DynamicIslandPhaseNav } from '@/bootcamps/main-conclusion/components/training-runner/DynamicIslandPhaseNav';
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
    'bg-[rgb(var(--surface-elev))] border-l-4 border-l-[rgb(var(--role-conclusion))] border border-[rgb(var(--border)/0.12)]',
  premise: 'bg-[rgb(var(--surface-elev))] border-l-4 border-l-[rgb(var(--role-premise))] border border-[rgb(var(--border)/0.12)]',
  opposing:
    'bg-[rgb(var(--surface-elev))] border-l-4 border-l-[rgb(var(--role-opposing))] border border-[rgb(var(--border)/0.12)]',
  background:
    'bg-[rgb(var(--surface-elev))] border-l-4 border-l-[rgb(var(--role-background))] border border-[rgb(var(--border)/0.12)]',
};

const ROLE_DEMO_TAG: Record<Role, string> = {
  conclusion: 'text-[rgb(var(--role-conclusion))] font-mc-mono text-[10px] font-bold uppercase tracking-wider',
  premise: 'text-[rgb(var(--role-premise))] font-mc-mono text-[10px] font-bold uppercase tracking-wider',
  opposing: 'text-[rgb(var(--role-opposing))] font-mc-mono text-[10px] font-bold uppercase tracking-wider',
  background: 'text-[rgb(var(--role-background))] font-mc-mono text-[10px] font-bold uppercase tracking-wider',
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
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  // Phase index survives refresh via the `?p=` query param. Clamp to valid range.
  const requested = Number.parseInt(params.get('p') ?? '0', 10);
  const phaseIndex = Number.isFinite(requested)
    ? Math.max(0, Math.min(phases.length - 1, requested))
    : 0;

  // Per-phase gates and the post-completion celebration screen.
  const [attemptDone, setAttemptDone] = useState<Record<number, boolean>>({});
  const [checkpointPick, setCheckpointPick] = useState<Record<number, string | null>>({});
  const [cleared, setCleared] = useState(false);

  // Self-heal: if the URL had p=99 from a stale link, normalize it.
  useEffect(() => {
    if (requested !== phaseIndex) {
      const next = new URLSearchParams(params);
      if (phaseIndex === 0) next.delete('p');
      else next.set('p', String(phaseIndex));
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setPhaseIndex(updater: (prev: number) => number) {
    const target = updater(phaseIndex);
    const next = new URLSearchParams(params);
    if (target === 0) next.delete('p');
    else next.set('p', String(target));
    setParams(next, { replace: true });
  }

  const phase = phases[phaseIndex]!;
  const isLast = phaseIndex === phases.length - 1;
  const phaseLabel = PHASE_LABEL[phase.kind];

  const canAdvance = useMemo(() => {
    if (phase.kind === 'attempt') return !!attemptDone[phaseIndex];
    if (phase.kind === 'checkpoint') return !!checkpointPick[phaseIndex];
    return true;
  }, [phase, phaseIndex, attemptDone, checkpointPick]);

  // After-submit focus management. When the student finishes an attempt or
  // picks a checkpoint option, canAdvance flips false→true and the Continue
  // button becomes actionable. Move focus to it so keyboard users know.
  // Skipped on phases where canAdvance is true at mount (briefing/demo/reveal/coach).
  const continueRef = useRef<HTMLButtonElement>(null);
  const prevCanAdvanceRef = useRef(canAdvance);
  useEffect(() => {
    const wasGated = phase.kind === 'attempt' || phase.kind === 'checkpoint';
    if (wasGated && !prevCanAdvanceRef.current && canAdvance && continueRef.current) {
      continueRef.current.focus();
    }
    prevCanAdvanceRef.current = canAdvance;
  }, [canAdvance, phase.kind]);

  async function next() {
    if (!canAdvance) return;
    if (isLast) {
      await onComplete();
      setCleared(true);
      return;
    }
    setPhaseIndex((i) => i + 1);
  }

  function back() {
    if (phaseIndex === 0) return;
    setPhaseIndex((i) => i - 1);
  }

  // Post-completion celebration. Renders once, then student clicks through to the runner.
  if (cleared) {
    return (
      <ClearedScreen
        studentEyebrow={studentEyebrow}
        title={title}
        backHref={backHref ?? '/bootcamp/intro-to-lr/lessons'}
        onContinue={() => navigate('/bootcamp/intro-to-lr')}
      />
    );
  }

  return (
    <article
      className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[840px] mx-auto"
      data-lesson-title={title}
    >
      <Hero studentEyebrow={studentEyebrow} title={title} hook={hook} completed={completed} />

      <DynamicIslandPhaseNav 
        phases={phases} 
        currentIndex={phaseIndex} 
        onNavigate={(idx) => setPhaseIndex(() => idx)}
        canAdvance={canAdvance}
      />

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
        continueRef={continueRef}
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
        className="pointer-events-none absolute -top-16 left-0 h-48 w-72 opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgb(var(--surface) / 0.86), transparent 70%)' }}
      />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.28em] text-ink-faint">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))]"
            />
            {studentEyebrow}
          </div>
          {completed ? (
            <Badge tone="success" dot>
              completed
            </Badge>
          ) : null}
        </div>
        <h1 className="mt-3 font-mc-serif text-[clamp(3rem,6vw,5rem)] font-medium italic text-ink leading-[0.92] tracking-[-0.06em]">
          {title}
        </h1>
        <p className="mt-5 max-w-[48rem] border-l border-l-[rgb(var(--border)/0.18)] pl-4 font-mc-sans text-body-prose leading-relaxed text-ink-soft">
          {hook}
        </p>
      </div>
    </header>
  );
}

function PhaseLabel({ label }: { label: string }): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
      <span
        aria-hidden="true"
        className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(var(--accent)/0.7)]"
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
          <div className="font-mc-mono text-mono uppercase tracking-[0.22em] text-ink-faint">
            What you'll do
          </div>
          <p className="mt-2 font-mc-serif text-h3 text-ink leading-snug">{phase.goal}</p>
          <p className="mt-3 font-mc-serif text-body-prose text-ink-soft leading-relaxed">
            {phase.body}
          </p>
          {phase.primer ? (
            <div className="mt-4 inline-flex items-center gap-2 rounded-[999px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev))] px-3 py-1 font-mc-mono text-mono uppercase tracking-[0.18em] text-ink">
              <span
                aria-hidden="true"
                className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--ink))]"
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
          {phase.interactive && phase.interactive.kind === 'pronoun-unpack' ? (
            <div className="mt-5">
              <PronounUnpacker
                prompt={phase.interactive.prompt}
                segments={phase.interactive.segments}
                spans={phase.interactive.spans}
                caption={phase.interactive.caption}
              />
            </div>
          ) : null}
          {phase.interactive && phase.interactive.kind === 'absolute-statements' ? (
            <div className="mt-5">
              <AbsoluteStatementsWalk
                scenarios={phase.interactive.scenarios}
                caption={phase.interactive.caption}
              />
            </div>
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
        <Card variant="elev" className="border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface-elev)/0.96)]">
          <h2 className="font-mc-serif text-h2 font-semibold text-ink leading-tight">{phase.title}</h2>
          <CoachRow isFirst label="Structure map" body={phase.structure_map} />
          <CoachRow label="Core move" body={phase.core_move} />
          <CoachRow label="Why it matters" body={phase.why_it_matters} />
        </Card>
      );

    case 'checkpoint':
      return <CheckpointPhase phase={phase} pick={checkpointPick} onPick={onCheckpointPick} />;
  }
}

function CoachRow({ label, body, isFirst }: { label: string; body: string; isFirst?: boolean }): JSX.Element {
  return (
    <section
      className={cn(
        isFirst ? 'mt-5' : 'mt-5 border-t border-[rgb(var(--ink-soft)/0.08)] pt-5',
      )}
    >
      <h3 className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">{label}</h3>
      <p className="mt-2 font-mc-serif text-body-prose text-ink leading-relaxed">{body}</p>
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
                    'border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface)/0.82)] hover:border-[rgb(var(--border)/0.18)]',
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
            'mt-4 rounded-[6px] border px-4 py-3',
            picked.correct
              ? 'bg-[rgb(var(--success)/0.06)] border-[rgb(var(--success)/0.40)]'
              : 'bg-[rgb(var(--error)/0.06)] border-[rgb(var(--error)/0.40)]',
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
  total: _total,
  isLast,
  canAdvance,
  onBack,
  onNext,
  backHref,
  completed,
  continueRef,
}: {
  phaseIndex: number;
  total: number;
  isLast: boolean;
  canAdvance: boolean;
  onBack: () => void;
  onNext: () => void;
  backHref?: string;
  completed: boolean;
  continueRef: React.RefObject<HTMLButtonElement>;
}): JSX.Element {
  const nextLabel = isLast ? (completed ? 'Done' : 'Mark lesson complete') : 'Continue';
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
      </div>
      <div className="flex items-center gap-3">
        {backHref ? (
          <Link
            to={backHref}
            className="font-mc-mono text-mono text-ink-soft hover:text-mc-accent transition-colors duration-150 ease-eased focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2 px-1"
          >
            Back to Lessons
          </Link>
        ) : null}
        <Button
          ref={continueRef}
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

/**
 * Cleared screen — rendered once when the student completes the final phase.
 * Closes the loop with a real beat: "Lesson cleared." Then a single CTA back
 * to the runner where the next step is already computed.
 */
function ClearedScreen({
  studentEyebrow,
  title,
  backHref,
  onContinue,
}: {
  studentEyebrow: string;
  title: string;
  backHref: string;
  onContinue: () => void;
}): JSX.Element {
  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[840px] mx-auto">
      <section
        className={cn(
          'relative isolate overflow-hidden rounded-[8px] p-7 desktop:p-9',
          'bg-[rgb(var(--surface))] border border-[rgb(var(--border)/0.10)] shadow-[var(--shadow-3)]',
        )}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 right-0 h-64 w-[440px] max-w-full opacity-70 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgb(var(--surface) / 0.92), transparent 70%)' }}
        />
        <div className="relative">
          <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.28em] text-ink-faint">
            <span
              aria-hidden="true"
              className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--ink))]"
            />
            {studentEyebrow} cleared
          </div>
          <h1 className="mt-3 font-mc-serif text-[clamp(3rem,6vw,5rem)] font-medium italic text-ink leading-[0.92] tracking-[-0.06em]">
            Nice. {title}
          </h1>
          <p className="mt-4 max-w-[58ch] font-mc-sans text-body-prose leading-relaxed text-ink-soft">
            That session is logged. Your next step is ready in the trainer.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              rightIcon={<ArrowRight className="h-4 w-4" strokeWidth={2.2} />}
              className="!h-12 !px-6"
              onClick={onContinue}
              leftIcon={<Sparkles className="h-4 w-4" strokeWidth={2.2} />}
            >
              See your next step
            </Button>
            <Link
              to={backHref}
              className="font-mc-mono text-mono text-ink-soft hover:text-mc-accent transition-colors duration-150 ease-eased focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent rounded-2 px-1"
            >
              All lessons
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}

export type { Phase, Role };
export default PhaseRunner;
