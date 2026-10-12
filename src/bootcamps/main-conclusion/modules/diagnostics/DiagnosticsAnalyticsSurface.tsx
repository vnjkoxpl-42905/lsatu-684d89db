import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { Activity, ArrowRight, BrainCircuit, Gauge as GaugeIcon, LibraryBig, ShieldAlert, Sparkles, Target } from 'lucide-react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, XAxis, YAxis } from 'recharts';
import { Gauge } from '@/components/ui/gauge-1';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { useDiagnostics } from '@/bootcamps/main-conclusion/hooks/useDiagnostics';
import { useIntroLrAttempts } from '@/bootcamps/main-conclusion/hooks/useIntroLrAttempts';
import {
  aggregateTraitStats,
  buildRecommendations,
  buildRollingAccuracySeries,
  buildSourceSummary,
  buildSurfaceWeaknesses,
  calibrationSeed,
  latestDiagnosticsActivityAt,
  moduleViews,
  strongestTraits,
  weakestTraits,
} from '@/bootcamps/main-conclusion/lib/diagnostics';
import { isDue } from '@/bootcamps/main-conclusion/lib/srs';
import { Badge } from '@/bootcamps/main-conclusion/components/primitives/Badge';
import { Button } from '@/bootcamps/main-conclusion/components/primitives/Button';
import { Card } from '@/bootcamps/main-conclusion/components/primitives/Card';
import { Chip } from '@/bootcamps/main-conclusion/components/primitives/Chip';
import { LoadingSkeleton } from '@/bootcamps/main-conclusion/components/primitives/LoadingSkeleton';
import { PageHeader } from '@/bootcamps/main-conclusion/components/primitives/PageHeader';

const trendConfig = {
  rollingAccuracy: { label: 'Rolling accuracy', color: 'rgb(var(--accent))' },
} as const;

const traitConfig = {
  accuracy: { label: 'Accuracy', color: 'rgb(var(--accent))' },
} as const;

function gaugeTone(value: number) {
  if (value >= 75) return 'success';
  if (value >= 50) return 'warn';
  return 'error';
}

function gaugeColors(value: number) {
  return {
    '0': 'rgb(var(--error))',
    '50': 'rgb(var(--warn))',
    '75': 'rgb(var(--success))',
    secondary: 'rgb(var(--border) / 0.18)',
    primary: value >= 75 ? 'rgb(var(--success))' : value >= 50 ? 'rgb(var(--warn))' : 'rgb(var(--error))',
  };
}

