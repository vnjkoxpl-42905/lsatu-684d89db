/**
 * One practice test, in progress.
 *
 * This page is the invigilator, not the exam. It says which section is next,
 * starts it, runs the break, reads each leg's result back out of the tables the
 * runners write, and scores the sitting at the end. Every actual question is
 * answered somewhere else, in the same runner the student uses outside a test.
 *
 * The result readback is deliberately conservative: a leg with no matching row
 * is reported as unfinished rather than scored as zero. A zero here would read
 * on the score report as "answered everything wrong", which is a different and
 * much more discouraging claim than "you walked away from section 2".
 */
import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import {
  formatPracticeTestClock,
  legLabel,
  loadPracticeTestRun,
  practiceTestPace,
  practiceTestRaw,
  practiceTestScaled,
  savePracticeTestRun,
  PRACTICE_TEST_BREAK_SECONDS,
  type PracticeTestRun as Run,
} from "@/lib/practiceTest";
import { lrLegLaunch, rcLegHref, readLegResult } from "@/lib/practiceTestRunner";
import "./testing-centre.css";

function mmss(seconds: number) {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * What a ticking clock says out loud.
 *
 * The digits change twice a second, and a live region wired straight to them
 * would talk over itself for ten minutes without pause. Coarse steps instead:
 * whole minutes while minutes remain, then ten-second steps inside the last
 * one. The string changes only when the step does, so the region speaks only
 * when there is something new to say.
 */
function breakAnnouncement(remaining: number): string {
  const seconds = Math.ceil(remaining);
  if (seconds <= 0) return "The break is over. Continue when you are ready.";
  if (seconds <= 60) return `${Math.ceil(seconds / 10) * 10} seconds of the break left.`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} of the break left.`;
}

/** The break, on its own clock. Skippable — it is a break, not a gate. */
function BreakScreen({ run, onDone }: { run: Run; onDone: () => void }) {
  const startedAt = run.breakStartedAt ? Date.parse(run.breakStartedAt) : Date.now();
  const [remaining, setRemaining] = React.useState(() =>
    Math.max(0, PRACTICE_TEST_BREAK_SECONDS - (Date.now() - startedAt) / 1000),
  );

  React.useEffect(() => {
    // Nothing left to count. The interval used to keep firing at 2Hz for as
    // long as the student sat on a finished break.
    if (remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, PRACTICE_TEST_BREAK_SECONDS - (Date.now() - startedAt) / 1000));
    }, 500);
    return () => window.clearInterval(id);
  }, [startedAt, remaining]);

  return (
    <div className="testing-panel">
      <h2 className="testing-heading">Break</h2>
      <div className="testing-score">
        {/* The digits are for the eye. Assistive tech gets the coarse
            announcement instead of a number that changes 1,200 times. */}
        <strong aria-hidden>{mmss(remaining)}</strong>
        <span aria-hidden>break remaining</span>
        <span className="sr-only" role="timer" aria-live="polite">
          {breakAnnouncement(remaining)}
        </span>
      </div>
      <p className="testing-note">
        Stand up, get water, look at something further away than a screen. The
        real test gives you this, and taking it is part of practising the
        sitting rather than just the questions.
      </p>
      <div className="testing-actions">
        <Button onClick={onDone}>
          {remaining > 0 ? "Skip the break and continue" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function ScoreReport({ run, onExit }: { run: Run; onExit: () => void }) {
  const { correct, total } = practiceTestRaw(run);
  const scaled = practiceTestScaled(run);
  const unfinished = run.legs.filter((l) => !l.completedAt);

  return (
    <div className="testing-panel">
      <h2 className="testing-heading">Score report</h2>
      <div className="testing-score">
        <strong>{scaled}</strong>
        <span>
          estimated score · {correct} of {total} correct
        </span>
      </div>
      {/* Not fine print. This sentence is the difference between a number a
          student can act on and one they will quote at themselves for a week,
          and it sat at 12.5px and 2.10:1 under a 56px figure. */}
      <p className="testing-note testing-note-lead">
        Estimated from a typical modern LSAT curve, not PrepTest {run.pt}'s own
        conversion table. Treat it as a band, not a number.
      </p>

      <div className="testing-shape">
        {run.legs.map((leg, i) => (
          <div
            className="testing-shape-row"
            data-state={leg.completedAt ? "done" : undefined}
            key={`${leg.kind}-${leg.section}`}
          >
            <b>Section {i + 1}</b>
            <span>{legLabel(leg)}</span>
            <em>
              {leg.completedAt
                ? `${leg.correct ?? 0}/${leg.questionCount}`
                : "not finished"}
            </em>
          </div>
        ))}
      </div>

      {unfinished.length > 0 && (
        <p className="testing-note">
          {unfinished.length === 1 ? "One section was" : `${unfinished.length} sections were`}{" "}
          left unfinished, so those questions count against the raw total. The
          estimate is lower than a completed sitting would give you.
        </p>
      )}

      <div className="testing-actions">
        <Button onClick={onExit}>Back to the Testing Centre</Button>
      </div>
    </div>
  );
}

export default function PracticeTestRunPage() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [run, setRun] = React.useState<Run | null | undefined>(undefined);
  const [checking, setChecking] = React.useState(false);
  const [noResult, setNoResult] = React.useState(false);

  React.useEffect(() => {
    setRun(runId ? loadPracticeTestRun(runId) : null);
  }, [runId]);

  const commit = React.useCallback((next: Run) => {
    savePracticeTestRun(next);
    setRun(next);
  }, []);

  /**
   * Coming back from a leg. Runs once per return: the leg that was started has
   * either produced a row or it has not, and there is nothing to poll for.
   */
  React.useEffect(() => {
    if (!run || !user) return;
    const leg = run.legs[run.currentLeg];
    if (!leg || !leg.startedAt || leg.completedAt) return;
    let cancelled = false;

    setChecking(true);
    void readLegResult(user.id, run, leg)
      .then((result) => {
        if (cancelled) return;
        if (!result) {
          setNoResult(true);
          return;
        }
        const legs = run.legs.map((l, i) =>
          i === run.currentLeg
            ? {
                ...l,
                completedAt: new Date().toISOString(),
                correct: result.correct,
                answered: result.answered,
                timeMs: result.timeMs,
              }
            : l,
        );
        const nextLeg = run.currentLeg + 1;
        commit({
          ...run,
          legs,
          currentLeg: nextLeg,
          status: nextLeg >= legs.length ? "complete" : "in-progress",
        });
      })
      .finally(() => {
        if (!cancelled) setChecking(false);
      });

    return () => {
      cancelled = true;
    };
  }, [run, user, commit]);

  /** The break clock starts the moment the break becomes due, not on render. */
  React.useEffect(() => {
    if (!run || run.status !== "in-progress") return;
    if (run.breakTaken || run.currentLeg !== run.breakAfterLeg) return;
    if (run.breakStartedAt) return;
    commit({ ...run, breakStartedAt: new Date().toISOString() });
  }, [run, commit]);

  const begin = () => {
    if (!run) return;
    const leg = run.legs[run.currentLeg];
    if (!leg) return;
    const startedAt = new Date().toISOString();
    const next: Run = {
      ...run,
      legs: run.legs.map((l, i) => (i === run.currentLeg ? { ...l, startedAt } : l)),
    };
    // Stamped and saved BEFORE navigating: the readback matches on this
    // timestamp, and a leg that starts without one can never be scored.
    savePracticeTestRun(next);
    setRun(next);
    setNoResult(false);

    if (leg.kind === "lr") {
      const launch = lrLegLaunch(next, leg, next.currentLeg);
      navigate(launch.pathname, { state: launch.state });
    } else {
      navigate(rcLegHref(next, leg, next.currentLeg));
    }
  };

  if (run === undefined) {
    return (
      <div
        className="flex items-center gap-3 py-10 text-sm"
        role="status"
        aria-live="polite"
      >
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Loading your practice test…
      </div>
    );
  }

  if (!run) {
    return (
      <>
        <h1 className="classroom-title">Practice test not found</h1>
        <p className="testing-lede">
          This sitting is not on this device. Practice tests in progress are kept
          in the browser you started them in.
        </p>
        <Button onClick={() => navigate("/testing")}>Back to the Testing Centre</Button>
      </>
    );
  }

  const clock = formatPracticeTestClock(run.pace);
  const paceLabel = practiceTestPace(run.pace).label;
  const leg = run.legs[run.currentLeg];
  const breakDue =
    !run.breakTaken && run.currentLeg === run.breakAfterLeg && run.status === "in-progress";

  return (
    <>
      <h1 className="classroom-title">Practice Test {run.pt}</h1>
      <p className="testing-lede">
        {run.legs.length} scored sections · {paceLabel}
        {clock ? ` · ${clock} a section` : ""}
      </p>

      {run.status !== "complete" && (
      <div className="testing-shape">
        {run.legs.map((l, i) => (
          <div
            className="testing-shape-row"
            data-state={
              l.completedAt ? "done" : i === run.currentLeg ? "current" : undefined
            }
            key={`${l.kind}-${l.section}`}
          >
            <b>Section {i + 1}</b>
            <span>{legLabel(l)}</span>
            <em>
              {/* No number until the whole sitting is over. Knowing section 1's
                  score changes how the rest is sat, which is the difference
                  between a practice test and three drills. */}
              {l.completedAt ? 'Finished' : `${l.questionCount} questions`}
            </em>
          </div>
        ))}
      </div>
      )}

      {checking && (
        <div
          className="flex items-center gap-3 py-4 text-sm"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Reading that section's result…
        </div>
      )}

      {!checking && noResult && (
        <div className="testing-panel">
          <p className="testing-note">
            That section has not been submitted yet, so there is no result to
            read. Go back and finish it, or mark it unfinished and move on. An
            unfinished section still counts its questions against the raw total.
          </p>
          <div className="testing-actions">
            <Button onClick={begin}>Go back to that section</Button>
            <Button
              variant="outline"
              onClick={() => {
                const nextLeg = run.currentLeg + 1;
                commit({
                  ...run,
                  currentLeg: nextLeg,
                  status: nextLeg >= run.legs.length ? "complete" : "in-progress",
                });
                setNoResult(false);
              }}
            >
              Mark it unfinished and continue
            </Button>
          </div>
        </div>
      )}

      {!checking && !noResult && run.status === "complete" && (
        <ScoreReport run={run} onExit={() => navigate("/testing")} />
      )}

      {!checking && !noResult && run.status === "in-progress" && breakDue && (
        <BreakScreen
          run={run}
          onDone={() => commit({ ...run, breakTaken: true, breakStartedAt: undefined })}
        />
      )}

      {!checking && !noResult && run.status === "in-progress" && !breakDue && leg && (
        <div className="testing-panel">
          {/* The only sentence on this page that says what the button below
              it commits the student to. It is not a footnote. */}
          <p className="testing-note testing-note-lead">
            Next: <strong>{legLabel(leg)}</strong>, {leg.questionCount} questions
            {clock ? `, ${clock} on the clock` : ", untimed"}.
          </p>
          <div className="testing-actions">
            <Button onClick={begin}>
              {leg.startedAt ? "Return to" : "Begin"} section {run.currentLeg + 1}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/testing")}>
              Leave and come back later
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
