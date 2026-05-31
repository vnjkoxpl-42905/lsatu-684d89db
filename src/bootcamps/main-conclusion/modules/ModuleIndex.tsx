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
import { DynamicIslandTOC } from '@/bootcamps/main-conclusion/components/training-runner/DynamicIslandTOC';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Sparkles, BookOpen, Award, Dumbbell, Target } from 'lucide-react';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

const LESSONS = lessonsData as LessonRow[];

export function ModuleIndex(): JSX.Element {
  const { progress } = useModuleProgress();
  const progressLike: ProgressLike | null = progress
    ? {
        completed_lessons: progress.completed_lessons,
        completed_drills: progress.completed_drills,
      }
    : null;

  const step = nextTrainingStep(progressLike, LESSONS);
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

  const heroStep = isFreshRun
    ? {
        ...step,
        eyebrow: 'START HERE',
        title: 'How to Read an LR Stimulus',
        subtitle:
          'Start with the reading mindset first: find the conclusion, find the premises, and test whether the support really proves the claim.',
        cta: 'Begin Lesson',
        // Force absolute path for navigation
        href: '/bootcamp/intro-to-lr/lessons/notes/how-to-read-lr-stimulus',
        secondary: undefined,
      }
    : {
        ...step,
        secondary: step.secondary ?? { label: 'View lessons', href: '/bootcamp/intro-to-lr/lessons' },
      };

  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[840px] mx-auto">
      <section>
        <RunnerHero step={heroStep} Icon={Icon} />
      </section>
    </div>
  );
}
