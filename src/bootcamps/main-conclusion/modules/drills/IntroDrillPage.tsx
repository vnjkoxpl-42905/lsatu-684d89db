import { Link, useLocation } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';

import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import {
  getNextAction,
  getPreviousAction,
} from '@/bootcamps/main-conclusion/content/introToLrPath';
import { useModuleProgress } from '@/bootcamps/main-conclusion/hooks/useModuleProgress';
import { INTRO_DRILLS, type IntroDrillDefinition } from './introDrills';

export function IntroDrillPage({ drill }: { drill: IntroDrillDefinition }) {
  const { pathname } = useLocation();
  const previousAction = getPreviousAction(pathname);
  const nextAction = getNextAction(pathname);
  const { progress } = useModuleProgress();
  const isCompleted = Boolean(progress?.completed_drills?.includes(drill.completionId));

  return (
    <div className="mc-bootcamp min-h-screen bg-[oklch(0.96_0.01_60)] text-[oklch(0.2_0.01_60)]">
      <main className="mx-auto w-full max-w-[1120px] px-6 py-8 md:px-10 md:py-10 desktop:px-12 desktop:py-12">
        <div className="mx-auto w-full max-w-[980px] space-y-10">
          {previousAction ? (
            <Link
              to={previousAction.route}
              state={previousAction.linkState}
              className="inline-flex items-center gap-2 rounded-full border border-[oklch(0.2_0.01_60/0.1)] bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-[oklch(0.2_0.01_60/0.54)] transition-colors hover:bg-[oklch(0.98_0.005_60)]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Link>
          ) : null}

          <section className="grid min-h-[76vh] grid-cols-1 items-center gap-14 py-10 md:grid-cols-[1fr_minmax(320px,390px)] md:py-16">
            <div className="space-y-8">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.38em] text-[oklch(0.2_0.01_60/0.46)]">
                  Intro to LR · Drill {drill.number} of {INTRO_DRILLS.length}
                </p>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgb(var(--success)/0.3)] bg-[rgb(var(--success)/0.12)] px-2.5 py-0.5 font-mc-mono text-[10px] uppercase tracking-[0.16em] text-[rgb(var(--success))]">
                    <Check className="h-3 w-3" strokeWidth={2.8} />
                    Completed
                  </span>
                ) : null}
              </div>
              <h1 className="max-w-[12ch] font-serif text-[clamp(3.9rem,9vw,7.5rem)] italic font-medium leading-[0.9] tracking-[-0.06em] text-[oklch(0.15_0.01_60)]">
                {drill.title}
              </h1>
              <p className="max-w-2xl text-xl leading-relaxed text-[oklch(0.2_0.01_60/0.64)] md:text-2xl">
                {drill.summary}
              </p>
            </div>

            <aside className="group relative">
              <div className="absolute inset-0 rounded-[24px] bg-[oklch(0.2_0.01_60/0.04)] opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
              <Card variant="elev" className="relative space-y-8 rounded-[24px] p-8 md:p-10">
                <div className="space-y-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-[oklch(0.2_0.01_60/0.42)]">
                    Drill page
                  </p>
                  <h2 className="font-serif text-3xl italic tracking-tight text-[oklch(0.15_0.01_60)]">
                    {isCompleted ? 'Run it again or continue' : 'Enter the live drill'}
                  </h2>
                  {drill.questionCount ? (
                    <p className="text-[15px] leading-relaxed text-[oklch(0.2_0.01_60/0.58)]">
                      {drill.questionCount} questions
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-3">
                  <Link
                    to={drill.runRoute}
                    className="group/btn relative inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[color:var(--border-accent-mid)] bg-[image:var(--grad-accent-strong)] px-4 font-mc-mono text-body uppercase tracking-[0.18em] text-[rgb(var(--bg))] shadow-[0_16px_34px_rgb(var(--bg)/0.4)] transition-[transform,box-shadow,background,border-color] duration-150 ease-eased hover:-translate-y-[2px] hover:border-[color:var(--border-accent-strong)] hover:shadow-[var(--glow-accent-strong)] active:translate-y-[0.5px] active:shadow-[var(--shadow-press)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-mc-accent focus-visible:outline-offset-2"
                  >
                    {isCompleted ? 'Run Again' : 'Start Drill'}
                    <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2.2} />
                  </Link>

                  {nextAction ? (
                    <Link
                      to={nextAction.route}
                      state={nextAction.linkState}
                      className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[oklch(0.2_0.01_60/0.16)] bg-white px-4 font-mc-mono text-body uppercase tracking-[0.16em] text-[oklch(0.2_0.01_60)] transition-colors hover:bg-[oklch(0.98_0.005_60)]"
                    >
                      Next: {nextAction.title}
                      <ArrowRight className="h-4 w-4 shrink-0" strokeWidth={2} />
                    </Link>
                  ) : null}
                </div>
              </Card>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
