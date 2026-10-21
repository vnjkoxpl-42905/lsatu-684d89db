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
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { questionBank } from "@/lib/questionLoader";
import {
  checkpointPracticeTestBreak,
  formatPracticeTestClock,
  finishPracticeTestBreak,
  hasOutdatedPt118Structure,
  legLabel,
  practiceTestPaceLabel,
  practiceTestRunSectionSeconds,
  practiceTestBreakRemainingSeconds,
  practiceTestRaw,
  practiceTestScaled,
  retryPracticeTestBreakSave,
  type PracticeTestRun as Run,
} from "@/lib/practiceTest";
import {
  continueAccountPracticeTestHere,
  getPracticeTestDeviceId,
  loadAccountPracticeTestRun,
  PracticeTestConflictError,
  readPendingPracticeTestBackup,
  saveAccountPracticeTestRun,
} from "@/lib/practiceTestStore";
import { findRcLegSession, lrLegLaunch, readLegResult } from "@/lib/practiceTestRunner";
import { createSession } from "@/features/rc/api/rcProgress";
import { loadPracticeTestReview, type PracticeTestLegReview } from "@/lib/practiceTestReview";
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
function BreakScreen({ run, onDone, paused = false, saving = false, retryLabel }: {
  run: Run; onDone: () => void; paused?: boolean; saving?: boolean; retryLabel?: string;
}) {
  const [remaining, setRemaining] = React.useState(() => practiceTestBreakRemainingSeconds(run));

  React.useEffect(() => {
    // Nothing left to count. The interval used to keep firing at 2Hz for as
    // long as the student sat on a finished break.
    if (paused || remaining <= 0) return;
    const id = window.setInterval(() => {
      setRemaining(practiceTestBreakRemainingSeconds(run));
    }, 500);
    return () => window.clearInterval(id);
  }, [run, paused, remaining]);

  React.useEffect(() => {
    setRemaining(practiceTestBreakRemainingSeconds(run));
  }, [run]);

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
      {paused && <p className="testing-note" role="status">The break clock is paused while this change waits to save to your account.</p>}
      <p className="testing-note">
        Stand up, get water, look at something further away than a screen. The
        real test gives you this, and taking it is part of practising the
        sitting rather than just the questions.
      </p>
      <div className="testing-actions">
        <Button disabled={saving} onClick={onDone}>
          {paused ? retryLabel : remaining > 0 ? "Skip the break and continue" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function ScoreReport({ run, userId, onExit }: { run: Run; userId: string; onExit: () => void }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const reviewReturn = requestedReturn?.split("?")[0] === "/review/to-review" ? requestedReturn : null;
  const legValue = searchParams.get("leg");
  const legParam = Number(legValue);
  const targetLeg = legValue !== null && Number.isSafeInteger(legParam) && legParam >= 0 && legParam < run.legs.length
    ? legParam : null;
  const targetQuestion = searchParams.get("q");
  const { isLoading: questionBankLoading } = useQuestionBank();
  const permissions = useUserPermissions();
  const canOpenDrill = !permissions.loading && (permissions.is_admin || permissions.has_drill_access);
  const { correct, total } = practiceTestRaw(run);
  const scaled = practiceTestScaled(run);
  const unfinished = run.legs.filter((l) => !l.completedAt);
  const [reviews, setReviews] = React.useState<PracticeTestLegReview[] | null>(null);
  const [reviewError, setReviewError] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    setReviews(null);
    setReviewError(false);
    void loadPracticeTestReview(userId, run)
      .then((value) => { if (!cancelled) setReviews(value); })
      .catch(() => { if (!cancelled) setReviewError(true); });
    return () => { cancelled = true; };
  }, [run.id, userId]);

  React.useEffect(() => {
    if (!reviews || targetLeg === null || !targetQuestion) return;
    const target = document.getElementById(`pt-review-question-${targetLeg}-${encodeURIComponent(targetQuestion)}`);
    target?.scrollIntoView?.({ block: "start" });
  }, [reviews, targetLeg, targetQuestion]);

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

      <section className="mt-8" aria-labelledby="exam-question-review">
        <h3 id="exam-question-review" className="text-lg font-semibold">Review each question</h3>
        <p className="testing-note">Open a section to see your first answer, the correct answer, and saved timing.</p>
        {!reviews && !reviewError && <p role="status" className="testing-note">Loading question results…</p>}
        {reviewError && <p role="alert" className="testing-note">Question results could not be loaded. Refresh to try again.</p>}
        {reviews?.map((review) => {
          const section = run.legs[review.legIndex];
          return <details key={review.legIndex} open={targetLeg === review.legIndex || undefined} className="my-3 rounded-lg border border-border bg-background p-4">
            <summary className="cursor-pointer font-semibold">Section {review.legIndex + 1} · {legLabel(section)} · {review.available ? `${review.questions.length} questions` : 'Question detail unavailable'}</summary>
            {!review.available ? <p className="testing-note">This sitting has no saved question detail for this section.</p> :
              <div className="mt-3 grid gap-2">
                {review.questions.map((question) => {
                  const lrContent = section.kind === 'lr' && !questionBankLoading
                    ? questionBank.getQuestion(question.id) : null;
                  return <details key={question.id} id={`pt-review-question-${review.legIndex}-${encodeURIComponent(question.id)}`} open={targetLeg === review.legIndex && targetQuestion === question.id || undefined} className="scroll-mt-6 rounded-md border border-border p-3">
                  <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">Question {question.number}{question.type ? ` · ${question.type}` : ''}</span>
                    <span className="text-sm">{question.selected === null ? 'Unanswered' : question.correct === true ? 'Correct' : question.correct === false ? 'Missed' : 'Answer saved'}</span>
                  </summary>
                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <span>Your first answer: <strong>{question.selected ?? 'No answer'}</strong></span>
                    <span>Correct answer: <strong>{question.correctAnswer}</strong></span>
                    {question.timeMs !== null && <span>Time: {Math.round(question.timeMs / 1000)} seconds</span>}
                    {question.flagged === true && <span>Flagged during the section</span>}
                    {question.blindReviewAnswer && <span>Blind review answer: <strong>{question.blindReviewAnswer}</strong></span>}
                  </div>
                  {(lrContent || question.rcContent) && <div className="mt-4 space-y-3 border-t border-border pt-4 text-sm">
                    {lrContent?.stimulus && <p className="whitespace-pre-wrap leading-relaxed">{lrContent.stimulus}</p>}
                    {question.rcContent && <p className="whitespace-pre-wrap leading-relaxed">{question.rcContent.passage}</p>}
                    <p className="font-medium whitespace-pre-wrap">{lrContent?.questionStem ?? question.rcContent?.prompt}</p>
                    <ol className="space-y-2" aria-label={`Question ${question.number} answer choices`}>
                      {(lrContent
                        ? Object.entries(lrContent.answerChoices).map(([letter, text]) => ({ letter, text }))
                        : question.rcContent?.choices ?? []
                      ).map(({ letter, text }) => <li key={letter} className="flex gap-2">
                        <strong>{letter}.</strong><span className="whitespace-pre-wrap">{text}</span>
                      </li>)}
                    </ol>
                  </div>}
                  {canOpenDrill && <a className="mt-4 inline-flex min-h-11 items-center text-sm font-semibold underline" href={question.href}>
                    {section.kind === 'lr' ? 'Practice this question' : 'Review in RC player'}
                  </a>}
                  {!lrContent && !question.rcContent && !questionBankLoading && <p className="mt-3 text-sm text-muted-foreground">Question text is unavailable for this saved result.</p>}
                </details>})}
              </div>}
          </details>;
        })}
      </section>

      <div className="testing-actions">
        <Button onClick={() => reviewReturn ? navigate(reviewReturn) : onExit()}>{reviewReturn ? "Back to Review" : "Back to Practice Exams"}</Button>
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
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [pendingRun, setPendingRun] = React.useState<Run | null>(null);
  const [loadRevision, retryAccountLoad] = React.useReducer((revision: number) => revision + 1, 0);

  React.useEffect(() => {
    let cancelled = false;
    setRun(undefined);
    setSaveError(null);
    setPendingRun(null);
    if (!runId || !user) {
      setRun(null);
      return;
    }
    void loadAccountPracticeTestRun(user.id, runId)
      .then((loaded) => {
        if (cancelled) return;
        setRun(loaded);
        const backup = readPendingPracticeTestBackup(user.id, runId);
        setPendingRun(backup && (!loaded || backup.revision === loaded.revision) ? backup : null);
        if (backup && loaded && backup.revision !== loaded.revision) {
          setSaveError("This device has an unsynced copy, but your account has newer changes. The device copy has been preserved for recovery.");
        }
        if (backup && !loaded) {
          setSaveError("This device has an unsynced copy, but the exam could not be found in your account. The copy has been preserved for recovery.");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSaveError(error instanceof Error ? error.message : "Could not load this exam from your account.");
          setPendingRun(readPendingPracticeTestBackup(user.id, runId));
          setRun(null);
        }
      });
    return () => { cancelled = true; };
  }, [runId, user?.id, loadRevision]);

  const commit = React.useCallback(async (next: Run, pendingBackup: Run = next): Promise<Run | null> => {
    if (!user) return null;
    setSaving(true);
    setSaveError(null);
    try {
      // The frozen snapshot belongs only in the recovery copy. An acknowledged
      // run must keep counting after a heartbeat succeeds.
      const { breakRemainingSeconds: _frozen, ...accountRun } = next;
      const saved = await saveAccountPracticeTestRun(user.id, accountRun, pendingBackup);
      setRun(saved);
      setPendingRun(null);
      return saved;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "This exam could not be saved to your account.");
      setPendingRun(pendingBackup);
      if (error instanceof PracticeTestConflictError) {
        try {
          const latest = await loadAccountPracticeTestRun(user.id, next.id);
          if (latest) {
            setRun(latest);
            if (latest.revision !== next.revision || latest.activeDeviceId !== getPracticeTestDeviceId()) {
              setPendingRun(null);
            }
          }
        } catch {
          // Keep the unsynced device copy until the account can be checked again.
        }
      }
      return null;
    } finally {
      setSaving(false);
    }
  }, [user?.id]);

  /**
   * Coming back from a leg. Runs once per return: the leg that was started has
   * either produced a row or it has not, and there is nothing to poll for.
   */
  React.useEffect(() => {
    if (!run || pendingRun || !user || run.activeDeviceId !== getPracticeTestDeviceId() || hasOutdatedPt118Structure(run)) return;
    const leg = run.legs[run.currentLeg];
    if (!leg || !leg.startedAt || leg.completedAt) return;
    let cancelled = false;

    setChecking(true);
    void readLegResult(user.id, run, leg)
      .then(async (result) => {
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
        await commit({
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
  }, [run, pendingRun, user, commit]);

  /** The break clock starts the moment the break becomes due, not on render. */
  React.useEffect(() => {
    if (!run || saving || pendingRun || run.activeDeviceId !== getPracticeTestDeviceId() || hasOutdatedPt118Structure(run) || run.status !== "in-progress") return;
    if (run.breakTaken || run.currentLeg !== run.breakAfterLeg) return;
    if (run.breakStartedAt) return;
    void commit({ ...run, breakStartedAt: new Date().toISOString() });
  }, [run, commit, saving, pendingRun]);

  /** Detect a lost account connection even when the student has not pressed Continue. */
  React.useEffect(() => {
    if (!run || saving || pendingRun || run.activeDeviceId !== getPracticeTestDeviceId() ||
        run.status !== "in-progress" || run.breakTaken ||
        run.currentLeg !== run.breakAfterLeg || !run.breakStartedAt) return;
    const id = window.setTimeout(() => {
      void commit(run, checkpointPracticeTestBreak(run));
    }, 15_000);
    return () => window.clearTimeout(id);
  }, [run, saving, pendingRun, commit]);

  const begin = async () => {
    if (!run || saving || hasOutdatedPt118Structure(run)) return;
    const leg = run.legs[run.currentLeg];
    if (!leg) return;
    let saved = run;
    if (!leg.startedAt) {
      const next: Run = {
        ...run,
        legs: run.legs.map((l, i) => i === run.currentLeg
          ? { ...l, startedAt: new Date().toISOString() }
          : l),
      };
      // Stamp and save before opening the runner so every leg has a durable
      // identity and the exam can be resumed on another device.
      const created = await commit(next);
      if (!created) return;
      saved = created;
    }
    setNoResult(false);

    if (leg.kind === "lr") {
      const launch = lrLegLaunch(saved, leg, saved.currentLeg);
      navigate(launch.pathname, { state: launch.state });
    } else {
      try {
        const existing = await findRcLegSession(user!.id, saved.id, saved.currentLeg);
        if (existing?.status === "in_progress") {
          navigate(`/rc/drill?sessionId=${encodeURIComponent(existing.id)}&ptRun=${encodeURIComponent(saved.id)}&ptLeg=${saved.currentLeg}&returnTo=${encodeURIComponent(`/testing/test/${saved.id}`)}`);
        } else if (existing?.status === "completed") {
          navigate(`/rc/results/${encodeURIComponent(existing.id)}?returnTo=${encodeURIComponent(`/testing/test/${saved.id}`)}`);
        } else if (existing) {
          setSaveError("This section was closed. Mark it unfinished to continue the exam.");
        } else {
          // The legacy /rc?start=1 link passes through the general Drill hub,
          // which an assigned-only student cannot open. Create this exact
          // sitting leg under their account and enter its own runner directly.
          const sectionSeconds = practiceTestRunSectionSeconds(saved);
          const passageIds = leg.passageIds ?? [];
          const session = await createSession({
            reveal: 'end_of_set',
            timing: sectionSeconds === null
              ? { mode: 'unlimited' }
              : { mode: 'per_passage_budget', secondsPerPassage: Math.round(sectionSeconds / (passageIds.length || 4)) },
            source: 'manual',
            practiceTestRunId: saved.id,
            practiceTestLegIndex: saved.currentLeg,
          }, passageIds);
          navigate(`/rc/drill?sessionId=${encodeURIComponent(session.id)}&ptRun=${encodeURIComponent(saved.id)}&ptLeg=${saved.currentLeg}&returnTo=${encodeURIComponent(`/testing/test/${saved.id}`)}`);
        }
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : "Could not reopen this section.");
      }
    }
  };

  const retryPending = () => {
    if (!run || !pendingRun || saving) return;
    void commit(retryPracticeTestBreakSave(run, pendingRun));
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
        <h1 className="classroom-title">{saveError ? "Practice test unavailable" : "Practice test not found"}</h1>
        <p className="testing-lede">
          {saveError ?? "This exam was not found in your account."}
        </p>
        {pendingRun && (
          <p className="testing-note" role="status">
            An unsynced copy is saved on this device. Progress is paused until the account copy can be checked.
          </p>
        )}
        <div className="testing-actions">
          {saveError && <Button onClick={retryAccountLoad}>Retry loading account</Button>}
          <Button onClick={() => navigate("/testing")}>Back to Practice Exams</Button>
        </div>
      </>
    );
  }

  if (hasOutdatedPt118Structure(run)) {
    return (
      <>
        <h1 className="classroom-title">Practice Test 118 changed</h1>
        <p className="testing-lede">
          This saved sitting used an unscored section and an extra question. Its
          score would be inaccurate, so start a new PT118 sitting. Your earlier
          work remains saved.
        </p>
        <Button onClick={() => navigate("/testing")}>Back to Practice Exams</Button>
      </>
    );
  }

  const clock = formatPracticeTestClock(practiceTestRunSectionSeconds(run));
  const paceLabel = practiceTestPaceLabel(run.pace);
  const leg = run.legs[run.currentLeg];
  const breakDue =
    !run.breakTaken && run.currentLeg === run.breakAfterLeg && run.status === "in-progress";
  const onAnotherDevice = run.status === "in-progress" && run.activeDeviceId !== getPracticeTestDeviceId();

  return (
    <>
      <h1 className="classroom-title">Practice Test {run.pt}</h1>
      <p className="testing-lede">
        {run.legs.length} scored sections · {paceLabel}
        {clock ? ` · ${clock} a section` : ""}
      </p>

      {saveError && <p className="testing-note" role="alert">{saveError} Your account copy is still available. Retry after the connection returns.</p>}
      {pendingRun && pendingRun.revision === run.revision && !onAnotherDevice &&
        !(pendingRun.breakRemainingSeconds !== undefined && breakDue) && (
        <Button disabled={saving} onClick={retryPending}>Save pending changes</Button>
      )}
      {onAnotherDevice && (
        <div className="testing-panel">
          <p className="testing-note">This exam is open on another device. Continue here to move it to this device.</p>
          <Button disabled={saving} onClick={() => {
            if (!user) return;
            setSaving(true);
            setSaveError(null);
            void continueAccountPracticeTestHere(user.id, run)
              .then(setRun)
              .catch((error: unknown) => setSaveError(error instanceof Error ? error.message : "Could not move this exam here."))
              .finally(() => setSaving(false));
          }}>Continue on this device</Button>
        </div>
      )}

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

      {!pendingRun && !onAnotherDevice && !checking && noResult && (
        <div className="testing-panel">
          <p className="testing-note">
            That section has not been submitted yet, so there is no result to
            read. Go back and finish it, or mark it unfinished and move on. An
            unfinished section still counts its questions against the raw total.
          </p>
          <div className="testing-actions">
            <Button disabled={saving} onClick={() => { void begin(); }}>Go back to that section</Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => {
                const nextLeg = run.currentLeg + 1;
                void commit({
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

      {!pendingRun && !checking && !noResult && run.status === "complete" && (
        <ScoreReport run={run} userId={user!.id} onExit={() => navigate("/testing")} />
      )}

      {pendingRun && pendingRun.revision === run.revision && !onAnotherDevice &&
        pendingRun.breakRemainingSeconds !== undefined && breakDue && (
        <BreakScreen run={pendingRun} paused saving={saving} onDone={retryPending}
          retryLabel={pendingRun.breakTaken ? "Retry saving and continue" : "Retry saving break"} />
      )}

      {!pendingRun && !onAnotherDevice && !checking && !noResult && run.status === "in-progress" && breakDue && run.breakStartedAt && (
        <BreakScreen
          run={run}
          saving={saving}
          onDone={() => { void commit(finishPracticeTestBreak(run)); }}
        />
      )}

      {!pendingRun && !onAnotherDevice && !checking && !noResult && run.status === "in-progress" && !breakDue && leg && (
        <div className="testing-panel">
          {/* The only sentence on this page that says what the button below
              it commits the student to. It is not a footnote. */}
          <p className="testing-note testing-note-lead">
            Next: <strong>{legLabel(leg)}</strong>, {leg.questionCount} questions
            {clock ? `, ${clock} on the clock` : ", untimed"}.
          </p>
          <div className="testing-actions">
            <Button disabled={saving} onClick={() => { void begin(); }}>
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
