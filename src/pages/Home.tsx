import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RecentPerformanceWidget } from '@/components/dashboard/RecentPerformanceWidget';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import { SplineScene } from '@/components/ui/splite';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';
import { BackgroundPaths } from '@/components/ui/background-paths';
import {
  BookOpen,
  Sparkles,
  Grid3x3,
  XCircle,
  Flag,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

// ─────────────────────────────────────────────────────────────────────────────
// Mode strip data
// ─────────────────────────────────────────────────────────────────────────────
const modes = [
  {
    id: 'full-section' as const,
    icon: BookOpen,
    label: 'Full Section',
    description: 'Logical Reasoning Section',
  },
  {
    id: 'natural-drill' as const,
    icon: Sparkles,
    label: 'Smart Builder',
    description: 'Natural language',
  },
  {
    id: 'type-drill' as const,
    icon: Grid3x3,
    label: 'Build a Set',
    description: 'Custom drill',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Study tool row — quiet secondary utility
// ─────────────────────────────────────────────────────────────────────────────
function StudyToolRow({
  icon: Icon,
  label,
  description,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group w-full flex items-center gap-3.5 px-4 py-3.5 text-left',
        'transition-colors duration-150',
        'hover:bg-white/[0.03]',
      )}
    >
      <div className="shrink-0 w-7 h-7 rounded-md bg-neutral-800 ring-1 ring-white/[0.04] flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 text-neutral-500 group-hover:text-neutral-300 transition-colors duration-150" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] text-neutral-300 leading-snug group-hover:text-white transition-colors duration-150">
          {label}
        </div>
        <div className="text-[11px] text-neutral-600 mt-0.5 leading-snug">{description}</div>
      </div>
      <ArrowRight className="w-3.5 h-3.5 text-neutral-700 group-hover:text-neutral-400 shrink-0 transition-colors duration-150" />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
export default function Home() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { manifest, isLoading, error } = useQuestionBank();
  const [selectedAction, setSelectedAction] = React.useState<DrillMode | null>(null);
  const [stats, setStats] = React.useState({
    totalAttempted: 0,
    avgAccuracy: 0,
    recentStreak: 0,
  });
  const [sparklineData, setSparklineData] = React.useState<
    Array<{ date: string; count: number }>
  >([]);
  const [trends] = React.useState<Array<{ label: string; value: string }>>([
    { label: 'Logical Reasoning', value: '72%' },
    { label: 'Inference Questions', value: '68%' },
    { label: 'Argument Structure', value: '65%' },
  ]);

  // Auth guard
  React.useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  // Load user stats
  React.useEffect(() => {
    if (!user) return;

    const loadStats = async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: attempts } = await supabase
        .from('attempts')
        .select('correct, timestamp_iso')
        .eq('class_id', user.id)
        .gte('timestamp_iso', thirtyDaysAgo.toISOString());

      if (attempts && attempts.length > 0) {
        const correct = attempts.filter((a) => a.correct).length;
        const accuracy = Math.round((correct / attempts.length) * 100);

        setStats({
          totalAttempted: attempts.length,
          avgAccuracy: accuracy,
          recentStreak: 0,
        });

        const dailyCounts = new Map<string, number>();
        attempts.forEach((attempt) => {
          const date = new Date(attempt.timestamp_iso).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          dailyCounts.set(date, (dailyCounts.get(date) || 0) + 1);
        });

        const sparkline: Array<{ date: string; count: number }> = [];
        for (let i = 17; i >= 0; i--) {
          const date = new Date();
          date.setDate(date.getDate() - i);
          const dateStr = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
          sparkline.push({ date: dateStr, count: dailyCounts.get(dateStr) || 0 });
        }
        setSparklineData(sparkline);
      }
    };

    loadStats();
  }, [user]);

  const getFirstName = () => {
    if (!user) return 'there';
    const displayName =
      user.user_metadata?.display_name ||
      user.user_metadata?.username ||
      user.email?.split('@')[0] ||
      'there';
    const firstName = displayName.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, '');
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() || 'there';
  };

  const handleStartAdaptive = () => {
    navigate('/drill', { state: { mode: 'adaptive' } });
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate('/drill', { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

  const handleModeClick = (modeId: DrillMode) => {
    setSelectedAction((prev) => (prev === modeId ? null : modeId));
  };

  // ── Loading / Error states ──────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border border-border border-t-foreground/30 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Preparing your workspace
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    );
  }

  const userInitials = user?.email?.slice(0, 2).toUpperCase() || 'U';

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header — minimal, no branding ──────────────────────────────────── */}
      <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <div>
            <h2 className="text-sm font-medium text-foreground">
              Welcome back, {getFirstName()}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <LogoutButton />
            <ThemeToggle />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={() => navigate('/foyer')}
            >
              Main Hub
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={() => navigate('/analytics')}
            >
              View Analytics
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent"
              onClick={() => navigate('/profile')}
            >
              <Avatar className="h-7 w-7 border border-border">
                <AvatarFallback className="text-xs bg-secondary text-foreground/80">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              Profile
            </Button>
          </div>
        </div>
      </header>

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 lg:px-8 pt-8 pb-16 animate-fade-in">

        {/* ── Row 1 — Hero (unchanged) ──────────────────────────────────────── */}
        <Card className="w-full h-[280px] bg-black/[0.96] relative overflow-hidden rounded-xl">
          <BackgroundPaths />
          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          <div className="flex h-full">
            <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
              <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400">
                LR Smart Drill
              </h1>
              <p className="mt-3 text-sm text-neutral-400 max-w-md leading-relaxed">
                Take it one question at a time with your tutor.
              </p>
              <div className="mt-5">
                <Button
                  onClick={handleStartAdaptive}
                  size="sm"
                  className="bg-white text-black hover:bg-neutral-200 font-medium"
                >
                  Start Drilling
                </Button>
              </div>
            </div>
            <div className="flex-1 relative hidden md:block">
              <SplineScene
                scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                className="w-full h-full"
              />
            </div>
          </div>
        </Card>

        {/* ── Row 2 — Glass-card mode selector ─────────────────────────────── */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = selectedAction === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => handleModeClick(mode.id)}
                className={cn(
                  'group w-full text-left rounded-xl py-6 px-5',
                  'flex flex-col gap-3',
                  'backdrop-blur-xl',
                  'transition-all duration-200',
                  isActive
                    ? [
                        'bg-accent',
                        'border border-foreground/[0.18]',
                        'shadow-sm',
                      ]
                    : [
                        'bg-card',
                        'border border-border',
                        'hover:bg-accent',
                        'hover:border-foreground/[0.12]',
                        'hover:-translate-y-0.5',
                      ],
                )}
              >
                {/* Icon */}
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80',
                  )}
                />

                {/* Label + description */}
                <div>
                  <div
                    className={cn(
                      'text-[15px] font-medium leading-snug transition-colors duration-200',
                      isActive ? 'text-foreground' : 'text-foreground/90',
                    )}
                  >
                    {mode.label}
                  </div>
                  <div
                    className={cn(
                      'text-[11px] uppercase tracking-[0.15em] mt-1 leading-snug transition-colors duration-200',
                      isActive ? 'text-muted-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    {mode.description}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* ── Row 3 — Support zone OR Action panel ──────────────────────────── */}
        <div className="mt-10">
          {!selectedAction ? (
            <div className="grid grid-cols-1 lg:grid-cols-[3fr_2fr] gap-5 items-start">

              {/* ═══ Left — live-work stack ═══ */}
              <div className="space-y-3">

                {/* Compact At a Glance band */}
                <div
                  className={cn(
                    'rounded-xl bg-card border border-border p-5',
                    'shadow-sm',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                    At a Glance
                  </p>
                  <div className="flex items-baseline gap-10">
                    {/* Practiced */}
                    <div>
                      <span className="text-2xl font-semibold text-foreground tabular-nums leading-none">
                        {stats.totalAttempted}
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2 uppercase tracking-[0.15em]">
                        Practiced
                      </span>
                    </div>
                    {/* Accuracy */}
                    <div>
                      <span className="text-2xl font-semibold text-foreground tabular-nums leading-none">
                        {stats.totalAttempted > 0 ? stats.avgAccuracy : 0}%
                      </span>
                      <span className="text-[10px] text-muted-foreground ml-2 uppercase tracking-[0.15em]">
                        Accuracy
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Performance */}
                <RecentPerformanceWidget />
              </div>

              {/* ═══ Right — utility stack ═══ */}
              <div className="space-y-3">

                {/* Study Tools */}
                <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                  <div className="px-4 pt-4 pb-3 border-b border-border">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-neutral-500">
                      Study Tools
                    </p>
                  </div>
                  <div className="divide-y divide-border">
                    <StudyToolRow
                      icon={XCircle}
                      label="Wrong Answer Journal"
                      description="Review mistakes and track growth patterns"
                      onClick={() => navigate('/waj')}
                    />
                    <StudyToolRow
                      icon={Flag}
                      label="Flagged Questions"
                      description="Questions you marked for deeper review"
                      onClick={() => navigate('/flagged')}
                    />
                  </div>
                </div>

                {/* Opportunities */}
                <div
                  className={cn(
                    'rounded-xl bg-card border border-border p-5',
                    'shadow-sm',
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-4">
                    Opportunities
                  </p>
                  <div className="space-y-3">
                    {trends.map((trend, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="w-1 h-1 rounded-full bg-neutral-600 shrink-0" />
                          <span className="text-[13px] text-foreground/80">{trend.label}</span>
                        </div>
                        <span className="text-[13px] text-muted-foreground tabular-nums font-medium">
                          {trend.value}
                        </span>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/analytics')}
                    className="mt-4 text-muted-foreground/70 hover:text-foreground hover:bg-accent text-[11px] h-7 px-2.5 -ml-1"
                  >
                    View Full Analytics
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ── Action panels ───────────────────────────────────────────── */}
              {selectedAction === 'full-section' && manifest && (
                <div className="animate-slide-up">
                  <SectionSelector
                    manifest={manifest}
                    onStartSection={handleStartSection}
                    onCancel={() => setSelectedAction(null)}
                  />
                </div>
              )}

              {selectedAction === 'type-drill' && manifest && (
                <div className="animate-slide-up">
                  <QuestionPicker
                    manifest={manifest}
                    onStartDrill={handleStartTypeDrill}
                    onCancel={() => setSelectedAction(null)}
                  />
                </div>
              )}

              {selectedAction === 'natural-drill' && (
                <div className="animate-slide-up">
                  <NaturalDrillCreator
                    onStartDrill={handleStartTypeDrill}
                    onCancel={() => setSelectedAction(null)}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
