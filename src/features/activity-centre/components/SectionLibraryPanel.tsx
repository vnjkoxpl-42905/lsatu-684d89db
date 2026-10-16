import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { recoverPendingRecordings, recoverPendingRows } from "../recall/recoverRecordings";
import { useStudentActivities } from "../hooks/useStudentActivities";
import { SectionLibrary } from "./SectionLibrary";
import { SectionLibraryLaunch } from "./SectionLibraryLaunch";
import { SectionProgress } from "./SectionProgress";
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
  showProgress = true,
  compact = false,
}: {
  onExit?: () => void;
  title?: string;
  subtitle?: string | null;
  /** Hide aggregate history when Reading Progress is available in the host. */
  showProgress?: boolean;
  /** Use the shorter introduction inside the Reading Center workspace. */
  compact?: boolean;
  /**
   * The drill's own briefing. Defaults to the authored section instructions
   * because the door is not a section and carries no snapshot of its own, and
   * the method it describes is the same one every section is run by.
   */
  instructions?: ActivityInstructions;
}) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { assignments } = useStudentActivities();

  /*
   * Send up anything a previous run left on this machine.
   *
   * The runner already does this on the way into an Attempt, which only helps
   * a student who starts another one. This is the door she actually comes back
   * through, so a recording or a set of answers stranded by a crash goes up as
   * soon as she opens the drill -- and is markable from that moment. Silent and
   * best-effort: a failed pass must never keep this page from opening.
   */
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    void (async () => {
      try {
        await recoverPendingRecordings(user.id);
        if (cancelled) return;
        await recoverPendingRows(user.id);
      } catch {
        // Nothing to say here. The next open tries again.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  return (
    <SectionLibraryLaunch
      title={title}
      subtitle={subtitle}
      instructions={instructions ?? (sectionInstructions as unknown as ActivityInstructions)}
      onExit={onExit}
      compact={compact}
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
      {showProgress && <SectionProgress onOpen={(id) => navigate(`/reading-center/rrc/attempt/${id}`)} />}

      <SectionLibrary
        attempts={assignments}
        onStart={(id) => navigate(`/reading-center/rrc/attempt/${id}`, { state: { startSection: true } })}
        onOpenAttempt={(id) => navigate(`/reading-center/rrc/attempt/${id}`)}
      />
    </SectionLibraryLaunch>
  );
}