export function DiagnosticsAnalyticsSurface({ title = 'Diagnostic Profile' }: { title?: string }) {
  const d = useDiagnostics();
  const introLr = useIntroLrAttempts();

  if (d.loading) {
    return (
      <div className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-6xl mx-auto">
        <LoadingSkeleton lines={10} />
      </div>
    );
  }

  const seed = calibrationSeed(d.calibrationAttempts);
  const traits = aggregateTraitStats(d.trapsTags);
  const modules = moduleViews(d.progress);
  const dueCount = d.srsItems.filter((s) =>
    isDue({ ease: s.ease, interval_days: s.interval_days, lapses: s.lapses, reps: 0, due_at_iso: s.due_at, last_grade: s.last_grade ?? 0 }),
  ).length;
  const recommendations = buildRecommendations(traits, dueCount, d.calibrationAttempts.length > 0);
  const timeline = buildRollingAccuracySeries(d.calibrationAttempts, d.simulatorAttempts, d.drillStageGates);
  const sourceSummary = buildSourceSummary(d.calibrationAttempts, d.simulatorAttempts, d.drillStageGates);
  const strengths = strongestTraits(traits);
  const weaknesses = weakestTraits(traits);
  const weakSurfaces = buildSurfaceWeaknesses(d.trapsTags);
  const lastActivity = latestDiagnosticsActivityAt(d.calibrationAttempts, d.simulatorAttempts, d.drillStageGates, d.rrRecordings, d.srsItems, d.progress);
  const totalScoredAttempts = sourceSummary.reduce((sum, source) => sum + source.attempts, 0);
  const totalCorrectAttempts = sourceSummary.reduce((sum, source) => sum + source.correct, 0);
  const overallAccuracy = totalScoredAttempts === 0 ? 0 : Math.round((totalCorrectAttempts / totalScoredAttempts) * 100);
  const coveredTraits = traits.filter((trait) => trait.attempts > 0).length;
  const coveragePercent = Math.round((coveredTraits / Math.max(traits.length, 1)) * 100);
  const retentionPercent = d.srsItems.length === 0 ? 0 : Math.round((dueCount / d.srsItems.length) * 100);
  const completedModulePercent = Math.round(
    (modules.filter((module) => module.pct >= 1).length / Math.max(modules.length, 1)) * 100,
  );

  const hasNoEvidence = !seed.attempted && totalScoredAttempts === 0;


  return (
    <article className="px-6 py-12 desktop:px-12 desktop:py-16 max-w-6xl mx-auto space-y-8">
      <PageHeader
        eyebrow="Diagnostics"
        title={title}
        description="This page remembers each student’s saved attempts, drill gates, review queue, and recordings. It diagnoses patterns, stability, and risk areas, not just raw score."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent" dot>
              {totalScoredAttempts} scored attempts saved
            </Badge>
            {lastActivity ? (
              <Badge tone="neutral">last activity {format(new Date(lastActivity), 'MMM d')}</Badge>
            ) : null}
          </div>
        }
      />

      {hasNoEvidence ? (
        <Card variant="elev" accent className="p-5">
          <div className="flex items-start gap-3">
            <Badge tone="warn" dot>awaiting evidence</Badge>
            <div className="flex-1">
              <p className="font-mc-serif text-body text-ink">
                Your diagnostic memory is empty. The graphs below populate automatically as you finish drills, simulator sets, and SRS reviews. Every attempt is saved to your profile and synced across devices.
              </p>
              <div className="mt-3">
                <Link to="/bootcamp/intro-to-lr/drills">
                  <Button size="sm" rightIcon={<ArrowRight className="h-3.5 w-3.5" strokeWidth={2.2} />}>
                    Start the first drill
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>
      ) : null}



      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Diagnostic accuracy"
          subtitle="Across calibration, simulator, and drill gates."
          valueLabel={`${overallAccuracy}%`}
          tone={gaugeTone(overallAccuracy)}
          icon={<Target className="h-4 w-4" strokeWidth={2} />}
          gauge={<Gauge value={overallAccuracy} size="medium" showValue colors={gaugeColors(overallAccuracy)} />}
          detail={`${totalCorrectAttempts} correct out of ${totalScoredAttempts} saved scored attempts`}
        />
        <MetricCard
          title="Trait coverage"
          subtitle="How much of the weakness map has real evidence."
          valueLabel={`${coveragePercent}%`}
          tone={gaugeTone(coveragePercent)}
          icon={<BrainCircuit className="h-4 w-4" strokeWidth={2} />}
          gauge={<Gauge value={coveragePercent} size="medium" showValue colors={gaugeColors(coveragePercent)} />}
          detail={`${coveredTraits} of ${traits.length} traits have recorded encounters`}
        />
        <MetricCard
          title="Retention load"
          subtitle="How much of the saved queue is due right now."
          valueLabel={d.srsItems.length === 0 ? '0' : `${dueCount}`}
          tone={dueCount === 0 ? 'success' : dueCount >= 5 ? 'error' : 'warn'}
          icon={<ShieldAlert className="h-4 w-4" strokeWidth={2} />}
          gauge={<Gauge value={retentionPercent} size="medium" showValue colors={gaugeColors(100 - retentionPercent)} />}
          detail={d.srsItems.length === 0 ? 'No SRS items saved yet' : `${dueCount} of ${d.srsItems.length} saved review items are due`}
        />
        <MetricCard
          title="Program memory"
          subtitle="Persisted student profile, not a one-session snapshot."
          valueLabel={`${completedModulePercent}%`}
          tone={gaugeTone(completedModulePercent)}
          icon={<LibraryBig className="h-4 w-4" strokeWidth={2} />}
          gauge={<Gauge value={completedModulePercent} size="medium" showValue colors={gaugeColors(completedModulePercent)} />}
          detail={`${modules.filter((module) => module.pct >= 1).length} of ${modules.length} modules fully cleared`}
        />
      </section>

      <Card variant="elev" className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Intro to LR</div>
            <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Your saved question attempts</h2>
            <p className="mt-2 max-w-[60ch] font-mc-serif text-body text-ink-soft">
              Every question you answer inside Intro to LR autosaves to your profile in the background. This card pulls from that log so you can see how much practice you have actually banked.
            </p>
          </div>
          <Badge tone={introLr.accuracy >= 75 ? 'success' : introLr.accuracy >= 50 ? 'warn' : 'neutral'}>
            {introLr.loading ? 'loading…' : `${introLr.total} attempts`}
          </Badge>
        </div>
        {introLr.loading ? (
          <LoadingSkeleton lines={3} />
        ) : introLr.total === 0 ? (
          <p className="font-mc-serif text-body text-ink-soft">
            No saved question attempts yet. Start any drill in Intro to LR and answers will appear here automatically.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
              <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">Accuracy</div>
              <div className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{introLr.accuracy}%</div>
              <p className="mt-1 font-mc-sans text-small text-ink-soft">{introLr.correct} of {introLr.total} correct.</p>
            </div>
            <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3 md:col-span-2">
              <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">By question type</div>
              <ul className="mt-2 space-y-1">
                {introLr.byMode.slice(0, 6).map((m) => (
                  <li key={m.mode} className="flex items-center justify-between gap-3 font-mc-sans text-small text-ink">
                    <span className="truncate">{m.mode}</span>
                    <span className="font-mc-mono text-mono text-ink-soft">{m.accuracy}% · {m.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </Card>



      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <Card variant="elev" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Trend</div>
              <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Stability over time</h2>
              <p className="mt-2 max-w-[56ch] font-mc-serif text-body text-ink-soft">
                Rolling accuracy across the student&apos;s most recent scored work. This is the fastest read on whether the profile is getting steadier or wobblier.
              </p>
            </div>
            <Badge tone="neutral">{timeline.length} recent points</Badge>
          </div>
          <ChartContainer config={trendConfig} className="h-[260px] w-full aspect-auto">
            <AreaChart data={timeline} margin={{ left: 6, right: 6, top: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="diagnostics-trend-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--accent))" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="rgb(var(--accent))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent hideIndicator labelKey="label" formatter={(value, _name, item) => (
                <div className="flex min-w-[10rem] items-center justify-between gap-4">
                  <span>{item.payload.source}</span>
                  <span className="font-mono">{value}%</span>
                </div>
              )} />} />
              <Area
                type="monotone"
                dataKey="rollingAccuracy"
                stroke="var(--color-rollingAccuracy)"
                fill="url(#diagnostics-trend-fill)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </Card>

        <Card variant="surface" className="space-y-4">
          <div>
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Readout</div>
            <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Strengths and weaknesses</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[rgb(var(--success))]" strokeWidth={2} />
                <span className="font-mc-mono text-mono uppercase tracking-[0.14em] text-[rgb(var(--success))]">Strengths</span>
              </div>
              {strengths.length === 0 ? (
                <p className="font-mc-serif text-body text-ink-soft">Not enough trait evidence yet to call stable strengths.</p>
              ) : (
                <ul className="space-y-2">
                  {strengths.map((trait) => (
                    <li key={trait.trait} className="rounded-[6px] border border-[rgb(var(--success)/0.18)] bg-[rgb(var(--success)/0.07)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <Chip tone="conclusion">{trait.trait}</Chip>
                        <span className="font-mc-mono text-mono text-[rgb(var(--success))]">{Math.round(trait.accuracy * 100)}%</span>
                      </div>
                      <p className="mt-2 font-mc-serif text-body text-ink-soft">
                        Holding up across {trait.attempts} encounters. This is a current strength, not a lucky one-off.
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-[rgb(var(--error))]" strokeWidth={2} />
                <span className="font-mc-mono text-mono uppercase tracking-[0.14em] text-[rgb(var(--error))]">Needs attention</span>
              </div>
              {weaknesses.length === 0 ? (
                <p className="font-mc-serif text-body text-ink-soft">No repeat weak spots are recorded yet.</p>
              ) : (
                <ul className="space-y-2">
                  {weaknesses.map((trait) => (
                    <li key={trait.trait} className="rounded-[6px] border border-[rgb(var(--error)/0.18)] bg-[rgb(var(--error)/0.06)] px-3 py-2">
                      <div className="flex items-center justify-between gap-3">
                        <Chip tone="opposing">{trait.trait}</Chip>
                        <span className="font-mc-mono text-mono text-[rgb(var(--error))]">{Math.round(trait.accuracy * 100)}%</span>
                      </div>
                      <p className="mt-2 font-mc-serif text-body text-ink-soft">
                        {trait.picked_when_wrong} wrong-answer picks tied to this trait across {trait.attempts} encounters.
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.4fr)]">
        <Card variant="surface" className="space-y-4">
          <div>
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Coverage</div>
            <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Where the misses cluster</h2>
            <p className="mt-2 font-mc-serif text-body text-ink-soft">
              These are the specific surfaces where the saved wrong answers keep collecting.
            </p>
          </div>
          <ul className="space-y-2">
            {weakSurfaces.length === 0 ? (
              <li className="font-mc-serif text-body text-ink-soft">No wrong-answer clusters recorded yet.</li>
            ) : (
              weakSurfaces.map((surface) => (
                <li key={surface.surfaceId} className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mc-mono text-mono text-ink">{surface.surfaceId}</span>
                    <Badge tone="warn">{surface.wrongCount} misses</Badge>
                  </div>
                  <p className="mt-2 font-mc-serif text-body text-ink-soft">
                    Dominant trap: {surface.dominantTrait ?? 'unclassified'}.
                  </p>
                </li>
              ))
            )}
          </ul>
        </Card>

        <Card variant="elev" className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Trait map</div>
              <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Weakness map by trait</h2>
              <p className="mt-2 font-mc-serif text-body text-ink-soft">
                This chart is diagnosis-first: it highlights repeat weak spots and coverage gaps, not generic leaderboard energy.
              </p>
            </div>
          </div>
          <ChartContainer config={traitConfig} className="h-[300px] w-full aspect-auto">
            <BarChart data={traits.map((trait) => ({ trait: trait.trait, accuracy: Math.round(trait.accuracy * 100), attempts: trait.attempts }))} margin={{ left: 6, right: 12, top: 8, bottom: 0 }}>
              <CartesianGrid horizontal strokeDasharray="3 3" />
              <XAxis dataKey="trait" tickLine={false} axisLine={false} />
              <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
              <ChartTooltip content={<ChartTooltipContent hideIndicator labelKey="trait" formatter={(value, _name, item) => (
                <div className="flex min-w-[10rem] items-center justify-between gap-4">
                  <span>{item.payload.attempts} attempts</span>
                  <span className="font-mono">{value}%</span>
                </div>
              )} />} />
              <Bar dataKey="accuracy" radius={[4, 4, 0, 0]}>
                {traits.map((trait) => (
                  <Cell
                    key={trait.trait}
                    fill={trait.attempts === 0 ? 'rgb(var(--border) / 0.35)' : trait.accuracy >= 0.75 ? 'rgb(var(--success))' : trait.accuracy >= 0.5 ? 'rgb(var(--warn))' : 'rgb(var(--error))'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        </Card>
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card variant="surface" className="space-y-4">
          <div>
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Sources</div>
            <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">High-level analytics</h2>
          </div>
          <ul className="grid gap-3 sm:grid-cols-3">
            {sourceSummary.map((source) => (
              <li key={source.source} className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
                <div className="font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">{source.source}</div>
                <div className="mt-2 font-mc-serif text-h2 font-semibold text-ink">{source.attempts}</div>
                <p className="mt-1 font-mc-sans text-small text-ink-soft">
                  {source.attempts === 0 ? 'No saved attempts yet.' : `${Math.round((source.correct / source.attempts) * 100)}% accuracy in this source.`}
                </p>
              </li>
            ))}
          </ul>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
              <div className="flex items-center gap-2 font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                <Activity className="h-3.5 w-3.5" strokeWidth={2} />
                Saved queue
              </div>
              <p className="mt-2 font-mc-serif text-body text-ink">
                {d.srsItems.length} SRS items, {dueCount} due now, {d.rrRecordings.length} recordings saved.
              </p>
            </div>
            <div className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
              <div className="flex items-center gap-2 font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
                <GaugeIcon className="h-3.5 w-3.5" strokeWidth={2} />
                Saved evidence
              </div>
              <p className="mt-2 font-mc-serif text-body text-ink">
                {seed.m1.attempts} legacy intro calibration attempt{seed.m1.attempts === 1 ? '' : 's'}, {seed.m5.attempts} hard-sentences calibration attempt{seed.m5.attempts === 1 ? '' : 's'}, and the rest of this profile persist across sessions.
              </p>
            </div>
          </div>
        </Card>

        <Card variant="elev" className="space-y-4">
          <div>
            <div className="font-mc-mono text-label uppercase tracking-[0.18em] text-mc-accent">Next moves</div>
            <h2 className="mt-2 font-mc-serif text-h2 font-semibold text-ink">Specific recommendations</h2>
          </div>
          {recommendations.length === 0 ? (
            <p className="font-mc-serif text-body text-ink-soft">No recommendations yet beyond continuing to generate more diagnostic evidence.</p>
          ) : (
            <ul className="space-y-3">
              {recommendations.slice(0, 4).map((recommendation) => (
                <li key={recommendation.id} className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-3 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <Badge tone={recommendation.priority === 1 ? 'accent' : 'neutral'}>P{recommendation.priority}</Badge>
                    <span className="font-mc-mono text-mono text-ink-faint">{recommendation.kind}</span>
                  </div>
                  <h3 className="mt-2 font-mc-serif text-body font-semibold text-ink">{recommendation.title}</h3>
                  <p className="mt-2 font-mc-serif text-body text-ink-soft">{recommendation.reason}</p>
                  <Link
                    to={recommendation.href.startsWith('/bootcamp/intro-to-lr') ? recommendation.href : `/bootcamp/intro-to-lr${recommendation.href}`}
                    className="mt-3 inline-flex items-center gap-1.5 font-mc-mono text-mono text-mc-accent hover:underline underline-offset-4"
                  >
                    Open next step <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </section>

      <section className="rounded-[6px] border border-[rgb(var(--border)/0.10)] bg-[rgb(var(--surface-elev)/0.45)] px-4 py-3">
        <p className="font-mc-sans text-small text-ink-soft">
          Every attempt, drill gate, and review on this profile is saved to your account and synced across devices. This page is your full diagnostic memory — there are no separate sub-pages to hunt through.
        </p>
      </section>

    </article>
  );
}

function MetricCard({
  title,
  subtitle,
  valueLabel,
  tone,
  icon,
  gauge,
  detail,
}: {
  title: string;
  subtitle: string;
  valueLabel: string;
  tone: 'neutral' | 'success' | 'warn' | 'error' | 'accent';
  icon: JSX.Element;
  gauge: JSX.Element;
  detail: string;
}) {
  return (
    <Card variant="surface" className="flex h-full flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center gap-2 font-mc-mono text-mono uppercase tracking-[0.14em] text-ink-faint">
          {icon}
          {title}
        </div>
        <Badge tone={tone}>{valueLabel}</Badge>
      </div>
      <div className="flex items-center gap-4">
        <div className="shrink-0">{gauge}</div>
        <div className="space-y-2">
          <p className="font-mc-serif text-body text-ink">{subtitle}</p>
          <p className="font-mc-sans text-small text-ink-soft">{detail}</p>
        </div>
      </div>
    </Card>
  );
}
