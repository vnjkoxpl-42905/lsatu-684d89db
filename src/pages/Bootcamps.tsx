import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ChevronRight } from 'lucide-react';
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
] as const;

export default function BootcampsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
            Focused skill-building programs to sharpen specific LSAT reasoning abilities.
          </p>
          <p
            className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60 mt-2 select-text"
            title={`Build ${BUILD_SHA} · ${BUILD_TIME}`}
          >
            build {BUILD_SHA}
          </p>
        </div>

        <div className="space-y-4">
          {BOOTCAMPS.map((bc) => (
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
      </main>
    </div>
  );
}
