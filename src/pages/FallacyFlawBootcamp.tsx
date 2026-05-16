import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Layers, StickyNote, Zap } from 'lucide-react';
import { Module } from '@/data/fallacyFlaw/constants';
import FFDashboard from '@/components/bootcamp/FFDashboard';
import FFDrillPlayer from '@/components/bootcamp/FFDrillPlayer';
import FFFlashcards from '@/components/bootcamp/FFFlashcards';
import FFJournal from '@/components/bootcamp/FFJournal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';

type FFView = 'dashboard' | 'drill' | 'flashcards' | 'journal';

const FallacyFlawBootcamp: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = React.useState<FFView>('dashboard');
  const [selectedModule, setSelectedModule] = React.useState<Module | null>(null);

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

  const NavBtn: React.FC<{ target: FFView; icon: React.ReactNode; label: string }> = ({ target, icon, label }) => (
    <button
      onClick={() => { setSelectedModule(null); setView(target); }}
      className={cn(
        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors duration-150',
        view === target
          ? 'bg-accent text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
      )}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/bootcamps')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Bootcamps
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mr-3">Flaw &amp; Famous Flaws</span>
            {view !== 'drill' && (
              <nav className="flex items-center gap-1">
                <NavBtn target="dashboard" icon={<Zap className="w-3.5 h-3.5" />} label="Drills" />
                <NavBtn target="flashcards" icon={<Layers className="w-3.5 h-3.5" />} label="Flashcards" />
                <NavBtn target="journal" icon={<StickyNote className="w-3.5 h-3.5" />} label="Journal" />
              </nav>
            )}
          </div>

          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {view === 'dashboard' && (
          <FFDashboard onStartDrill={handleStartDrill} />
        )}
        {view === 'drill' && selectedModule && (
          <FFDrillPlayer module={selectedModule} onEndDrill={handleEndDrill} />
        )}
        {view === 'flashcards' && <FFFlashcards />}
        {view === 'journal' && <FFJournal />}
      </main>
    </div>
  );
};

export default FallacyFlawBootcamp;
