import { useEffect, useRef, useState } from "react";
import * as PauseDialog from "@radix-ui/react-dialog";
import { Pause } from "lucide-react";
import { loadPassageProgress, savePassageProgress } from "./lib/passageProgress";
import { createCapture, saveCaptureWindow, uploadCapture } from "./lib/captures";
import { finalizeAttempt, newId, readAttemptProgress } from "./lib/attempts";
import { clearCheckpoint, saveCheckpoint, contentKeyFor, type CheckpointRecap, type PendingPassageProgress } from "./lib/checkpoint";
import { buildSectionSteps, buildParagraphTrainingSteps, STEP_TITLE } from "./lib/sequence";
import { ActiveClock, toSeconds } from "./lib/activeClock";
import { discard } from "./lib/backup";
import { useRecapRecorder, type PreparedResult, type RecordedRecap } from "./useRecapRecorder";
import RcTrainingFeedback from "./RcTrainingFeedback";
import RcRecordingWaveform from "./RcRecordingWaveform";
import { recapLabel } from "./lib/history";
import { paragraphDisplayLabel } from "./lib/segment";
import LegacyRcRecallRunner, { formatClock } from "./LegacyRcRecallRunner";
import "./RcRecallRunner.css";
import "./ContinuousRcRecallRunner.css";

