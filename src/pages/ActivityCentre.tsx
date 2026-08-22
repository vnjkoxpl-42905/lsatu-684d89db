import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Send } from "lucide-react";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { AssignWorkSheet, type AssignWorkSheetItem } from "@/components/teacher/library/AssignWorkSheet";
import { useAdminActivities, useStudentActivities } from "@/features/activity-centre";
import type { Activity, ActivityAssignment } from "@/features/activity-centre";
import { ActivityCard } from "@/features/activity-centre/components/ActivityCard";
import { librarySortIndex } from "@/features/activity-centre/content";
import { slugFromTitle } from "@/features/activity-centre/worlds/registry";
import "@/features/activity-centre/activity-centre.css";

/**
 * The Activity Centre.
 *
 * For a student this is the list of Activities assigned to them, ordered by the
 * teaching progression: the scope of text each skill works on, a word up to a
 * passage. It used to sort by status and then by seed date, which put the
 * passage-level Activity first and the word-level one near the bottom, the
 * curriculum's own argument backwards.
 *
 * For an admin it is also the library. Assignment-gating is right for students
 * and was wrong for the person doing the assigning: the Centre showed him "No
 * activities assigned yet" while eight authored Activities sat in the table,
 * with the only way to open or assign one being the Teacher Desk. The library
 * below is admin-only, opens each Activity through the row-free preview, and
 * assigns through the same sheet every other assign surface uses.
 *
 * Each card carries the world it opens into. Eight Activities drawn as eight
 * identical rows read as one undifferentiated list, which is the wrong
 * impression when every one of them is a different place.
 */
export default function ActivityCentre() {
  const navigate = useNavigate();
  const { assignments, loading, error } = useStudentActivities();
  const { is_admin } = useUserPermissions();

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

          {/* An admin with nothing assigned is not an empty Centre, so the
              student's empty state would be telling him to wait for himself. */}
          {!loading && !error && ordered.length === 0 && !is_admin && (
            <div className="rounded-[24px] border border-dashed border-border bg-card p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No activities assigned yet. Your instructor will add them here.
              </p>
            </div>
          )}

          {ordered.length > 0 && (
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
          )}
        </div>

        {is_admin && <AdminLibrary assignedCount={ordered.length} />}
      </div>
    </div>
  );
}

/**
 * Every authored Activity, openable and assignable, for the one person who
 * needs to see the library rather than a list of what he has been given.
 *
 * Opening runs the preview route, which works off the Activity DEFINITION and
 * writes nothing: looking at an Activity must never put it on his own
 * Classroom. Assigning goes through AssignWorkSheet, the single assign pipeline
 * shared with drills and homework, so an Activity can ship in a mixed bundle as
 * one assignment event rather than as its own separate ping.
 */
function AdminLibrary({ assignedCount }: { assignedCount: number }) {
  const navigate = useNavigate();
  const { activities, loading, error } = useAdminActivities();
  const [sheetItems, setSheetItems] = useState<AssignWorkSheetItem[] | null>(null);

  const ordered = useMemo(
    () => [...activities].sort((a, b) => librarySortIndex(a.slug) - librarySortIndex(b.slug)),
    [activities],
  );

  return (
    <section className="mt-12 border-t border-border pt-8">
      <header className="max-w-2xl">
        <h2 className="ac-display text-2xl text-foreground">The library</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
          {assignedCount > 0
            ? "Every Activity you can assign. Open one to work it yourself; nothing you open here is recorded."
            : "Every Activity you can assign. Open one to work it yourself, or send it to a student. Nothing you open here is recorded."}
        </p>
      </header>

      {loading && (
        <div className="mt-6 flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
        </div>
      )}

      {!loading && error && (
        <p className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Could not load the library: {error}
        </p>
      )}

      {/* Zero rows here is a real failure, not an empty library: the Activities
          are seeded. It usually means this admin account cannot read the table. */}
      {!loading && !error && ordered.length === 0 && (
        <div className="mt-6 rounded-[24px] border border-dashed border-border bg-card p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No Activities came back. They are seeded, so this is a read failing rather than an empty
            library.
          </p>
        </div>
      )}

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        {ordered.map((activity, i) => (
          <div key={activity.id} className="flex flex-col gap-2">
            <ActivityCard
              assignment={asCard(activity)}
              position={i + 1}
              onOpen={() => navigate(`/activities/preview/${activity.id}`)}
            />
            <button
              type="button"
              onClick={() =>
                setSheetItems([
                  {
                    item: { kind: "activity", activityId: activity.id },
                    title: activity.title,
                    kindLabel: "Activity",
                  },
                ])
              }
              className="inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-border bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground"
            >
              <Send className="h-3 w-3" />
              Assign {activity.title}
            </button>
          </div>
        ))}
      </div>

      <AssignWorkSheet
        open={!!sheetItems}
        items={sheetItems ?? []}
        onClose={() => setSheetItems(null)}
      />
    </section>
  );
}

/**
 * An Activity definition in the shape the card draws.
 *
 * The card is written against an assignment because that is what a student
 * holds, and the two carry the same copy: title, subtitle, items. The status
 * fields are the honest defaults for a definition nobody has been given -- no
 * progress, no score -- so the card shows the item count and nothing it cannot
 * back up.
 */
function asCard(activity: Activity): ActivityAssignment {
  return {
    id: activity.id,
    activity_id: activity.id,
    student_id: "",
    title: activity.title,
    subtitle: activity.subtitle,
    instructions: activity.instructions,
    item_format: activity.item_format,
    items: activity.items,
    status: "assigned",
    score: null,
    started_at: null,
    completed_at: null,
    assigned_by: "",
    class_id: "",
    created_at: activity.created_at,
  };
}
