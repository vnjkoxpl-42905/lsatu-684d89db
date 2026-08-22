import { useMemo, useState } from 'react';
import { BarChart3, Play, Plus, Send, Sparkles } from 'lucide-react';
import { useHubStudents } from '@/hooks/useHubStudents';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { openRoute } from '@/lib/utils';
import { LibraryViews, type LibraryItem } from '@/components/teacher/desk/library/LibraryViews';
import type { LibraryView } from '@/hooks/useDeskLibraryView';
import type { AssignWorkSheetItem } from '@/components/teacher/library/AssignWorkSheet';
import {
  useAdminActivities,
  ActivityResults,
  type Activity,
} from '@/features/activity-centre';

/**
 * One Activity, in the shape the one assign flow wants. Activities go through
 * the same sheet as drills and homework so a mixed bundle ships as a single
 * assignment event rather than as two separate pings to the same student.
 */
function sheetItem(activity: Activity): AssignWorkSheetItem {
  return {
    item: { kind: 'activity', activityId: activity.id },
    title: activity.title,
    kindLabel: 'Activity',
  };
}

export function DeskLibraryActivitiesSurface({
  view,
  onAssign,
  onBundle,
}: {
  view: LibraryView;
  onAssign: (item: AssignWorkSheetItem) => void;
  onBundle: (item: AssignWorkSheetItem) => void;
}) {
  const { activities, loading, error } = useAdminActivities();
  const [resultsFor, setResultsFor] = useState<Activity | null>(null);

  return (
    <section className="flex h-full w-full flex-col">
      <header className="shrink-0 border-b border-black/10 px-6 py-4">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-teacher-accent" />
          <h2 className="text-base font-semibold text-black">Activities</h2>
        </div>
        <p className="mt-0.5 text-xs text-black/55">
          Coach-led skill exercises. Assign one to a student and they work it with immediate feedback.
        </p>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        {loading && <p className="text-xs text-black/45">Loading activities…</p>}
        {error && <p className="text-xs text-rose-700">Could not load activities: {error}</p>}
        {!loading && !error && activities.length === 0 && (
          <div className="border border-dashed border-black/15 bg-white/30 px-6 py-12 text-center text-sm text-black/45">
            No activities yet.
          </div>
        )}

        {activities.length > 0 && (
          <LibraryViews
            view={view}
            items={activities.map((a): LibraryItem => ({
              id: a.id,
              title: a.title,
              subtitle: a.subtitle,
              meta: (
                <span className="tabular-nums text-black/45">
                  {a.items.length} items · {a.item_format}
                </span>
              ),
              actions: (
                <ActivityActions
                  activity={a}
                  onAssign={() => onAssign(sheetItem(a))}
                  onBundle={() => onBundle(sheetItem(a))}
                  onResults={() => setResultsFor(a)}
                />
              ),
            }))}
          />
        )}
      </div>

      <ActivityResultsSheet activity={resultsFor} onClose={() => setResultsFor(null)} />
    </section>
  );
}

function ActivityActions({
  activity,
  onAssign,
  onBundle,
  onResults,
}: {
  activity: Activity;
  onAssign: () => void;
  onBundle: () => void;
  onResults: () => void;
}) {
  // Preview: run the activity DEFINITION, writing nothing. It used to
  // self-assign, which is how activities Joshua only opened to look at ended up
  // on his own Classroom's "Assigned to you" list. The old row-reuse dance
  // existed only to stop those piling up; with no row there is nothing to pile.
  const handleOpen = () => {
    openRoute(`/activities/preview/${activity.id}`);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="inline-flex items-center gap-1.5 border border-black/15 bg-white/40 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black disabled:opacity-50"
      >
        <Play className="h-3 w-3" /> Open
      </button>
      <button
        type="button"
        onClick={onResults}
        title="See who has done this activity"
        aria-label={`See results for ${activity.title}`}
        className="inline-flex items-center gap-1.5 border border-black/15 bg-white/40 px-2.5 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
      >
        <BarChart3 className="h-3 w-3" /> Results
      </button>
      <button
        type="button"
        onClick={onBundle}
        title="Add to the assign bundle"
        aria-label={`Add ${activity.title} to the assign bundle`}
        className="ml-auto inline-flex items-center gap-1 border border-black/15 bg-white/40 px-2 py-1 text-xs font-semibold text-black/65 transition hover:border-black/35 hover:text-black"
      >
        <Plus className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onAssign}
        className="inline-flex items-center gap-1.5 border border-teacher-accent/40 bg-teacher-accent/15 px-2.5 py-1 text-xs font-semibold text-teacher-accent-strong transition hover:bg-teacher-accent/25"
      >
        <Send className="h-3 w-3" /> Assign
      </button>
    </>
  );
}

function ActivityResultsSheet({
  activity,
  onClose,
}: {
  activity: Activity | null;
  onClose: () => void;
}) {
  const { rows: students } = useHubStudents();

  const nameFor = useMemo(() => {
    const byId = new Map(students.map((s) => [s.class_id, s.display_name]));
    return (studentId: string) => byId.get(studentId) || 'Unnamed student';
  }, [students]);

  return (
    <Sheet open={!!activity} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Results: {activity?.title}</SheetTitle>
        </SheetHeader>
        {activity && (
          <div className="mt-4">
            <ActivityResults activityId={activity.id} nameFor={nameFor} />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

export default DeskLibraryActivitiesSurface;
