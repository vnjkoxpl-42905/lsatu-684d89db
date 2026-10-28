import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useClassId } from '@/hooks/useClassId';
import { questionBank } from '@/lib/questionLoader';
import { computeAnalyticsFromRollup, type AnalyticsData, type OpportunityArea } from '@/lib/analyticsRollup';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import BreakdownPanel from '@/components/analytics/BreakdownPanel';
import FlaggedQuestionsList from '@/components/analytics/FlaggedQuestionsList';
import ImportedMetricsPanel from '@/components/analytics/ImportedMetricsPanel';
import FirstAnswerProgressPanel from '@/components/analytics/FirstAnswerProgressPanel';
import { Flag } from 'lucide-react';

const ProgressPrototype = import.meta.env.DEV ? React.lazy(() => import('@/components/analytics/prototype/LiveProgressPrototype')) : null;

const Analytics = () => {
  const [params] = useSearchParams();
  if (import.meta.env.DEV && ProgressPrototype && ['desk', 'explorer', 'timeline'].includes(params.get('variant') ?? '')) {
    return <React.Suspense fallback={<p role="status">Loading Progress preview…</p>}><ProgressPrototype /></React.Suspense>;
  }
  return <LegacyAnalytics />;
};

const LegacyAnalytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [opportunities, setOpportunities] = React.useState<OpportunityArea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const { classId, loading: classIdLoading } = useClassId();

  // SVG color helpers — adapt to current theme
  const svgTrack   = isLight ? 'rgba(0,0,0,0.07)'  : 'rgba(255,255,255,0.06)';
  const svgArc     = isLight ? 'rgba(0,0,0,0.65)'  : 'rgba(255,255,255,0.7)';
  const svgArcSm   = isLight ? 'rgba(0,0,0,0.55)'  : 'rgba(255,255,255,0.6)';
  const dotColor   = isLight ? 'rgb(0,0,0)'         : 'rgb(255,255,255)';

  React.useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (classIdLoading || !classId) return;
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, classId, classIdLoading]);

  const loadAnalytics = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      // Server-side qtype x level x window rollup (attempt_accuracy_rollup) instead
      // of downloading every attempt row and bucketing client-side. Each row is
      // { qtype, level, bucket, total, correct } where bucket is 'current7d' (last
      // 7 days), 'prev7d' (the 7 days before), or 'older'. RLS on attempts still
      // governs via SECURITY INVOKER.
      const { data: rollup, error } = await supabase.rpc('attempt_accuracy_rollup', {
        p_class_id: classId,
      });

      if (error) throw error;

      const { data: analytics, opportunities } = computeAnalyticsFromRollup(rollup ?? []);
      setData(analytics);
      setOpportunities(opportunities);
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
      setLoadError('Could not load analytics. Check your connection and try again.');
      setLoading(false);
    }
  };

  const startDrill = (type?: string, level?: number, count = 6) => {
    const manifest = questionBank.getManifest();
    const pts = Object.keys(manifest.byPT).map(Number);
    navigate('/drill', {
      state: {
        mode: 'type-drill',
        config: { qtypes: type ? [type] : [], difficulties: level ? [level] : [], pts, count },
      },
    });
  };

  // The first-answer panel has its own data source and must not wait for the
  // legacy rollup. Keep the auth redirect's previous no-content behavior.
  if (!user) return null;

  const hasData = data && Object.keys(data.accuracyByType).length > 0;
  const sortedTypes = hasData ? Object.keys(data.accuracyByType).sort() : [];

  return (
    // The Progress destination owns the page heading and classroom navigation.
    <div className="min-w-0 bg-background">
      <div className="mx-auto w-full min-w-0 max-w-7xl pb-16">
        <div data-motion-enter className="mb-10 min-w-0">
          <FirstAnswerProgressPanel />
        </div>

        <p className="mb-5 text-xs leading-relaxed text-muted-foreground">
          The breakdown and opportunity charts below use saved attempts, including repeat answers. Their percentages may differ from first-answer accuracy above.
        </p>

        {/* Tag breakdowns. Self-contained: reads the student's own attempts and
            the question bank, so it renders regardless of the rollup below. */}
        <div data-motion-reveal className="mb-10">
          <BreakdownPanel />
        </div>

        <div data-motion-reveal data-motion-group data-motion-ready={classIdLoading || (classId && loading) ? "false" : "true"}>
        {classIdLoading || (classId && loading) ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center" role="status">
            <p className="text-muted-foreground text-sm">Loading breakdown and opportunity charts…</p>
          </div>
        ) : !classId ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center" role="alert">
            <p className="text-foreground text-sm font-medium">Could not load breakdown and opportunity charts. Refresh this page to try again.</p>
          </div>
        ) : loadError ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center">
            <p className="text-foreground text-sm font-medium">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => loadAnalytics()}
            >
              Retry
            </Button>
          </div>
        ) : !hasData ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center">
            <p className="text-muted-foreground text-sm">No data yet for this period</p>
            <p className="text-[12px] text-muted-foreground/70 mt-2">Complete some drills to see your analytics</p>
          </div>
        ) : (
          <>
            {/* Top Opportunities */}
            <div data-motion-item data-motion-id="analytics-opportunities"
              className="mb-12"
            >
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
                Top Opportunities
              </p>
              {opportunities.length === 0 ? (
                <div className="rounded-xl bg-card border border-border shadow-sm p-8 text-center">
                  <p className="text-muted-foreground text-sm">Great work — no significant improvement areas detected.</p>
                </div>
              ) : (
                <div className="grid md:grid-cols-3 gap-4">
                  {opportunities.map((opp, idx) => (
                    <button
                      key={idx}
                      className={cn(
                        'group rounded-xl bg-card border border-border shadow-sm p-6',
                        'hover:bg-accent hover:border-border',
                        'transition-all duration-200 text-left focus:outline-none',
                      )}
                      onClick={() => startDrill(opp.type, opp.level)}
                    >
                      <div className="flex flex-col items-center">
                        <div className="relative w-28 h-28 mb-4">
                          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                            <circle cx="50" cy="50" r="40" fill="none" stroke={svgTrack} strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="40" fill="none"
                              stroke={svgArc} strokeWidth="8"
                              strokeDasharray={`${(opp.currentAccuracy / 100) * 251.2} 251.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className="text-2xl font-semibold text-foreground tabular-nums">{opp.impact}</div>
                            <div className="text-[10px] text-muted-foreground uppercase tracking-[0.12em]">Impact</div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[13px] font-medium text-foreground/80">{opp.type} · L{opp.level}</div>
                          <div className="text-[11px] text-muted-foreground mt-1">
                            {Math.round(opp.currentAccuracy)}% accuracy · {opp.attempts} attempts
                          </div>
                          <div className="text-[11px] text-muted-foreground/70 mt-1 group-hover:text-muted-foreground transition-colors">
                            Tap to drill →
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Performance by Type + Matrix */}
            <div data-motion-item data-motion-id="analytics-performance"
              className="grid lg:grid-cols-[1fr_auto] gap-8"
            >
              {/* Type Bars */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
                  Performance by Type
                </p>
                <div className="space-y-2.5">
                  {sortedTypes.map(type => {
                    const stats = data.accuracyByType[type];
                    const trend = data.trend7d[type] || 0;
                    return (
                      <div
                        key={type}
                        className="group cursor-pointer"
                        onClick={() => startDrill(type, undefined)}
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startDrill(type, undefined); } }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-44 text-[13px] text-foreground/80 truncate">{type}</div>
                          <div className="flex-1 h-7 bg-secondary border border-border rounded-md relative overflow-hidden group-hover:border-border transition-all">
                            <div
                              className="h-full bg-foreground/[0.18] rounded-md transition-all duration-500"
                              style={{ width: `${stats.accuracy}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-end pr-2.5">
                              <span className="text-[12px] text-muted-foreground font-medium tabular-nums">
                                {Math.round(stats.accuracy)}%
                              </span>
                            </div>
                          </div>
                          <div className={cn(
                            'w-6 text-[12px] text-center font-medium tabular-nums',
                            trend > 0 ? 'text-emerald-400' : trend < 0 ? 'text-rose-400' : 'text-muted-foreground/70'
                          )}>
                            {trend > 0 ? '↑' : trend < 0 ? '↓' : '—'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Matrix */}
              <div className="min-w-0 lg:w-96">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
                  Type × Level Matrix
                </p>
                <div className="max-w-full overflow-x-auto rounded-xl bg-card border border-border shadow-sm p-4" role="region" aria-label="Type by level matrix" tabIndex={0}>
                  <div className="min-w-[380px] space-y-2">
                    <div className="flex gap-2 mb-3">
                      <div className="w-28" />
                      {[1, 2, 3, 4, 5].map(level => (
                        <div key={level} className="w-10 text-center text-[11px] text-muted-foreground/70 font-medium">
                          L{level}
                        </div>
                      ))}
                    </div>
                    {sortedTypes.map(type => (
                      <div key={type} className="flex gap-2 items-center">
                        <div className="w-28 text-[11px] text-muted-foreground truncate" title={type}>{type}</div>
                        {[1, 2, 3, 4, 5].map(level => {
                          const stats = data.accuracyByTypeLevel[type]?.[level];
                          const accuracy = stats?.accuracy || 0;
                          const missShare = data.recentMissShare[type]?.[level] || 0;
                          const size = stats ? Math.max(6, Math.min(26, (accuracy / 100) * 26)) : 4;
                          const opacity = stats ? 0.2 + (missShare * 0.8) : 0.08;
                          return (
                            <div
                              key={level}
                              className="w-10 h-10 flex items-center justify-center cursor-pointer hover:bg-accent rounded-md transition-colors"
                              onClick={() => stats && startDrill(type, level)}
                              tabIndex={stats ? 0 : -1}
                              title={stats ? `${type} L${level}: ${Math.round(accuracy)}% (${stats.total} attempts)` : 'No data'}
                            >
                              <div
                                className="rounded-full transition-all"
                                style={{ width: `${size}px`, height: `${size}px`, opacity, background: dotColor }}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Difficulty Circles */}
            <div className="mt-12">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
                Performance by Difficulty
              </p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                {[1, 2, 3, 4, 5].map(level => {
                  const stats = data.accuracyByLevel[level] || { accuracy: 0, total: 0 };
                  return (
                    <button
                      key={level}
                      className={cn(
                        'group rounded-xl bg-card border border-border shadow-sm p-5',
                        'hover:bg-accent hover:border-border',
                        'transition-all duration-200 focus:outline-none',
                      )}
                      onClick={() => startDrill(undefined, level)}
                      tabIndex={0}
                    >
                      <div className="flex flex-col items-center">
                        <div className="relative w-20 h-20 mb-3">
                          <svg viewBox="0 0 100 100" className="transform -rotate-90 w-full h-full">
                            <circle cx="50" cy="50" r="40" fill="none" stroke={svgTrack} strokeWidth="8" />
                            <circle
                              cx="50" cy="50" r="40" fill="none"
                              stroke={svgArcSm} strokeWidth="8"
                              strokeDasharray={`${(stats.accuracy / 100) * 251.2} 251.2`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-lg font-semibold text-foreground tabular-nums">
                              {Math.round(stats.accuracy)}%
                            </div>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-[12px] font-medium text-foreground/80">Level {level}</div>
                          {stats.total > 0 && (
                            <div className="text-[11px] text-muted-foreground/70 mt-0.5">{stats.total} attempts</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Flagged Questions */}
            <div className="mt-12">
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5 flex items-center gap-2">
                <Flag className="w-3.5 h-3.5" />
                Flagged Questions
              </p>
              <FlaggedQuestionsList />
            </div>
          </>
        )}

        </div>

        {/* Imported outside work (7Sage / PT). Renders whenever the student has
            any parsed uploads, even if they have no in-app attempts yet. */}
        {!loadError && <ImportedMetricsPanel className="mt-12" />}
      </div>
    </div>
  );
};

export default Analytics;
