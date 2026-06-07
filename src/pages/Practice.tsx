/**
 * /practice — the real practice workspace.
 *
 * This page borrows the soft "workspace preview" language from the auth
 * homepage, but every card is wired to an actual LSAT U practice surface.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bookmark,
  BookOpen,
  Flag,
  Grid3x3,
  LayoutGrid,
  Menu,
  Play,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { RecentPerformanceWidget } from '@/components/dashboard/RecentPerformanceWidget';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import SmartLRTrainingCard from '@/components/mainhub/SmartLRTrainingCard';
import MainhubSidebar from '@/components/mainhub/MainhubSidebar';
import MainhubAccountButton from '@/components/mainhub/MainhubAccountButton';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { supabase } from '@/integrations/supabase/client';
import { useClassId } from '@/hooks/useClassId';
import { useLastActivity } from '@/hooks/useLastActivity';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { resolveResumeTarget, type LastActivitySnapshot } from '@/lib/lastActivity';
import { cn } from '@/lib/utils';
import type { DrillMode, FullSectionConfig, TypeDrillConfig } from '@/types/drill';

type ModeCardId = DrillMode | 'my-sets';

interface ModeCard {
  id: ModeCardId;
  icon: React.ElementType;
  label: string;
  kicker: string;
  description: string;
  accent: string;
}

const modes: ModeCard[] = [
  {
    id: 'full-section',
    icon: BookOpen,
    label: 'Full Section',
    kicker: '01',
    description: 'Timed official-format Logical Reasoning section.',
    accent: 'bg-blue-600',
  },
  {
    id: 'natural-drill',
    icon: Sparkles,
    label: 'Smart Builder',
    kicker: '02',
    description: 'Describe the work you want and let LSAT U assemble the set.',
    accent: 'bg-amber-500',
  },
  {
    id: 'type-drill',
    icon: Grid3x3,
    label: 'Build a Set',
    kicker: '03',
    description: 'Hand-pick question types, tests, difficulty, and volume.',
    accent: 'bg-slate-400',
  },
  {
    id: 'my-sets',
    icon: Bookmark,
    label: 'My Sets',
    kicker: '04',
    description: 'Reopen saved custom sets when you want a known playlist.',
    accent: 'bg-neutral-300',
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

function WorkspaceToolRow({
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
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 rounded-[22px] border border-[#ebe6dd] bg-[#fffdf8] px-4 py-4 text-left shadow-[0_1px_1px_rgba(20,23,35,0.03)] transition duration-200 hover:-translate-y-0.5 hover:border-[#dcd5c9] hover:shadow-[0_18px_35px_rgba(20,23,35,0.08)]"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f4efe5] text-slate-500 transition-colors group-hover:text-slate-900">
        <Icon className="h-4 w-4" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-800">{label}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-slate-700" />
    </button>
  );
}

function WorkspaceStat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <div className="rounded-[22px] border border-[#ebe6dd] bg-[#fffdf8] p-5 shadow-[0_1px_1px_rgba(20,23,35,0.03)]">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-blue-600" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          {label}
        </span>
      </div>
      <div className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">{value}</div>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

export default function Practice() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { manifest, isLoading, error } = useQuestionBank();
  const perms = useUserPermissions();
  const [selectedAction, setSelectedAction] = React.useState<DrillMode | null>(null);
  const [stats, setStats] = React.useState({ totalAttempted: 0, avgAccuracy: 0 });
  const [statsLoaded, setStatsLoaded] = React.useState(false);
  const [profileDisplayName, setProfileDisplayName] = React.useState<string | null>(null);
  const { classId, loading: classIdLoading } = useClassId();
  const { data: lastActivity } = useLastActivity();
  const resumeSnapshot = lastActivity?.state_snapshot ?? null;

  React.useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [user, authReady, navigate]);

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

  React.useEffect(() => {
    if (!user || classIdLoading || !classId) return;

    const loadStats = async () => {
      const { data: attempts } = await supabase
        .from('attempts')
        .select('correct, timestamp_iso')
        .eq('class_id', classId);

      setStatsLoaded(true);

      if (attempts && attempts.length > 0) {
        const correct = attempts.filter((a) => a.correct).length;
        setStats({
          totalAttempted: attempts.length,
          avgAccuracy: Math.round((correct / attempts.length) * 100),
        });
      }
    };

    void loadStats();
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

  const drillPath = '/drill';

  const handleStartSection = (config: FullSectionConfig) => {
    navigate(drillPath, { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate(drillPath, { state: { mode: 'type-drill', config } });
  };

  const handleStartNaturalDrill = (config: TypeDrillConfig) => {
    navigate(drillPath, { state: { mode: 'natural-drill', config } });
  };

  const handleModeCardClick = (id: ModeCardId) => {
    if (id === 'my-sets') {
      navigate('/practice/sets');
      return;
    }
    setSelectedAction((prev) => (prev === id ? null : id));
  };

  const renderActionPanel = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center rounded-[28px] border border-[#ebe6dd] bg-[#fffdf8] py-16">
          <div className="h-8 w-8 animate-spin rounded-full border border-[#ebe6dd] border-t-slate-500" />
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
            Loading questions
          </p>
          <Button variant="ghost" size="sm" className="mt-3 text-slate-500" onClick={() => setSelectedAction(null)}>
            Cancel
          </Button>
        </div>
      );
    }

    if (error) {
      return (
        <div className="rounded-[28px] border border-[#ebe6dd] bg-[#fffdf8] p-8 text-center">
          <p className="text-sm text-slate-600">{error}</p>
          <Button variant="ghost" size="sm" className="mt-3 text-slate-500" onClick={() => setSelectedAction(null)}>
            Back
          </Button>
        </div>
      );
    }

    if (!manifest) return null;

    return (
      <section className="rounded-[30px] border border-[#e7e1d6] bg-white p-3 shadow-[0_22px_60px_rgba(20,23,35,0.08)]">
        <div className="rounded-[24px] bg-[#fbfaf6] p-4 md:p-6">
          {selectedAction === 'full-section' && (
            <SectionSelector manifest={manifest} onStartSection={handleStartSection} onCancel={() => setSelectedAction(null)} />
          )}
          {selectedAction === 'type-drill' && (
            <QuestionPicker manifest={manifest} onStartDrill={handleStartTypeDrill} onCancel={() => setSelectedAction(null)} />
          )}
          {selectedAction === 'natural-drill' && (
            <NaturalDrillCreator onStartDrill={handleStartNaturalDrill} onCancel={() => setSelectedAction(null)} />
          )}
        </div>
      </section>
    );
  };

  if (!authReady || !user) return null;

  return (
    <div className="light min-h-[100dvh] bg-[#f4f0e8] text-slate-900">
      <div className="relative flex min-h-[100dvh] w-full overflow-hidden">
        <aside className="hidden w-[300px] shrink-0 border-r border-[#e3ddd3] bg-[#fbfaf6] md:block">
          <MainhubSidebar displayName={profileDisplayName} />
        </aside>

        <Sheet>
          <SheetTrigger
            aria-label="Open practice navigation"
            className="absolute left-4 top-4 z-30 rounded-full border border-[#e4ded4] bg-[#fffdf8] p-3 text-slate-600 shadow-sm transition hover:text-slate-950 md:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden />
          </SheetTrigger>
          <SheetContent side="left" className="w-[320px] p-0">
            <MainhubSidebar displayName={profileDisplayName} />
          </SheetContent>
        </Sheet>

        <main className="relative flex min-w-0 flex-1 flex-col overflow-y-auto">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_24%_12%,rgba(255,255,255,0.95),transparent_30%),radial-gradient(circle_at_82%_4%,rgba(232,226,215,0.75),transparent_24%)]"
          />

          <div className="relative mx-auto flex w-full max-w-[1420px] flex-1 flex-col px-4 py-4 md:px-6 lg:px-8">
            <section className="overflow-hidden rounded-[30px] border border-[#ded8ce] bg-[#fffdf8]/92 shadow-[0_28px_80px_rgba(21,24,35,0.12)] backdrop-blur">
              <header className="flex h-[72px] items-center gap-3 border-b border-[#e8e1d7] bg-[#fbfaf6] px-5 md:px-7">
                <div className="hidden gap-2 md:flex" aria-hidden>
                  <span className="h-3 w-3 rounded-full bg-[#d6d2cb]" />
                  <span className="h-3 w-3 rounded-full bg-[#d6d2cb]" />
                  <span className="h-3 w-3 rounded-full bg-[#d6d2cb]" />
                </div>
                <div className="flex flex-1 justify-center text-center font-serif text-lg font-semibold tracking-tight text-slate-500 md:text-xl">
                  LSAT U · Practice Workspace
                </div>
                <div className="hidden items-center gap-2 rounded-xl border border-[#e4ded4] bg-white px-3 py-2 text-xs font-semibold text-slate-400 md:flex">
                  <LayoutGrid className="h-3.5 w-3.5" aria-hidden />
                  Live
                </div>
                <MainhubAccountButton displayName={profileDisplayName} />
              </header>

              <div className="grid min-h-[calc(100dvh-112px)] lg:grid-cols-[minmax(0,1fr)_420px]">
                <div className="border-b border-[#e8e1d7] p-5 md:p-8 lg:border-b-0 lg:border-r">
                  <div className="mb-9 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-400">
                        Workspace
                      </p>
                      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-[-0.035em] text-slate-950 md:text-5xl">
                        Welcome back,{' '}
                        <span className="italic text-slate-500">{getFirstName()}.</span>
                      </h1>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">
                        Start with Smart LR, resume unfinished work, or open a targeted builder. This is the practice cockpit behind the homepage preview.
                      </p>
                    </div>
                    {resumeSnapshot && (
                      <Button
                        type="button"
                        onClick={() => {
                          const { path, state } = resolveResumeTarget(resumeSnapshot);
                          navigate(path, { state });
                        }}
                        className="h-12 rounded-full bg-slate-950 px-5 text-white hover:bg-slate-800"
                      >
                        <Play className="h-4 w-4" aria-hidden />
                        Resume
                      </Button>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {modes.map((mode) => {
                      const Icon = mode.icon;
                      const isActive = mode.id !== 'my-sets' && selectedAction === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => handleModeCardClick(mode.id)}
                          className={cn(
                            'group flex min-h-[178px] flex-col rounded-[26px] border p-5 text-left transition duration-200',
                            isActive
                              ? 'border-slate-950 bg-white shadow-[0_22px_45px_rgba(20,23,35,0.12)]'
                              : 'border-[#ebe6dd] bg-[#fffdf8] shadow-[0_1px_1px_rgba(20,23,35,0.03)] hover:-translate-y-0.5 hover:border-[#dcd5c9] hover:shadow-[0_18px_35px_rgba(20,23,35,0.08)]',
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span className={cn('h-2 w-2 rounded-full', mode.accent)} />
                            <span className="text-[12px] font-semibold tracking-[0.18em] text-slate-400">
                              {mode.kicker}
                            </span>
                          </span>
                          <Icon className="mt-7 h-5 w-5 text-slate-400 transition-colors group-hover:text-slate-900" aria-hidden />
                          <span className="mt-5 text-lg font-semibold tracking-tight text-slate-900">
                            {mode.label}
                          </span>
                          <span className="mt-2 text-sm leading-6 text-slate-500">
                            {mode.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-6">
                    {selectedAction ? (
                      renderActionPanel()
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/practice/sets')}
                        className="group flex w-full items-center gap-5 rounded-[28px] border border-[#ebe6dd] bg-[#fffdf8] p-5 text-left shadow-[0_1px_1px_rgba(20,23,35,0.03)] transition duration-200 hover:border-[#dcd5c9] hover:shadow-[0_18px_35px_rgba(20,23,35,0.08)]"
                      >
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[22px] bg-[#f4efe5] text-slate-500">
                          <ArrowRight className="h-6 w-6" aria-hidden />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold uppercase tracking-[0.18em] text-slate-400">
                            Continue
                          </span>
                          <span className="mt-1 block text-lg font-semibold text-slate-900">
                            Open saved sets and relaunch your custom work.
                          </span>
                        </span>
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f4efe5] text-slate-500 transition group-hover:text-slate-950">
                          <ArrowRight className="h-5 w-5" aria-hidden />
                        </span>
                      </button>
                    )}
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <WorkspaceStat
                      label="Practiced"
                      value={stats.totalAttempted}
                      detail={statsLoaded ? 'Total answered questions in your account.' : 'Loading your attempt history.'}
                    />
                    <WorkspaceStat
                      label="Accuracy"
                      value={`${stats.totalAttempted > 0 ? stats.avgAccuracy : 0}%`}
                      detail="All-time correct answer rate from completed attempts."
                    />
                  </div>

                  {statsLoaded && stats.totalAttempted === 0 && (
                    <div className="mt-4 rounded-[24px] border border-dashed border-[#dcd5c9] bg-[#fffdf8]/70 p-5">
                      <div className="text-sm font-semibold text-slate-900">No attempts yet.</div>
                      <div className="mt-1 text-sm text-slate-500">
                        Start Smart LR when you want the shortest path into useful practice.
                      </div>
                    </div>
                  )}
                </div>

                <aside className="bg-[#fbfaf6] p-5 md:p-8">
                  <div className="sticky top-6 space-y-5">
                    <SmartLRTrainingCard />

                    {resumeSnapshot && (
                      <div className="rounded-[26px] border border-[#ebe6dd] bg-[#fffdf8] p-5 shadow-[0_1px_1px_rgba(20,23,35,0.03)]">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Last activity
                        </div>
                        <div className="mt-3 text-base font-semibold text-slate-900">
                          {resumeSnapshot.label}
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          {resumeSubtitle(resumeSnapshot)}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      {perms.has_waj_access && (
                        <WorkspaceToolRow
                          icon={XCircle}
                          label="Wrong Answer Journal"
                          description="Review mistakes and spot recurring reasoning patterns."
                          onClick={() => navigate('/waj')}
                        />
                      )}
                      {perms.has_flagged_access && (
                        <WorkspaceToolRow
                          icon={Flag}
                          label="Flagged Questions"
                          description="Return to questions you marked for deeper review."
                          onClick={() => navigate('/flagged')}
                        />
                      )}
                      {perms.has_analytics_access && (
                        <WorkspaceToolRow
                          icon={ArrowRight}
                          label="Analytics"
                          description="Open your full trends, accuracy, and review dashboard."
                          onClick={() => navigate('/analytics')}
                        />
                      )}
                    </div>

                    <RecentPerformanceWidget />
                  </div>
                </aside>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
