/**
 * /practice — drill-launcher hub. (Historically the file was Home.tsx;
 * renamed because the route is /practice and there is no /home surface.)
 */
import * as React from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { RecentPerformanceWidget } from '@/components/dashboard/RecentPerformanceWidget';
import { useClassId } from '@/hooks/useClassId';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import { SplineScene } from '@/components/ui/splite';
import { Card } from '@/components/ui/card';
import { Spotlight } from '@/components/ui/spotlight';

import {
  BookOpen,
  Sparkles,
  Grid3x3,
  XCircle,
  Flag,
  ArrowRight,
  ArrowLeft,
  Bookmark,
  Play,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLastActivity } from '@/hooks/useLastActivity';
import { resolveResumeTarget, type LastActivitySnapshot } from '@/lib/lastActivity';
import { Switch } from '@/components/ui/switch';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useTheme } from '@/contexts/ThemeContext';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';
import { useUserPermissions } from '@/hooks/useUserPermissions';

// ─────────────────────────────────────────────────────────────────────────────
// Mode strip data
// ─────────────────────────────────────────────────────────────────────────────
type ModeCardId = DrillMode | 'my-sets';

interface ModeCard {
  id: ModeCardId;
  icon: React.ElementType;
  label: string;
  description: string;
  purpose: string;
}

const modes: ModeCard[] = [
  {
    id: 'full-section',
    icon: BookOpen,
    label: 'Full Section',
    description: 'Timed section',
    purpose: 'A timed 25-question LR section under official conditions.',
  },
  {
    id: 'natural-drill',
    icon: Sparkles,
    label: 'Smart Builder',
    description: 'Plain English',
    purpose: "Describe the drill in plain English; I'll assemble it.",
  },
  {
    id: 'type-drill',
    icon: Grid3x3,
    label: 'Build a Set',
    description: 'Hand-picked',
    purpose: 'Filter the bank yourself and hand-pick questions.',
  },
  {
    id: 'my-sets',
    icon: Bookmark,
    label: 'My Sets',
    description: 'Saved sets',
    purpose: 'Re-launch sets you saved earlier.',
  },
];

