import { useState } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow } from 'date-fns';
import { ArrowRight, Check, Minus, X } from 'lucide-react';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { useIntroLrAttempts } from '@/bootcamps/main-conclusion/hooks/useIntroLrAttempts';
import { usePracticeDrillStatus } from '@/bootcamps/main-conclusion/hooks/usePracticeDrillStatus';
import {
  buildLiveIntroDiagnosticProfile,
  type LiveDrillLabDiagnostic,
  type LiveHardSentenceItem,
  type LivePathStepItem,
  type LivePracticeSetDiagnostic,
  type LiveRecentAttemptItem,
  type RollingAccuracyPoint,
} from '@/bootcamps/main-conclusion/lib/diagnostics';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { cn } from '@/bootcamps/main-conclusion/lib/cn';

type PathTab = 'core-path' | 'hard-sentences';

export function DiagnosticsAnalyticsSurface({ title = 'Diagnostic Profile' }: { title?: string }) {
  const d = useDiagnostics();
  const introLr = useIntroLrAttempts();
  const practice = usePracticeDrillStatus();
  const [activeTab, setActiveTab] = useState<PathTab>('core-path');

  if (d.loading || introLr.loading || practice.loading) {
    return (
      <div className="mx-auto max-w-[1280px] px-6 py-10 md:px-10 md:py-12">
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  const profile = buildLiveIntroDiagnosticProfile({
    progress: d.progress,
    practiceStatuses: practice.statuses,
    introLrAttempts: introLr.attempts,
    calibrationAttempts: d.calibrationAttempts,
    fsvrSession: d.fsvrSession,
    fsvrViewedAt: d.fsvrViewedAt,
  });

  const lastActivityLabel = profile.lastActivityAt
    ? `Updated ${format(new Date(profile.lastActivityAt), 'MMM d')}`
    : 'No saved attempts yet';

  const subtitleText =
    profile.corePathCompleted === 0 && profile.totalScoredReps === 0
      ? 'Tracks your lessons, drill labs, official LSAT practice sets, and saved question attempts across Intro to LR.'
      : `${profile.corePathCompleted} of ${profile.corePathTotal} core path steps cleared · ${profile.totalScoredReps} scored question rep${profile.totalScoredReps === 1 ? '' : 's'} saved · ${lastActivityLabel}.`;

  return (
    <article className="mx-auto max-w-[1280px] px-6 py-8 md:px-10 md:py-12 font-mc-sans text-[rgb(var(--ink))]">
      {/* Title Row */}
      <header className="flex flex-col gap-5 border-b border-[rgb(var(--border)/0.12)] pb-7 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <div className="text-[12px] font-medium text-[rgb(var(--ink-faint))]">
            Intro to LR · Diagnostics
          </div>
          <h1 className="font-mc-serif text-[clamp(28px,3.4vw,40px)] font-semibold leading-[1.08] tracking-[-0.025em] text-[rgb(var(--ink))]">
            {title}
          </h1>
          <p className="max-w-[64ch] text-[14px] leading-[1.55] text-[rgb(var(--ink-soft))]">
            {subtitleText}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Link
            to={profile.nextMove.href}
            state={profile.nextMove.linkState}
            className="inline-flex h-10 items-center gap-2 rounded-[6px] bg-[rgb(var(--ink))] px-4 text-[13px] font-medium text-[rgb(var(--bg))] transition-opacity duration-150 hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--ink)/0.35)] focus-visible:ring-offset-2"
          >
            <span>{profile.nextMove.ctaLabel}</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
          </Link>
        </div>
      </header>

      {/* Divided KPI Strip */}
      <section
        aria-label="Course standing summary"
        className="mt-6 grid grid-cols-1 overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))] sm:grid-cols-2 lg:grid-cols-4"
      >
        <KpiCell
          label="Core Path"
          figure={`${profile.corePathCompleted} / ${profile.corePathTotal}`}
          badge={`${profile.corePathPct}%`}
          caption={`${profile.lessonsCompleted}/${profile.lessonsTotal} lessons · ${profile.drillsCompleted}/${profile.drillsTotal} labs · ${profile.practiceSetsCompleted}/${profile.practiceSetsTotal} practice sets`}
          isFirst
        />
        <KpiCell
          label="Question Accuracy"
          figure={profile.overallAccuracy !== null ? `${profile.overallAccuracy}%` : 'No reps'}
          badge={profile.totalScoredReps > 0 ? `${profile.totalScoredReps} saved` : '0 saved'}
          caption={
            profile.totalScoredReps > 0
              ? `${profile.totalCorrectReps} of ${profile.totalScoredReps} correct across labs and sets`
              : 'Populates automatically as you answer questions'
          }
        />
        <KpiCell
          label="Practice Sets"
          figure={`${profile.practiceQuestionsAnswered} / ${profile.practiceQuestionsTotal}`}
          badge={
            profile.practiceQuestionsAnswered > 0
              ? `${profile.practiceQuestionsCorrect} correct`
              : 'Not started'
          }
          caption="Official LSAT Main Conclusion questions (2 sets)"
        />
        <KpiCell
          label="Hard Sentences"
          figure={`${profile.hardSentencesCompleted} / ${profile.hardSentencesTotal}`}
          badge={`${profile.hardSentencesPct}%`}
          caption="5 lessons, Decomposer Lab, Cluster Drill, and Capstone"
        />
      </section>

      {/* Main 2-Column Workspace */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* Left Primary Column */}
        <div className="min-w-0 space-y-6">
          {/* Signature Element: Official Practice Sets & Drill Labs Ledger */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[rgb(var(--border)/0.10)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[rgb(var(--ink))]">
                  Main Conclusion Practice Sets
                </h2>
                <p className="mt-0.5 text-[13px] text-[rgb(var(--ink-soft))]">
                  Official LSAT questions grouped by conclusion structure. Question markers update after every answer.
                </p>
              </div>
              <Link
                to="/bootcamp/intro-to-lr/practice-drills"
                className="text-[12px] font-medium text-[rgb(var(--ink-soft))] underline-offset-4 hover:text-[rgb(var(--ink))] hover:underline"
              >
                Open Practice Drills
              </Link>
            </div>

            <div className="divide-y divide-[rgb(var(--border)/0.08)]">
              {profile.practiceSets.map((set) => (
                <PracticeSetRow key={set.slug} set={set} />
              ))}
            </div>
          </section>

          {/* Interactive Drill Labs & Graded Exercises */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[rgb(var(--border)/0.10)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[rgb(var(--ink))]">
                  Drill Labs and Graded Exercises
                </h2>
                <p className="mt-0.5 text-[13px] text-[rgb(var(--ink-soft))]">
                  Saved completion and accuracy across the three core Drill Labs and Hard Sentences evaluations.
                </p>
              </div>
              <Link
                to="/bootcamp/intro-to-lr/drills"
                className="text-[12px] font-medium text-[rgb(var(--ink-soft))] underline-offset-4 hover:text-[rgb(var(--ink))] hover:underline"
              >
                Open Drill Lab
              </Link>
            </div>

            <div className="divide-y divide-[rgb(var(--border)/0.08)]">
              {profile.drillLabs.map((lab) => (
                <DrillLabRow key={lab.id} lab={lab} />
              ))}
            </div>
          </section>

          {/* Rolling Accuracy Chart */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))]">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[rgb(var(--border)/0.10)] px-5 py-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em] text-[rgb(var(--ink))]">
                  Accuracy Across Recent Reps
                </h2>
                <p className="mt-0.5 text-[13px] text-[rgb(var(--ink-soft))]">
                  Four-question rolling accuracy across your most recent timestamped lab and capstone submissions.
                </p>
              </div>
              <span className="text-[12px] tabular-nums text-[rgb(var(--ink-faint))]">
                {profile.rollingSeries.length} recorded point{profile.rollingSeries.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="p-5">
              <RollingAccuracyChart points={profile.rollingSeries} />
            </div>
          </section>
        </div>

        {/* Right Rail */}
        <aside className="space-y-6">
          {/* Next Recommended Move Card */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface))] p-5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12px] font-medium text-[rgb(var(--accent))]">
                {profile.nextMove.eyebrow}
              </span>
              <span className="inline-flex items-center rounded-[4px] bg-[rgb(var(--surface-elev))] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--ink-soft))]">
                Next step
              </span>
            </div>
            <h2 className="mt-2 font-mc-serif text-[20px] font-semibold leading-[1.25] text-[rgb(var(--ink))]">
              {profile.nextMove.title}
            </h2>
            <p className="mt-2 text-[13px] leading-[1.55] text-[rgb(var(--ink-soft))]">
              {profile.nextMove.reason}
            </p>
            <div className="mt-4">
              <Link
                to={profile.nextMove.href}
                state={profile.nextMove.linkState}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-[6px] bg-[rgb(var(--ink))] px-4 text-[13px] font-medium text-[rgb(var(--bg))] transition-opacity duration-150 hover:opacity-90"
              >
                <span>{profile.nextMove.ctaLabel}</span>
                <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
              </Link>
            </div>
          </section>

          {/* Curriculum Checklist (Core Path & Hard Sentences) */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))]">
            <div className="border-b border-[rgb(var(--border)/0.10)] px-4 pt-3.5">
              <div className="flex items-center justify-between">
                <h2 className="text-[14px] font-semibold text-[rgb(var(--ink))]">
                  Curriculum Checklist
                </h2>
                <span className="text-[12px] tabular-nums text-[rgb(var(--ink-faint))]">
                  {activeTab === 'core-path'
                    ? `${profile.corePathCompleted}/${profile.corePathTotal} done`
                    : `${profile.hardSentencesCompleted}/${profile.hardSentencesTotal} done`}
                </span>
              </div>
              <div className="mt-3 flex gap-4" role="tablist" aria-label="Curriculum modules">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'core-path'}
                  onClick={() => setActiveTab('core-path')}
                  className={cn(
                    'border-b-2 pb-2.5 text-[12px] font-medium transition-colors duration-150',
                    activeTab === 'core-path'
                      ? 'border-[rgb(var(--ink))] text-[rgb(var(--ink))]'
                      : 'border-transparent text-[rgb(var(--ink-faint))] hover:text-[rgb(var(--ink-soft))]',
                  )}
                >
                  Core Path ({profile.corePathCompleted}/{profile.corePathTotal})
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === 'hard-sentences'}
                  onClick={() => setActiveTab('hard-sentences')}
                  className={cn(
                    'border-b-2 pb-2.5 text-[12px] font-medium transition-colors duration-150',
                    activeTab === 'hard-sentences'
                      ? 'border-[rgb(var(--ink))] text-[rgb(var(--ink))]'
                      : 'border-transparent text-[rgb(var(--ink-faint))] hover:text-[rgb(var(--ink-soft))]',
                  )}
                >
                  Hard Sentences ({profile.hardSentencesCompleted}/{profile.hardSentencesTotal})
                </button>
              </div>
            </div>

            {activeTab === 'core-path' ? (
              <ul className="divide-y divide-[rgb(var(--border)/0.07)]">
                {profile.pathSteps.map((step) => (
                  <PathStepRow key={step.id} step={step} />
                ))}
              </ul>
            ) : (
              <ul className="divide-y divide-[rgb(var(--border)/0.07)]">
                {profile.hardEntries.map((entry) => (
                  <HardEntryRow key={entry.id} entry={entry} />
                ))}
              </ul>
            )}
          </section>

          {/* Recent Saved Attempts */}
          <section className="overflow-hidden rounded-[8px] border border-[rgb(var(--border)/0.12)] bg-[rgb(var(--surface))]">
            <div className="flex items-baseline justify-between gap-2 border-b border-[rgb(var(--border)/0.10)] px-4 py-3.5">
              <h2 className="text-[14px] font-semibold text-[rgb(var(--ink))]">
                Recent Saved Reps
              </h2>
              <span className="text-[12px] tabular-nums text-[rgb(var(--ink-faint))]">
                {profile.totalScoredReps} total
              </span>
            </div>

            {profile.recentAttempts.length === 0 ? (
              <div className="px-4 py-6 text-[13px] leading-[1.5] text-[rgb(var(--ink-soft))]">
                No individual question submissions recorded yet. Complete a question in any Drill Lab or Capstone to see your log here.
              </div>
            ) : (
              <ul className="divide-y divide-[rgb(var(--border)/0.07)]">
                {profile.recentAttempts.map((item) => (
                  <RecentAttemptRow key={item.id} item={item} />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}

function KpiCell({
  label,
  figure,
  badge,
  caption,
  isFirst = false,
}: {
  label: string;
  figure: string;
  badge: string;
  caption: string;
  isFirst?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex flex-col justify-between p-5',
        !isFirst && 'border-t border-[rgb(var(--border)/0.10)] sm:border-l sm:border-t-0',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-[rgb(var(--ink-soft))]">{label}</span>
        <span className="inline-flex items-center rounded-[4px] bg-[rgb(var(--surface-elev))] px-2 py-0.5 text-[11px] font-medium tabular-nums text-[rgb(var(--ink-soft))]">
          {badge}
        </span>
      </div>
      <div className="mt-3 font-mc-serif text-[28px] font-semibold leading-none tracking-[-0.02em] tabular-nums text-[rgb(var(--ink))]">
        {figure}
      </div>
      <p className="mt-2.5 text-[12px] leading-[1.45] text-[rgb(var(--ink-faint))]">{caption}</p>
    </div>
  );
}

function PracticeSetRow({ set }: { set: LivePracticeSetDiagnostic }) {
  const actionLabel =
    set.state === 'completed'
      ? 'Review set'
      : set.state === 'in-progress'
        ? `Resume Q${set.resumeIndex + 1}`
        : 'Start set';

  return (
    <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-semibold text-[rgb(var(--ink))]">{set.title}</span>
          <StatusPill state={set.state} />
          {set.accuracy !== null ? (
            <span className="text-[12px] font-medium tabular-nums text-[rgb(var(--ink-soft))]">
              · {set.accuracy}% ({set.correct}/{set.answered})
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5" aria-label={`${set.title} question outcomes`}>
          {set.questionOutcomes.map((outcome, index) => {
            const isResume = set.state === 'in-progress' && index === set.resumeIndex;
            const statusText =
              outcome === 'correct'
                ? `Question ${index + 1}: correct`
                : outcome === 'incorrect'
                  ? `Question ${index + 1}: missed`
                  : `Question ${index + 1}: unanswered`;
            return (
              <span
                key={index}
                title={statusText}
                aria-label={statusText}
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-[5px] text-[11px] font-medium tabular-nums',
                  outcome === 'correct' &&
                    'border border-[rgb(var(--success)/0.32)] bg-[rgb(var(--success)/0.12)] text-[rgb(var(--success))]',
                  outcome === 'incorrect' &&
                    'border border-[rgb(var(--error)/0.30)] bg-[rgb(var(--error)/0.10)] text-[rgb(var(--error))]',
                  outcome === 'unanswered' &&
                    'border border-[rgb(var(--border)/0.16)] bg-[rgb(var(--bg)/0.55)] text-[rgb(var(--ink-faint))]',
                  isResume && 'ring-1 ring-[rgb(var(--ink))] ring-offset-1',
                )}
              >
                {outcome === 'correct' ? (
                  <Check className="h-3 w-3" strokeWidth={2.5} />
                ) : outcome === 'incorrect' ? (
                  <X className="h-3 w-3" strokeWidth={2.5} />
                ) : (
                  index + 1
                )}
              </span>
            );
          })}
          <span className="ml-1.5 text-[12px] tabular-nums text-[rgb(var(--ink-faint))]">
            {set.answered} of {set.total} answered
          </span>
        </div>
      </div>

      <div className="shrink-0">
        <Link
          to={set.route}
          state={set.linkState}
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[rgb(var(--border)/0.18)] bg-[rgb(var(--bg)/0.6)] px-3 text-[12px] font-medium text-[rgb(var(--ink))] transition-colors duration-150 hover:bg-[rgb(var(--surface-elev))]"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function DrillLabRow({ lab }: { lab: LiveDrillLabDiagnostic }) {
  const actionLabel =
    lab.state === 'completed'
      ? 'Review'
      : lab.state === 'in-progress'
        ? 'Continue'
        : 'Open';

  return (
    <div className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[14px] font-medium text-[rgb(var(--ink))]">{lab.title}</span>
          <StatusPill state={lab.state} />
        </div>
        <p className="mt-0.5 text-[12px] tabular-nums text-[rgb(var(--ink-soft))]">
          {lab.skill} · {lab.detailLabel}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-4">
        {lab.accuracy !== null ? (
          <div className="text-right">
            <span className="text-[14px] font-semibold tabular-nums text-[rgb(var(--ink))]">
              {lab.accuracy}%
            </span>
            <span className="block text-[11px] text-[rgb(var(--ink-faint))]">accuracy</span>
          </div>
        ) : null}
        <Link
          to={lab.route}
          className="inline-flex h-8 items-center gap-1.5 rounded-[6px] border border-[rgb(var(--border)/0.18)] bg-[rgb(var(--bg)/0.6)] px-3 text-[12px] font-medium text-[rgb(var(--ink))] transition-colors duration-150 hover:bg-[rgb(var(--surface-elev))]"
        >
          <span>{actionLabel}</span>
          <ArrowRight className="h-3 w-3" strokeWidth={2} />
        </Link>
      </div>
    </div>
  );
}

function StatusPill({ state }: { state: 'completed' | 'in-progress' | 'not-started' }) {
  if (state === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-[4px] bg-[rgb(var(--success)/0.12)] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--success))]">
        <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
        Completed
      </span>
    );
  }
  if (state === 'in-progress') {
    return (
      <span className="inline-flex items-center rounded-[4px] bg-[rgb(var(--accent)/0.14)] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--accent))]">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-[4px] bg-[rgb(var(--surface-elev))] px-2 py-0.5 text-[11px] font-medium text-[rgb(var(--ink-faint))]">
      Not started
    </span>
  );
}

function PathStepRow({ step }: { step: LivePathStepItem }) {
  return (
    <li>
      <Link
        to={step.route}
        state={step.linkState}
        className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[rgb(var(--bg)/0.55)]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium tabular-nums',
              step.state === 'completed' &&
                'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]',
              (step.state === 'next' || step.state === 'in-progress') &&
                'bg-[rgb(var(--ink))] text-[rgb(var(--bg))]',
              step.state === 'upcoming' &&
                'border border-[rgb(var(--border)/0.20)] text-[rgb(var(--ink-faint))]',
            )}
          >
            {step.state === 'completed' ? (
              <Check className="h-3 w-3" strokeWidth={2.5} />
            ) : (
              step.index
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[rgb(var(--ink))]">
              {step.title}
            </div>
            <div className="text-[11px] tabular-nums text-[rgb(var(--ink-faint))]">
              {step.typeLabel} · {step.detail}
            </div>
          </div>
        </div>

        <span
          className={cn(
            'shrink-0 text-[11px] font-medium',
            step.state === 'completed' && 'text-[rgb(var(--success))]',
            (step.state === 'next' || step.state === 'in-progress') && 'text-[rgb(var(--accent))]',
            step.state === 'upcoming' && 'text-[rgb(var(--ink-faint))]',
          )}
        >
          {step.state === 'completed'
            ? 'Done'
            : step.state === 'in-progress'
              ? 'Resume'
              : step.state === 'next'
                ? 'Next'
                : 'Open'}
        </span>
      </Link>
    </li>
  );
}

function HardEntryRow({ entry }: { entry: LiveHardSentenceItem }) {
  return (
    <li>
      <Link
        to={entry.route}
        className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-[rgb(var(--bg)/0.55)]"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span
            className={cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-medium tabular-nums',
              entry.completed && 'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]',
              !entry.completed && entry.isNext && 'bg-[rgb(var(--ink))] text-[rgb(var(--bg))]',
              !entry.completed && !entry.isNext && 'border border-[rgb(var(--border)/0.20)] text-[rgb(var(--ink-faint))]',
            )}
          >
            {entry.completed ? (
              <Check className="h-3 w-3" strokeWidth={2.5} />
            ) : entry.id === 'capstone' ? (
              '5.8'
            ) : (
              entry.id
            )}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-[rgb(var(--ink))]">
              {entry.title}
            </div>
            <div className="text-[11px] text-[rgb(var(--ink-faint))]">{entry.kindLabel}</div>
          </div>
        </div>

        <span
          className={cn(
            'shrink-0 text-[11px] font-medium',
            entry.completed
              ? 'text-[rgb(var(--success))]'
              : entry.isNext
                ? 'text-[rgb(var(--accent))]'
                : 'text-[rgb(var(--ink-faint))]',
          )}
        >
          {entry.completed ? 'Done' : entry.isNext ? 'Next' : 'Open'}
        </span>
      </Link>
    </li>
  );
}

function RecentAttemptRow({ item }: { item: LiveRecentAttemptItem }) {
  let relativeTime = '';
  try {
    relativeTime = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
  } catch {
    relativeTime = '';
  }

  return (
    <li className="flex min-h-[44px] items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span
          className={cn(
            'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
            item.correct
              ? 'bg-[rgb(var(--success)/0.14)] text-[rgb(var(--success))]'
              : 'bg-[rgb(var(--error)/0.12)] text-[rgb(var(--error))]',
          )}
          aria-label={item.correct ? 'Correct' : 'Missed'}
        >
          {item.correct ? (
            <Check className="h-3 w-3" strokeWidth={2.5} />
          ) : (
            <Minus className="h-3 w-3" strokeWidth={2.5} />
          )}
        </span>
        <div className="min-w-0">
          <div className="truncate text-[13px] font-medium text-[rgb(var(--ink))]">
            {item.sourceLabel} · {item.questionLabel}
          </div>
          <div className="truncate text-[11px] text-[rgb(var(--ink-faint))]">
            {item.answerLabel}
          </div>
        </div>
      </div>

      <span className="shrink-0 text-[11px] tabular-nums text-[rgb(var(--ink-faint))]">
        {relativeTime}
      </span>
    </li>
  );
}

function RollingAccuracyChart({ points }: { points: RollingAccuracyPoint[] }) {
  const width = 640;
  const height = 180;
  const padLeft = 38;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 26;
  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;
  const ticks = [0, 50, 100];

  const yFor = (val: number) => padTop + plotH - (Math.max(0, Math.min(100, val)) / 100) * plotH;
  const xFor = (i: number, count: number) =>
    count <= 1 ? padLeft + plotW / 2 : padLeft + (i / (count - 1)) * plotW;

  const polylinePoints =
    points.length > 1
      ? points.map((pt, i) => `${xFor(i, points.length).toFixed(1)},${yFor(pt.rollingAccuracy).toFixed(1)}`).join(' ')
      : '';

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[180px] w-full overflow-visible"
        role="img"
        aria-label="Rolling accuracy chart across saved question attempts"
      >
        {ticks.map((tick) => {
          const y = yFor(tick);
          return (
            <g key={tick}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="rgb(var(--border) / 0.12)"
                strokeWidth="1"
              />
              <text
                x={padLeft - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-[rgb(var(--ink-faint))] text-[11px] tabular-nums"
              >
                {tick}%
              </text>
            </g>
          );
        })}

        {points.length === 0 ? (
          <line
            x1={padLeft}
            y1={yFor(0)}
            x2={width - padRight}
            y2={yFor(0)}
            stroke="rgb(var(--border) / 0.28)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ) : null}

        {points.length > 1 ? (
          <polyline
            fill="none"
            stroke="rgb(var(--success))"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            points={polylinePoints}
          />
        ) : null}

        {points.map((pt, i) => {
          const cx = xFor(i, points.length);
          const cy = yFor(pt.rollingAccuracy);
          const showLabel =
            points.length <= 6 || i === 0 || i === points.length - 1 || i === Math.floor(points.length / 2);
          return (
            <g key={`${pt.label}-${i}`}>
              <circle
                cx={cx}
                cy={cy}
                r={3.5}
                fill="rgb(var(--surface))"
                stroke="rgb(var(--success))"
                strokeWidth="2"
              >
                <title>{`${pt.label} · ${pt.source}: ${pt.rollingAccuracy}% rolling accuracy`}</title>
              </circle>
              {showLabel ? (
                <text
                  x={cx}
                  y={height - 6}
                  textAnchor="middle"
                  className="fill-[rgb(var(--ink-faint))] text-[10px] tabular-nums"
                >
                  {pt.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {points.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="rounded-[6px] bg-[rgb(var(--surface)/0.92)] px-3 py-1.5 text-[12px] text-[rgb(var(--ink-soft))]">
            No timestamped question reps yet. Complete a drill lab or capstone question to plot your trend.
          </span>
        </div>
      ) : null}
    </div>
  );
}
