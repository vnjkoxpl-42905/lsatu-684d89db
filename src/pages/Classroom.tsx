import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ClipboardList } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { LogoutButton } from '@/components/LogoutButton';

function IL({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium select-none">
      {children}
    </span>
  );
}

export default function Classroom() {
  const navigate = useNavigate();
  const { user } = useAuth();

  React.useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

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
          <IL>Classroom</IL>
          <LogoutButton />
          <ThemeToggle />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-24 flex justify-center">
        <div className="text-center space-y-3 max-w-md">
          <ClipboardList
            className="h-10 w-10 text-muted-foreground/40 mx-auto"
            strokeWidth={1.25}
          />
          <h2 className="text-base font-medium text-foreground/90">
            No assignments yet
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            When Joshua sends you assignments or materials, they&rsquo;ll appear here.
          </p>
        </div>
      </main>
    </div>
  );
}
