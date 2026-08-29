import { useOrientation, OrientationCardView } from "@/components/classroom/OrientationCard";
import AnnouncementBanner from "@/components/classroom/AnnouncementBanner";
import ClassroomHome from "@/components/classroom/home/ClassroomHome";

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
 */
export default function Classroom() {
  const { loaded, completed, setCompleted, name, answers, save } = useOrientation();

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

  return (
    <>
      <AnnouncementBanner />
      <ClassroomHome />
    </>
  );
}
