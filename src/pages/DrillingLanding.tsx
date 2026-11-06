import * as React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Puzzle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import AssignedWorkPanel from "@/components/mainhub/AssignedWorkPanel";
import { listStandaloneDrillRuns } from "@/lib/drillRunLedger";
import { getSessionAttempts, listSessions } from "@/features/rc/api/rcProgress";
import { loadAllIndexPassages } from "@/features/rc/lib/rcBank";
import { loadDrillResumeSession } from "@/lib/drillResumeSession";
import {
  buildStandaloneDrillHistory,
  type StandaloneDrillHistoryItem,
} from "@/lib/standaloneDrillHistory";

/** How many unfinished drills the Continue Drilling list shows. */
const CONTINUE_DRILLING_LIMIT = 5;

/**
 * Unfinished drills, newest first, LR and RC together. Each row's `continueTo`
 * is the same link the old "In progress" tab used, so Continue reopens the
 * drill at the exact question with the saved answers (LR: the saved run; RC:
 * the saved session and its draft answers). Nothing here re-stores progress.
 */
async function loadContinueDrilling(userId: string): Promise<StandaloneDrillHistoryItem[]> {
  const [lr, allRc, smartDrill, indexPassages] = await Promise.all([
    listStandaloneDrillRuns(userId),
    listSessions(),
    loadDrillResumeSession(userId, "drill::adaptive"),
    // Titles are a nicety: without the index the rows keep their generic names.
    loadAllIndexPassages().catch(() => []),
  ]);
  const rc = allRc.filter(
    (session) =>
      session.userId === userId &&
      session.status === "in_progress" &&
      !session.config.practiceTestRunId &&
      !session.config.timedSectionSittingId &&
      session.config.source !== "assignment",
  );
  const attempts = await Promise.all(
    rc.map(async (session) => [session.id, await getSessionAttempts(session.id).catch(() => [])] as const),
  );
  const names = new Map(
    indexPassages.map(
      (p) => [p.passageId, { preptest: p.preptest, section: p.section, setNumber: p.setNumber, title: p.title }] as const,
    ),
  );
  return buildStandaloneDrillHistory(lr, rc, new Map(attempts), smartDrill, names, rc)
    .filter((run) => run.status === "in_progress")
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, CONTINUE_DRILLING_LIMIT);
}

function DrillCard({
  title,
  blurb,
  tone,
  icon,
  onClick,
}: {
  title: string;
  blurb: string;
  tone: "rc" | "lr";
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tone={tone}
      className="group flex flex-col items-start gap-3 rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-background" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span className="block text-lg font-semibold">{title}</span>
        <span className="mt-1 block text-sm text-muted-foreground">{blurb}</span>
      </span>
    </button>
  );
}

/**
 * The Drilling page: two cards to start a drill, and the drills the student
 * left unfinished underneath. Same shape as LexPrep's Drilling page.
 */
export default function DrillingLanding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [runs, setRuns] = React.useState<StandaloneDrillHistoryItem[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [revision, retry] = React.useReducer((n: number) => n + 1, 0);

  React.useEffect(() => {
    if (!user?.id) return;
    let active = true;
    setRuns(null);
    setError(null);
    loadContinueDrilling(user.id).then(
      (loaded) => { if (active) setRuns(loaded); },
      (e: unknown) => { if (active) setError(e instanceof Error ? e.message : "Your drills could not be loaded."); },
    );
    return () => { active = false; };
  }, [user?.id, revision]);

  return (
    <div className="mx-auto flex w-full max-w-[71.25rem] flex-col gap-8 px-1 py-6 pb-12" data-testid="drilling-landing">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">Drilling</h1>
          <p className="mt-2 text-sm text-muted-foreground">Improve LSAT performance with practice drills for each section.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => navigate("/practice/drills?view=saved")}>
          My Drills
          <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
        </Button>
      </header>

      <section aria-labelledby="new-drill-heading">
        <h2 id="new-drill-heading" className="text-base font-semibold">New Drill</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <DrillCard
            tone="rc"
            title="New RC Drill"
            blurb="Create and configure a new RC Drill"
            icon={<BookOpen className="h-4 w-4" />}
            onClick={() => navigate("/practice/drills?section=rc&view=create")}
          />
          <DrillCard
            tone="lr"
            title="New LR Drill"
            blurb="Create and configure a new LR Drill"
            icon={<Puzzle className="h-4 w-4" />}
            onClick={() => navigate("/practice/drills?section=lr&view=create")}
          />
        </div>
      </section>

      <section aria-labelledby="continue-drilling-heading">
        <h2 id="continue-drilling-heading" className="text-base font-semibold">Continue Drilling</h2>
        <div className="mt-3 rounded-xl border border-dashed border-border p-4 sm:p-6">
          {error ? (
            <div role="alert" className="flex flex-wrap items-center gap-3 text-sm">
              <span>{error}</span>
              <Button size="sm" variant="outline" onClick={retry}>Try again</Button>
            </div>
          ) : runs === null ? (
            <p role="status" className="text-sm text-muted-foreground">Loading drills…</p>
          ) : runs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground">
              You don&apos;t have any in-progress drills. Start a new drill above to begin practicing.
            </p>
          ) : (
            <ul className="space-y-3">
              {runs.map((run) => (
                <li key={run.key} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="min-w-0">
                    <p className="font-medium">{run.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {run.section === "rc" ? "RC" : "LR"} · {run.detail} · {new Date(run.date).toLocaleDateString()}
                    </p>
                  </div>
                  <Button size="sm" onClick={() => navigate(run.continueTo)}>Continue</Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <AssignedWorkPanel drillReturnTo="/practice/drills" />
    </div>
  );
}
