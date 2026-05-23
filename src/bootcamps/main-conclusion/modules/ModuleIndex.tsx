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
  const path = buildLessonPath(progressLike, LESSONS);
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

  // Custom copy for first run as requested
  const heroStep = isFreshRun
    ? {
        ...step,
        eyebrow: 'START HERE',
        title: 'Lesson 1: What’s an argument?',
        subtitle:
          'Before you can answer LR questions, you need to see the argument clearly: what the author is claiming, what support they give, and where the reasoning can break.',
        cta: 'Begin Lesson 1',
        secondary: undefined, // Only one primary action above the fold
      }
    : {
        ...step,
        secondary: step.secondary ?? { label: 'View lessons', href: '/bootcamp/intro-to-lr/lessons' },
      };

  return (
    <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-[1100px] mx-auto space-y-16 pb-32">
      <DynamicIslandTOC />
      
      <section>
        <RunnerHero step={heroStep} Icon={Icon} />
        {!isFreshRun ? (
          <div className="mt-8">
            <TrainingPath dots={path} />
          </div>
        ) : null}
      </section>

      {isFreshRun && (
        <>
          <section data-toc data-toc-title="What you’ll do first" className="space-y-6">
            <div className="font-mc-mono text-label uppercase tracking-[0.22em] text-[rgb(var(--ink-faint))]">
              Orientation
            </div>
            <h2 className="font-mc-serif text-h1 font-semibold text-[rgb(var(--ink))]">What you’ll do first</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                'Learn what counts as an argument',
                'Separate premises from conclusions',
                'Practice spotting the main point',
              ].map((item, i) => (
                <Card key={i} variant="surface" className="flex items-center gap-4">
                  <div className="h-2 w-2 shrink-0 rounded-full bg-[rgb(var(--ink))]" />
                  <span className="font-mc-mono text-mono uppercase tracking-wide text-[rgb(var(--ink-soft))]">{item}</span>
                </Card>
              ))}
            </div>
          </section>

          <section data-toc data-toc-title="Your path through Intro to LR" className="space-y-8">
            <div className="space-y-2">
              <h2 className="font-mc-serif text-h1 font-semibold text-[rgb(var(--ink))]">Your path through Intro to LR</h2>
              <p className="font-mc-serif text-body-prose text-[rgb(var(--ink-soft))] leading-relaxed">
                Start with Lesson 1. The rest of the bootcamp builds from that first read.
              </p>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { 
                  title: '1. See the argument', 
                  desc: 'Learn what counts as an argument, what the author is claiming, and what support is being offered.' 
                },
                { 
                  title: '2. Separate the pieces', 
                  desc: 'Distinguish premises, conclusions, background, concessions, and opposing views.' 
                },
                { 
                  title: '3. Find the main point faster', 
                  desc: 'Practice conclusion signals, structure shifts, and first-pass reads.' 
                },
                { 
                  title: '4. Apply it in questions', 
                  desc: 'Move from guided lessons into drills and simulator-style practice.' 
                },
              ].map((path, i) => (
                <Card key={i} variant="elev" className="space-y-2 border border-[rgb(var(--border)/0.08)] bg-[rgb(var(--bg-2)/0.4)]">
                  <h3 className="font-mc-serif text-h3 font-semibold text-[rgb(var(--ink))] italic">{path.title}</h3>
                  <p className="font-mc-serif text-body text-[rgb(var(--ink-soft))] leading-relaxed">{path.desc}</p>
                </Card>
              ))}
            </div>
          </section>

          <section data-toc data-toc-title="How to use this bootcamp" className="space-y-6">
            <Card variant="surface" className="border border-[rgb(var(--ink)/0.12)] bg-[rgb(var(--bg-2))] p-8 text-center max-w-2xl mx-auto">
              <h2 className="font-mc-serif text-h2 font-semibold text-[rgb(var(--ink))] mb-4">How to use this bootcamp</h2>
              <p className="font-mc-serif text-body-prose text-[rgb(var(--ink-soft))] leading-relaxed">
                Start with Lesson 1. Use the floating contents control only when you want to review the path or jump back to a section on this page.
              </p>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

