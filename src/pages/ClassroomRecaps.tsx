import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useClassroomItems } from '@/hooks/useClassroomItems';

export default function ClassroomRecaps() {
  const navigate = useNavigate();
  const { data: items = [] } = useClassroomItems();
  const recaps = items.filter(
    (i) => i.type === 'session_recap' || i.type === 'smartboard_recap',
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b border-border bg-background/85 backdrop-blur">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/classroom')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Classroom
          </Button>
          <div className="flex items-center gap-2 ml-auto text-foreground">
            <BookOpen className="w-4 h-4" />
            <span className="text-sm font-semibold tracking-tight">Session recaps</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {recaps.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No recaps yet. Joshua will post recaps after sessions.
          </div>
        ) : (
          <ul className="space-y-2">
            {recaps.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/classroom/item/${encodeURIComponent(r.id)}`)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 transition-colors text-left"
                >
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{r.title}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {format(new Date(r.created_at), 'MMM d, yyyy')}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
