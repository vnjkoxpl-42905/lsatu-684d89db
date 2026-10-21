import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { useStudentActivity } from "../hooks/useStudentActivities";
import {
  assignmentBelongsToAnotherAccount,
  completeAssignment,
  getAccommodation,
  listItemResponses,
  markAssignmentStarted,
  recordItemResponse,
} from "../api/activitiesClient";
import { reconstructProgress, scoreFor } from "../progress";
import { draftKey, flushOutbox, queueAttempt, type PendingAttempt } from "../drafts";
import type { RunScore } from "../progress";
import { syncClassroomItemStatusBySource } from "@/lib/classroomItems";
import { useAuth } from "@/contexts/AuthContext";
import { MAX_ATTEMPTS } from "../api/types";
import type { JudgeSource, Verdict } from "../api/types";
import { cachePracticeRun, createPracticeRun, loadPracticeRuns, readCachedRuns, syncPracticeRun, practiceSaveMessage, type PracticeRun } from "../conditionals/practiceStore";
import { repairConditionalItem } from "../content/repairConditionalItems";
import { buildPaperDiagramChoices, buildLegacyPaperDiagramChoices } from "../worlds/switchyard/diagramChoices";
import { getGeneralPhase } from "../conditionals/generalPhases";
import { PaperDiagramPanel } from "./PaperDiagramPanel";
import { ActivityIntro } from "./ActivityIntro";
import { ActivityHeroPanel } from "./ActivityHeroPanel";
import { ActivityProgress } from "./ActivityProgress";
import { ActivityExitButton } from "./ActivityExitButton";
import { worldForTitle } from "../worlds/registry";
import { SectionRunner } from "../recall/SectionRunner";
import { SectionBriefingPage } from "./SectionBriefingPage";
import { recoverPendingRecordings, recoverPendingRows } from "../recall/recoverRecordings";
import { acknowledgeSectionCompletion, readSectionCompletion, requireSectionEvidence, requireSectionRecording } from "../recall/sectionCompletion";
import type { Accommodation } from "../recall/section";
import { SectionLibraryPanel } from "./SectionLibraryPanel";
import { ActivityQuestionStack } from "./ActivityQuestionStack";
import { CompletionSummary } from "./CompletionSummary";
import { SectionReport } from "./SectionReport";
// For `ac-section-handover`, the second half of the drill room's handover: the
// field warms on the way out and the card rises onto it on the way in.
import "../recall/section.css";
import "../activity-centre.css";

/** `report` is the section-only tail: grading runs after she stops. */
type Phase = "intro" | "running" | "closing" | "done" | "report";

/**
 * Student player: intro -> split-screen quiz -> completion summary.
 *
 * On open it replays the saved attempt log so the student resumes exactly where
 * they left off (or reviews a completed run). A completed activity can be re-run
 * as practice via "Practice again". Conditional practice has its own saved
 * session and never touches the original graded score.
 */
export interface ActivityRunnerProps {
  /** When embedded (not routed), the assignment id to run. Falls back to the URL param. */
  assignmentId?: string;
  /**
   * Teacher preview starts at the intro and never changes assignment scores.
   * Own General Conditional previews save a separate practice session.
   */
  preview?: boolean;
}

/**
 * A run is one mounted player.
 *
 * The Report Card's "Run these again" navigates to a NEW assignment id under
 * the same `/activities/:assignmentId` route, so React keeps this component
 * mounted and every piece of run state -- the phase, the hydrated flag, the
 * attempt-log promise -- would carry over from the finished run and leave her
 * staring at the grading screen of a run that has no recording. Keying on the
 * id makes a new run a new mount, which is what it actually is.
 */
export function ActivityRunner(props: ActivityRunnerProps = {}) {
  const params = useParams<{ assignmentId: string; activityId: string }>();
  const location = useLocation();
  const key = `${props.assignmentId ?? params.assignmentId ?? params.activityId ?? "none"}:${new URLSearchParams(location.search).get("practiceRun") ?? ""}`;
  return <ActivityRunnerInstance key={key} {...props} />;
}

