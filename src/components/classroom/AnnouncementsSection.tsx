import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Megaphone } from 'lucide-react';
import { ClassroomSection, EmptyHint } from './ClassroomSection';
import type { ClassroomItem } from '@/hooks/useClassroomItems';

interface Props {
  items: ClassroomItem[];
}

export function AnnouncementsSection({ items }: Props) {
  const navigate = useNavigate();
  const announcements = items
    .filter((i) => i.type === 'announcement' || i.type === 'note')
    .slice(0, 4);

  return (
    <ClassroomSection title="From Joshua">
      {announcements.length === 0 ? (
        <EmptyHint>No new posts. Joshua will reach out here when needed.</EmptyHint>
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => navigate(`/classroom/item/${encodeURIComponent(a.id)}`)}
              className="w-full flex items-start gap-3 px-4 py-3 rounded-lg border border-border/60 bg-card/30 hover:bg-card/70 hover:border-border transition ease-out active:scale-[0.98] text-left"
            >
              <Megaphone className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium truncate">{a.title}</div>
                {a.description && (
                  <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {a.description}
                  </div>
                )}
                <div className="text-[10px] text-muted-foreground mt-1.5">
                  {format(new Date(a.created_at), 'MMM d')}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </ClassroomSection>
  );
}
