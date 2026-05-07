import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useClassroomItems } from '@/hooks/useClassroomItems';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2, Lock } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { BUILD_SHA, BUILD_TIME } from '@/lib/buildInfo';

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

const BOOTCAMPS = [
  {
    id: 'causation-station',
    title: 'Causation Station',
    emoji: '⚗️',
    description:
      'A focused bootcamp to master causal reasoning — one of the most frequently tested skills on the LSAT. Train across 4 progressive modules: spot causation vs. correlation, identify alternate explanations, test relationships, and apply skills to real LSAT questions.',
    stats: ['4 Modules', '76 Questions', 'Flashcards + Journal'],
    route: '/bootcamp/causation-station',
    accentClass: 'bg-sky-500/10 border-sky-500/20',
  },
  {
    id: 'abstraction',
    title: 'Abstract',
    emoji: '🧬',
    description:
      'Master the abstract language of LSAT Role questions. Module 1 breaks down 15 dense answer-choice stems into plain English with keyword coaching. Module 2 walks you through 6 of the hardest PT Role questions with full structural maps and answer-choice analysis.',
    stats: ['2 Modules', '15 Exercises', '7 Questions'],
    route: '/bootcamp/abstraction',
    accentClass: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'intro-to-lr',
    title: 'Intro to LR',
    emoji: '🛠️',
    description:
      'Six modules, gate-driven, calibration after teaching. 12 voice-led lessons + capstone; Reference + Indicator Vault; 9 drills with Stage-Gate engine; 20-question Simulator with Trap Master 7-trait diagnostic; Hard Sentences cluster decomposer; Diagnostics dashboard with SM-2 spaced repetition. Unlock cascade starts at Lesson 1.1.',
    stats: ['6 Modules', '86 Surfaces', 'SM-2 SRS'],
    route: '/bootcamp/intro-to-lr',
    accentClass: 'bg-amber-500/10 border-amber-500/20',
  },
  {
    id: 'principle-flaw',
    title: 'Principle & Flaw',
    emoji: '⚖️',
    description:
      'A 14-day, voice-led program covering Flaw (Levels 1–4), Principle Strengthen, Strengthen Application, Principle Conform, and Parallel Flaw bridging — with daily question sets pulled live from the LSAT U question bank, a Learn hub, flashcards with SRS, and a structured Review Log.',
    stats: ['14-Day Plan', '47 PT Questions', 'Flashcards + Review Log'],
    route: '/bootcamp/principle-flaw',
    accentClass: 'bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 'fallacy-flaw',
    title: 'Flaw & Famous Flaws',
    emoji: '🎭',
    description:
      'A focused bootcamp on identifying and naming logical flaws. Six days of flashcards, flaw-stack drills, mindmaps, language protocols, and spaced-repetition review — covering 18 canonical flaw types with real LSAT question practice.',
    stats: ['6 Days', '18 Flaw Types', 'Flashcards + SRS'],
    route: '/bootcamp/fallacy-flaw',
    accentClass: 'bg-teal-500/10 border-teal-500/20',
  },
] as const;

export default function BootcampsPage() {
  const navigate = useNavigate();
  const { user, authReady } = useAuth();
  const { is_admin, loading: permsLoading } = useUserPermissions();
  const { data: items = [], isLoading: itemsLoading } = useClassroomItems();

  React.useEffect(() => {
    if (authReady && !user) navigate('/auth');
  }, [user, authReady, navigate]);

  const assignedIds = React.useMemo(() => {
    const set = new Set<string>();
    for (const it of items) {
      if (it.type !== 'bootcamp_module' || it.status === 'archived') continue;
      const id = (it.metadata_json as any)?.bootcamp_id;
      if (typeof id === 'string') set.add(id);
      // Fallback: source_id may be the route, e.g. /bootcamp/principle-flaw
      if (typeof it.source_id === 'string') {
        const slug = it.source_id.replace(/^\/bootcamp\//, '').replace(/\/.*$/, '');
        if (slug) set.add(slug);
      }
    }
    return set;
  }, [items]);

  const visible = is_admin
    ? BOOTCAMPS
    : BOOTCAMPS.filter((b) => assignedIds.has(b.id));

  const loading = !authReady || permsLoading || (!is_admin && itemsLoading);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/foyer')}
            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Main Hub
          </Button>
          <IL>Bootcamps</IL>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Bootcamps</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {is_admin
              ? 'All bootcamps. Students only see bootcamps you assign from the Teacher Workspace.'
              : 'Focused skill-building programs assigned to you by Joshua.'}
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 select-text"
            title={`Build ${BUILD_SHA} · ${BUILD_TIME}`}
          >
            build {BUILD_SHA}
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-10 text-center space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <Lock className="w-4 h-4 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <div className="space-y-1">
              <h2 className="text-sm font-semibold">No bootcamps assigned yet</h2>
              <p className="text-xs text-muted-foreground">
                Joshua will add bootcamps to your path from the Teacher Workspace.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((bc) => (
              <div
                key={bc.id}
                className="rounded-xl bg-card border border-border shadow-sm p-6 flex flex-col sm:flex-row gap-6 items-start"
              >
                <div
                  className={`w-12 h-12 rounded-xl ${bc.accentClass} flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-xl">{bc.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{bc.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 max-w-xl leading-relaxed">
                    {bc.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3">
                    {bc.stats.map((s) => (
                      <span
                        key={s}
                        className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={() => navigate(bc.route)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-foreground text-background text-sm font-medium px-4 py-2 hover:bg-foreground/90 transition-colors duration-150"
                    >
                      Launch Bootcamp
                      <span className="ml-1">→</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