function ActivityRunnerInstance({ assignmentId: assignmentIdProp, preview = false }: ActivityRunnerProps = {}) {
  const params = useParams<{ assignmentId: string; activityId: string }>();
  // The routed preview names an ACTIVITY, not an assignment: it runs off the
  // definition and no row exists to name. Everything else names an assignment.
  const previewActivityId = preview ? params.activityId : undefined;
  const assignmentId = assignmentIdProp ?? params.assignmentId;
  const navigate = useNavigate();
  const location = useLocation();
  const requestedPracticeId = new URLSearchParams(location.search).get("practiceRun");
  const [savedPractice, setSavedPractice] = useState<PracticeRun | null>(null);
  const savedPracticeRef = useRef<PracticeRun | null>(null);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState("");
  const startSectionOnOpen =
    !preview &&
    typeof location.state === "object" &&
    location.state !== null &&
    "startSection" in location.state &&
    location.state.startSection === true;
  // Only the routed runner owns the whole viewport and therefore needs its own
  // way out. Embedded (teacher preview) sits inside chrome that already closes.
  const routed = assignmentIdProp === undefined;

  // Exit means two different places depending on where you are standing, and
  // conflating them is what made the first version wrong. From a question, the
  // thing you want to back out to is the Activity's own intro: its title, the
  // worked example, the rules. Dropping straight to the Activity Centre there
  // skips past the page you were actually trying to reach. From the intro
  // itself there is nowhere further in to go, so that one leaves for the
  // Centre. Returning to the intro keeps `index`, so the Start action resumes on
  // the same question rather than restarting the Activity.
  const handleBackToIntro = routed ? () => setPhase("intro") : undefined;
  const handleLeave = routed ? () => navigate(isGeneral ? "/activities/conditionals" : "/activities") : undefined;
  const { user } = useAuth();

  // "Activity not found." was shown for two very different situations: an id
  // that is not real, and an assignment that IS real but was issued to another
  // account. The second is the common one for anyone signed in as admin while
  // the assignment sits on their student login, and the old wording sent the
  // reader looking for a routing or RLS bug that was never there.
  // Tri-state, not a boolean. A boolean starting false means the first paint
  // after an empty load says "Activity not found." and only corrects itself
  // once the probe answers, so the wrong sentence is shown first and the right
  // one arrives as a flicker. "unknown" keeps the spinner up instead.
  const [ownership, setOwnership] = useState<"unknown" | "elsewhere" | "absent">("unknown");
  const { assignment, loading, error } = useStudentActivity(assignmentId, previewActivityId);
  const confirmedCompletion = assignment?.status === "completed" && Boolean(assignment.completed_at);

  /**
   * Joshua, opening a link he handed to a student.
   *
   * An admin can read every assignment, so the row loads; what must not happen
   * is his visit being recorded as the student's work. Every write below is
   * gated on `readOnly` rather than `practice` alone, and the attempt log is
   * read under the assignment's OWN student id, so what he sees on the screen
   * is their answers rather than an empty run.
   */
  const viewingSomeoneElse = Boolean(assignment && user && assignment.student_id !== user.id);
  const isGeneral = assignment?.title === "Conditional Rephrase";
  const persistPractice = useCallback((next: PracticeRun): boolean => {
    if (!user || next.userId !== user.id || viewingSomeoneElse) return false;
    try { cachePracticeRun(next); }
    catch (error) { setPracticeError(error instanceof Error ? error.message : "This browser could not save your practice. Retry before continuing."); return false; }
    savedPracticeRef.current = next;
    setSavedPractice(next);
    setPracticeError(null);
    setSaveStatus("Saved on this device; syncing...");
    void syncPracticeRun(user.id, next.id).then(() => setSaveStatus("Saved to your account")).catch(error => {
      const message = practiceSaveMessage(error);
      setSaveStatus(message);
      toast({ title: "Practice account sync unavailable", description: message });
    });
    return true;
  }, [user, viewingSomeoneElse]);
  const updatePractice = useCallback((change: Partial<PracticeRun>) => {
    const run = savedPracticeRef.current;
    return run ? persistPractice({ ...run, ...change, updatedAt: new Date().toISOString() }) : false;
  }, [persistPractice]);
  const logStudentId = assignment?.student_id ?? user?.id;

  // Only asked when the load has genuinely come back empty, so the ordinary
  // path costs nothing. The probe reads by id alone and returns a boolean, so
  // a student who cannot see the row keeps the plain not-found wording.
  useEffect(() => {
    if (loading || error || assignment) {
      setOwnership("unknown");
      return;
    }
    // No id to probe (teacher preview, or a malformed route) can never resolve
    // to "belongs to someone else", and leaving it "unknown" would hold the
    // spinner up forever. Settle it here rather than waiting on a call that is
    // never made.
    if (!assignmentId) {
      setOwnership("absent");
      return;
    }
    let live = true;
    void assignmentBelongsToAnotherAccount(assignmentId)
      .then((yes) => {
        if (live) setOwnership(yes ? "elsewhere" : "absent");
      })
      .catch(() => {
        // The helper already swallows its own failures; this is the guard for
        // anything it cannot, so a probe never becomes an unhandled rejection.
        // Resolving to "absent" keeps the plain wording, never the stronger claim.
        if (live) setOwnership("absent");
      });
    return () => {
      live = false;
    };
  }, [assignmentId, assignment, loading, error]);

  // Ungraded run with no DB writes / score overwrite. True for teacher previews
  // and for a "Practice again" re-run of a completed activity.
  const [practice, setPractice] = useState(preview || Boolean(requestedPracticeId));
  /** No row is written under this run: a practice re-run, a preview, or an admin looking. Saved practice owns a separate row. */
  const readOnly = practice || viewingSomeoneElse;

  /**
   * The attempt log, started at mount rather than after the assignment lands.
   *
   * Both reads are keyed by ids that are known before either request goes out:
   * the assignment id from the route and the student id from the session. The
   * hydrate effect used to await the assignment and only then ask for the log,
   * which made the slowest screen in the flow two sequential round trips for no
   * reason. It is one now, and the effect awaits a promise that has been in
   * flight the whole time.
   */
  const logRef = useRef<Promise<Awaited<ReturnType<typeof listItemResponses>>> | null>(null);
  if (!logRef.current && assignmentId && logStudentId && !preview && !requestedPracticeId &&
      (!assignment?.revoked_at || readOnly)) {
    logRef.current = listItemResponses(assignmentId, logStudentId);
    // Nothing awaits this until the effect does, and an unhandled rejection in
    // between would surface as a page-level error. The effect still sees it.
    logRef.current.catch(() => {});
  }

  const [phase, setPhase] = useState<Phase>("intro");
  /**
   * The student's time accommodation, and the reason the clock was wrong.
   *
   * `SectionRunner` has always taken this and nothing ever passed it, so every
   * run fell back to "standard" and an accommodated student was scored against
   * a goal 13 or 25 minutes shorter than her own. ADR 0014 gave the section
   * three goals precisely so that would not happen, and the wire was never
   * connected.
   *
   * Held here rather than fetched inside the runner because the runner starts
   * recording the moment it mounts, and its clock must not change under her a
   * second into the section.
   */
  const [accommodation, setAccommodation] = useState<Accommodation>("standard");
  const [index, setIndex] = useState(0);
  const [verdicts, setVerdicts] = useState<Record<number, Verdict | null>>({});
  const [responses, setResponses] = useState<Record<number, string>>({});
  const [hydrated, setHydrated] = useState(false);
  const [progressLoadFailed, setProgressLoadFailed] = useState(false);
  const [completionError, setCompletionError] = useState(false);
  const closeoutRef = useRef<{ verdicts: Record<number, Verdict | null>; phase: "done" | "report" } | null>(null);
  const closingRef = useRef(false);
  // The world's entrance plays once per run, on Start, before the first item.
  const [entered, setEntered] = useState(false);
  /**
   * The item the student stopped ON, mid-attempt, in an earlier sitting: which
   * index it is, how many attempts they had already spent, and what they had
   * typed. Applied only while `index` still points at that item, so moving on
   * never re-seeds a later question with an older question's words.
   */
  const [resumeAt, setResumeAt] = useState<{ index: number; attempts: number; text: string } | null>(null);
  const hydratingRef = useRef(false);
  /**
   * The world, on a phone.
   *
   * Below md the two columns stack, and the yard came first at 864px measured
   * at 375x812 -- so the student scrolled past a full screen of scenery to
   * reach the answer box on every one of 62 questions, and the routing beat
   * then played off-screen behind them. It rides as a compact sticky band
   * instead, opened on tap when they want the whole yard.
   */
  const [bandExpanded, setBandExpanded] = useState(false);
  const bandRef = useRef<HTMLElement | null>(null);

  /**
   * The item orders a re-drill is running, or null for the whole set.
   *
   * Only ever set alongside `practice`, and only from the completion screen, so
   * it cannot narrow a graded run: a student is never scored over a subset they
   * chose. It is also set long after the hydrate effect has replayed the log,
   * which is the other thing that must never see a filtered list.
   */
  const [redrillOrders, setRedrillOrders] = useState<number[] | null>(null);

  const items = useMemo(() => {
    if (!assignment) return [];
    if (savedPractice?.general) return savedPractice.general.items;
    const all = [...assignment.items].sort((a, b) => a.order - b.order).map(item =>
      isGeneral && !confirmedCompletion && !viewingSomeoneElse ? repairConditionalItem(item) : item);
    if (!redrillOrders) return all;
    const wanted = new Set(redrillOrders);
    const subset = all.filter((i) => wanted.has(i.order));
    // An override that matches nothing is a stale list, not an empty activity.
    // Running the whole set is the wrong answer; running zero items is worse.
    return subset.length > 0 ? subset : all;
  }, [assignment, redrillOrders, savedPractice?.general, isGeneral, viewingSomeoneElse, confirmedCompletion]);

  /**
   * The Activity's world, when it has one. Eight were built, one per Activity,
   * and until now none was reachable outside the dev lab. A world replaces the
   * cover rail on the left; the answer box and Coach on the right are untouched.
   */
  const world = useMemo(() => worldForTitle(assignment?.title), [assignment?.title]);
  const currentItem = items[index];
  const generalPhase = getGeneralPhase(index);
  const timedGeneral = isGeneral && generalPhase.seconds !== null && !viewingSomeoneElse;
  const [assignedPaper, setAssignedPaper] = useState<{ key: string; deadline?: string; ready: boolean } | null>(null);
  const assignedPaperKey = user && assignment ? `lsatu:general-paper:v1:${user.id}:${assignment.id}:${index}` : "";

  // Start the clock only when this question is on screen. Preserve an absolute
  // deadline so leaving or reloading cannot buy another interval.
  useEffect(() => {
    if (!timedGeneral || phase !== "running" || !entered || !hydrated || viewingSomeoneElse) return;
    const seconds = generalPhase.seconds!;
    if (savedPractice) {
      if (savedPractice.stage === "paper" && !savedPractice.paperDeadline) {
        updatePractice({ paperDeadline: new Date(Date.now() + seconds * 1000).toISOString() });
      }
      return;
    }
    if (!assignedPaperKey || assignedPaper?.key === assignedPaperKey) return;
    try {
      const raw = localStorage.getItem(assignedPaperKey);
      const state = raw ? JSON.parse(raw) as { deadline: string; ready: boolean } : { deadline: new Date(Date.now() + seconds * 1000).toISOString(), ready: false };
      if (!Number.isFinite(Date.parse(state.deadline))) throw new Error("The saved diagram timer could not be read. Keep this page open and retry.");
      if (!raw) localStorage.setItem(assignedPaperKey, JSON.stringify(state));
      setAssignedPaper({ key: assignedPaperKey, ...state });
    } catch (error) { setPracticeError(error instanceof Error ? error.message : "The diagram timer could not be saved."); }
  }, [timedGeneral, generalPhase.seconds, phase, entered, hydrated, viewingSomeoneElse, savedPractice, updatePractice, assignedPaperKey, assignedPaper?.key]);
  const finishAssignedPaper = () => {
    if (!assignedPaper || assignedPaper.key !== assignedPaperKey) return;
    try {
      const next = { ...assignedPaper, ready: true };
      localStorage.setItem(assignedPaperKey, JSON.stringify(next));
      setAssignedPaper(next);
    } catch { setPracticeError("This browser could not save the diagram stage. Retry before continuing."); }
  };

  /**
   * One marker per item, carrying the verdict the student actually earned.
   * Replayed progress is in `verdicts`, so this survives leaving and coming
   * back: the rail a student sees on their third sitting shows all three.
   * Items not yet reached carry null and the world draws them as untravelled
   * rather than inventing an outcome.
   */
  const mileposts = useMemo(
    () => items.map((i) => ({ order: i.order, outcome: verdicts[i.order] ?? null })),
    [items, verdicts],
  );

  const worldStage = useMemo(() => {
    if (!world || !currentItem || timedGeneral) return null;
    return world.render({
      item: currentItem,
      response: responses[currentItem.order],
      answered: verdicts[currentItem.order] !== undefined,
      verdict: verdicts[currentItem.order],
      completedItems: items.filter((item) => verdicts[item.order] === "correct"),
      mileposts: isGeneral ? undefined : mileposts,
      currentOrder: currentItem.order,
    });
  }, [world, currentItem, items, responses, verdicts, mileposts, timedGeneral, isGeneral]);

  // Mirror progress into the Classroom feed row so a completed activity stops
  // showing "Start". Best-effort: the assignment is the source of truth.
  const syncClassroom = useCallback(
    async (status: "in_progress" | "completed") => {
      if (readOnly || !assignment) return;
      try {
        await syncClassroomItemStatusBySource("activity_assignments", assignment.id, status);
      } catch (e) {
        console.error("[activity:classroom:sync] failed", { status, error: e });
      }
    },
    [assignment, readOnly],
  );

  const closeAssignment = useCallback(async (outcomes: Record<number, Verdict | null>, finishedPhase: "done" | "report") => {
    if (!assignment || closingRef.current) return;
    if (readOnly) { setPhase(finishedPhase); return; }
    closeoutRef.current = { verdicts: outcomes, phase: finishedPhase };
    closingRef.current = true;
    setCompletionError(false);
    setPhase("closing");
    try {
      if (finishedPhase === "done") {
        // A locally resolved answer may still be queued after a failed write.
        // Retry those writes, then check the account's log before closing it.
        await flushOutbox((pending) => recordItemResponse(pending));
        const saved = await listItemResponses(assignment.id, assignment.student_id);
        if (reconstructProgress(items, saved).resolvedCount < items.length) {
          throw new Error("Some answers have not reached your account yet.");
        }
      }
      if (finishedPhase === "report") await acknowledgeSectionCompletion(assignment.id, assignment.student_id);
      else await completeAssignment(assignment.id, scoreFor(outcomes, items.length));
      void syncClassroom("completed");
      setPhase(finishedPhase);
    } catch (e) {
      console.error("[activity:complete] failed", e);
      setCompletionError(true);
    } finally {
      closingRef.current = false;
    }
  }, [assignment, readOnly, items, syncClassroom]);

  // Open behavior: runs once when the assignment loads.
  //
  // Every attempt is already written to `activity_item_responses` as it
  // happens, so the log is a complete record of where the student got to. This
  // replays it. A completed activity opens to its review summary; an
  // unfinished one opens ON the question they stopped at, with the verdicts
  // they already earned restored so the final score counts every sitting, not
  // just the last one. The intro is the front door exactly once: a run that has
  // been started resumes straight into the work rather than sending the student
  // back through the rules they have already read.
  useEffect(() => {
    if (!assignment || !user || hydrated || hydratingRef.current) return;
    if (assignment.revoked_at && !readOnly) {
      setHydrated(true);
      return;
    }
    hydratingRef.current = true;

    (async () => {
      if (requestedPracticeId) {
        try {
          if (!isGeneral || viewingSomeoneElse) throw new Error("This saved session is not available for this activity and account.");
          let run = readCachedRuns(user.id).find(r => r.id === requestedPracticeId);
          if (!run) run = (await loadPracticeRuns(user.id)).find(r => r.id === requestedPracticeId);
          if (!run?.general || run.mode !== "general" || run.general.sourceUrl !== location.pathname || !run.general.items.length) throw new Error("Saved session not found. Check your account and connection, then reload.");
          savedPracticeRef.current = run;
          setSavedPractice(run);
          const outcomes: Record<number, Verdict | null> = {};
          const texts: Record<number, string> = {};
          for (const answer of run.answers) {
            const order = Number(answer.questionId);
            texts[order] = answer.text;
            if (answer.verdict === "correct" || answer.revealed || answer.attempt >= MAX_ATTEMPTS) outcomes[order] = answer.verdict;
          }
          setVerdicts(outcomes); setResponses(texts);
          setIndex(Math.min(Math.max(0, run.position), run.general.items.length - 1)); setEntered(true);
          setPhase(run.stage === "done" ? "done" : "running");
        } catch (error) { setPracticeError(error instanceof Error ? error.message : "Could not load saved practice."); }
        setHydrated(true);
        return;
      }
      // Teacher preview: always enter at the intro, never load saved progress.
      if (preview) {
        setPhase("intro");
        setHydrated(true);
        return;
      }

      let log: Awaited<ReturnType<typeof listItemResponses>> = [];
      try {
        log = await (logRef.current ?? listItemResponses(assignment.id, assignment.student_id));
      } catch (e) {
        // A failed read must not silently look like "no progress" and hand the
        // student a blank run over the top of real saved work. Block starting
        // until a reload can read the log safely.
        console.error("[activity:resume:load] failed", e);
        toast({
          title: "Could not load your saved progress",
          description: "Your earlier answers are safe. Reload to pick up where you left off.",
          variant: "destructive",
        });
        setPhase("intro");
        setProgressLoadFailed(true);
        setHydrated(true);
        return;
      }

      /*
       * Rescue any recording left behind by a section that never finished.
       *
       * A crash or a closed lid used to cost the whole sitting. The stimulus
       * rows survive it now, and the audio survives on her own machine -- this
       * is the moment it gets put where those rows already say it is.
       *
       * Awaited so a recovered file is in place before the Report Card below
       * starts asking for a grade, and swallowed so it can never be the reason
       * this screen fails to open.
       */
      if (assignment.item_format === "spoken-recall" && !readOnly) {
        await recoverPendingRecordings(assignment.student_id);
        // And the answers of a run whose rows never landed, which without this
        // made the recording above unmarkable for ever. After the upload, so
        // the grade the last row asks for has audio to be about.
        await recoverPendingRows(assignment.student_id);
        // Before the runner mounts, so her own goal is the one on screen from
        // the first frame rather than 25 minutes that changes a moment later.
        setAccommodation(await getAccommodation(assignment.student_id));
        try {
          const pending = readSectionCompletion(assignment.id, assignment.student_id);
          if (pending && assignment.mode === "section") {
            // Read again after recovery, then verify this exact take rather
            // than combining rows from separate attempts into a finished run.
            const saved = await listItemResponses(assignment.id, assignment.student_id);
            requireSectionEvidence(pending, saved, items.map(item => item.order));
            await requireSectionRecording(pending);
            await closeAssignment({}, "report");
            setHydrated(true);
            return;
          }
        } catch (error) {
          console.error("[rrc:closeout:load] failed", error);
          setPhase("intro");
          setProgressLoadFailed(true);
          setHydrated(true);
          return;
        }
      }

      const progress = reconstructProgress(items, log);
      setVerdicts(progress.verdicts);
      setResponses(progress.responses);

      /*
       * Where a finished run lands when it is reopened.
       *
       * For a Read, Recall, Colour section that is the Report Card, and the
       * Report Card is the ONLY completion screen it has: the unit judged is
       * the whole section (ADR 0010), so there are no per-item verdicts for
       * `CompletionSummary` to summarise and it renders an empty one.
       *
       * Landing on `done` instead is how a graded run became unreachable.
       * Grading finishes minutes after she stops, so the Report Card is
       * something she comes BACK to -- and coming back was the one path that
       * did not lead to it. Every reopen, on every device, for the rest of the
       * assignment's life, showed the blank generic summary instead.
       */
      const isSectionRun = assignment.item_format === "spoken-recall" && assignment.mode === "section";
      const finishedPhase = isSectionRun ? "report" as const : "done" as const;

      if (confirmedCompletion) {
        setPhase(finishedPhase);
        setHydrated(true);
        return;
      }

      // Every item resolved but the run never closed (the tab went away on the
      // last Finish). The work is done; write the completion rather than
      // parking the student on a run with nothing left in it.
      if (!isSectionRun && items.length > 0 && progress.resolvedCount >= items.length) {
        setIndex(items.length - 1);
        // Keep the replayed answers until the account acknowledges closeout.
        // A failed write leaves a retry screen instead of a completion report.
        await closeAssignment(progress.verdicts, finishedPhase);
        setHydrated(true);
        return;
      }

      /*
       * Where the briefing says she is picking up from.
       *
       * A section is always at the beginning, because it never resumes: rows
       * left by an abandoned sitting are kept on purpose and are not progress
       * through this one. Without this the intro read "Back to stimulus 6" over
       * a Start button that correctly begins a fresh Attempt at stimulus 1.
       */
      setIndex(isSectionRun ? 0 : progress.resolvedCount);
      setResumeAt(
        !isSectionRun && progress.pendingAttempts > 0
          ? { index: progress.resolvedCount, attempts: progress.pendingAttempts, text: progress.pendingText }
          : null,
      );

      /*
       * A section never resumes.
       *
       * Everything else here is resumable by design: the log says where she
       * got to, the intro is the front door exactly once, and coming back
       * drops her onto the question she stopped at. A Read, Recall, Colour
       * section is the one run where that is wrong in every direction.
       *
       * There is nothing to resume INTO. The unit judged is the whole section
       * (ADR 0010) and the recording is one unbroken take; a run rejoined
       * halfway is a different sitting with a different recording, and the
       * grader would score the last Attempt's audio against a mixture of both.
       *
       * And resuming it is dangerous rather than merely wrong. Landing on
       * `running` opens the microphone and starts the clock with the briefing
       * skipped, so once a section had been opened ONCE -- including by
       * accident -- every later visit to the link began a live, recording,
       * clocked run. That is how the trial run began. An abandoned section
       * also leaves the assignment `in_progress` for ever, which is what made
       * the state sticky rather than a one-off.
       *
       * So it always opens on its briefing and a deliberate start. The rows
       * from an abandoned sitting stay where they are and cost nothing: the
       * next run takes the next `attempt_no` and the grader reads only the
       * newest Attempt.
       */
      /*
       * A section ALWAYS opens on its instructions page now, even when it was
       * launched with Start from the library. The briefing is a full page of
       * its own with its own Start; nothing records until she presses it.
       */
      const started = isSectionRun
        ? false
        : assignment.status === "in_progress" || progress.resolvedCount > 0 || progress.pendingAttempts > 0;
      setPhase(started ? "running" : "intro");
      // The world's entrance is the ceremony of arriving, and it runs two and a
      // half seconds. It belongs to Start, not to every reopen: a student who
      // works this Activity over five sittings should not pay for it five
      // times. Coming back drops them straight onto the question.
      if (started) setEntered(true);
      if (started && assignment.status === "assigned" && !readOnly) {
        // Attempts on record but the status never moved: repair it, so the
        // Centre and the Classroom stop calling this run unopened.
        try {
          await markAssignmentStarted(assignment.id);
        } catch (e) {
          console.error("[activity:resume:start] failed", e);
        }
        void syncClassroom("in_progress");
      }
      setHydrated(true);
    })();
  }, [assignment, user, items, hydrated, preview, readOnly, startSectionOnOpen, syncClassroom, isGeneral, location.pathname, requestedPracticeId, viewingSomeoneElse, confirmedCompletion, closeAssignment]);

  const beginGeneralPractice = useCallback((selected: typeof items) => {
    if (!user || viewingSomeoneElse || !isGeneral) return false;
    try {
      const next = createPracticeRun(user.id, "general", [], { sourceUrl: location.pathname, items: selected.map(repairConditionalItem) });
      if (!persistPractice(next)) return false;
      navigate(`${location.pathname}?practiceRun=${encodeURIComponent(next.id)}`, { replace: true });
      return true;
    } catch { setPracticeError("This browser cannot save a new session. Check device storage and retry."); return false; }
  }, [user, viewingSomeoneElse, isGeneral, location.pathname, navigate, persistPractice]);

  const handleStart = useCallback(async () => {
    if (isGeneral && preview && !viewingSomeoneElse && !savedPracticeRef.current) { beginGeneralPractice(items); return; }
    setEntered(false);
    setPhase("running");
    if (!readOnly && assignment && assignment.status === "assigned") {
      try {
        await markAssignmentStarted(assignment.id);
      } catch (e) {
        console.error("[activity:start] failed", e);
      }
      void syncClassroom("in_progress");
    }
  }, [assignment, readOnly, syncClassroom, isGeneral, preview, viewingSomeoneElse, beginGeneralPractice, items]);

  const handleRecord = useCallback(
    async (args: {
      itemOrder: number;
      responseText: string;
      verdict: Verdict | null;
      attemptNo: number;
      judgeSource?: JudgeSource;
      shadowFault?: string | null;
      latencyMs?: number;
      revealed?: boolean;
    }) => {
      const run = savedPracticeRef.current;
      if (run && !viewingSomeoneElse) {
        const answer = { id: crypto.randomUUID(), questionId: String(args.itemOrder), choiceId: run.selection || undefined, text: args.responseText, verdict: args.verdict, attempt: args.attemptNo, revealed: args.revealed === true, at: new Date().toISOString() };
        if (!updatePractice({ answers: [...run.answers, answer], stage: "feedback" })) return;
      }
      setResponses((prev) => ({ ...prev, [args.itemOrder]: args.responseText }));
      // The seed has served its purpose the moment this item is written to
      // again; leaving it set would re-apply an old attempt count on a remount.
      setResumeAt((prev) => (prev && items[prev.index]?.order === args.itemOrder ? null : prev));
      if (readOnly || !user || !assignment) return; // practice, preview and admin views are never persisted
      const payload: PendingAttempt = {
        assignmentId: assignment.id,
        studentId: user.id,
        itemOrder: args.itemOrder,
        responseText: args.responseText,
        verdict: args.verdict,
        attemptNo: args.attemptNo,
        judgeSource: args.judgeSource,
        shadowFault: args.shadowFault,
        latencyMs: args.latencyMs,
        parserVersion: world?.parserVersion,
      };
      try {
        await recordItemResponse(payload);
        // A good write is the moment to try whatever failed before it.
        void flushOutbox((pending) => recordItemResponse(pending));
      } catch (e) {
        console.error("[activity:record] failed", e);
        // The toast used to say the progress still counted while queueing
        // nothing at all, so the sentence was false the moment it appeared.
        // It is true now: the attempt is held and retried.
        queueAttempt(payload);
        toast({
          title: "Could not save that attempt",
          description: "It is saved on this device and will go up when the connection is back.",
          variant: "destructive",
        });
      }
    },
    [user, assignment, readOnly, items, world, viewingSomeoneElse, updatePractice],
  );

  // Anything stranded by an earlier session goes up as soon as there is a
  // student to attribute it to, without waiting for them to answer again.
  useEffect(() => {
    if (readOnly || !user) return;
    void flushOutbox((pending) => recordItemResponse(pending));
  }, [readOnly, user]);

  const handleResolved = useCallback((order: number, finalVerdict: Verdict | null) => {
    setVerdicts((prev) => ({ ...prev, [order]: finalVerdict }));
    // The routing and the flip are the payoff. On a phone the band is above the
    // answer box, so without this they play behind the student while they are
    // still looking at what they typed. Desktop already has both in view.
    if (typeof window === "undefined" || window.matchMedia("(min-width: 768px)").matches) return;
    bandRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleNext = useCallback(async () => {
    if (savedPracticeRef.current && !updatePractice({ position: Math.min(index + 1, items.length - 1), stage: index < items.length - 1 ? "paper" : "done", selection: "", paperDeadline: undefined })) return;
    if (index < items.length - 1) {
      setIndex((i) => i + 1);
      setBandExpanded(false); // a new question starts with the answer box in reach
      return;
    }
    await closeAssignment(verdicts, "done");
  }, [index, items.length, verdicts, updatePractice, closeAssignment]);

  // Re-run a completed activity for practice. Clears local state, writes nothing.
  const startPractice = useCallback((orders: number[] | null) => {
    if (isGeneral && !viewingSomeoneElse) {
      beginGeneralPractice(orders ? items.filter(item => orders.includes(item.order)) : items);
      return;
    }
    setPractice(true);
    setRedrillOrders(orders);
    setVerdicts({});
    setResponses({});
    setResumeAt(null);
    setIndex(0);
    setEntered(true);
    setPhase("running");
  }, [isGeneral, viewingSomeoneElse, beginGeneralPractice, items]);

  /**
   * "Practice again" repeats whatever set was just run, rather than always
   * reopening all 62. A student who has just worked five misses and presses it
   * means those five again; sending them back to the top of the full Activity
   * would be an answer to a question they did not ask.
   */
  const handlePracticeAgain = useCallback(
    () => startPractice(redrillOrders),
    [startPractice, redrillOrders],
  );

  /** The ledger's re-drill: the misses, ungraded, in their original order. */
  const handleRedrill = useCallback(
    (orders: number[]) => startPractice(orders),
    [startPractice],
  );

  // The empty-load case is still resolving until the ownership probe answers,
  // so it waits here rather than showing a sentence it may have to take back.
  if (loading || (assignment && !hydrated) || (!error && !assignment && ownership === "unknown")) {
    return (
      <div className="activity-centre min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[hsl(var(--muted))] border-t-[hsl(var(--ac-emerald))]" />
      </div>
    );
  }

  if (requestedPracticeId && practiceError && !savedPractice) return <div className="activity-centre min-h-screen p-8"><p role="alert">{practiceError}</p><button onClick={() => window.location.reload()}>Retry loading</button><button onClick={() => navigate("/activities/conditionals")}>Conditional drills</button></div>;

  if (error || !assignment) {
    return (
      <div className="activity-centre min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-sm text-muted-foreground">
          {error
            ? `Could not load this activity: ${error}`
            : ownership === "elsewhere"
              ? "This activity was assigned to a different account."
              : "Activity not found."}
        </p>
        {!error && user?.email && (
          <p className="text-xs text-muted-foreground/70">
            {ownership === "elsewhere"
              ? `You are signed in as ${user.email}. Sign in as the account it was assigned to.`
              : `Signed in as ${user.email}.`}
          </p>
        )}
        {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
      </div>
    );
  }

  if (assignment.revoked_at && !readOnly) {
    return (
      <div className="activity-centre min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <p>This Activity is no longer assigned. Your earlier work has been kept.</p>
        {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
      </div>
    );
  }

  // Graded completion shows the score as it was STORED, so re-opening a finished
  // run never quietly re-scores it under today's rules. A run stored under
  // scoring_version 1 counted unjudged items as wrong, and its parts were never
  // written down, so it is shown over its own item count and left alone. A
  // practice run has nothing stored and is always scored live.
  const liveScore = scoreFor(verdicts, items.length);
  const storedScore: RunScore | null =
    !practice && confirmedCompletion
      ? {
          numerator: assignment.score_numerator ?? 0,
          judged: assignment.score_judged ?? items.length,
          total: assignment.score_total ?? items.length,
          percent: assignment.score,
        }
      : null;
  const displayScore = storedScore ?? liveScore;

  if (progressLoadFailed) {
    return <div className="activity-centre min-h-screen p-8">
      <p role="alert">Could not load your saved progress. Your earlier answers are safe. Reload before continuing.</p>
      <button type="button" onClick={() => window.location.reload()}>Retry loading</button>
      {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
    </div>;
  }

  if (phase === "closing") {
    return <div className="activity-centre min-h-screen p-8">
      {completionError ? <>
        <p role="alert">Could not save completion to your account. Your answers are kept here. Retry to finish.</p>
        <button type="button" onClick={() => {
          const pending = closeoutRef.current;
          if (pending) void closeAssignment(pending.verdicts, pending.phase);
        }}>Retry completion</button>
      </> : <p role="status">Saving completion to your account...</p>}
      {handleLeave && <ActivityExitButton onExit={handleLeave} tone="light" />}
    </div>;
  }

  /**
   * The admin's own marker, on every phase of a run he is only looking at.
   * Without it the screen is indistinguishable from his own work, and the one
   * thing he must be able to trust is that nothing he types here lands on the
   * student's record.
   *
   * The second sentence is conditional because it was not always true. It
   * claimed her saved answers were on screen while Joshua looked at a section
   * library, which holds no items at all, and at a spoken drill, whose work is
   * a recording and a set of timings rather than anything a typed-answer view
   * can show. The half that always holds -- nothing he does here is recorded --
   * is the half that is always printed.
   */
  const showsSavedAnswers =
    assignment.item_format !== "spoken-recall" && Object.keys(responses).length > 0;
  const adminBanner = viewingSomeoneElse ? (
    <div className="mx-auto mb-4 max-w-5xl rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))] px-4 py-2 text-xs text-muted-foreground">
      {showsSavedAnswers
        ? "Admin view of a student\u2019s assignment. Their saved answers are shown; nothing you do here is recorded."
        : "Admin view of a student\u2019s assignment. Nothing you do here is recorded."}
    </div>
  ) : null;

  /*
   * The door. Joshua assigns Read, Recall, Colour; she picks which section to
   * run tonight, and she runs several. This Activity has no items of its own:
   * its content is the list.
   *
   * It sits ABOVE the `phase === "intro"` return rather than below it, because
   * the door has no intro to precede it -- it IS the first screen. Behind that
   * return it was unreachable except by pressing Start on an editorial page
   * written for the typed Activities, which is how a student met three screens
   * before her first run and only the last of them was designed for this drill.
   */
  if (assignment.mode === "section-library") {
    return (
      <div className="activity-centre min-h-screen" data-runner="section-library">
        {adminBanner}
        <SectionLibraryPanel
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          onExit={handleLeave}
        />
      </div>
    );
  }

  /*
   * A section's front door is its instructions, in full, on their own page.
   *
   * The editorial intro folded the method into tabs, so a student pressing
   * Start from the library either met a page she had to unfold or -- when the
   * launch skipped it -- a live microphone with no explanation at all.
   */
  if (phase === "intro" && assignment.mode === "section" && assignment.item_format === "spoken-recall") {
    return (
      <div className="activity-centre min-h-screen" data-runner="section-briefing">
        {adminBanner}
        <SectionBriefingPage
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          onStart={handleStart}
          onExit={handleLeave}
        />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <div className="activity-centre act-home" data-world={world?.slug}>
        {adminBanner}
        {practiceError && <p role="alert" className="p-4">{practiceError}</p>}
        <ActivityIntro
          title={assignment.title}
          subtitle={assignment.subtitle}
          instructions={assignment.instructions}
          itemCount={items.length}
          maxAttempts={MAX_ATTEMPTS}
          format={assignment.item_format}
          mode={assignment.mode}
          resumeAt={index + 1}
          preview={preview}
          canSaveProgress={!readOnly && Boolean(user)}
          /*
           * The goal is per accommodation, so there is no single "target" on the
           * assignment to read. A student on 70% extra time is not slow when she
           * takes longer, and showing her the standard clock would print a target
           * she is not being measured against.
           */
          timeGoalMinutes={assignment.time_goal_minutes?.[accommodation] ?? null}
          sourceSection={assignment.source_section}
          studentId={assignment.student_id}
          /*
           * Two gates, and they guard different things.
           *
           * `showHistory` keeps the block off a page Joshua is reading over a
           * student's shoulder, where "your last three runs" is not addressed to
           * the person looking at it. The `studentId` above is the one that makes
           * the READ safe: the admin SELECT policy on the grades table returns
           * every student's rows, so a flag here could never have been enough on
           * its own.
           */
          showHistory={!practice && !viewingSomeoneElse}
          onStart={handleStart}
          onExit={handleLeave}
        />
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div
        className="activity-centre min-h-screen bg-[hsl(var(--aw-page,var(--background)))] px-4 py-8 md:px-8 md:py-12"
        data-world={world?.slug}
      >
        <div className="mx-auto max-w-5xl">
          {adminBanner}
          {handleLeave && (
            <div className="mb-6">
              <ActivityExitButton onExit={handleLeave} tone="light" />
            </div>
          )}
          <CompletionSummary
            title={assignment.title}
            items={items}
            verdicts={verdicts}
            responses={responses}
            score={displayScore}
            practice={practice}
            onPractice={handlePracticeAgain}
            onRedrill={handleRedrill}
          />
        </div>
      </div>
    );
  }

  /**
   * Read, Recall, Colour takes the whole screen, not a column of it.
   *
   * It is a runner rather than a world
   * (`docs/adr/0009-read-recall-colour-is-a-runner-not-a-world.md`): there is no
   * typed answer for a world to sit beside, the unit she answers is a chunk
   * rather than an item, and during the recall the screen must carry nothing
   * readable at all, which a world could not arrange without reaching outside
   * itself to suppress the answer column.
   *
   * The hand-off is on `item_format`, which used to be a display string and is
   * now the switch that picks a player. Everything above this line still runs:
   * the assignment, its snapshot, its ownership check and its resume are the
   * same for RRC as for anything else.
   */
  if (assignment.item_format === "spoken-recall") {
    if (!user) return null;
    /*
     * Section mode is its own player, not a mode flag on the v1 one.
     *
     * The v1 runner's unit is the item and it judges each chunk as she goes; a
     * section's unit is the whole section and nothing may be judged until it
     * ends (ADR 0010, spec section 4). Those are different machines, so the
     * branch is here rather than inside RecallRunner, where the forbidden
     * feedback phase would still exist and have to be remembered around.
     *
     * `mode` comes off the assignment's own snapshot, not the Activity: the
     * clock is what her time is scored against, so a later edit to the
     * definition must not be able to rescore a run she has finished.
     */
    if (assignment.mode === "section") {
      /*
       * A finished section goes to its Report Card, not back to the intro.
       * Grading is a post-section job, so the card polls for a result that is
       * still being produced rather than being handed one.
       */
      if (phase === "report") {
        return (
          <div
            className="activity-centre rc-ground ac-section-handover min-h-screen px-4 py-12"
            data-runner="recall-section-report"
          >
            <SectionReport assignmentId={assignment.id} onDone={handleLeave ?? handleBackToIntro} />
          </div>
        );
      }
      return (
        <div className="activity-centre min-h-screen" data-runner="recall-section">
          <SectionRunner
            assignmentId={assignment.id}
            studentId={user.id}
            items={assignment.items}
            sourceSection={assignment.source_section}
            /*
             * The section builder needs the complete set of goals to validate
             * and build the run. `accommodation` tells it which one applies to
             * this student when the clock and grade are calculated.
             */
            timeGoalMinutes={assignment.time_goal_minutes}
            accommodation={accommodation}
            onComplete={() => setPhase("report")}
            onExit={handleBackToIntro}
          />
        </div>
      );
    }
    /*
     * Read, Recall, Colour is a whole section, and only that.
     *
     * The one-stimulus runner it used to fall back to here is gone: it walked a
     * chunk cursor, judged every chunk live and took typed answers, all three of
     * which section mode forbids (ADRs 0012 and 0013). Keeping it meant the same
     * name ran two different drills depending on a field, and the wrong one was
     * what a preview showed.
     *
     * An assignment without `mode: "section"` is content that predates the
     * decision. It is not deleted and nothing about it is lost; there is simply
     * no runner for it any more, and saying so plainly beats a blank screen.
     */
    return (
      <div className="activity-centre min-h-screen grid place-items-center px-6">
        <div className="max-w-md text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Read, Recall, Colour
          </p>
          <p className="mt-3 text-lg text-foreground">
            This one runs as a whole section now.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a section from the Activity Centre to start a run.
          </p>
          {handleLeave && (
            <button type="button" className="mt-6 text-sm underline" onClick={handleLeave}>
              Back to the Activity Centre
            </button>
          )}
        </div>
      </div>
    );
  }

  // The entrance is a one-shot animation that owns the screen, so it renders
  // before the split view rather than inside it.
  if (world && !entered) {
    const Entrance = world.Entrance;
    return (
      <div className="activity-centre min-h-screen" data-world={world.slug}>
        <Entrance onDone={() => setEntered(true)} title={assignment.title} />
      </div>
    );
  }

  return (
    <div className="activity-centre min-h-screen" data-world={world?.slug}>
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[minmax(320px,42%)_1fr]">
        {worldStage ? (
          /* The world carries the item itself, so the rail's job here is only
             the two things the world does not draw: the way out and the count.
             Falls back to the hero panel whenever the item does not parse into
             the world's domain, rather than rendering an empty world. */
          <aside
            ref={bandRef}
            className="ac-yard-band relative flex min-h-[200px] flex-col md:min-h-[560px] md:sticky md:top-0 md:h-screen"
            data-expanded={bandExpanded ? "true" : "false"}
          >
            <div className="flex items-center justify-between gap-3 bg-[hsl(var(--aw-page,var(--background)))] px-5 py-4 md:px-6">
              {handleBackToIntro && <ActivityExitButton onExit={handleBackToIntro} tone="light" />}
              {!isGeneral && <span className="text-[11px] font-semibold tabular-nums tracking-wide text-[hsl(var(--aw-soft,var(--muted-foreground)))]">
                {index + 1} / {items.length}
              </span>}
            </div>
            <div className="min-h-0 flex-1">{worldStage}</div>
            {/* Phone only. The world is the reward, not the route to the answer
                box: below md it rides as a band the student can open when they
                want it, and the answer box stays on the first screen. */}
            <button
              type="button"
              className="ac-band-toggle md:hidden"
              onClick={() => setBandExpanded((open) => !open)}
              aria-expanded={bandExpanded}
            >
              {bandExpanded ? "Collapse" : "Expand"}
            </button>
          </aside>
        ) : (
        <ActivityHeroPanel
          assignment={assignment}
          showProgress={!isGeneral}
          current={index + 1}
          total={items.length}
          onExit={handleBackToIntro}
        />
        )}
        {/* The answer column stands on the world's own ground; the work cards
            inside keep their light reading surface. */}
        <main className="min-h-screen bg-[hsl(var(--aw-page,var(--background)))]">
          {isGeneral && <ActivityProgress completed={items.filter(item => Object.prototype.hasOwnProperty.call(verdicts, item.order)).length} total={items.length} />}
          {saveStatus && savedPractice && <p role="status" className="px-6 pt-4 text-sm">{saveStatus}</p>}
          {practiceError && <p role="alert" className="px-6 pt-4 text-sm">{practiceError}</p>}
          {savedPractice ? (() => {
            const choices = buildPaperDiagramChoices(currentItem.credited_answers, currentItem.order);
            const attempts = savedPractice.answers.filter(answer => answer.questionId === String(currentItem.order));
            const last = attempts.at(-1);
            const resolved = !!last && (last.verdict === "correct" || last.revealed || last.attempt >= MAX_ATTEMPTS);
            const submitted = choices.find(choice => choice.responseText === last?.text);
            const historical = last && !submitted
              ? buildLegacyPaperDiagramChoices(currentItem.credited_answers, currentItem.order).find(choice => choice.responseText === last.text)
              : undefined;
            const selection = choices.some(choice => choice.id === savedPractice.selection) ? savedPractice.selection : "";
            const submit = async (reveal = false) => {
              if (resolved || (!reveal && savedPracticeRef.current?.stage !== "choices")) return;
              const choice = choices.find(candidate => candidate.id === savedPractice.selection);
              if (!reveal && !choice) return;
              const count = savedPractice.answers.length;
              const verdict = reveal ? last?.verdict ?? null : choice!.verdict;
              await handleRecord({ itemOrder: currentItem.order, responseText: reveal ? last?.text ?? "Answer revealed" : choice!.responseText, verdict, attemptNo: attempts.length + 1, judgeSource: "fast-path", revealed: reveal });
              if (savedPracticeRef.current?.answers.length === count) return;
              if (reveal || verdict === "correct" || attempts.length + 1 >= MAX_ATTEMPTS) handleResolved(currentItem.order, verdict);
            };
            return <div className="px-5 py-6 md:px-12 md:py-12">

              {!worldStage && !timedGeneral && <p className="mb-5 text-lg">{currentItem.prompt}</p>}
              {savedPractice.stage === "feedback" && historical && <section aria-label="Previously saved answer" className="mb-5 rounded-xl border border-border bg-card p-4">
                <p className="text-sm font-semibold">Your saved answer</p>
                <p className="mt-2 text-sm leading-relaxed">{last.text}</p>
                <p className="mt-2 text-xs text-muted-foreground">Answered before the paired choices were introduced. Your result is unchanged.</p>
              </section>}
              <PaperDiagramPanel key={`${savedPractice.id}:${currentItem.order}`} item={currentItem} choices={choices}
                diagramSeconds={generalPhase.seconds ?? undefined} paperDeadline={savedPractice.paperDeadline} phaseLabel={generalPhase.label}
                value={selection} onChange={selection => { updatePractice({ selection, ...(timedGeneral && savedPractice.stage === "paper" ? { stage: "choices" as const } : {}) }); }}
                paperReady={savedPractice.stage !== "paper"} onPaperReady={() => { updatePractice({ stage: "choices" }); }}
                onSubmit={() => { void submit(); }} onRetry={() => { updatePractice({ stage: "choices", selection: "" }); }}
                onShowAnswer={() => { void submit(true); }} onNext={() => { void handleNext(); }} judging={false}
                attempts={attempts.length} result={savedPractice.stage === "feedback" && last ? { verdict: last.verdict ?? "unchecked", feedback: last.revealed ? "Compare your diagram with the complete statement below." : submitted?.feedback ?? historical?.feedback ?? "Your saved result is unchanged." } : null}
                revealed={Boolean(last?.revealed)} resolved={resolved} isLast={index === items.length - 1}
                creditedSecondaryLabel={assignment.instructions?.credited_secondary_label} />
            </div>;
          })() : (
          <ActivityQuestionStack
            showQuestionNumber={!isGeneral}
            diagramSeconds={timedGeneral ? generalPhase.seconds ?? undefined : undefined}
            paperDeadline={assignedPaper?.key === assignedPaperKey ? assignedPaper.deadline : undefined}
            paperReady={timedGeneral ? assignedPaper?.key === assignedPaperKey && assignedPaper.ready : undefined}
            onPaperReady={timedGeneral ? finishAssignedPaper : undefined}
            phaseLabel={isGeneral ? generalPhase.label : undefined}
            items={items}
            format={assignment.item_format}
            coach={assignment.instructions?.coach}
            coachSource={preview && previewActivityId ? { sourceKind: "preview", sourceId: previewActivityId } : !preview ? { sourceKind: "assignment", sourceId: assignment.id } : undefined}
            answerLabel={assignment.instructions?.answer_label}
            answerPlaceholder={assignment.instructions?.answer_placeholder}
            creditedSecondaryLabel={assignment.instructions?.credited_secondary_label}
            promptInWorld={Boolean(worldStage && world?.carriesPrompt)}
            fastPath={world?.fastPath}
            localJudge={world?.localJudge}
            paperChoices={world?.paperChoices}
            shadowFault={world?.shadowFault}
            activeIndex={index}
            resumeAttempts={resumeAt?.index === index ? resumeAt.attempts : 0}
            resumeValue={resumeAt?.index === index ? resumeAt.text : ""}
            draftKeyFor={(itemOrder) => draftKey(savedPractice?.id ?? assignment.id, itemOrder)}
            onResolved={handleResolved}
            onRecord={handleRecord}
            onNext={handleNext}
          />
          )}
        </main>
      </div>
    </div>
  );
}

export default ActivityRunner;
