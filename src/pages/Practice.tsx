/**
 * /practice — a literal, real version of the homepage workspace preview.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  Bookmark,
  Clock,
  Flag,
  Home,
  Inbox,
  LayoutGrid,
  Menu,
  Play,
  Sparkles,
  User,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { SectionSelector } from '@/components/drill/SectionSelector';
import { QuestionPicker } from '@/components/drill/QuestionPicker';
import { NaturalDrillCreator } from '@/components/drill/NaturalDrillCreator';
import { useAuth } from '@/contexts/AuthContext';
import { useQuestionBank } from '@/contexts/QuestionBankContext';
import { useLastActivity } from '@/hooks/useLastActivity';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { resolveResumeTarget, type LastActivitySnapshot } from '@/lib/lastActivity';
import { cn } from '@/lib/utils';
import type { FullSectionConfig, TypeDrillConfig } from '@/types/drill';

type PracticePanel = 'full-section' | 'builder' | 'natural-drill' | 'type-drill' | null;

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

function PreviewLine({
  className,
  accent = false,
}: {
  className?: string;
  accent?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'block h-2 rounded-full',
        accent ? 'bg-[#dfe7ff]' : 'bg-[#f1ece2]',
        className,
      )}
    />
  );
}

function WorkspaceNav({
  hasChatAccess,
  onResume,
  onNavigate,
}: {
  hasChatAccess: boolean;
  onResume: () => void;
  onNavigate: (path: string) => void;
}) {
  const navItems = [
    { label: 'Today', icon: Home, active: true, onClick: () => onNavigate('/practice') },
    { label: 'Spaces', icon: LayoutGrid, onClick: () => onNavigate('/foyer') },
    { label: 'Sessions', icon: Clock, onClick: onResume },
    { label: 'Inbox', icon: Inbox, disabled: !hasChatAccess, onClick: () => onNavigate('/inbox') },
    { label: 'Profile', icon: User, onClick: () => onNavigate('/profile') },
  ];

  return (
    <aside className="flex h-full flex-col gap-2 border-r border-[#e7e1d7] bg-[#faf7f0] px-6 py-10">
      <div className="px-2 pb-5 text-[13px] font-semibold uppercase tracking-[0.28em] text-[#a8afbc]">
        Workspace
      </div>
      {navItems.map(({ label, icon: Icon, active, disabled, onClick }) => (
        <button
          key={label}
          type="button"
          disabled={disabled}
          onClick={onClick}
          className={cn(
            'flex min-h-14 items-center gap-4 rounded-2xl px-4 text-left text-[18px] font-semibold transition',
            active
              ? 'border border-[#e7e1d7] bg-[#fffdf8] text-[#16171d] shadow-[0_1px_2px_rgba(15,17,29,0.03)]'
              : 'text-[#727985] hover:bg-[#fffdf8]/70 hover:text-[#20232b]',
            disabled && 'cursor-not-allowed opacity-40 hover:bg-transparent',
          )}
        >
          <Icon
            className={cn('h-[22px] w-[22px]', active ? 'text-[#2f5bff]' : 'text-[#a6adba]')}
            strokeWidth={1.8}
            aria-hidden
          />
          {label}
        </button>
      ))}
    </aside>
  );
}

function PracticePreviewCard({
  index,
  title,
  description,
  active,
  primary,
  onClick,
}: {
  index: string;
  title: string;
  description: string;
  active?: boolean;
  primary?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex min-h-[190px] flex-col rounded-[18px] border bg-[#fffdf8] p-7 text-left transition duration-200',
        active
          ? 'border-[#cfd7f5] shadow-[0_20px_45px_rgba(47,91,255,0.08)]'
          : 'border-[#e7e1d7] shadow-[0_1px_2px_rgba(15,17,29,0.03)] hover:-translate-y-0.5 hover:border-[#d7d1c7]',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'h-3 w-3 rounded-full',
            primary || active ? 'bg-[#2f5bff]' : 'bg-[#ddd9d2]',
          )}
        />
        <span className="text-[15px] font-semibold tracking-[0.2em] text-[#a8afbc]">
          {index}
        </span>
      </div>
      <div className="mt-7 space-y-4" aria-hidden>
        <PreviewLine className="w-[86%]" />
        <PreviewLine className="w-[64%]" />
      </div>
      <div className="mt-auto pt-9">
        <PreviewLine accent={primary || active} className="w-[42%]" />
        <div className="mt-4 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#22242b] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {title}
            </div>
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#777f8c] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
              {description}
            </p>
          </div>
          <ArrowRight
            className="h-5 w-5 shrink-0 text-[#b0a898] opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100"
            aria-hidden
          />
        </div>
      </div>
    </button>
  );
}

function BuilderChoice({
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
      className="group flex items-center gap-4 rounded-2xl border border-[#e7e1d7] bg-[#fffdf8] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#d7d1c7] hover:shadow-[0_16px_32px_rgba(15,17,29,0.08)]"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#f3eee4] text-[#7a818e] group-hover:text-[#1d2028]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-[#1d2028]">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-[#777f8c]">{description}</span>
      </span>
      <ArrowRight className="h-4 w-4 text-[#b8b0a2]" aria-hidden />
    </button>
  );
}

function SecondaryLink({
  icon: Icon,
  label,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-[#e7e1d7] bg-[#fffdf8]/70 px-4 text-xs font-semibold text-[#727985] transition hover:border-[#d7d1c7] hover:text-[#1d2028]"
    >
      <Icon className="h-4 w-4" aria-hidden />
      {label}
    </button>
  );
}

export default function Practice() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { manifest, isLoading, error } = useQuestionBank();
  const perms = useUserPermissions();
  const { data: lastActivity } = useLastActivity();
  const resumeSnapshot = lastActivity?.state_snapshot ?? null;
  const [activePanel, setActivePanel] = React.useState<PracticePanel>(null);

  React.useEffect(() => {
    if (authReady && !user) navigate('/auth', { replace: true });
  }, [user, authReady, navigate]);

  const startSmartDrill = () => {
    navigate('/drill', { state: { mode: 'adaptive' } });
  };

  const resumeOrSmartDrill = () => {
    if (resumeSnapshot) {
      const { path, state } = resolveResumeTarget(resumeSnapshot);
      navigate(path, { state });
      return;
    }
    startSmartDrill();
  };

  const handleStartSection = (config: FullSectionConfig) => {
    navigate('/drill', { state: { mode: 'full-section', config } });
  };

  const handleStartTypeDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'type-drill', config } });
  };

  const handleStartNaturalDrill = (config: TypeDrillConfig) => {
    navigate('/drill', { state: { mode: 'natural-drill', config } });
  };

  const renderDrawer = () => {
    if (!activePanel) return null;

    if (activePanel === 'builder') {
      return (
        <section className="mt-8 rounded-[18px] border border-[#e7e1d7] bg-[#fbfaf6] p-5 shadow-[0_16px_45px_rgba(15,17,29,0.07)]">
          <div className="mb-5 flex items-center justify-between gap-4">
            <div>
              <div className="text-[12px] font-semibold uppercase tracking-[0.22em] text-[#a8afbc]">
                Build Practice
              </div>
              <p className="mt-1 text-sm text-[#727985]">
                Choose the builder that fits the work you want to do.
              </p>
            </div>
            <Button variant="ghost" size="sm" className="text-[#727985]" onClick={() => setActivePanel(null)}>
              Close
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <BuilderChoice
              icon={Sparkles}
              label="Smart Builder"
              description="Describe the target in plain English."
              onClick={() => setActivePanel('natural-drill')}
            />
            <BuilderChoice
              icon={LayoutGrid}
              label="Build a Set"
              description="Filter tests, question types, difficulty, and count."
              onClick={() => setActivePanel('type-drill')}
            />
            <BuilderChoice
              icon={Bookmark}
              label="My Sets"
              description="Relaunch saved custom sets."
              onClick={() => navigate('/practice/sets')}
            />
          </div>
        </section>
      );
    }

    if (isLoading) {
      return (
        <section className="mt-8 flex flex-col items-center justify-center rounded-[18px] border border-[#e7e1d7] bg-[#fbfaf6] py-14">
          <div className="h-8 w-8 animate-spin rounded-full border border-[#e7e1d7] border-t-[#727985]" />
          <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.22em] text-[#a8afbc]">
            Loading questions
          </p>
        </section>
      );
    }

    if (error) {
      return (
        <section className="mt-8 rounded-[18px] border border-[#e7e1d7] bg-[#fbfaf6] p-8 text-center">
          <p className="text-sm text-[#727985]">{error}</p>
          <Button variant="ghost" size="sm" className="mt-3 text-[#727985]" onClick={() => setActivePanel(null)}>
            Back
          </Button>
        </section>
      );
    }

    if (!manifest && activePanel !== 'natural-drill') return null;

    return (
      <section className="mt-8 rounded-[18px] border border-[#e7e1d7] bg-[#fbfaf6] p-4 shadow-[0_16px_45px_rgba(15,17,29,0.07)] md:p-6">
        {activePanel === 'full-section' && manifest && (
          <SectionSelector manifest={manifest} onStartSection={handleStartSection} onCancel={() => setActivePanel(null)} />
        )}
        {activePanel === 'type-drill' && manifest && (
          <QuestionPicker manifest={manifest} onStartDrill={handleStartTypeDrill} onCancel={() => setActivePanel(null)} />
        )}
        {activePanel === 'natural-drill' && (
          <NaturalDrillCreator onStartDrill={handleStartNaturalDrill} onCancel={() => setActivePanel('builder')} />
        )}
      </section>
    );
  };

  if (!authReady || !user) return null;

  const mobileNav = (
    <WorkspaceNav
      hasChatAccess={perms.has_chat_access}
      onResume={resumeOrSmartDrill}
      onNavigate={navigate}
    />
  );

  return (
    <div className="light min-h-[100dvh] overflow-x-hidden bg-[#f7f4ed] text-[#1d2028]">
      <div className="mx-auto flex min-h-[100dvh] w-full max-w-[1920px] items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
        <section className="w-full max-w-[1680px] overflow-hidden rounded-[28px] border border-[#e1dbd0] bg-[#fffdf8] shadow-[0_1px_2px_rgba(15,17,29,0.04),0_32px_90px_-24px_rgba(15,17,29,0.24)]">
          <header className="flex h-[96px] items-center gap-4 border-b border-[#e7e1d7] bg-[#faf7f0] px-8">
            <Sheet>
              <SheetTrigger
                aria-label="Open practice navigation"
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-[#e7e1d7] bg-[#fffdf8] text-[#727985] md:hidden"
              >
                <Menu className="h-5 w-5" aria-hidden />
              </SheetTrigger>
              <SheetContent side="left" className="w-[310px] p-0">
                {mobileNav}
              </SheetContent>
            </Sheet>

            <div className="hidden items-center gap-3 md:flex" aria-hidden>
              <span className="h-4 w-4 rounded-full bg-[#d8d5cf]" />
              <span className="h-4 w-4 rounded-full bg-[#d8d5cf]" />
              <span className="h-4 w-4 rounded-full bg-[#d8d5cf]" />
            </div>
            <div className="min-w-0 flex-1 text-center font-serif text-2xl font-semibold tracking-[-0.02em] text-[#737b88]">
              LSAT U · Workspace
            </div>
            <div className="hidden h-12 items-center rounded-xl border border-[#e7e1d7] bg-[#fffdf8] px-4 text-lg font-medium text-[#a8afbc] shadow-[0_1px_2px_rgba(15,17,29,0.03)] sm:flex">
              ⌘ K
            </div>
          </header>

          <div className="grid min-h-[620px] md:grid-cols-[320px_minmax(0,1fr)]">
            <div className="hidden md:block">
              <WorkspaceNav
                hasChatAccess={perms.has_chat_access}
                onResume={resumeOrSmartDrill}
                onNavigate={navigate}
              />
            </div>

            <main className="bg-[#fffdf8] px-6 py-10 sm:px-8 lg:px-12 xl:px-16">
              <div className="mx-auto max-w-[1260px]">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                  <h1 className="font-serif text-3xl font-semibold leading-tight tracking-[-0.035em] text-[#16171d] sm:text-4xl">
                    Welcome back,{' '}
                    <span className="italic font-normal text-[#737b88]">
                      your space is ready.
                    </span>
                  </h1>
                  <span className="inline-flex h-12 w-fit items-center gap-3 rounded-full bg-[#f1ece2] px-5 text-lg font-semibold text-[#737b88]">
                    <span className="h-3 w-3 rounded-full bg-[#2f5bff]" />
                    Live
                  </span>
                </div>

                <div className="mt-12 grid gap-6 lg:grid-cols-3">
                  <PracticePreviewCard
                    index="01"
                    title="Smart LR Drill"
                    description="Start adaptive Logical Reasoning practice."
                    primary
                    onClick={startSmartDrill}
                  />
                  <PracticePreviewCard
                    index="02"
                    title="Full Section"
                    description="Open a timed section selector."
                    active={activePanel === 'full-section'}
                    onClick={() => setActivePanel((prev) => (prev === 'full-section' ? null : 'full-section'))}
                  />
                  <PracticePreviewCard
                    index="03"
                    title="Build Practice"
                    description="Choose Smart Builder, Build a Set, or My Sets."
                    active={activePanel === 'builder' || activePanel === 'natural-drill' || activePanel === 'type-drill'}
                    onClick={() => setActivePanel((prev) => (prev === 'builder' ? null : 'builder'))}
                  />
                </div>

                <button
                  type="button"
                  onClick={resumeOrSmartDrill}
                  className="group mt-9 flex w-full items-center gap-7 rounded-[22px] border border-[#e7e1d7] bg-[#fffdf8] px-7 py-8 text-left shadow-[0_1px_2px_rgba(15,17,29,0.03)] transition hover:border-[#d7d1c7] hover:shadow-[0_18px_45px_rgba(15,17,29,0.08)]"
                >
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[18px] bg-[#f1ece2] text-[#737b88]">
                    {resumeSnapshot ? (
                      <Play className="h-7 w-7" aria-hidden />
                    ) : (
                      <ArrowRight className="h-7 w-7" aria-hidden />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold uppercase tracking-[0.22em] text-[#a8afbc]">
                      {resumeSnapshot ? 'Resume' : 'Continue'}
                    </span>
                    <span className="mt-2 block text-lg font-semibold text-[#1d2028]">
                      {resumeSnapshot ? resumeSnapshot.label : 'Start with Smart LR'}
                    </span>
                    <span className="mt-1 block text-sm text-[#777f8c]">
                      {resumeSnapshot ? resumeSubtitle(resumeSnapshot) : 'Adaptive practice, no setup needed.'}
                    </span>
                  </span>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f1ece2] text-[#737b88] transition group-hover:translate-x-0.5 group-hover:text-[#1d2028]">
                    <ArrowRight className="h-5 w-5" aria-hidden />
                  </span>
                </button>

                {(perms.has_waj_access || perms.has_flagged_access || perms.has_analytics_access) && (
                  <div className="mt-5 flex flex-wrap gap-3">
                    {perms.has_waj_access && (
                      <SecondaryLink icon={XCircle} label="Wrong Answer Journal" onClick={() => navigate('/waj')} />
                    )}
                    {perms.has_flagged_access && (
                      <SecondaryLink icon={Flag} label="Flagged Questions" onClick={() => navigate('/flagged')} />
                    )}
                    {perms.has_analytics_access && (
                      <SecondaryLink icon={BarChart3} label="Analytics" onClick={() => navigate('/analytics')} />
                    )}
                  </div>
                )}

                {renderDrawer()}
              </div>
            </main>
          </div>
        </section>
      </div>
    </div>
  );
}
