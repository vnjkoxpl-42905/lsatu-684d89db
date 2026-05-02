/**
 * Bootcamp Runner — pure logic for "what is the student's next training step?"
 *
 * Reads from real progress (completed_lessons, completed_drills) plus the static
 * lesson list. No fake claims: if no progress exists, the next step is Lesson 1.
 * If everything is done, the next step is the Simulator (the post-capstone state).
 *
 * Consumed by ModuleIndex (the bootcamp landing page) and tested by runner.test.ts.
 */

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
  | 'capstone'
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
  /** Optional secondary action (e.g. a "Run a question" link after capstone). */
  secondary?: { label: string; href: string };
}

const TOTAL_LESSONS = 13;

/** Rank lesson numbers like "1.5" / "1.10" by the integer second component. */
function lessonRank(num: string): number {
  const parts = num.split('.');
  return Number(parts[1] ?? '0');
}
const CAPSTONE_NUMBER = '1.13';
const CAPSTONE_LESSON_ID = 'MC-LSN-1.13';
const UNLOCK_DRILL_NUMBER = '3.4';
const UNLOCK_DRILL_ID = 'MC-DRL-3.4';

/**
 * Given the student's progress and the static lesson list, decide which single
 * action they should take next. Pure — no I/O, no Date.now, no randomness.
 */
export function nextTrainingStep(
  progress: ProgressLike | null,
  lessons: readonly LessonRow[],
): NextStep {
  const sorted = [...lessons]
    .filter((l) => /^1\.\d+$/.test(l.number))
    .sort((a, b) => lessonRank(a.number) - lessonRank(b.number));

  const completedLessons = new Set(progress?.completed_lessons ?? []);
  const completedDrills = new Set(progress?.completed_drills ?? []);

  // Empty progress → start at Lesson 1.
  if (completedLessons.size === 0) {
    const first = sorted[0];
    return {
      kind: 'start',
      eyebrow: 'Start training',
      title: first ? `Lesson 1: ${first.title}` : 'Lesson 1',
      subtitle:
        'Begin with the foundation. Twelve voice-led lessons take you from "what is an argument" to spotting the conclusion at speed.',
      cta: 'Begin Lesson 1',
      href: first ? `${BC}/lessons/${first.number}` : `${BC}/lessons/1.1`,
    };
  }

  // Teaching lessons are 1.1–1.12. Capstone is 1.13 and is tracked separately.
  const teaching = sorted.filter((l) => l.id !== CAPSTONE_LESSON_ID);
  const firstUndoneTeaching = teaching.find((l) => !completedLessons.has(l.id));
  const teachingDoneCount = teaching.filter((l) => completedLessons.has(l.id)).length;
  const capstoneAttempted = completedLessons.has(CAPSTONE_LESSON_ID);
  const drill34Done = completedDrills.has(UNLOCK_DRILL_ID);

  // 1) Mid-teaching: any of 1.1–1.12 not yet done → continue there.
  if (firstUndoneTeaching) {
    const lessonNumber = firstUndoneTeaching.number;
    const lessonInt = lessonNumber.split('.')[1] ?? lessonNumber;
    return {
      kind: 'continue-lesson',
      eyebrow: teachingDoneCount === 0 ? 'Start training' : 'Pick up where you left off',
      title: `Lesson ${lessonInt}: ${firstUndoneTeaching.title}`,
      subtitle:
        teachingDoneCount === 0
          ? 'Twelve guided sessions take you from "what is an argument" to spotting the conclusion at speed. Lesson 13 is the calibration that turns the dashboard on.'
          : `${teachingDoneCount} of ${teaching.length} teaching lessons cleared. One click and you are back in the seat.`,
      cta: teachingDoneCount === 0 ? `Begin Lesson ${lessonInt}` : `Continue Lesson ${lessonInt}`,
      href: `${BC}/lessons/${lessonNumber}`,
    };
  }

  // 2) Teaching done, capstone not taken → push to calibration.
  if (!capstoneAttempted) {
    return {
      kind: 'capstone',
      eyebrow: 'Calibration time',
      title: 'Take your calibration',
      subtitle:
        'Twelve lessons clear. The calibration is the first time the dashboard learns anything about you. After the teaching, not before.',
      cta: 'Start calibration',
      href: `${BC}/lessons/${CAPSTONE_NUMBER}`,
    };
  }

  // 3) Capstone done, Drill 3.4 not cleared → run the unlock-gate drill.
  if (!drill34Done) {
    return {
      kind: 'unlock-drill',
      eyebrow: 'Unlock the Simulator',
      title: `Drill ${UNLOCK_DRILL_NUMBER}: Rebuttal vs First-Sentence`,
      subtitle:
        'Four stages, five questions each. Clear all four and the Question Simulator opens.',
      cta: 'Open the gate drill',
      href: `${BC}/drills/${UNLOCK_DRILL_NUMBER}`,
    };
  }

  // 4) Capstone + Drill 3.4 done → live training.
  return {
    kind: 'simulator-ready',
    eyebrow: 'Live training',
    title: 'Run a Simulator question',
    subtitle:
      'Real LSAT-format items with the full five-choice answer set. Every miss is tagged so you can see the pattern.',
    cta: 'Open Simulator',
    href: `${BC}/simulator/bank`,
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
  const gate = ordered.find((d) => d.gates_simulator);

  // Highest priority: if the unlock-gate drill is not done, that is always next.
  if (gate && !completed.has(gate.id)) {
    return {
      eyebrow: 'Unlock the Simulator',
      title: `Drill ${gate.number}: ${gate.title}`,
      subtitle:
        'Four stages, five questions each. Clear all four and the Question Simulator opens.',
      cta: `Run Drill ${gate.number}`,
      href: `${BC}/drills/${gate.number}`,
      isGate: true,
    };
  }

  // Otherwise: first uncompleted drill in numeric order.
  const next = ordered.find((d) => !completed.has(d.id));
  if (next) {
    return {
      eyebrow: 'Next drill',
      title: `Drill ${next.number}: ${next.title}`,
      subtitle: 'Four stages of five questions. Your run-rate is calibration, not a grade.',
      cta: `Run Drill ${next.number}`,
      href: `${BC}/drills/${next.number}`,
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
      capstone: l.number === CAPSTONE_NUMBER,
    };
  });
}
