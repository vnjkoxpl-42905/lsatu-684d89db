/**
 * Bootcamp Runner — pure logic for "what is the student's next training step?"
 *
 * Reads from real progress (completed_lessons, completed_drills) plus the
 * integrated note/lab path. No fake claims: if no progress exists, the next
 * step is the first note. If everything is done, the next step is practice.
 *
 * Consumed by ModuleIndex (the bootcamp landing page) and tested by runner.test.ts.
 */

import { INTRO_LR_PATH } from '@/bootcamps/main-conclusion/content/introToLrPath';

const BC = '/bootcamp/intro-to-lr';

export interface LessonRow {
  id: string;
  number: string;
  title: string;
}

export interface ProgressLike {
  completed_lessons: string[];
  completed_drills: string[];
}

export type StepKind =
  | 'start'
  | 'continue-lesson'
  | 'unlock-drill'
  | 'simulator-ready'
  | 'all-clear';

export interface NextStep {
  kind: StepKind;
  /** Eyebrow above the title — e.g. "Pick up where you left off" */
  eyebrow: string;
  /** Headline shown in the runner hero — student-facing. No internal IDs. */
  title: string;
  /** Subtitle — one short sentence on what this step is for. */
  subtitle: string;
  /** CTA label — verb-led, no "→" (the icon is rendered alongside). */
  cta: string;
  /** Destination href (full path under the bootcamp). */
  href: string;
  /** Optional secondary action for an alternate follow-up move. */
  secondary?: { label: string; href: string };
}

const INTEGRATED_COMPLETION_ACTIONS = INTRO_LR_PATH.filter((action) => action.completionId);

/** Rank lesson numbers like "1.5" / "1.10" by the integer second component. */
function lessonRank(num: string): number {
  const parts = num.split('.');
  return Number(parts[1] ?? '0');
}

/**
 * Given the student's progress and the static lesson list, decide which single
 * action they should take next. Pure — no I/O, no Date.now, no randomness.
 */
export function nextTrainingStep(
  progress: ProgressLike | null,
  lessons: readonly LessonRow[],
): NextStep {
  const completedLessons = new Set(progress?.completed_lessons ?? []);
  const completedDrills = new Set(progress?.completed_drills ?? []);
  const isActionComplete = (action: (typeof INTRO_LR_PATH)[number]) => {
    if (!action.completionId) return false;
    if (action.type === 'note') return completedLessons.has(action.completionId);
    if (action.type === 'drill' || action.type === 'practice') return completedDrills.has(action.completionId);
    return false;
  };

  if (completedLessons.size === 0 && completedDrills.size === 0) {
    const first = INTRO_LR_PATH[0];
    return {
      kind: 'start',
      eyebrow: 'Start training',
      title: first ? `Lesson 1: ${first.title}` : 'Lesson 1',
      subtitle:
        'Begin with the foundation: arguments, support, and conclusions.',
      cta: 'Begin Lesson 1',
      href: first?.route ?? `${BC}/lessons/notes/three-parts-lr-question`,
    };
  }

  const firstUndoneAction = INTEGRATED_COMPLETION_ACTIONS.find((action) => !isActionComplete(action));
  const doneCount = INTEGRATED_COMPLETION_ACTIONS.filter(isActionComplete).length;

  if (firstUndoneAction) {
    const isNote = firstUndoneAction.type === 'note';
    return {
      kind: isNote ? 'continue-lesson' : 'unlock-drill',
      eyebrow: doneCount === 0 ? 'Start training' : 'Pick up where you left off',
      title: firstUndoneAction.title,
      subtitle:
        doneCount === 0
          ? 'Build the foundation first, then move through the core LR patterns.'
          : `${doneCount} of ${INTEGRATED_COMPLETION_ACTIONS.length} path steps cleared. One click and you are back in the seat.`,
      cta: isNote ? 'Continue lesson' : 'Open drill',
      href: firstUndoneAction.route,
    };
  }

  return {
    kind: 'simulator-ready',
    eyebrow: 'Core path cleared',
    title: 'Run timed practice',
    subtitle:
      'Move from guided reps into real LSAT-format items with the full five-choice answer set.',
    cta: 'Open Practice',
    href: `${BC}/practice-drills`,
    secondary: { label: 'See your dashboard', href: `${BC}/diagnostics/dashboard` },
  };
}

/**
 * Lightweight summary used by the training-path strip below the runner hero.
 * No claims that aren't tracked by real persistence.
 */
export interface PathDot {
  number: string;
  title: string;
  href: string;
  status: 'done' | 'active' | 'upcoming';
  capstone?: boolean;
}

export interface DrillRow {
  id: string;
  number: string;
  slug: string;
  title: string;
  gates_simulator?: boolean;
}

export interface DrillNextStep {
  /** Eyebrow above the title — student-facing. */
  eyebrow: string;
  /** Headline. */
  title: string;
  /** Subtitle — one sentence. */
  subtitle: string;
  /** CTA verb. */
  cta: string;
  /** Destination href. */
  href: string;
  /** Whether this step is the unlock-gate drill (3.4). */
  isGate: boolean;
}

/** Pure helper for the Drills hub: which drill should the student do next? */
export function nextDrillStep(
  progress: ProgressLike | null,
  drills: readonly DrillRow[],
): DrillNextStep {
  const completed = new Set(progress?.completed_drills ?? []);
  const ordered = [...drills].sort((a, b) => parseFloat(a.number) - parseFloat(b.number));

  // Next is always the first uncompleted drill in numeric order. The student
  // works the sequence in order, so a brand-new student starts at Drill 1, not
  // the capstone. When that next drill happens to be the gate, surface the
  // unlock-the-Simulator framing; otherwise use the plain next-drill framing.
  const next = ordered.find((d) => !completed.has(d.id));
  if (next) {
    return {
      eyebrow: 'Next drill',
      title: `Drill ${next.number}: ${next.title}`,
      subtitle: 'Open the drill page first, then enter the live lab when you are ready to work.',
      cta: `Open Drill ${next.number}`,
      href: `${BC}/drills/${next.slug}`,
      isGate: false,
    };
  }

  // All drills cleared.
  return {
    eyebrow: 'All drills cleared',
    title: 'Run a Simulator question',
    subtitle:
      'Gate drill cleared. Apply the read on real LSAT-format items.',
    cta: 'Open Simulator',
    href: `${BC}/simulator/bank`,
    isGate: false,
  };
}

export function buildLessonPath(
  progress: ProgressLike | null,
  lessons: readonly LessonRow[],
): PathDot[] {
  const sorted = [...lessons]
    .filter((l) => /^1\.\d+$/.test(l.number))
    .sort((a, b) => lessonRank(a.number) - lessonRank(b.number));

  const completed = new Set(progress?.completed_lessons ?? []);
  const firstUndone = sorted.find((l) => !completed.has(l.id))?.id;

  return sorted.map((l) => {
    const isDone = completed.has(l.id);
    const isActive = l.id === firstUndone;
    return {
      number: l.number,
      title: l.title,
      href: `${BC}/lessons/${l.number}`,
      status: isDone ? 'done' : isActive ? 'active' : 'upcoming',
      capstone: false,
    };
  });
}
