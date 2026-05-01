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

const LESSONS = lessonsData as LessonRow[];
const TOTAL_LESSONS = 13;

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
  const completedCount = progressLike?.completed_lessons.filter((id) =>
    /^MC-LSN-1\.\d+$/.test(id),
  ).length ?? 0;

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
      ? `${completedCount} of ${TOTAL_LESSONS} done`
      : step.kind === 'simulator-ready'
      ? 'lessons cleared'
      : undefined;

  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1100px] mx-auto space-y-8">
      <Eyebrow />
      <RunnerHero step={step} progressLabel={progressLabel} Icon={Icon} />
      <TrainingPath dots={path} />
      <JumpTo />
    </div>
  );
}

function Eyebrow(): JSX.Element {
  return (
    <header className="relative isolate">
      <div className="inline-flex items-center gap-2 font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">
        <span
          aria-hidden="true"
          className="inline-block h-1.5 w-1.5 rounded-full bg-[rgb(var(--accent))] shadow-[0_0_8px_rgb(232_208_139/0.6)]"
        />
        Intro to LR · Logical Reasoning Bootcamp
      </div>
      <h1 className="font-mc-serif text-h1 font-semibold mt-2 text-ink leading-tight">
        Welcome back.
      </h1>
    </header>
  );
}
