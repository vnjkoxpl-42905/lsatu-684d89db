import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Beaker, Brain } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';
import InteractiveStemDrill from './InteractiveStemDrill';
import AdvancedQuizViewer from './AdvancedQuizViewer';
import { stemDrills, roleQuestions } from './data';

type ModuleId = 'stem-drill' | 'advanced-quiz';

const MODULES: { id: ModuleId; title: string; subtitle: string; icon: React.ElementType; total: number }[] = [
  { id: 'stem-drill', title: '01. The De-Abstraction Lab', subtitle: '15 Exercises', icon: Beaker, total: stemDrills.length },
  { id: 'advanced-quiz', title: '02. Advanced Application', subtitle: '6 Questions', icon: Brain, total: roleQuestions.length },
];

export default function AbstractionBootcamp() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>('stem-drill');
  const [progress, setProgress] = useState<Record<ModuleId, number>>({ 'stem-drill': 0, 'advanced-quiz': 0 });

  // Auth check bypassed for local dev
  // React.useEffect(() => {
  //   if (!user) navigate('/auth');
  // }, [user, navigate]);

  const handleProgress = (moduleId: ModuleId) => (count: number) => {
    setProgress(prev => ({ ...prev, [moduleId]: count }));
  };

  const totalDone = progress['stem-drill'] + progress['advanced-quiz'];
  const totalItems = stemDrills.length + roleQuestions.length;
  const overallProgress = Math.round((totalDone / totalItems) * 100);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="px-4 lg:px-8 py-4 flex items-center justify-between max-w-7xl mx-auto">
          <Button variant="ghost" size="sm" onClick={() => navigate('/bootcamps')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-accent -ml-2">
            <ArrowLeft className="h-3.5 w-3.5" />
            Bootcamps
          </Button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">Abstract</span>
          <div className="flex items-center gap-2">
            <LogoutButton />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-72 border-r border-border p-6 sticky top-[65px] h-[calc(100vh-65px)] overflow-y-auto">
          <div className="space-y-1 mb-6">
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">Abstract</p>
            <p className="text-[10px] text-muted-foreground">Progress: {overallProgress}%</p>
            <div className="w-full h-1.5 bg-accent rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${overallProgress}%` }} />
            </div>
          </div>
          <nav className="space-y-2">
            {MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const done = progress[mod.id];
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    isActive
                      ? 'border-primary/30 bg-primary/5'
                      : 'border-transparent hover:bg-accent'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-semibold truncate ${isActive ? 'text-primary' : 'text-foreground'}`}>{mod.title}</p>
                      <p className="text-[10px] text-muted-foreground">{mod.subtitle} · {done}/{mod.total}</p>
                    </div>
                  </div>
                  <div className="mt-2 w-full h-1 bg-accent rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${mod.total > 0 ? (done / mod.total) * 100 : 0}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Tab Bar */}
        <div className="lg:hidden sticky top-[65px] z-10 bg-background border-b border-border">
          <div className="flex">
            {MODULES.map(mod => {
              const isActive = activeModule === mod.id;
              const Icon = mod.icon;
              return (
                <button
                  key={mod.id}
                  onClick={() => setActiveModule(mod.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-semibold transition-colors border-b-2 ${
                    isActive ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{mod.id === 'stem-drill' ? 'De-Abstraction Lab' : 'Advanced Quiz'}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-8 max-w-3xl">
          {activeModule === 'stem-drill' && (
            <InteractiveStemDrill onComplete={handleProgress('stem-drill')} />
          )}
          {activeModule === 'advanced-quiz' && (
            <AdvancedQuizViewer onComplete={handleProgress('advanced-quiz')} />
          )}
        </main>
      </div>
    </div>
  );
}
