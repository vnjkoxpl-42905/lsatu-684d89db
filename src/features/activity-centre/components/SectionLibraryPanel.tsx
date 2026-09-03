import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStudentActivities } from "../hooks/useStudentActivities";
import { listMyRecentSectionGrades } from "../api/activitiesClient";
import { SectionLibrary } from "./SectionLibrary";
import { SectionRunHistory } from "./SectionRunHistory";
import { ActivityExitButton } from "./ActivityExitButton";
import type { SectionGradeStub } from "../api/types";

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
  /**
   * Her recent runs, for the shape of the week.
   *
   * The drill's own instruction is three a day, six if she can, and nothing in
   * the product knew she had done four. One Report Card cannot say whether she
   * is getting better; the pile of them can, and they were all already stored.
   * Loaded beside the list and never waited on: picking tonight's section does
   * not depend on it.
   */
  const [recent, setRecent] = useState<SectionGradeStub[]>([]);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await listMyRecentSectionGrades();
      if (!cancelled) setRecent(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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

      {recent.length > 0 && (
        <div className="mt-12 border-t border-border pt-8">
          <SectionRunHistory grades={recent} heading="How it has been going" />
        </div>
      )}
    </div>
  );
}
