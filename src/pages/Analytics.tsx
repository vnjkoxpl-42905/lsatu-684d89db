import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { questionBank } from '@/lib/questionLoader';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

interface AnalyticsData {
  accuracyByType: Record<string, { correct: number; total: number; accuracy: number }>;
  accuracyByLevel: Record<number, { correct: number; total: number; accuracy: number }>;
  accuracyByTypeLevel: Record<string, Record<number, { correct: number; total: number; accuracy: number }>>;
  trend7d: Record<string, number>;
  recentMissShare: Record<string, Record<number, number>>;
}

interface OpportunityArea {
  type: string;
  level: number;
  impact: number;
  currentAccuracy: number;
  gap: number;
  attempts: number;
}

const Analytics = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [data, setData] = React.useState<AnalyticsData | null>(null);
  const [opportunities, setOpportunities] = React.useState<OpportunityArea[]>([]);
  const [loading, setLoading] = React.useState(true);
  const opportunitiesRef = useScrollAnimation();
  const performanceRef = useScrollAnimation();

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
    loadAnalytics();
  }, [user]);

  const loadAnalytics = async () => {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const { data: attempts, error } = await supabase
        .from('attempts')
        .select('qtype, level, correct, timestamp_iso')
        .gte('timestamp_iso', thirtyDaysAgo.toISOString())
        .order('timestamp_iso', { ascending: false });

      if (error) throw error;

      const typeStats: Record<string, { correct: number; total: number }> = {};
      const levelStats: Record<number, { correct: number; total: number }> = {};
      const typeLevelStats: Record<string, Record<number, { correct: number; total: number }>> = {};
      const type7d: Record<string, { correct: number; total: number }> = {};
      const typePrev7d: Record<string, { correct: number; total: number }> = {};

      attempts?.forEach(attempt => {
        const { qtype, level, correct, timestamp_iso } = attempt;
        const timestamp = new Date(timestamp_iso);

        if (!typeStats[qtype]) typeStats[qtype] = { correct: 0, total: 0 };
        typeStats[qtype].total++;
        if (correct) typeStats[qtype].correct++;

        if (!levelStats[level]) levelStats[level] = { correct: 0, total: 0 };
        levelStats[level].total++;
        if (correct) levelStats[level].correct++;

        if (!typeLevelStats[qtype]) typeLevelStats[qtype] = {};
        if (!typeLevelStats[qtype][level]) typeLevelStats[qtype][level] = { correct: 0, total: 0 };
        typeLevelStats[qtype][level].total++;
        if (correct) typeLevelStats[qtype][level].correct++;

        if (timestamp >= sevenDaysAgo) {
          if (!type7d[qtype]) type7d[qtype] = { correct: 0, total: 0 };
          type7d[qtype].total++;
          if (correct) type7d[qtype].correct++;
        } else if (timestamp >= fourteenDaysAgo) {
          if (!typePrev7d[qtype]) typePrev7d[qtype] = { correct: 0, total: 0 };
          typePrev7d[qtype].total++;
          if (correct) typePrev7d[qtype].correct++;
        }
      });

      const accuracyByType: Record<string, { correct: number; total: number; accuracy: number }> = {};
      Object.entries(typeStats).forEach(([type, stats]) => {
        accuracyByType[type] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
      });

      const accuracyByLevel: Record<number, { correct: number; total: number; accuracy: number }> = {};
      Object.entries(levelStats).forEach(([level, stats]) => {
        accuracyByLevel[Number(level)] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
      });

      const accuracyByTypeLevel: Record<string, Record<number, { correct: number; total: number; accuracy: number }>> = {};
      Object.entries(typeLevelStats).forEach(([type, levels]) => {
        accuracyByTypeLevel[type] = {};
        Object.entries(levels).forEach(([level, stats]) => {
          accuracyByTypeLevel[type][Number(level)] = { ...stats, accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0 };
        });
      });

      const trend7d: Record<string, number> = {};
      Object.keys(accuracyByType).forEach(type => {
        const current7d = type7d[type] ? (type7d[type].correct / type7d[type].total) * 100 : 0;
        const prev7d = typePrev7d[type] ? (typePrev7d[type].correct / typePrev7d[type].total) * 100 : 0;
        trend7d[type] = current7d - prev7d;
      });

      const totalMisses = attempts?.filter(a => !a.correct).length || 1;
      const recentMissShare: Record<string, Record<number, number>> = {};
      attempts?.forEach(attempt => {
        if (!attempt.correct) {
          const { qtype, level } = attempt;
          if (!recentMissShare[qtype]) recentMissShare[qtype] = {};
          if (!recentMissShare[qtype][level]) recentMissShare[qtype][level] = 0;
          recentMissShare[qtype][level]++;
        }
      });
      Object.keys(recentMissShare).forEach(type => {
        Object.keys(recentMissShare[type]).forEach(level => {
          recentMissShare[type][Number(level)] /= totalMisses;
        });
      });

      setData({ accuracyByType, accuracyByLevel, accuracyByTypeLevel, trend7d, recentMissShare });

      const targetAccuracy = 85;
      const totalAttempts = attempts?.length || 1;
      const impactScores: OpportunityArea[] = [];

      Object.entries(accuracyByTypeLevel).forEach(([type, levels]) => {
        Object.entries(levels).forEach(([level, stats]) => {
          const currentAccuracy = stats.accuracy;
          const gap = Math.max(0, targetAccuracy - currentAccuracy);
          const recentShare = stats.total / totalAttempts;
          const impact = Math.round(100 * gap * recentShare);
          if (stats.total >= 3 && impact > 0) {
            impactScores.push({ type, level: Number(level), impact, currentAccuracy, gap, attempts: stats.total });
          }
        });
      });

      setOpportunities(impactScores.sort((a, b) => b.impact - a.impact).slice(0, 3));
      setLoading(false);
    } catch (error) {
      console.error('Error loading analytics:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border border-border border-t-foreground/30 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading analytics</p>
        </div>
      </div>
    );
  }

  const hasData = data && Object.keys(data.accuracyByType).length > 0;
  const sortedTypes = hasData ? Object.keys(data.accuracyByType).sort() : [];

  return (
    <div className="min-h-screen bg-background">

      {/* Header */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/foyer')}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Main Hub
          </Button>
          <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">Analytics</p>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-16">
        {!hasData ? (
          <div className="rounded-xl bg-card border border-border shadow-sm p-12 text-center">
            <p className="text-muted-foreground text-sm">No data yet for this period</p>
            <p className="text-[12px] text-muted-foreground/70 mt-2">Complete some drills to see your analytics</p>
          </div>
        ) : (
          <>
            {/* Top Opportunities */}
            <div
              ref={opportunitiesRef.ref}
              className={cn(
                'mb-12 transition-all duration-700',
                opportunitiesRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
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
            <div
              ref={performanceRef.ref}
              className={cn(
                'grid lg:grid-cols-[1fr_auto] gap-8 transition-all duration-700 delay-150',
                performanceRef.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              )}
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
              <div className="lg:w-96">
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-5">
                  Type × Level Matrix
                </p>
                <div className="rounded-xl bg-card border border-border shadow-sm p-4">
                  <div className="space-y-2">
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
              <div className="grid grid-cols-5 gap-3">
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
          </>
        )}
      </div>
    </div>
  );
};

export default Analytics;
