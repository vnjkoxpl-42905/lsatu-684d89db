import { useNavigate } from "react-router-dom";
import { useStudentActivities } from "../hooks/useStudentActivities";
import { SectionLibrary } from "./SectionLibrary";
import { ActivityExitButton } from "./ActivityExitButton";

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
export function SectionLibraryPanel({ onExit }: { onExit?: () => void }) {
  const navigate = useNavigate();
  const { assignments } = useStudentActivities();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Out loud
          </p>
          <h1 className="mt-2 text-2xl font-medium text-foreground">Read, Recall, Colour</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a section. Three a day is the rhythm, and nothing here disappears once you have
            done it.
          </p>
        </div>
        {onExit && <ActivityExitButton onExit={onExit} />}
      </div>

      <div className="mt-8">
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
      </div>
    </div>
  );
}
