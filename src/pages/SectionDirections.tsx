import * as React from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { useStudentAssignment } from "@/hooks/useStudentAssignments";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { singleSectionOf } from "@/lib/drillRunSpec";
import { launchDrill } from "@/lib/drillLaunch";
import { SECTION_DIRECTIONS, sectionMinutes } from "@/lib/sectionDirections";
import { SectionDirectionsCard } from "@/components/drill/official/SectionDirectionsCard";
import "./section-directions.css";

/**
 * The screen before an assigned section, laid out the way LawHub lays out its
 * own: a white card on a blue-grey field, the section number, the clock, the
 * question count, the official directions, and one button.
 *
 * Nothing is timed here. The clock starts when GO TO QUESTIONS is pressed,
 * which is also when the assignment becomes "in progress", so a student who
 * opens this and walks away has lost nothing.
 *
 * It takes the whole screen on purpose. The Classroom rail and the list of
 * other work are exactly what a student should not be looking at in the
 * minute before a timed section.
 */
export default function SectionDirectionsPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();
  const { settings } = useUserSettings();
  const { assignment, loading, error } = useStudentAssignment(assignmentId);

  const section = React.useMemo(
    () => (assignment ? singleSectionOf(assignment.question_qids ?? []) : null),
    [assignment],
  );

  if (loading && !assignment) {
    return (
      <main className="section-directions" aria-busy="true">
        <p className="section-directions-status" role="status">
          Loading your section…
        </p>
      </main>
    );
  }

  if (error || !assignment || !assignmentId) {
    return (
      <main className="section-directions">
        <div className="section-directions-card">
          <h1 className="section-directions-title">Section not found</h1>
          <p className="section-directions-body">
            This assignment could not be loaded. Open your Classroom and try again from there.
          </p>
        </div>
        <button
          type="button"
          className="section-directions-go"
          onClick={() => navigate("/classroom")}
        >
          BACK TO CLASSROOM
        </button>
      </main>
    );
  }

  // Not one section (a mixed set, or a set that was edited after assigning):
  // the ordinary assignment page knows what to do with it.
  if (!section) {
    return <Navigate to={`/classroom/${encodeURIComponent(assignmentId)}`} replace />;
  }

  // Finished work is a record, not a door. Results live in History.
  if (assignment.status === "completed") {
    return <Navigate to="/history" replace />;
  }

  const minutes = sectionMinutes(settings.defaultTimingMode);
  const questionCount = assignment.question_qids.length;
  // Only LR sections are qid-shaped today; an RC assignment will arrive with
  // its own kind on the row rather than being inferred from a qid pattern.
  const directions = SECTION_DIRECTIONS.lr;

  const goToQuestions = () => {
    const timerMode =
      settings.defaultTimingMode === "35" ? undefined : settings.defaultTimingMode;
    const query = launchDrill({
      kind: "assignment",
      assignmentId,
      timerMode,
      options: { returnTo: "/classroom" },
    });
    navigate(`/drill?${query}`);
  };

  return (
    <main className="section-directions">
      <button
        type="button"
        className="section-directions-back"
        onClick={() => navigate("/classroom")}
      >
        ← Back to home
      </button>
      <SectionDirectionsCard
        sectionNumber={section.section}
        minutes={minutes}
        questionCount={questionCount}
        directions={directions}
      />
      <button
        type="button"
        className="section-directions-go"
        onClick={goToQuestions}
        autoFocus
      >
        GO TO QUESTIONS
      </button>
    </main>
  );
}
