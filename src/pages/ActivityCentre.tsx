import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentActivities } from "@/features/activity-centre";
import { ActivityCard } from "@/features/activity-centre/components/ActivityCard";
import { librarySortIndex } from "@/features/activity-centre/content";
import { slugFromTitle } from "@/features/activity-centre/worlds/registry";
import "@/features/activity-centre/activity-centre.css";

/**
 * Student home for the Activity Centre: the list of assigned Activities.
 *
 * Ordered by the teaching progression, the scope of text each skill works on,
 * a word up to a passage. It used to sort by status and then by seed date,
 * which put the passage-level Activity first and the word-level one near the
 * bottom: the curriculum's own argument, backwards. `librarySortIndex` already
 * held that order for the teacher's library; the student list simply never
 * asked for it.
 *
 * Each card carries the world it opens into. Eight Activities rendered as eight
 * identical rows read as one undifferentiated list, which is the wrong
 * impression when every one of them is a different place.
 */
export default function ActivityCentre() {
  const navigate = useNavigate();
  const { assignments, loading, error } = useStudentActivities();

  const ordered = useMemo(
    () =>
      [...assignments].sort(
        (a, b) => librarySortIndex(slugFromTitle(a.title)) - librarySortIndex(slugFromTitle(b.title)),
      ),
    [assignments],
  );

  return (
    // No back link of its own: the classroom rail is the way back, and it was
    // pointing at /foyer, which only redirects to /classroom anyway. One name
    // for this surface too, not "Activity Centre" over "Your activities".
    <div className="activity-centre">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <h1 className="ac-display text-4xl text-foreground">Activities</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Coach-led skill exercises, ordered by how much text each one works on: a single word
            first, a whole passage last.
          </p>
        </header>

        <div className="mt-8">
          {loading && (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
            </div>
          )}

          {!loading && error && (
            <p className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
              Could not load your activities: {error}
            </p>
          )}

          {!loading && !error && ordered.length === 0 && (
            <div className="rounded-[24px] border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No activities assigned yet. Your instructor will add them here.
              </p>
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-2">
            {ordered.map((a, i) => (
              <ActivityCard
                key={a.id}
                assignment={a}
                position={i + 1}
                onOpen={() => navigate(`/activities/${a.id}`)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
