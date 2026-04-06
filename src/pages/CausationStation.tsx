import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Layers, StickyNote, Zap } from 'lucide-react';
import { Module } from '@/data/causationStation/constants';
import CSDashboard from '@/components/bootcamp/CSDashboard';
import CSDrillPlayer from '@/components/bootcamp/CSDrillPlayer';
import CSFlashcards from '@/components/bootcamp/CSFlashcards';
import CSJournal from '@/components/bootcamp/CSJournal';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import { cn } from '@/lib/utils';

type CSView = 'dashboard' | 'drill' | 'flashcards' | 'journal';

const CausationStation: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = React.useState<CSView>('dashboard');
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

  const NavBtn: React.FC<{ target: CSView; icon: React.ReactNode; label: string }> = ({ target, icon, label }) => (
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
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/classroom')}
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Classroom
          </button>

          <div className="flex items-center gap-1">
            <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium mr-3">Causation Station</span>
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

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {view === 'dashboard' && (
          <CSDashboard onStartDrill={handleStartDrill} />
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