type Props = Parameters<typeof LegacyRcRecallRunner>[0];
type WindowIntent = { id: string; startMs: number; endMs: number; key: string; position: number; kind: "recall" | "passage_recap" };
export default function ContinuousRcRecallRunner(props: Props) {
  const { attempt, studentId, passages, segmented, scope, onExit, resume } = props;
  const showElapsedTimer = true;
  const paragraphFlow = attempt.segmentation_version === 2;
  const steps = useRef(paragraphFlow ? buildParagraphTrainingSteps(segmented) : buildSectionSteps("rc_recall", segmented, scope)).current;
  const initial = Math.min(resume?.stepIndex ?? 0, steps.length - 1);
  const [index, setIndex] = useState(steps[initial].kind === "recall" && !resume?.recaps.some((r) => r.key === steps[initial].recapKey) ? initial - 1 : initial);
  const [progressLoading, setProgressLoading] = useState(true);
  const [progressLoadError, setProgressLoadError] = useState(false);
  const [, refreshTimes] = useState(0);
  const [guide, setGuide] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [savingStage, setSavingStage] = useState<string | null>(null);
  const [leaveError, setLeaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [recaps, setRecaps] = useState<CheckpointRecap[]>(resume?.recaps ?? []);
  const [finished, setFinished] = useState<{ completed: boolean; seconds: number; error: string | null; retry: "save" | "refresh" | null } | null>(null);
  const [, setElapsed] = useState(toSeconds(resume?.sectionMs ?? 0));
  const [optionalStarted, setOptionalStarted] = useState(false);
  const recorder = useRecapRecorder();
  const everStarted = useRef(false);
  const capture = useRef<string | null>(null);
  const finalized = useRef<{ completed: boolean; seconds: number } | null>(null);
  const captureFailure = useRef<string | null>(null);
  const captureKeys = useRef(new Set<string>());
  const captureStart = useRef<number | null>(null);
  const windowIntent = useRef<WindowIntent | null>(null);
  const retained = useRef<{ id: string; recording: RecordedRecap } | null>(null);
  const lock = useRef(false), mounted = useRef(true), generation = useRef(0);
  const cancel = useRef<(() => void) | null>(null);
  const clock = useRef(new ActiveClock({ sectionMs: resume?.sectionMs, passageMs: resume?.passageMs }));
  const passageTimes = useRef<number[]>(resume?.passageTimesMs ?? passages.map((_, position) => position === steps[initial].passage ? resume?.passageMs ?? 0 : 0));
  const completedPositions = useRef(new Set(resume?.completedPassagePositions ?? []));
  const progressIntent = useRef<PendingPassageProgress | null>(resume?.pendingPassageProgress ?? null);
  const heading = useRef<HTMLHeadingElement>(null);
  const latest = useRef({ index, recaps, done: false, ready: false, pending: resume?.pending ?? null });
  latest.current.index = index; latest.current.recaps = recaps; latest.current.ready = ready;
  const key = props.contentKey ?? contentKeyFor({ preptest: attempt.preptest, section: attempt.section, passageIds: attempt.passage_ids });
  const step = steps[index];
  const displayedTime = clock.current.snapshot(Date.now());
  const persist = () => {
    if (latest.current.done) return;
    if (!resume && !everStarted.current && latest.current.index === 0 && latest.current.recaps.length === 0 && !latest.current.pending && !progressIntent.current && !captureFailure.current && !retained.current && completedPositions.current.size === 0 && passageTimes.current.every((ms) => ms === 0)) return;
    const totals = clock.current.snapshot(Date.now());
    const result = saveCheckpoint({ version: 1, captureWorkflow: true, studentId, attemptId: attempt.id, attempt, contentKey: key, scope,
      passageTimesMs: passageTimes.current.map((ms, position) => position === steps[latest.current.index].passage && !completedPositions.current.has(position + 1) ? Math.max(ms, totals.passageMs) : ms),
      completedPassagePositions: [...completedPositions.current], pendingPassageProgress: progressIntent.current,
      stepIndex: latest.current.index, stepId: steps[latest.current.index].id, recaps: latest.current.recaps,
      sectionMs: totals.sectionMs, passageMs: totals.passageMs, showElapsedTimer, savedAt: Date.now(), pending: latest.current.pending });
    if (!result.ok && mounted.current) setMessage("This device could not save your place. Keep this screen open until you finish.");
  };
  const loadProgress = async () => {
    setProgressLoading(true); setProgressLoadError(false);
    try {
      const rows = await loadPassageProgress(studentId, [attempt.id]);
      if (!mounted.current) return;
      rows.filter((row) => row.attempt_id === attempt.id).forEach((row) => {
        const position = row.passage_position - 1;
        if (position < 0 || position >= passages.length || attempt.passage_ids[position] !== row.passage_id) return;
        passageTimes.current[position] = Math.max(passageTimes.current[position] ?? 0, row.active_ms);
        if (row.completed) { passageTimes.current[position] = row.active_ms; completedPositions.current.add(row.passage_position); }
      });
      clock.current.restoreMinimum({ sectionMs: passageTimes.current.reduce((sum, ms) => sum + ms, 0), passageMs: passageTimes.current[step.passage] }, Date.now());
      setElapsed(toSeconds(clock.current.snapshot(Date.now()).sectionMs)); refreshTimes((value) => value + 1);
    } catch { if (mounted.current) setProgressLoadError(true); }
    finally { if (mounted.current) setProgressLoading(false); }
  };
  useEffect(() => { void loadProgress(); }, []);
  useEffect(() => {
    mounted.current = true;
    const tick = window.setInterval(() => setElapsed(toSeconds(clock.current.snapshot(Date.now()).sectionMs)), 1000);
    const hide = () => { clock.current.pause(Date.now()); persist(); };
    const show = () => { if (latest.current.ready && !pausedRef.current && !latest.current.pending && !latest.current.done) clock.current.start(Date.now()); };
    window.addEventListener("pagehide", hide); window.addEventListener("pageshow", show);
    return () => { mounted.current = false; generation.current += 1; cancel.current?.(); window.clearInterval(tick); window.removeEventListener("pagehide", hide); window.removeEventListener("pageshow", show); clock.current.pause(Date.now()); persist(); };
  }, []);
  useEffect(() => { if (ready && !latest.current.pending && !latest.current.done) clock.current.start(Date.now()); }, [ready]);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); persist(); }, [index, recaps, ready]);
  useEffect(() => { if (finished) heading.current?.focus({ preventScroll: true }); }, [finished]);
  const updateRecaps = (next: CheckpointRecap[]) => { latest.current.recaps = next; setRecaps(next); };
  const guarded = async (action: () => Promise<void>) => {
    if (lock.current) return; lock.current = true; setBusy(true);
    try { await action(); } catch (error) { if (mounted.current) setMessage(error instanceof Error ? error.message : "This step could not be saved. Try again."); }
    finally { lock.current = false; if (mounted.current) { setBusy(false); setSavingStage(null); } }
  };
  const begin = () => guarded(async () => {
    if (progressLoading || progressLoadError) return;
    setMessage(null); setWaiting(true); const token = ++generation.current;
    const canceled = new Promise<null>((resolve) => { cancel.current = () => resolve(null); });
    const preparing = recorder.prepare().then((result) => { if (result.ok && (!mounted.current || token !== generation.current)) result.stream.getTracks().forEach((track) => track.stop()); return result; });
    let prepared: PreparedResult | null;
    try { prepared = await Promise.race([preparing, canceled]); }
    finally { if (token === generation.current && mounted.current) { setWaiting(false); cancel.current = null; } }
    if (!prepared || !mounted.current || token !== generation.current) return;
    if (prepared.ok === false) { setMessage(`${prepared.reason.replace(/(?:Allow it, or choose|Choose) a silent recall instead\./gi, "").trim()} Allow microphone access, then try Start exercise again or choose another passage.`); return; }
    const id = newId();
    try {
      await createCapture(id, studentId, attempt.id, prepared.mimeType);
      if (!mounted.current || token !== generation.current) { prepared.stream.getTracks().forEach((track) => track.stop()); return; }
      const started = await recorder.start({ recapId: id, captureId: id, attemptId: attempt.id, studentId, recapKey: `capture-${id}` }, prepared);
      if (!mounted.current || token !== generation.current) { if (started.ok) await recorder.stop(); return; }
      if (started.ok === false) { setMessage(started.reason.replace(/Try again or choose a silent recall instead\./gi, "Try Start exercise again or choose another passage.")); return; }
      everStarted.current = true; capture.current = id; captureFailure.current = null; captureKeys.current = new Set(); setReady(true);
      if (!started.backup.ok) setMessage("Recording is running, but this device cannot keep a backup. Keep the screen open until your recording uploads.");
    } catch { prepared.stream.getTracks().forEach((track) => track.stop()); throw new Error("Recording could not start. Retry or choose another passage."); }
  });
  const cancelRequest = () => {
    generation.current += 1; cancel.current?.(); cancel.current = null; setWaiting(false);
    setMessage("Microphone request canceled. Dismiss the browser permission prompt, then retry or choose another passage.");
  };
  const advance = () => {
    if (index >= 2) setGuide(false);
    setOptionalStarted(false); captureStart.current = null; windowIntent.current = null;
    if (steps[index + 1]?.passage !== step.passage) { if (!completedPositions.current.has(step.passage + 1)) passageTimes.current[step.passage] = clock.current.snapshot(Date.now()).passageMs; clock.current.resetPassage(Date.now()); }
    setIndex((value) => value + 1);
  };
  const saveRecall = async () => {
    if (!step.recapKey) return;
    if (latest.current.recaps.some((r) => r.key === step.recapKey)) return;
    if (!capture.current || captureStart.current === null || recorder.interruption) throw new Error("This recall's recording was interrupted. Keep the saved audio and return to the passage list before starting again.");
    if (!windowIntent.current) windowIntent.current = { id: newId(), key: step.recapKey, startMs: captureStart.current, endMs: Math.max(captureStart.current + 1, recorder.getOffset()), position: step.passage + 1, kind: step.kind as "recall" | "passage_recap" };
    const intent = windowIntent.current;
    setSavingStage("Saving your recall…");
    const row = await saveCaptureWindow({ id: intent.id, studentId, attemptId: attempt.id, captureId: capture.current, recapKey: intent.key, passagePosition: intent.position, kind: intent.kind, startMs: intent.startMs, endMs: intent.endMs });
    captureKeys.current.add(step.recapKey);
    updateRecaps([...latest.current.recaps, { key: step.recapKey, voice: "spoken", state: row.recording_state, rowId: row.id, label: STEP_TITLE[step.kind] }]);
  };
  const storeCapture = async () => {
    if (capture.current) {
      const id = capture.current; capture.current = null;
      const recording = await recorder.stop();
      if (!recording) { captureFailure.current = "No complete recording is available to upload. Return to RC Training and check Your attempts for any partial audio this device may have kept. Automatic feedback is unavailable for this recording."; throw new Error(captureFailure.current); }
      retained.current = { id, recording };
    }
    const kept = retained.current; if (!kept) { if (captureFailure.current) throw new Error(captureFailure.current); return; }
    setSavingStage("Saving your recording…");
    await uploadCapture({ studentId, attemptId: attempt.id, captureId: kept.id, path: kept.recording.path, blob: kept.recording.blob, mimeType: kept.recording.mimeType, durationMs: kept.recording.durationMs });
    await discard(kept.id); retained.current = null;
    updateRecaps(latest.current.recaps.map((r) => captureKeys.current.has(r.key) ? { ...r, state: "saved" } : r));
  };
  const saveCurrentProgress = async (completed: boolean, resumeClock = true) => {
    const wasRunning = clock.current.running;
    clock.current.pause(Date.now());
    const position = step.passage + 1;
    if (!progressIntent.current) progressIntent.current = { passageId: attempt.passage_ids[step.passage], passagePosition: position,
      activeMs: Math.round(completedPositions.current.has(position) ? passageTimes.current[step.passage] : clock.current.snapshot(Date.now()).passageMs), completed };
    persist();
    const intent = progressIntent.current;
    setSavingStage("Saving your place…");
    const row = await savePassageProgress({ studentId, attemptId: attempt.id, ...intent });
    passageTimes.current[intent.passagePosition - 1] = row.active_ms;
    if (row.completed) completedPositions.current.add(intent.passagePosition);
    progressIntent.current = null;
    if (completed && !row.completed) {
      if (intent.completed) { progressIntent.current = intent; persist(); throw new Error("Passage completion could not be confirmed. Try again."); }
      await saveCurrentProgress(true, resumeClock); return;
    }
    persist(); refreshTimes((value) => value + 1);
    if (resumeClock && ready && !latest.current.done && (wasRunning || !latest.current.pending)) clock.current.start(Date.now());
  };
  const reconcileProgress = async () => {
    const progress = await readAttemptProgress(attempt.id, studentId);
    updateRecaps(latest.current.recaps.map((recap) => {
      const verified = progress.recaps.find((row) => row.id === recap.rowId && row.recap_key === recap.key);
      return verified ? { ...recap, state: verified.recording_state } : recap;
    }));
  };
  const refreshProgress = async () => {
    try { await reconcileProgress(); setFinished((value) => value ? { ...value, error: null, retry: null } : value); }
    catch { setFinished((value) => value ? { ...value, error: "Your result is saved, but recording status could not be checked. Refresh it when your connection returns.", retry: "refresh" } : value); }
  };
  const finish = async (completed: boolean) => {
    clock.current.pause(Date.now());
    const seconds = finalized.current?.seconds ?? latest.current.pending?.seconds ?? toSeconds(clock.current.snapshot(Date.now()).sectionMs);
    if (!finalized.current) await saveCurrentProgress(false, false);
    if (!finalized.current) { latest.current.pending = { completed, seconds, savedAt: Date.now() }; persist(); }
    let audioError = captureFailure.current;
    if (!captureFailure.current) {
      try { await storeCapture(); } catch (error) { audioError = error instanceof Error ? error.message : "Your recording has not uploaded yet."; }
    }
    try {
      if (!finalized.current) {
        setSavingStage("Saving your practice…");
        const saved = await finalizeAttempt({ attemptId: attempt.id, studentId, elapsedSeconds: seconds, completed });
        finalized.current = { completed: saved?.completed ?? completed, seconds: saved?.elapsed_seconds ?? seconds };
        latest.current.done = true; latest.current.pending = null; clearCheckpoint(studentId, attempt.id);
      }
    } catch {
      setFinished({ completed, seconds, error: "Your result could not be confirmed. Keep this screen open and try saving again.", retry: "save" }); return;
    }
    let refreshError = false;
    try { await reconcileProgress(); } catch { refreshError = true; }
    setFinished({ ...finalized.current, error: audioError ?? (refreshError ? "Your result is saved, but recording status could not be checked. Refresh it when your connection returns." : null),
      retry: captureFailure.current ? null : retained.current ? "save" : refreshError ? "refresh" : null });
  };
  const act = () => guarded(async () => {
    if (!ready || pausedRef.current || recorder.interruption || leaveError) return;
    setMessage(null);
    if (step.kind === "read") { captureStart.current = recorder.getOffset(); advanceTo(index + 1); return; }
    if (step.kind === "recall") {
      await saveRecall();
      if (paragraphFlow) {
        if (steps[index + 1]?.passage !== step.passage) await saveCurrentProgress(true);
        if (index + 1 >= steps.length) await finish(true); else advance();
      } else advanceTo(index + 1);
      return;
    }
    if (step.kind === "confirm" && steps[index + 1]?.kind !== "read") await saveCurrentProgress(true);
    if (step.kind === "passage_recap") {
      if (!optionalStarted) { captureStart.current = recorder.getOffset(); setOptionalStarted(true); return; }
      await saveRecall();

    }
    if (index + 1 >= steps.length) await finish(true); else advance();
  });
  const advanceTo = (next: number) => { if (index >= 2) setGuide(false); setIndex(next); };
  const action = useRef<(() => void) | null>(null); action.current = ready && !paused && !busy && !finished && !leaveError ? () => void act() : null;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('button,input,textarea,select,a,video,audio,summary,[contenteditable],[role="dialog"],[role="button"],[role="combobox"]') || document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]')) return;
      if (!action.current) return; event.preventDefault(); if (!event.repeat) action.current();
    };
    document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown);
  }, []);
  const leave = () => guarded(async () => {
    clock.current.pause(Date.now());
    try { await saveCurrentProgress(false, false); await storeCapture(); }
    catch {
      persist();
      setLeaveError(captureFailure.current ?? "Your progress or recording has not saved. Keep this page open to retry, or leave and check Your attempts for any audio this device may have kept.");
      return;
    }
    setLeaveError(null); persist(); onExit();
  });

  const pausePractice = () => {
    if (lock.current || busy || pausedRef.current) return;
    if (!recorder.interruption && !leaveError && !recorder.pause()) {
      setMessage("Your recording could not pause. Try again, or save and leave."); return;
    }
    clock.current.pause(Date.now()); pausedRef.current = true; setPaused(true); persist();
  };
  const resumePractice = () => {
    if (lock.current || busy || leaveError || recorder.interruption) return;
    if (!recorder.resume()) { setMessage("Your recording could not resume. Save your work and leave, then try again."); return; }
    pausedRef.current = false; setPaused(false); setGuide(false); setMessage(null);
    clock.current.start(Date.now()); heading.current?.focus({ preventScroll: true });
  };

  if (finished) return <main className="rct-run rct-continuous rct-completion" data-testid="rc-recall-finished"><div className="rct-completion-intro"><p className="rct-completion-eyebrow">RC Training</p><h1 ref={heading} tabIndex={-1}>{!finalized.current ? "Your practice needs saving" : retained.current ? "Recording needs saving" : captureFailure.current ? "Recording unavailable" : finished.completed ? "Practice complete" : "Practice ended early"}</h1><p role={finished.error ? "alert" : undefined}>{finished.error ?? "Your work is saved."}</p>{showElapsedTimer && <p>Total practice time: {formatClock(finished.seconds)}</p>}
    {finished.retry && <button type="button" disabled={busy} onClick={() => void guarded(() => finished.retry === "refresh" ? refreshProgress() : finish(finished.completed))}>{finished.retry === "refresh" ? "Refresh recording status" : "Try saving again"}</button>}
    <button type="button" className="rct-run-button" onClick={onExit}>Choose another passage</button></div><RcTrainingFeedback attemptId={attempt.id} enabled={finalized.current?.completed === true} autoReview={paragraphFlow && !finished.error && !finished.retry} displayLabels={Object.fromEntries(recaps.filter((recap) => recap.rowId).map((recap) => { const position = Number(/^p(\d+)-/.exec(recap.key)?.[1] ?? 1); return [recap.rowId!, recapLabel({ recap_key: recap.key, kind: recap.key.endsWith("passage-recap") ? "passage_recap" : "recall", passage_position: position }, segmented[position - 1], passages.length)]; }))} /></main>;
  const hidden = step.kind === "recall" || step.kind === "passage_recap";
  const paragraph = segmented[step.passage];
  const paragraphContext = paragraphDisplayLabel(paragraph, step.paragraph);
  const passageRecalls = steps.filter((item) => item.passage === step.passage && item.kind === "recall");
  const savedKeys = new Set(recaps.map((recap) => recap.key));
  const savedParagraphs = passageRecalls.filter((item) => item.recapKey && savedKeys.has(item.recapKey)).length;
  const recordingActive = ready && !paused && !recorder.interruption && !leaveError && recorder.isRecording();
  const nextStep = steps[index + 1];
  const nextLabel = paragraphFlow ? step.kind === "read" ? "Recall paragraph" : !nextStep ? (passages.length === 1 ? "Finish passage" : "Finish section") : nextStep.passage !== step.passage ? "Next passage" : "Next paragraph" : step.kind === "read" ? "Hide paragraph" : step.kind === "recall" ? "Check recall" : step.kind === "confirm" ? (nextStep?.kind === "read" ? "Next paragraph" : "Finish passage") : !optionalStarted ? "Begin whole-passage recall" : !nextStep ? "Finish practice" : "Finish recall";
  return <main className="rct-run rct-continuous" data-testid="rc-recall-runner" style={{ maxWidth: 1000, margin: "0 auto" }}>
    <header className="rct-focus-header"><div className="rct-location"><h1 className={ready ? "sr-only" : "text-xl font-semibold"}>RC Training</h1>{ready && <p className="rct-context">{passages.length > 1 && <span className="rct-passage-position">Passage {step.passage + 1} of {passages.length}</span>}<span>{step.kind === "passage_recap" ? "Whole-passage recall" : paragraphContext}</span></p>}{ready && completedPositions.current.has(step.passage + 1) && <p className="sr-only">Passage completed</p>}</div>
      {ready && <div className="rct-session-tools"><span className={`rct-capture-status${recordingActive ? " is-recording" : ""}`} role="status"><i aria-hidden="true" />{recordingActive ? "Recording" : paused ? "Paused" : recorder.interruption ? "Recording interrupted" : leaveError ? "Recording not saved" : "Recording stopped"}</span><button type="button" className="rct-pause-button" disabled={busy} onClick={pausePractice}><Pause size={16} aria-hidden="true" />Pause</button></div>}</header>
    {ready && <div className="rct-paragraph-progress" role="group" aria-label={`Paragraph progress: ${savedParagraphs} of ${passageRecalls.length} recalls completed`}>
      {passageRecalls.map((item, position) => { const saved = !!item.recapKey && savedKeys.has(item.recapKey); const current = item.paragraph === step.paragraph; return <span key={item.id} role="img" className={saved ? "is-saved" : current ? "is-current" : ""} aria-label={`Paragraph ${position + 1}: ${saved ? "recall complete" : current ? "current" : "not started"}`} aria-current={current ? "step" : undefined} />; })}
    </div>}
    {ready && <PauseDialog.Root open={paused} onOpenChange={() => undefined}><PauseDialog.Portal>
      <PauseDialog.Overlay className="rct-pause-overlay" />
      <PauseDialog.Content onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()} onInteractOutside={(event) => event.preventDefault()} className="rct-pause-panel rct-continuous" onCloseAutoFocus={(event) => { event.preventDefault(); heading.current?.focus({ preventScroll: true }); }}>
        <PauseDialog.Title>Practice paused</PauseDialog.Title>
        <PauseDialog.Description>{recorder.interruption || leaveError ? "Your practice is paused. Save your work before leaving." : "Your timer and recording are paused."}</PauseDialog.Description>
        <p className="rct-pause-context">{paragraphContext}</p>
        <div role="timer" aria-label="Active practice time" className="rct-pause-time"><span>Passage practice time: {formatClock(toSeconds(completedPositions.current.has(step.passage + 1) ? passageTimes.current[step.passage] : displayedTime.passageMs))}</span>{(passages.length > 1 || step.kind === "passage_recap") && <span>Total practice time: {formatClock(toSeconds(displayedTime.sectionMs))}</span>}</div>
        <button type="button" className="rct-run-button" disabled={busy || !!leaveError || !!recorder.interruption} onClick={resumePractice} autoFocus>Resume</button>
        {busy && <p role="status" className="rct-save-status">{savingStage ?? "Saving…"}</p>}
        <div className="rct-pause-links"><button type="button" disabled={busy} onClick={() => void leave()}>Save and leave</button><button type="button" disabled={busy} onClick={() => { if (window.confirm("Finish this practice early? Your progress will be saved.")) void guarded(() => finish(false)); }}>Finish early</button></div>
        <button type="button" className="rct-instructions-toggle" onClick={() => setGuide((value) => !value)}>{guide ? "Hide instructions" : "Show instructions"}</button>
        {guide && <aside aria-label="Exercise instructions"><p>{paragraphFlow ? "Read the paragraph at your own pace. Choose Recall paragraph to hide it, then explain it aloud in your own words. Choose Next paragraph when you’re ready to continue. Space also moves you to the next step." : "Read the paragraph. Press Space to hide it and recall it aloud. Press Space again to check."}</p></aside>}
        {leaveError ? <section aria-label="Recording not saved"><p role="alert">{leaveError}</p>{(retained.current || capture.current) && <button type="button" disabled={busy} onClick={() => void leave()}>Try saving recording again</button>}</section> : (message || recorder.interruption) && <p role="alert">{message || recorder.interruption}</p>}
        {leaveError && <button type="button" disabled={busy} onClick={() => { persist(); onExit(); }}>Leave anyway</button>}
      </PauseDialog.Content>
    </PauseDialog.Portal></PauseDialog.Root>}
    {leaveError && !paused && <section aria-label="Recording not saved" className="my-4"><p role="alert">{leaveError}</p>
      {(retained.current || capture.current) && <button type="button" disabled={busy} onClick={() => void leave()}>Try saving recording again</button>}
      <button type="button" disabled={busy} onClick={() => { persist(); onExit(); }}>Leave anyway</button>
    </section>}
    {progressLoadError && <section role="alert"><p>Your saved passage progress could not be loaded.</p><button type="button" onClick={() => void loadProgress()}>Retry loading progress</button></section>}
    {!ready ? <>
      <div className="rct-exercise-body"><section className="rct-step-content rct-setup-content" aria-label="Microphone setup"><p>Allow microphone access to record as you read and recall; feedback checks only your hidden-text recalls.</p>
        {waiting && <div className="rct-permission-status"><p role="status">Waiting for microphone permission. Allow access in your browser, or cancel this request.</p><button type="button" onClick={() => cancelRequest()}>Cancel microphone request</button></div>}
        {message && !paused && <p role="alert" className="my-4">{message}</p>}
      </section></div>
      <footer className="rct-exercise-actions"><button type="button" className="rct-quiet-exit" disabled={busy && !waiting} onClick={() => { cancelRequest(); persist(); onExit(); }}>Choose another passage</button>
        <div className="rct-primary-actions"><button type="button" className="rct-run-button" disabled={busy || progressLoading || progressLoadError} onClick={() => void begin()}>Start exercise</button></div>
      </footer>
    </>
    : <>
      <div className="rct-exercise-body" key={`${step.id}:${hidden ? "recall" : "read"}`}>
        <div className={`rct-step-content rct-step-transition${hidden ? " is-recall" : ""}`}>
          <h2 ref={heading} tabIndex={-1} className="sr-only outline-none">{step.kind === "passage_recap" ? "Recall the whole passage" : hidden ? "Recall the whole paragraph" : step.kind === "confirm" ? "Check your recall" : "Read the whole paragraph"}</h2>
          {recorder.interruption && <section aria-label="Recording interrupted" className="rct-inline-notice"><p role="alert">{recorder.interruption}</p><button type="button" disabled={busy} onClick={() => void leave()}>Save recording and leave</button></section>}
          <section className={`rct-source rct-focus-source${hidden ? " rct-recall-source" : ""}`} aria-label={hidden ? "Passage text hidden" : "Passage text"}>
            {hidden ? <div className="rct-recall-prompt"><h3>Your turn.</h3><p>Explain what you just read in your own words.</p><div className="rct-waveform-slot"><RcRecordingWaveform active={recordingActive} level={recorder.micLevel ?? 0} available={recorder.micAvailable ?? false} /></div></div> : step.visible.map((position, visibleIndex) => {
              const source = paragraph.paragraphs[position];
              const previous = visibleIndex > 0 ? paragraph.paragraphs[step.visible[visibleIndex - 1]] : null;
              return <div key={position} className="mb-8 last:mb-0">{source.sub && previous?.sub !== source.sub && <h3 className="sr-only">Passage {source.sub}</h3>}<p style={{ whiteSpace: "pre-line" }}>{source.text}</p></div>;
            })}
          </section>
          {step.kind === "passage_recap" && <p className="rct-optional-note">Passage time is saved. This optional recall adds to your total time.</p>}
          {message && !paused && <p role="alert" className="my-4">{message}</p>}
        </div>
      </div>
      <footer className="rct-exercise-actions">
        <div className="rct-action-context" role="status">{busy ? savingStage ?? "Saving…" : null}</div>
        <div className="rct-primary-actions"><button type="button" className="rct-run-button" disabled={paused || busy || !!recorder.interruption || !!leaveError} onClick={() => void act()}>{busy ? "Saving…" : nextLabel}<span aria-hidden="true">Space</span></button>
        {step.optional && !optionalStarted && <button type="button" disabled={busy || paused} onClick={() => void guarded(async () => { if (index + 1 === steps.length) await finish(true); else advance(); })}>Skip optional recall</button>}</div>
      </footer>
    </>}


  </main>;
}
