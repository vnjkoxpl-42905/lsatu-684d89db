import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { BookOpen, ArrowRight } from 'lucide-react';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

interface Props {
  items: ClassroomItem[];
}

export function RecapsSection({ items }: Props) {
  const navigate = useNavigate();
  const recaps = items.filter(
    (i) => i.type === 'session_recap' || i.type === 'smartboard_recap',
  );

  return (
    <ClassroomSection title="Session recaps">
      {recaps.length === 0 ? (
        <EmptyHint>Recaps from your sessions with Joshua will show up here.</EmptyHint>
      ) : (
        <ul className="space-y-1.5">
          {recaps.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => navigate(`/classroom/item/${encodeURIComponent(r.id)}`)}
                className="group w-full flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition ease-out active:scale-[0.98] text-left"
              >
                <BookOpen className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-100" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </ClassroomSection>
  );
}
