import { useOrientation, OrientationCardView } from "@/components/classroom/OrientationCard";
import AnnouncementBanner from "@/components/classroom/AnnouncementBanner";
import ClassroomHome from "@/components/classroom/home/ClassroomHome";
import LockedModule from "@/components/LockedModule";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useReadingCenterAccess } from '@/hooks/useReadingCenterAccess';
import AssignedReadingCenterLink from '@/components/classroom/AssignedReadingCenterLink';

/**
 * The classroom home: the student dashboard.
 *
 * One screen that answers, in order, what to do now, what is assigned, whether
 * the coach said anything, when the next session is, and what the week holds.
 *
 * Except before setup is finished. Then the intake owns the whole stage: a
 * student answering questions about their week should not be reading a week
 * they have not built yet, and the old split showed both at once. They begin
 * from the invitation, walk the questions one at a time, and the classroom
 * appears behind them when they are done.
 *
 * And except when access has been revoked. The /classroom route admits any
 * signed-in student so a locked account still has somewhere to land, but the
 * dashboard itself lists assigned work, notes and recaps, which is exactly
 * what has_classroom_access buys. Without the flag the stage shows the same
 * locked notice every other door shows.
 */
export default function Classroom() {
  const { loaded, completed, setCompleted, name, answers, save } = useOrientation();
  const permissions = useUserPermissions();
  const readingCenter = useReadingCenterAccess();

  // Nothing until the profile read lands: drawing the home first and swapping
  // it for the intake a beat later is worse than a moment of quiet.
  if (!loaded) return null;

  if (!completed) {
    return (
      <OrientationCardView
        initialName={name}
        initialAnswers={answers}
        onSave={save}
        onDone={() => setCompleted(true)}
        startCollapsed
      />
    );
  }

  if (permissions.loading) return <div role="status">Checking workspace access…</div>;

  if (!permissions.loading && !permissions.is_admin && !permissions.has_classroom_access) {
    if (readingCenter.isPending) return <div role="status">Checking assigned work…</div>;
    if (readingCenter.allowed) return <section className="mx-auto max-w-xl space-y-4 p-6">
      <h1 className="text-2xl font-semibold">Reading Center is assigned to you</h1>
      <p>Open your reading library to practice, add articles, or pick up where you left off.</p>
      <AssignedReadingCenterLink label="Open Reading Center" />
    </section>;
    return <LockedModule />;
  }

  return (
    <>
      <AnnouncementBanner />
      <ClassroomHome />
    </>
  );
}
