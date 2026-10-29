import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, HelpCircle, Layers, StickyNote, Zap } from 'lucide-react';
import { Module, MODULES } from '@/data/causationStation/constants';
import CSDashboard from '@/components/bootcamp/CSDashboard';
import CSDrillPlayer, { MODULE_COMPLETION_KEY } from '@/components/bootcamp/CSDrillPlayer';
import CSFlashcards from '@/components/bootcamp/CSFlashcards';
import CSJournal from '@/components/bootcamp/CSJournal';
import CSStudyTimer from '@/components/bootcamp/CSStudyTimer';
import CSOnboardingGuide from '@/components/bootcamp/CSOnboardingGuide';
import CSLauncher from '@/components/bootcamp/CSLauncher';
import { LogoutButton } from '@/components/LogoutButton';
import { useBootcampProgress } from '@/hooks/useBootcampProgress';
import { cn } from '@/lib/utils';
import '@/components/bootcamp/styles/cs-punk.css';

type CSView = 'dashboard' | 'drill' | 'flashcards' | 'journal';

const ONBOARDING_SEEN_KEY = 'causationHasSeenOnboarding';

// Completion model: one full run through each of the 4 modules. Module ids map
// to 1-indexed "days" for the shared classroom-progress hook.
const MODULE_ORDER: string[] = MODULES.map((m) => m.id);

function readCompletedModuleDays(): number[] {
  try {
    const raw = localStorage.getItem(MODULE_COMPLETION_KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    return ids
      .map((id) => MODULE_ORDER.indexOf(id))
      .filter((i) => i >= 0)
      .map((i) => i + 1);
  } catch (error) {
    console.error('Failed to read causation module completion:', error);
    return [];
  }
}

const CausationStation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = React.useState<CSView>('dashboard');
  const [selectedModule, setSelectedModule] = React.useState<Module | null>(null);
  const [completedDays, setCompletedDays] = React.useState<number[]>(() => readCompletedModuleDays());
  const [showOnboarding, setShowOnboarding] = React.useState(false);
  const [showLauncher, setShowLauncher] = React.useState(true);

  React.useEffect(() => {
    if (!localStorage.getItem(ONBOARDING_SEEN_KEY)) {
      setShowOnboarding(true);
      localStorage.setItem(ONBOARDING_SEEN_KEY, 'true');
    }
  }, []);

  // Refresh completion when a module finishes (same-tab event) or another tab
  // writes (storage event), and whenever we return to a non-drill view.
  React.useEffect(() => {
    const refresh = () => setCompletedDays(readCompletedModuleDays());
    window.addEventListener('causation-module-complete', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('causation-module-complete', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  React.useEffect(() => {
    if (view !== 'drill') setCompletedDays(readCompletedModuleDays());
  }, [view]);

  // Mirror module completion to the student's classroom card so teachers see
  // in_progress / completed instead of a card that never moves.
  useBootcampProgress({
    bootcampId: 'causation-station',
    completedDays,
    totalDays: MODULE_ORDER.length,
  });

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  if (!user) return null;

  const handleStartDrill = (module: Module) => {
    setSelectedModule(module);
    setView('drill');
  };

  const handleEndDrill = () => {
    setSelectedModule(null);
    setView('dashboard');
  };

  const NavBtn: React.FC<{ target: CSView; icon: React.ReactNode; label: string }> = ({ target, icon, label }) => (
    <button
      onClick={() => { setSelectedModule(null); setView(target); }}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors duration-150',
        view === target
          ? 'text-punk-cyan drop-shadow-neon-cyan'
          : 'text-punk-sub hover:text-punk-text'
      )}
    >
      {icon}
      {label}
    </button>
  );

  if (showLauncher) {
    return <CSLauncher onEnter={() => setShowLauncher(false)} />;
  }

  return (
    <div className="cs-punk min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-punk-sub/20 bg-punk-base/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-y-2">
          <button
            onClick={() => navigate('/classroom')}
            className="flex items-center gap-1.5 text-sm text-punk-sub hover:text-punk-text transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Back to Classroom</span>
            <span className="sm:hidden">Classroom</span>
          </button>

          <div className="flex items-center gap-1 order-last w-full justify-center sm:order-none sm:w-auto sm:justify-start">
            <span className="text-[11px] uppercase tracking-[0.2em] text-punk-sub font-medium mr-3">Causation Station</span>
            {view !== 'drill' && (
              <nav className="flex items-center gap-1 bg-punk-panel/50 backdrop-blur-sm border border-punk-sub/20 rounded-full px-1 py-1">
                <NavBtn target="dashboard" icon={<Zap className="w-3.5 h-3.5" />} label="Dashboard" />
                <NavBtn target="flashcards" icon={<Layers className="w-3.5 h-3.5" />} label="Flashcards" />
                <NavBtn target="journal" icon={<StickyNote className="w-3.5 h-3.5" />} label="Journal" />
              </nav>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <CSStudyTimer />
            <button
              onClick={() => setShowOnboarding(true)}
              className="flex items-center text-punk-sub hover:text-punk-text transition-colors p-1.5"
              aria-label="Replay intro"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <LogoutButton />
          </div>
        </div>
      </header>

      {showOnboarding && <CSOnboardingGuide onClose={() => setShowOnboarding(false)} />}

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {view === 'dashboard' && (
          <CSDashboard onStartDrill={handleStartDrill} onReplayIntro={() => setShowOnboarding(true)} />
        )}
        {view === 'drill' && selectedModule && (
          <CSDrillPlayer module={selectedModule} onEndDrill={handleEndDrill} />
        )}
        {view === 'flashcards' && <CSFlashcards />}
        {view === 'journal' && <CSJournal />}
      </main>
    </div>
  );
};

export default CausationStation;
