/**
 * Bootcamp Runner — the bootcamp's primary entry point.
 *
 * Replaces the old card-grid module index. Lands the student on a single,
 * obvious next training step computed from real progress (useModuleProgress).
 * The 6-module list is demoted to a JumpTo pill row.
 */

import lessonsData from '@/bootcamps/main-conclusion/data/lessons.generated.json';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import {
  nextTrainingStep,
  buildLessonPath,
  type LessonRow,
  type ProgressLike,
} from '@/bootcamps/main-conclusion/lib/runner';
import { RunnerHero } from '@/bootcamps/main-conclusion/components/training-runner/RunnerHero';
import { TrainingPath } from '@/bootcamps/main-conclusion/components/training-runner/TrainingPath';
import { JumpTo } from '@/bootcamps/main-conclusion/components/training-runner/JumpTo';
import { Sparkles, BookOpen, Award, Dumbbell, Target } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const LESSONS = lessonsData as LessonRow[];
const TOTAL_TEACHING = 12;

export function ModuleIndex(): JSX.Element {
  const { progress } = useModuleProgress();
  const progressLike: ProgressLike | null = progress
    ? {
        completed_lessons: progress.completed_lessons,
        completed_drills: progress.completed_drills,
      }
    : null;

  const step = nextTrainingStep(progressLike, LESSONS);
  const path = buildLessonPath(progressLike, LESSONS);
  // Count only the 12 teaching lessons (1.1–1.12). Capstone is tracked separately.
  const teachingDoneCount = (progressLike?.completed_lessons ?? []).filter(
    (id) => /^MC-LSN-1\.\d+$/.test(id) && id !== 'MC-LSN-1.13',
  ).length;
  const isFreshRun = step.kind === 'start';

  const Icon =
    step.kind === 'capstone'
      ? Award
      : step.kind === 'unlock-drill'
      ? Dumbbell
      : step.kind === 'simulator-ready'
      ? Target
      : step.kind === 'continue-lesson'
      ? BookOpen
      : Sparkles;

  const progressLabel =
    step.kind === 'continue-lesson'
      ? `${teachingDoneCount} of ${TOTAL_TEACHING} done`
      : step.kind === 'simulator-ready'
      ? 'lessons cleared'
      : undefined;

  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1100px] mx-auto space-y-8">
      <BrandLine />
      <RunnerHero step={step} progressLabel={progressLabel} Icon={Icon} />
      {!isFreshRun ? <TrainingPath dots={path} /> : <FreshRunPreview />}
      <JumpTo />
      {isFreshRun ? <ShortcutHint /> : null}
    </div>
  );
}

/**
 * Brand line above the hero. Single eyebrow, no competing heading.
 * The hero's display title is the page's H1.
 */
function BrandLine(): JSX.Element {
  return (
    <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
      <span
        aria-hidden="true"
        className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
      />
      Intro to LR · Logical Reasoning Bootcamp
    </div>
  );
}

/**
 * First-run substitute for the lesson-path strip. A single line that promises
 * the shape of the journey, instead of 13 grey dots that show no signal yet.
 */
function FreshRunPreview(): JSX.Element {
  return (
    <div
      className={cn(
        'rounded-3 px-4 py-3',
        'bg-[image:var(--grad-surface-soft)]',
        'border border-[rgb(var(--border)/0.08)]',
      )}
    >
      <div className="flex items-center gap-3 font-mc-mono text-mono text-ink-faint">
        <span
          aria-hidden="true"
          className="inline-block h-1 w-1 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_6px_rgb(232_208_139/0.7)]"
        />
        Twelve guided lessons, then the calibration that turns your dashboard on.
      </div>
    </div>
  );
}

/**
 * One-time hint surfacing the keyboard shortcuts on first run.
 * Disappears the moment the student clears their first lesson.
 */
function ShortcutHint(): JSX.Element {
  return (
    <p className="font-mc-mono text-mono text-ink-faint inline-flex flex-wrap items-center gap-2">
      <Kbd>⌘K</Kbd>
      <span>jump anywhere</span>
      <span className="opacity-50">·</span>
      <Kbd>⌘J</Kbd>
      <span>ask the tutor</span>
    </p>
  );
}

function Kbd({ children }: { children: React.ReactNode }): JSX.Element {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-[5px] px-1',
        'bg-[rgb(var(--surface-elev))] border border-[rgb(var(--border)/0.14)]',
        'shadow-[inset_0_-1px_0_rgb(0_0_0/0.4),0_1px_0_rgb(255_255_255/0.04)]',
        'font-mc-mono text-[10px] font-semibold text-ink-soft',
      )}
    >
      {children}
    </kbd>
  );
}
