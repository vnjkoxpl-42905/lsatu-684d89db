import { useNavigate } from "react-router-dom";
import { useStudentActivities } from "../hooks/useStudentActivities";
import { SectionLibrary } from "./SectionLibrary";
import { SectionLibraryLaunch } from "./SectionLibraryLaunch";
import sectionInstructions from "../content/read-recall-colour-section.instructions.json";
import type { ActivityInstructions } from "../api/types";

/**
 * The section list, wired to her own record and to the router.
 *
 * `SectionLibrary` stays pure so it can be rendered in a test without a session
 * or a router. This is the half that knows about both.
 *
 * Starting an Attempt navigates to that Attempt's own assignment, which shows
 * the instructions before it runs. That is deliberate: the instructions are the
 * same for every section and she sees them every time she starts one, rather
 * than once when the drill was first assigned.
 */
export function SectionLibraryPanel({
  onExit,
  title = "Read, Recall, Colour",
  subtitle = null,
  instructions,
}: {
  onExit?: () => void;
  title?: string;
  subtitle?: string | null;
  /**
   * The drill's own briefing. Defaults to the authored section instructions
   * because the door is not a section and carries no snapshot of its own, and
   * the method it describes is the same one every section is run by.
   */
  instructions?: ActivityInstructions;
}) {
  const navigate = useNavigate();
  const { assignments } = useStudentActivities();

  return (
    <SectionLibraryLaunch
      title={title}
      subtitle={subtitle}
      instructions={instructions ?? (sectionInstructions as unknown as ActivityInstructions)}
      onExit={onExit}
    >
      {/*
        * Starting and reopening are the same navigation, on purpose.
        *
        * An Attempt IS its assignment, so its Report Card is at the
        * assignment's own address -- which is what makes a past Attempt
        * reachable from any device at any later date rather than only from
        * the tab that produced it. A completed section routes itself to the
        * card rather than to the runner.
        */}
      <SectionLibrary
        attempts={assignments}
        onStart={(id) => navigate(`/activities/${id}`)}
        onOpenAttempt={(id) => navigate(`/activities/${id}`)}
      />
    </SectionLibraryLaunch>
  );
}
