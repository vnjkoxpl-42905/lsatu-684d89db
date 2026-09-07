import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { recoverPendingRecordings, recoverPendingRows } from "../recall/recoverRecordings";
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
 * Starting an Attempt navigates to that Attempt's own assignment and opens the
 * recorder immediately. The library already shows the complete instructions;
 * repeating them on a second page made Start look as though it had not opened
 * the drill at all.
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
        onStart={(id) => navigate(`/activities/${id}`, { state: { startSection: true } })}
        onOpenAttempt={(id) => navigate(`/activities/${id}`)}
      />
    </SectionLibraryLaunch>
  );
}
