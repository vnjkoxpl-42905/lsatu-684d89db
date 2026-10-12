import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import type { ClassroomItem } from '@/hooks/useClassroomItems';
import { resolveItemRoute } from '@/lib/classroomItems';

interface Props {
  item: ClassroomItem | null;
}

const VERB_BY_STATUS: Record<string, string> = {
  assigned: 'Start',
  in_progress: 'Continue',
  completed: 'Review',
  draft: 'Open',
  archived: 'Open',
};

const TYPE_LABEL: Record<string, string> = {
  bootcamp_module: 'Bootcamp',
  session_recap: 'Recap',
  announcement: 'From Joshua',
  note: 'From Joshua',
  homework: 'Homework',
  ta_assignment: 'TA assignment',
  drill: 'Drill',
  activity: 'Activity',
};

export function DoThisNextCard({ item }: Props) {
  const navigate = useNavigate();

  if (!item) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/30 px-5 py-6">
        <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 font-semibold">
          <Sparkles className="w-3.5 h-3.5" aria-hidden />
          Do this next
        </div>
        <h3 className="mt-2 text-base font-medium leading-snug text-foreground/60">
          Nothing assigned yet
        </h3>
        <p className="mt-1 text-sm text-muted-foreground/70 leading-relaxed">
          When Joshua assigns work or publishes a weekly plan, your next step shows up here.
        </p>
      </div>
    );
  }

  const route = resolveItemRoute(item);
  const verb = VERB_BY_STATUS[item.status] ?? 'Open';

  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-5 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">
            Do this next
          </div>
          <h3 className="text-lg font-bold leading-snug text-foreground text-balance">{item.title}</h3>
          {item.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">{item.description}</p>
          )}
          <div className="flex items-center flex-wrap gap-3 text-[11px] text-muted-foreground pt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted/60 text-foreground/70">
              {TYPE_LABEL[item.type] ?? item.type.replace(/_/g, ' ')}
            </span>
            {item.due_at && (
              <span>Due {format(new Date(item.due_at), 'MMM d')}</span>
            )}
            {item.unlock_at && new Date(item.unlock_at) > new Date() && (
              <span>Unlocks {format(new Date(item.unlock_at), 'MMM d')}</span>
            )}
          </div>
        </div>
        {route && (
          <Button
            onClick={() => navigate(route)}
            size="sm"
            className="shrink-0"
          >
            {verb}
            <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        )}
      </div>
    </div>
  );
}