function resumeSubtitle(snap: LastActivitySnapshot): string {
  if (snap.kind === 'drill') {
    const pretty =
      snap.mode === 'adaptive'
        ? 'Smart Drill'
        : snap.mode === 'type-drill'
        ? 'Custom drill'
        : snap.mode === 'natural-drill'
        ? 'Smart Builder'
        : 'Drill';
    const total = snap.qids?.length ?? 0;
    const at = (snap.current_index ?? 0) + 1;
    return total > 0 ? `${pretty} · Q ${at} of ${total}` : pretty;
  }
  if (snap.kind === 'section') {
    const total = snap.qids?.length ?? 0;
    const at = (snap.current_index ?? 0) + 1;
    return total > 0 ? `Section · Q ${at} of ${total}` : 'Section in progress';
  }
  return `Bootcamp lesson · step ${snap.step_index}`;
}

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
// Spline error boundary — falls back to a calm gradient panel when the
// external Spline scene fails to load (offline / CDN outage / blocked).
// ─────────────────────────────────────────────────────────────────────────────
class SplineBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn('[Practice] Spline scene failed', error);
  }
  render() {
    if (this.state.hasError) {
      // Static fallback so the hero card doesn't render as a blank panel
      // when Spline's CDN is blocked / offline.
      return (
        <div
          aria-hidden
          className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-950 to-black"
        >
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-white/10 to-white/0 border border-white/10 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-white/20 to-white/0" />
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
interface PracticeHubContentProps {
  embedded?: boolean;
  onBackToMainHub?: () => void;
}

export function PracticeHubContent({ embedded = false, onBackToMainHub }: PracticeHubContentProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, authReady, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { manifest, isLoading, error } = useQuestionBank();
  const perms = useUserPermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedAction, setSelectedAction] = React.useState<DrillMode | null>(() => {
    const a = searchParams.get('action');
    return a === 'full-section' || a === 'type-drill' ? a : null;
  });
  // Clears the action panel and strips ?action= so the URL never keeps a stale
  // param after the user cancels out of a panel opened from the Mainhub orbital.
  const clearAction = React.useCallback(() => {
    setSelectedAction(null);
    if (searchParams.has('action')) {
      searchParams.delete('action');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  // Official testing format is the DEFAULT for every account. Users can opt
  // back into the classic layout, which is persisted as 'classic'. Anything
  // else (including missing/legacy values) is treated as official.
  const [useOfficial, setUseOfficial] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('drillLayout') !== 'classic';
  });
  React.useEffect(() => {
    localStorage.setItem('drillLayout', useOfficial ? 'official' : 'classic');
  }, [useOfficial]);
  const drillPath = useOfficial ? '/drill' : '/drill?layout=classic';
  const [stats, setStats] = React.useState({
    totalAttempted: 0,
    avgAccuracy: 0,
  });
  const [statsLoaded, setStatsLoaded] = React.useState(false);
  const [statsError, setStatsError] = React.useState(false);
  const [profileDisplayName, setProfileDisplayName] = React.useState<string | null>(null);
  const { classId, loading: classIdLoading } = useClassId();

  // Auth guard
  React.useEffect(() => {
    if (authReady && !user) {
      navigate('/auth', { replace: true });
    }
  }, [user, authReady, navigate]);

  // Source of truth for the greeting is profiles.display_name (Mainhub's
  // canonical name), not user_metadata which can lag.
  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name')
        .eq('class_id', user.id)
        .maybeSingle();
      if (!cancelled) setProfileDisplayName(data?.display_name ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Load user stats
  React.useEffect(() => {
    if (!user || classIdLoading || !classId) return;

    const loadStats = async () => {
      // Server-side total/accuracy aggregate (attempt_totals) instead of pulling
      // every attempt row for the class and counting client-side. RLS on attempts
      // still governs via SECURITY INVOKER.
      const { data: rows, error } = await supabase.rpc('attempt_totals', {
        p_class_id: classId,
      });

      // A swallowed error here rendered "0 Practiced / No attempts yet" to a
      // student who may have hundreds of attempts: a swallowed-error AND a
      // fabricated-data violation. Surface it and do not claim stats loaded.
      if (error) {
        console.error('Failed to load practice stats:', error);
        setStatsError(true);
        toast.error('Could not load your stats');
        return;
      }

      setStatsError(false);
      setStatsLoaded(true);

      const agg = rows?.[0];
      const total = Number(agg?.total ?? 0);
      const correct = Number(agg?.correct ?? 0);
      if (total > 0) {
        setStats({
          totalAttempted: total,
          avgAccuracy: Math.round((correct / total) * 100),
        });
      }
    };

    loadStats();
  }, [user, classId, classIdLoading]);

  const getFirstName = () => {
    if (!user) return 'there';
    const raw =
      profileDisplayName ||
      (user.user_metadata?.display_name as string | undefined) ||
      user.email?.split('@')[0] ||
      'there';
    const firstName = raw.split(/[\s._-]/)[0].replace(/[^a-zA-Z]/g, '');
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase() || 'there';
  };

  const handleStartAdaptive = () => {
    navigate(drillPath, { state: { mode: 'adaptive', returnTo: `${location.pathname}${location.search}` } });
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate(drillPath, { state: { mode: 'full-section', config, returnTo: `${location.pathname}${location.search}` } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate(drillPath, { state: { mode: 'type-drill', config, returnTo: `${location.pathname}${location.search}` } });
  };

  const handleStartNaturalDrill = (config: TypeDrillConfig) => {
    navigate(drillPath, { state: { mode: 'natural-drill', config, returnTo: `${location.pathname}${location.search}` } });
  };

  const handleModeClick = (modeId: DrillMode) => {
    if (selectedAction === modeId) {
      clearAction();
      return;
    }
    setSelectedAction(modeId);
  };

  const handleModeCardClick = (id: ModeCardId) => {
    if (id === 'my-sets') {
      navigate('/practice/sets');
      return;
    }
    handleModeClick(id);
  };

  const { data: lastActivity } = useLastActivity();
  const resumeSnapshot = lastActivity?.state_snapshot ?? null;

  // ── Manifest loading helper for action panels ───────────────────────────
  const renderActionPanel = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border border-border border-t-foreground/30 rounded-full animate-spin" />
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Loading questions…</p>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={clearAction}>Cancel</Button>
        </div>
      );
    }
    if (error) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="ghost" size="sm" className="text-muted-foreground text-xs" onClick={clearAction}>Back</Button>
        </div>
      );
    }
    if (!manifest) return null;

    if (selectedAction === 'full-section') {
      return (
        <div className="animate-slide-up">
          <SectionSelector manifest={manifest} onStartSection={handleStartSection} onCancel={clearAction} />
        </div>
      );
    }
    if (selectedAction === 'type-drill') {
      return (
        <div className="animate-slide-up">
          <QuestionPicker manifest={manifest} onStartDrill={handleStartTypeDrill} onCancel={clearAction} />
        </div>
      );
    }
    if (selectedAction === 'natural-drill') {
      return (
        <div className="animate-slide-up">
          <NaturalDrillCreator onStartDrill={handleStartNaturalDrill} onCancel={clearAction} />
        </div>
      );
    }
    return null;
  };

  // Initials for the avatar — pull the first two letter characters of
  // the email so accounts like "12@example.com" don't render a "12"
  // avatar. Falls back to "U".
  const userInitials =
    (user?.email?.replace(/[^a-zA-Z]/g, '').slice(0, 2) || 'U').toUpperCase();

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">

      {/* ── Header — minimal, no branding ──────────────────────────────────── */}
      {!embedded && (
        <header className="border-b border-border bg-background/80 backdrop-blur-xl sticky top-0 z-10">
          <div className="px-4 lg:px-8 py-5 flex items-center max-w-7xl mx-auto">
            <button
              type="button"
              onClick={() => navigate('/foyer')}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
              aria-label="Back to Main Hub"
            >
              <ArrowLeft className="h-4 w-4" />
              Main Hub
            </button>
          </div>
        </header>
      )}

      {/* ── Canvas ─────────────────────────────────────────────────────────── */}
      <div className={cn(
        'max-w-7xl mx-auto px-4 lg:px-8 pb-16 animate-fade-in',
        embedded ? 'pt-12 md:pt-16' : 'pt-10',
      )}>
        {embedded && onBackToMainHub && (
          <div className="mb-5">
            <button
              type="button"
              onClick={onBackToMainHub}
              className="inline-flex items-center gap-2 text-sm font-medium text-foreground/70 transition-colors hover:text-foreground"
              aria-label="Back to Main Hub"
            >
              <ArrowLeft className="h-4 w-4" />
              Main Hub
            </button>
          </div>
        )}

        {/* ── Row 1 — Hero (intentionally dark on both themes) ────────────────
             With recent activity: surfaces the Resume CTA (Wave 3 / Item M),
             reusing useLastActivity + resolveResumeTarget. Falls back to the
             original "LR Smart Drill" entry on cold start. */}
        <Card className="w-full h-[280px] bg-zinc-950 relative overflow-hidden rounded-xl">

          <Spotlight className="-top-40 left-0 md:left-60 md:-top-20" fill="white" />
          <div className="flex h-full">
            <div className="flex-1 p-8 relative z-10 flex flex-col justify-center">
              {resumeSnapshot ? (
                <>
                  <div className="text-[10px] uppercase tracking-[0.25em] font-semibold text-neutral-400">
                    Pick up where you left off
                  </div>
                  <h1 className="mt-2 text-3xl md:text-4xl font-bold text-neutral-50 leading-tight">
                    {resumeSnapshot.label}
                  </h1>
                  <p className="mt-2 text-sm text-neutral-400 max-w-md leading-relaxed">
                    {resumeSubtitle(resumeSnapshot)}
                  </p>
                  <div className="mt-5 flex items-center gap-3">
                    <Button
                      onClick={() => {
                        const { path, state } = resolveResumeTarget(resumeSnapshot);
                        navigate(path, { state });
                      }}
                      size="sm"
                      className="bg-white text-black hover:bg-neutral-200 font-medium gap-2"
                    >
                      <Play className="h-3.5 w-3.5" aria-hidden /> Resume
                    </Button>
                    <Button
                      onClick={handleStartAdaptive}
                      size="sm"
                      variant="ghost"
                      className="text-neutral-400 hover:text-neutral-100 hover:bg-white/[0.06]"
                    >
                      New Smart Drill
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="text-3xl md:text-4xl font-bold text-neutral-100">
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
                      Start Smart Drill
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="flex-1 relative hidden md:block">
              <SplineBoundary>
                <SplineScene
                  scene="https://prod.spline.design/kZDDjO5HuC9GJUM2/scene.splinecode"
                  className="w-full h-full"
                />
              </SplineBoundary>
            </div>
          </div>
        </Card>

        {/* ── Row 2 — Mode selector cards ───────────────────────────────────
             Each card carries an icon, label, eyebrow descriptor, and a
             one-sentence purpose statement (Item I). The active card uses
             a gold-ring outline + lift shadow so it reads as clearly chosen
             rather than just tinted. My Sets routes to /practice/sets. */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {modes.map((mode) => {
            const Icon = mode.icon;
            const isActive = mode.id !== 'my-sets' && selectedAction === mode.id;

            return (
              <button
                key={mode.id}
                onClick={() => handleModeCardClick(mode.id)}
                className={cn(
                  'group w-full text-left rounded-xl py-5 px-5 min-h-[148px]',
                  'flex flex-col gap-3',
                  'transition-all duration-200',
                  isActive
                    ? [
                        'bg-accent',
                        'ring-2 ring-foreground/40 ring-offset-2 ring-offset-background',
                        'shadow-lg -translate-y-0.5',
                      ]
                    : [
                        'bg-card',
                        'border border-border',
                        'hover:bg-accent/60',
                        'hover:border-foreground/[0.18]',
                        'hover:-translate-y-0.5 hover:shadow-md',
                      ],
                )}
              >
                <Icon
                  className={cn(
                    'w-5 h-5 transition-colors duration-200',
                    isActive ? 'text-foreground' : 'text-muted-foreground group-hover:text-foreground/80',
                  )}
                  aria-hidden
                />

                <div className="flex-1">
                  <div
                    className={cn(
                      'text-[15px] font-semibold leading-snug transition-colors duration-200',
                      isActive ? 'text-foreground' : 'text-foreground/90',
                    )}
                  >
                    {mode.label}
                  </div>
                  <div
                    className={cn(
                      'text-[10px] uppercase tracking-[0.18em] mt-1 leading-snug transition-colors duration-200 font-semibold',
                      isActive ? 'text-muted-foreground' : 'text-muted-foreground/70',
                    )}
                  >
                    {mode.description}
                  </div>
                  <p className="text-[12px] text-muted-foreground/90 mt-2 leading-relaxed">
                    {mode.purpose}
                  </p>
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
                     All Time
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

                {/* Stats failed to load — honest fallback, not a fake zero. */}
                {statsError && (
                  <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 text-sm text-muted-foreground">
                    Stats unavailable right now. Please refresh to try again.
                  </div>
                )}

                {/* Empty-state CTA — only shown after stats load with zero
                    attempts so we don't flash it during initial load, and never
                    when the load errored (that isn't a true "no attempts"). */}
                {statsLoaded && !statsError && stats.totalAttempted === 0 && (
                  <div className="rounded-xl border border-dashed border-border bg-card/40 p-5 flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-foreground">No attempts yet.</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        Start a Smart Drill — adaptive difficulty, no setup needed.
                      </div>
                    </div>
                    <Button size="sm" onClick={handleStartAdaptive}>
                      Start your first drill
                    </Button>
                  </div>
                )}

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
                    {perms.has_waj_access && (
                      <StudyToolRow
                        icon={XCircle}
                        label="Wrong Answer Journal"
                        description="Review mistakes and track growth patterns"
                        onClick={() => navigate('/waj')}
                      />
                    )}
                    {perms.has_flagged_access && (
                      <StudyToolRow
                        icon={Flag}
                        label="Flagged Questions"
                        description="Questions you marked for deeper review"
                        onClick={() => navigate('/flagged')}
                      />
                    )}
                  </div>
                </div>

                {perms.has_analytics_access && (
                  <div className={cn('rounded-xl bg-card border border-border p-5', 'shadow-sm')}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate('/analytics')}
                      className="text-muted-foreground/70 hover:text-foreground hover:bg-accent text-[11px] h-7 px-2.5 -ml-1"
                    >
                      View Full Analytics
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            renderActionPanel()
          )}
        </div>
      </div>
    </div>
  );
}

export default function Practice() {
  return <PracticeHubContent />;
}
