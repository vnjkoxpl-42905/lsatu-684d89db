import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { discard } from "./lib/backup";
import {
  finalizeAttempt, insertRecap, markRecapFailed, markUnstartedRecapFailed, resetFailedRecap, uploadRecording,
  type AttemptRow, type RecapRow,
} from "./lib/attempts";
import { ActiveClock, toSeconds } from "./lib/activeClock";
import {
  clearCheckpoint, contentKeyFor, saveCheckpoint, type Checkpoint, type CheckpointRecap, type PendingFinalization,
} from "./lib/checkpoint";
import {
  MODE_LABEL, STEP_TITLE, buildSectionSteps, stepInstruction,
  type ConfirmScope, type RecallMode, type RecallStep, type Voice,
} from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";
import { useRecapRecorder, type PreparedResult, type RecordedRecap } from "./useRecapRecorder";
import { ArrowRight, BookOpen, Check, CheckCircle2, Clock3, EyeOff, Mic, VolumeX } from "lucide-react";
import RcTrainingFeedback from "./RcTrainingFeedback";
import "./RcRecallRunner.css";

const panel = { background: "var(--rc-card)", borderColor: "var(--rc-outline-2)" };
const muted = { color: "var(--rc-text-2)" };
const button = "rct-run-button inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
const primary = { background: "var(--rc-accent, #494387)", color: "#fff" };
const secondary = { border: "1px solid var(--rc-outline-2)", color: "var(--rc-text)" };

export const formatClock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

type RecapProgress = CheckpointRecap & {
  /** Whether an on-device copy of the audio exists. Unknown until the recording stops. */
  copy?: "device" | "none";
};

interface Props {
  mode: RecallMode;
  scope: ConfirmScope;
  passages: RcPassage[];
  segmented: SegmentedPassage[];
  attempt: AttemptRow;
  studentId: string;
  /** Leaves practice. Unfinished work stays on this device and can be resumed. */
  onExit: () => void;
  showElapsedTimer?: boolean;
  /** Same-device progress to continue from, already validated against this section. */
  resume?: Checkpoint | null;
  contentKey?: string;
}

const STAGES = ["Read", "Hide and recall", "Check"] as const;
const stageOf = (step: RecallStep): number => (step.kind === "read" ? 0 : step.kind === "confirm" ? 2 : 1);

interface Retained { blob: Blob; path: string; mimeType: string; durationMs: number }

export default function RcRecallRunner({ mode, scope, passages, segmented, attempt, studentId, onExit, showElapsedTimer = true, resume = null, contentKey }: Props) {
  const steps = useMemo(() => buildSectionSteps(mode, segmented, scope), [mode, segmented, scope]);
  const key = contentKey ?? contentKeyFor({ preptest: attempt.preptest ?? 0, section: attempt.section ?? 0, passageIds: attempt.passage_ids ?? [] });
  const [index, setIndex] = useState(() => Math.min(Math.max(resume?.stepIndex ?? 0, 0), steps.length - 1));
  const [voice, setVoice] = useState<Voice>("silent");
  const [paragraphVoice, setParagraphVoice] = useState<Voice>("spoken");
  const [micFailure, setMicFailure] = useState<string | null>(null);
  const startedStep = useRef<string | null>(null);
  const keyboardAction = useRef<(() => void) | null>(null);
  const [phase, setPhase] = useState<"idle" | "recalling">("idle");
  const [busy, setBusy] = useState(false);
  const [savingAudio, setSavingAudio] = useState(false);
  const [waitingForMic, setWaitingForMic] = useState(false);
  const mounted = useRef(true);
  const prepareGeneration = useRef(0);
  const cancelPermission = useRef<(() => void) | null>(null);
  const silentAfterCancel = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; prepareGeneration.current += 1; cancelPermission.current?.(); };
  }, []);
  const [notice, setNotice] = useState<string | null>(null);
  const [placeNotice, setPlaceNotice] = useState<string | null>(null);
  const [recaps, setRecaps] = useState<RecapProgress[]>(() => resume?.recaps ?? []);
  const [finished, setFinished] = useState<null | { completed: boolean; seconds: number; error: string | null }>(null);
  const clock = useRef(new ActiveClock({ sectionMs: resume?.sectionMs, passageMs: resume?.passageMs }));
  const [elapsed, setElapsed] = useState(() => toSeconds(resume?.sectionMs ?? 0));
  const [passageElapsed, setPassageElapsed] = useState(() => toSeconds(resume?.passageMs ?? 0));
  const completionSeconds = useRef<number | null>(null);
  const inFlight = useRef(false);
  const retained = useRef(new Map<string, Retained>());
  const unstarted = useRef(new Set<string>());
  const heading = useRef<HTMLHeadingElement>(null);
  const recorder = useRecapRecorder();
  const step = steps[index];

  // What the unmount and pagehide handlers must write, without re-binding them every render.
  const latest = useRef({ index, recaps, pending: resume?.pending ?? null as PendingFinalization | null, done: false });
  latest.current.index = index;
  latest.current.recaps = recaps;

  const persist = useCallback((): boolean => {
    const l = latest.current;
    if (l.done) return true;
    const now = Date.now();
    const t = clock.current.snapshot(now);
    const saved = saveCheckpoint({
      version: 1, studentId, attemptId: attempt.id, attempt, contentKey: key, scope, stepIndex: l.index, stepId: steps[l.index].id,
      recaps: l.recaps.map(({ copy: _copy, ...r }) => r), sectionMs: t.sectionMs, passageMs: t.passageMs,
      showElapsedTimer, savedAt: now, pending: l.pending,
    });
    setPlaceNotice(saved.ok === false ? `${saved.reason} If you leave, you will need to start this practice again.` : null);
    return saved.ok;
  }, [studentId, attempt, key, scope, steps, showElapsedTimer]);

  // Count active time only: from mount until the route is left or the page is hidden for good.
  useEffect(() => {
    clock.current.start(Date.now());
    const tick = window.setInterval(() => {
      const t = clock.current.snapshot(Date.now());
      setElapsed(toSeconds(t.sectionMs));
      setPassageElapsed(toSeconds(t.passageMs));
    }, 1000);
    const hide = () => { clock.current.pause(Date.now()); persist(); };
    const show = () => { if (!latest.current.done && !latest.current.pending && completionSeconds.current === null && !inFlight.current) clock.current.start(Date.now()); };
    window.addEventListener("pagehide", hide);
    window.addEventListener("pageshow", show);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("pageshow", show);
      clock.current.pause(Date.now());
      persist();
    };
  }, [persist]);

  useEffect(() => { heading.current?.focus(); setNotice(null); persist(); }, [index, persist]);
  useEffect(() => { persist(); }, [recaps, persist]);

  // Spoken recording starts only on an explicit click; silent recall starts as soon as the text is hidden.
  useEffect(() => { setPhase(startedStep.current === step.recapKey ? "recalling" : "idle"); }, [index, step.recapKey]);
  useEffect(() => { if (recorder.interruption) setNotice(recorder.interruption); }, [recorder.interruption]);

  const setRecap = useCallback((k: string, patch: Partial<RecapProgress>) =>
    setRecaps((list) => list.map((r) => (r.key === k ? { ...r, ...patch } : r))), []);
  const failedSilent = recaps.filter((r) => r.voice === "silent" && r.state === "failed").length;
  const markFailed = useCallback(async (rowId: string) => {
    try { await markRecapFailed(rowId, studentId); }
    catch { setNotice("We could not update the saved status of one recording. It is not counted as saved."); }
  }, [studentId]);

  /** Run one student action at a time. The lock is taken before any state update lands. */
  const guarded = async (action: () => Promise<void>): Promise<void> => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    try { await action(); }
    finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
      if (silentAfterCancel.current && mounted.current) { silentAfterCancel.current = false; void recallSilently(); }
    }
  };

  /** Record a silent recall. A failed row is reported, never silently dropped. */
  const saveSilent = async (): Promise<void> => {
    const k = step.recapKey!;
    const prior = recaps.find((r) => r.key === k);
    if (prior?.state === "saved" || prior?.state === "not_recorded") return;
    setRecaps((list) => [...list.filter((r) => r.key !== k), { key: k, voice: "silent", state: "not_recorded", rowId: prior?.rowId ?? null, label: STEP_TITLE[step.kind] }]);
    try {
      if (prior?.rowId && unstarted.current.has(prior.rowId)) await markUnstartedRecapFailed(prior.rowId, studentId);
      const row = prior?.rowId
        ? await resetFailedRecap(prior.rowId, studentId, "silent")
        : await insertRecap({ attemptId: attempt.id, studentId, recapKey: k, passagePosition: step.passage + 1, kind: step.kind as RecapRow["kind"], voice: "silent" });
      setRecap(k, { rowId: row.id });
    } catch {
      setRecap(k, { state: "failed", rowId: null });
      setNotice("One recall could not be saved. The rest of your attempt is unaffected.");
    }
  };

  const startRecall = async (target: RecallStep = step): Promise<boolean> => {
    if (!target.recapKey || (target.kind !== "recall" && (!target.voiceChoice || voice !== "spoken"))) { setPhase("recalling"); return true; }
    setNotice(null);
    const k = target.recapKey;
    const generation = ++prepareGeneration.current;
    setWaitingForMic(true);
    const canceled = new Promise<null>((resolve) => { cancelPermission.current = () => resolve(null); });
    const preparing = recorder.prepare().then((result) => {
      if (result.ok && (!mounted.current || generation !== prepareGeneration.current)) result.stream.getTracks().forEach((track) => track.stop());
      return result;
    }).catch((): PreparedResult => ({ ok: false, reason: "The microphone could not be opened. Retry or continue silently." }));
    let prepared: PreparedResult | null;
    try { prepared = await Promise.race([preparing, canceled]); }
    finally {
      if (generation === prepareGeneration.current) { cancelPermission.current = null; if (mounted.current) setWaitingForMic(false); }
    }
    if (!prepared || !mounted.current || generation !== prepareGeneration.current) return false;
    if (prepared.ok === false) { setNotice(prepared.reason); if (target.kind === "recall") setMicFailure(prepared.reason); return false; }
    const prior = recaps.find((r) => r.key === k);
    let row: RecapRow;
    try {
      if (prior?.rowId && unstarted.current.has(prior.rowId)) await markUnstartedRecapFailed(prior.rowId, studentId);
      row = prior?.rowId
        ? await resetFailedRecap(prior.rowId, studentId, "spoken")
        : await insertRecap({ attemptId: attempt.id, studentId, recapKey: k, passagePosition: target.passage + 1, kind: target.kind as RecapRow["kind"], voice: "spoken" });
    } catch {
      prepared.stream.getTracks().forEach((track) => track.stop());
      setNotice("This recall could not be started, so nothing was recorded. Try again or choose a silent recall.");
      if (target.kind === "recall") setMicFailure("The recording could not start. Retry, or continue silently without automatic feedback.");
      return false;
    }
    if (!mounted.current || generation !== prepareGeneration.current) {
      prepared.stream.getTracks().forEach((track) => track.stop());
      void markUnstartedRecapFailed(row.id, studentId).catch(() => undefined);
      return false;
    }
    const started = await recorder.start({ recapId: row.id, attemptId: attempt.id, studentId, recapKey: k }, prepared);
    if (!mounted.current || generation !== prepareGeneration.current) return false;
    if ("reason" in started) {
      if (started.preserveExisting) { setNotice(started.reason); if (target.kind === "recall") setMicFailure(started.reason); return false; }
      unstarted.current.add(row.id);
      try { await markUnstartedRecapFailed(row.id, studentId); }
      catch { /* Retry reconciles this marker before resetting the pathless row. */ }
      setRecaps((list) => [...list.filter((r) => r.key !== k), { key: k, voice: "spoken", state: "failed", rowId: row.id, label: STEP_TITLE[target.kind] }]);
      setNotice(started.reason);
      if (target.kind === "recall") setMicFailure("The recording could not start. Retry, or continue silently without automatic feedback.");
      return false;
    }
    setRecaps((list) => [...list.filter((r) => r.key !== k), { key: k, voice: "spoken", state: "pending", rowId: row.id, label: STEP_TITLE[target.kind], copy: started.backup.ok ? "device" : "none" }]);
    if (started.backup.ok === false) setNotice(`Recording started, but ${started.backup.reason.toLowerCase()} If this page closes before it uploads, this recording cannot be recovered.`);
    startedStep.current = k;
    setMicFailure(null);
    setPhase("recalling");
    return true;
  };

  /** Send one finished recording. It stays in memory until it is confirmed saved, so a retry has something to send. */
  const upload = async (k: string, rowId: string, kept: Retained, copy: "device" | "none"): Promise<void> => {
    retained.current.set(rowId, kept);
    try {
      await uploadRecording({ studentId, attemptId: attempt.id, recapId: rowId, path: kept.path, blob: kept.blob, mimeType: kept.mimeType, durationMs: kept.durationMs });
      await discard(rowId);
      retained.current.delete(rowId);
      setRecap(k, { state: "saved" });
    } catch {
      setRecap(k, { state: "failed", copy });
    }
  };
  const uploadRecorded = (k: string, rowId: string, recorded: RecordedRecap) =>
    upload(k, rowId, { blob: recorded.blob, path: recorded.path, mimeType: recorded.mimeType, durationMs: recorded.durationMs }, recorded.backup.ok ? "device" : "none");

  const retryUpload = (k: string) => guarded(async () => {
    const row = recaps.find((r) => r.key === k);
    const kept = row?.rowId ? retained.current.get(row.rowId) : undefined;
    if (!row?.rowId || !kept) return;
    setRecap(k, { state: "pending" });
    await upload(k, row.rowId, kept, row.copy ?? "none");
  });

  const downloadCopy = (k: string) => {
    const row = recaps.find((r) => r.key === k);
    const kept = row?.rowId ? retained.current.get(row.rowId) : undefined;
    if (!kept) return;
    const url = URL.createObjectURL(kept.blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = kept.path.slice(kept.path.lastIndexOf("/") + 1);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
  };

  const finalize = async (completed: boolean): Promise<void> => {
    clock.current.pause(Date.now());
    if (recorder.isRecording()) {
      const activeId = recorder.activeRecapId();
      const recorded = await recorder.stop();
      const open = recaps.find((r) => r.rowId === activeId);
      if (recorded && open?.rowId) void uploadRecorded(open.key, open.rowId, recorded);
      else if (!recorded && open?.rowId) {
        await markFailed(open.rowId);
        setRecap(open.key, { state: "failed" });
      }
    }
    // The first duration wins, so a retry after a failure reports the same time.
    if (completionSeconds.current === null) completionSeconds.current = toSeconds(clock.current.snapshot(Date.now()).sectionMs);
    const seconds = completionSeconds.current;
    // Write the intent before the request: leaving during the request must keep
    // both the intended result and its original duration for reconciliation.
    latest.current.pending = { completed, seconds, savedAt: Date.now() };
    const durable = persist();
    try {
      const row = await finalizeAttempt({ attemptId: attempt.id, studentId, elapsedSeconds: seconds, completed });
      // If it was already finished, the stored result is the true one.
      latest.current.pending = null;
      latest.current.done = true;
      clearCheckpoint(studentId, attempt.id);
      setFinished({ completed: row?.completed ?? completed, seconds: row?.elapsed_seconds ?? seconds, error: null });
    } catch {
      setFinished({ completed, seconds, error: durable
        ? "We could not confirm that your result was saved. Your time is kept on this device and the attempt stays in your list, so you can try again now or later."
        : "We could not confirm that your result was saved, and this device could not keep a backup of the result. Keep this screen open and try saving again before leaving." });
    }
  };

  const advance = async (): Promise<void> => {
    if (index + 1 < steps.length) {
      if (steps[index + 1].passage !== step.passage) {
        clock.current.resetPassage(Date.now());
        setPassageElapsed(0);
      }
      setIndex(index + 1);
    } else await finalize(true);
  };

  const finishRecall = () => guarded(async () => {
    const k = step.recapKey!;
    const current = recaps.find((r) => r.key === k);
    if ((step.voiceChoice || (step.kind === "recall" && mode === "rc_recall")) && phase === "recalling" && current?.voice === "spoken" && current.rowId) {
      const recorded = await recorder.stop();
      setPhase("idle");
      if (recorded) {
        setSavingAudio(true);
        try { await uploadRecorded(k, current.rowId, recorded); }
        finally { setSavingAudio(false); }
      }
      else { await markFailed(current.rowId); setRecap(k, { state: "failed" }); }
    } else await saveSilent();
    await advance();
  });

  const continueFromStep = () => guarded(advance);
  const endAttempt = () => {
    if (!window.confirm("End this attempt now? It will be saved as not completed.")) return;
    void guarded(() => finalize(false));
  };
  const hideAndRecall = () => guarded(async () => {
    const next = steps[index + 1];
    if (mode === "rc_recall" && next?.kind === "recall") {
      if (!await startRecall(next)) return;
      setParagraphVoice("spoken");
    }
    await advance();
  });
  const cancelMicRequest = (continueSilently = false) => {
    silentAfterCancel.current = continueSilently;
    prepareGeneration.current += 1;
    cancelPermission.current?.();
    cancelPermission.current = null;
    setWaitingForMic(false);
    setMicFailure("The microphone request was canceled. Retry or continue silently without automatic feedback.");
    setNotice("Microphone request canceled. If your browser still shows its permission prompt, you can dismiss it.");
  };
  const recallSilently = () => guarded(async () => {
    setParagraphVoice("silent");
    setMicFailure(null);
    setNotice(null);
    await advance();
  });
  const leave = () => guarded(async () => {
    if (recorder.isRecording()) {
      const active = recaps.find((r) => r.rowId === recorder.activeRecapId());
      const recorded = await recorder.stop();
      setPhase("idle");
      if (recorded && active?.rowId) await uploadRecorded(active.key, active.rowId, recorded);
      else if (active?.rowId) { await markFailed(active.rowId); setRecap(active.key, { state: "failed" }); }
    }
    persist();
    onExit();
  });

  const interruptedParagraph = step.kind === "recall" && phase !== "recalling" && (resume?.recaps ?? []).some((r) => r.key === step.recapKey && r.voice === "spoken" && (r.state === "pending" || r.state === "failed"));
  keyboardAction.current = !finished && !busy && !interruptedParagraph ? () => {
    if (step.kind === "read") void hideAndRecall();
    else if (step.kind === "confirm") void continueFromStep();
    else if (step.kind === "recall") void finishRecall();
  } : null;
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat || event.altKey || event.ctrlKey || event.metaKey || inFlight.current) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('button,input,textarea,select,a,audio,video,summary,[contenteditable],[role="button"],[role="slider"],[role="dialog"],[role="combobox"],[role="textbox"],[role="checkbox"],[role="radio"],[role="switch"],[role="menuitem"],[role="option"],[role="tab"]')) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"],dialog[open]') || !keyboardAction.current) return;
      event.preventDefault();
      keyboardAction.current();
    };
    document.addEventListener("keydown", keydown);
    return () => document.removeEventListener("keydown", keydown);
  }, []);

  if (finished) {
    return <FinishedPanel attemptId={attempt.id} mode={mode} showElapsedTimer={showElapsedTimer} finished={finished} recaps={recaps} onExit={onExit}
      onRetry={() => { void guarded(() => finalize(finished.completed)); }} busy={busy}
      canRetryUpload={(k) => { const r = recaps.find((x) => x.key === k); return !!(r?.rowId && retained.current.has(r.rowId)); }}
      onRetryUpload={(k) => { void retryUpload(k); }} onDownload={downloadCopy} />;
  }

  const hidden = step.visible.length === 0;
  const effectiveVoice: Voice = step.kind === "recall" && mode === "rc_recall" ? paragraphVoice : step.voiceChoice ? voice : "silent";
  const isRecap = step.recapKey !== null;
  const recalling = isRecap && (effectiveVoice === "silent" || phase === "recalling");
  const passage = segmented[step.passage];
  const recallScope = step.kind === "passage_recap" ? "the whole passage" : step.kind === "cumulative" ? `paragraphs 1 to ${step.paragraph + 1}` : `paragraph ${step.paragraph + 1}`;
  const nextStep = steps[index + 1];
  const nextAction = !nextStep ? "finish practice" : nextStep.passage !== step.passage ? "start next passage" : nextStep.kind === "read" ? "next paragraph" : nextStep.kind === "passage_recap" ? "optional passage recall" : nextStep.kind === "confirm" ? "check the text" : "recall everything so far";
  const stage = stageOf(step);
  const recordingStarted = isRecap && effectiveVoice === "spoken" && phase === "recalling" && !recorder.interruption;
  const savedRecap = isRecap && recaps.some((r) => r.key === step.recapKey && (r.state === "saved" || r.state === "not_recorded"));
  const interruptedRecap = isRecap && phase !== "recalling" && (resume?.recaps ?? []).some((r) => r.key === step.recapKey && r.voice === "spoken" && (r.state === "pending" || r.state === "failed"));

  return <div className="rct-run" data-testid="rc-recall-runner">
    <header className="rct-run-header">
      <div><p className="rct-run-eyebrow">RC Training{mode !== "rc_recall" && <> <span>/</span> {MODE_LABEL[mode]}</>}</p>
        <p className="rct-run-location">Passage {step.passage + 1} <span>of {passages.length}</span> · Paragraph {step.paragraph + 1} <span>of {passage.paragraphs.length}</span></p></div>
      {showElapsedTimer && <div className="rct-run-clocks" aria-label="Elapsed timers">
        <div className="rct-run-clock"><Clock3 size={16} aria-hidden="true" /><span className="rct-run-clock-label">This passage</span><span aria-label="Passage elapsed time" className="tabular-nums">{formatClock(passageElapsed)}</span></div>
        <div className="rct-run-clock"><span className="rct-run-clock-label">Practice total</span><span aria-label="Section elapsed time" className="tabular-nums">{formatClock(elapsed)}</span></div>
        <span className="rct-run-clock-label">Counting up. No time limit. Time pauses when you leave this screen.</span>
      </div>}
    </header>
    <div className="rct-run-section-progress" aria-label="Passage progress">
      {passages.map((_, position) => <div key={position} className={`rct-run-passage ${position === step.passage ? "is-current" : position < step.passage ? "is-done" : ""}`} aria-current={position === step.passage ? "step" : undefined}>
        <span>{position < step.passage ? <Check size={13} aria-hidden="true" /> : String(position + 1).padStart(2, "0")}</span><span>Passage {position + 1}</span>
      </div>)}
    </div>
    <ol className="rct-run-stages" aria-label={step.kind === "passage_recap" ? "Passage end" : "Steps for each paragraph"}>
      {step.kind === "passage_recap"
        ? <li aria-current="step" className="is-current">Optional passage recall</li>
        : STAGES.map((label, position) => <li key={label} aria-current={position === stage ? "step" : undefined} className={position === stage ? "is-current" : position < stage ? "is-done" : ""}>{label}</li>)}
    </ol>
    {placeNotice && <p role="status" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>{placeNotice}</p>}
    {failedSilent > 0 && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>
      {failedSilent} silent recall record{failedSilent === 1 ? "" : "s"} could not be saved. Your other recalls are unaffected.
    </p>}
    <div className="rct-run-workspace">
      <aside className="rct-run-guide">
        <span className="rct-run-stage-icon">{hidden ? <EyeOff size={22} aria-hidden="true" /> : step.kind === "confirm" ? <CheckCircle2 size={22} aria-hidden="true" /> : <BookOpen size={22} aria-hidden="true" />}</span>
        <p className="rct-run-eyebrow">Paragraph {step.paragraph + 1} of {passage.paragraphs.length}</p>
        <h2 ref={heading} tabIndex={-1} className="rct-run-title outline-none">{STEP_TITLE[step.kind]}</h2>
        <p className="rct-run-instruction" role="status">{step.kind === "recall" && effectiveVoice === "silent" ? `Retell paragraph ${step.paragraph + 1} silently in your own words. This recall cannot receive automatic feedback. Press Space to check.` : stepInstruction(step, mode, scope)}</p>
        <div className="rct-run-paragraph-progress" aria-label="Paragraph progress">{passage.paragraphs.map((_, position) => <span key={position} className={position <= step.paragraph ? "is-reached" : ""} />)}</div>
      </aside>
      <section className={`rct-run-paper ${hidden ? "is-hidden" : ""}`} aria-label={hidden ? "Passage text hidden" : "Passage text"}>
        <div className="rct-run-paper-heading"><span>{hidden ? `Recall ${recallScope}${step.optional ? " (optional)" : ""}` : step.kind === "confirm" ? "Check your recall" : "The passage"}</span><span>{hidden ? "Text hidden" : `Paragraph ${step.paragraph + 1}`}</span></div>
        {hidden ? <div className="rct-run-recall-space"><div className={`rct-run-recall-symbol ${recalling ? "is-active" : ""}`}>{recordingStarted ? <Mic size={32} aria-hidden="true" /> : <EyeOff size={32} aria-hidden="true" />}</div><p className="rct-run-recall-heading">{`${effectiveVoice === "silent" ? "Silently retell" : "Retell"} ${recallScope} in your own words.`}</p><p className="rct-run-hidden-note">The text is hidden while you recall. Do not look back.</p>{recalling && <span className="rct-run-active-status"><span />{recordingStarted ? "Recording this recall only" : recorder.interruption && effectiveVoice === "spoken" ? "Recording stopped. Finish this recall silently." : "Silent recall in progress"}</span>}</div>
          : <div className="rct-run-passage-body">{step.visible.map((i) => <div key={i} className="rct-run-paragraph">
            {passage.paragraphs[i].labels.map((label) => <p key={label} className="rct-run-passage-label">{label}</p>)}
            <p>{passage.paragraphs[i].text}</p>
          </div>)}</div>}
      </section>
    </div>

    {savedRecap && <p role="status">This recall is already saved. Continue without saving it again.</p>}
    {interruptedRecap && <p role="alert">This recording was interrupted. Save your place and leave, then use Retry uploads in Your attempts before recording again. {step.optional ? "You can also skip this optional recall and continue." : "You can continue to check while the recording awaits recovery."}</p>}
    {recordingStarted && recorder.backupHealth?.ok === false && <p role="alert">{recorder.backupHealth.reason} Keep this page open until the recording uploads, or save a copy after stopping.</p>}
    {isRecap && step.voiceChoice && phase !== "recalling" && !savedRecap && !interruptedRecap && <fieldset className="rct-run-voice">
      <legend className="text-sm font-semibold">How will you recall the whole passage?</legend>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {(["silent", "spoken"] as Voice[]).map((v) => <label key={v} className="flex min-h-11 items-center gap-2">
          <input type="radio" name="voice" value={v} checked={voice === v} onChange={() => setVoice(v)} />
          {v === "spoken" ? <Mic size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}
          {v === "spoken" ? "Out loud (recorded)" : "Silent (not recorded)"}
        </label>)}
      </div>
      <p className="mt-1 text-xs" style={muted}>Silent is the default. Only an out loud recall is recorded, and recording starts when you press Start recording.</p>
    </fieldset>}

    {waitingForMic && <div role="status" className="rct-save-state">
      <p>Waiting for microphone permission. Allow access in your browser to record, or cancel this request. The paragraph stays visible until recording is ready.</p>
      <button type="button" className={button} style={secondary} onClick={() => cancelMicRequest()}>Cancel microphone request</button>
      {step.kind === "read" && <button type="button" className={button} style={secondary} onClick={() => cancelMicRequest(true)}>Continue silently (no automatic feedback)</button>}
    </div>}
    {notice && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>{notice}</p>}
    {savingAudio && <p role="status">Recording stopped. Saving your recall…</p>}

    <div className="rct-run-actions">
      {step.kind === "read" && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void hideAndRecall()}>
        Hide the text and record paragraph {step.paragraph + 1}<ArrowRight size={16} aria-hidden="true" />
      </button>}
      {step.kind === "read" && micFailure && !waitingForMic && <button type="button" className={button} style={secondary} disabled={busy} onClick={() => void recallSilently()}>Continue silently (no automatic feedback)</button>}
      {step.kind === "confirm" && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void continueFromStep()}>
        {nextAction === "finish practice" ? "Finish practice" : nextAction.charAt(0).toUpperCase() + nextAction.slice(1)}<ArrowRight size={16} aria-hidden="true" />
      </button>}
      {savedRecap && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void continueFromStep()}>Continue from saved recall</button>}
      {isRecap && !savedRecap && !interruptedRecap && effectiveVoice === "spoken" && phase !== "recalling" && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void guarded(async () => { await startRecall(); })}>Start recording</button>}
      {isRecap && !savedRecap && !interruptedRecap && recalling && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void finishRecall()}>
        {recordingStarted ? step.kind === "recall" ? "Stop recording and check my recall" : `Stop recording, ${nextAction}` : step.kind === "recall" && mode === "rc_recall" ? "Check my recall" : `Finish recall, ${nextAction}`}
      </button>}
      {interruptedRecap && !step.optional && <button type="button" className={button} style={secondary} disabled={busy} onClick={() => void continueFromStep()}>Continue to check</button>}
      {step.optional && !recordingStarted && !savedRecap && <button type="button" className={button} style={secondary} disabled={busy} onClick={() => void continueFromStep()}>Skip this optional recall, {nextAction}</button>}
      <button type="button" className={`${button} ml-auto`} style={secondary} disabled={busy} onClick={() => void leave()}>Save my place and leave</button>
      <button type="button" className={button} style={secondary} disabled={busy} onClick={endAttempt}>End attempt</button>
    </div>
    {step.kind === "read" && <p className="mt-2 text-sm">Press Space to hide this paragraph and start recording your recall.</p>}
    {recordingStarted && <p className="mt-2 text-sm" role="status">Recording this recall only. Press Space to stop and check.</p>}
    {step.kind === "recall" && effectiveVoice === "silent" && <p className="mt-2 text-sm">Silent recall is not recorded and cannot receive automatic feedback.</p>}
  </div>;
}

function FinishedPanel({ attemptId, mode, finished, recaps, onExit, onRetry, busy, showElapsedTimer, canRetryUpload, onRetryUpload, onDownload }: {
  showElapsedTimer: boolean;
  attemptId: string; mode: RecallMode; finished: { completed: boolean; seconds: number; error: string | null };
  recaps: RecapProgress[]; onExit: () => void; onRetry: () => void; busy: boolean;
  canRetryUpload: (key: string) => boolean; onRetryUpload: (key: string) => void; onDownload: (key: string) => void;
}) {
  const spoken = recaps.filter((r) => r.voice === "spoken");
  const saved = spoken.filter((r) => r.state === "saved").length;
  const failed = spoken.filter((r) => r.state === "failed");
  const pending = spoken.filter((r) => r.state === "pending").length;
  const failedSilent = recaps.filter((r) => r.voice === "silent" && r.state === "failed").length;
  return <div className="rct-run rct-run-finished" data-testid="rc-recall-finished">
    <div className="rct-run-finish-banner"><span className="rct-run-stage-icon">{finished.completed ? <CheckCircle2 size={28} aria-hidden="true" /> : <BookOpen size={28} aria-hidden="true" />}</span><p className="rct-run-eyebrow">RC Training{mode !== "rc_recall" && ` / ${MODE_LABEL[mode]}`}</p>
      <h2>{finished.error ? "Your result is not saved yet" : finished.completed ? `${mode === "rc_recall" ? "RC Training" : MODE_LABEL[mode]} practice complete` : "Attempt ended early"}</h2>
      <p>{finished.error ? "Nothing here has been confirmed by the server." : finished.completed ? "Every paragraph and passage was worked in order." : "Saved as not completed."}</p>
      {showElapsedTimer && <div className="rct-run-finish-time"><Clock3 size={18} aria-hidden="true" /><span>{formatClock(finished.seconds)}</span><span>total time</span></div>}
    </div>
    {finished.error && <div role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>
      <p>{finished.error}</p>
      <button type="button" className={`${button} mt-2`} style={secondary} disabled={busy} onClick={onRetry}>Try saving again</button>
    </div>}
    <section className="rct-run-recordings" style={panel} aria-label="Recording status">
      <h3 className="text-base font-semibold">Recordings</h3>
      {spoken.length === 0 ? <p className="mt-1 text-sm" style={muted}>No spoken recalls in this attempt, so nothing was recorded.</p>
        : <ul className="mt-2 space-y-1 text-sm">
          <li>{saved} of {spoken.length} spoken recalls saved</li>
          {pending > 0 && <li role="status">{pending} still uploading</li>}
          {failed.map((r) => <li key={r.key} role="alert">
            {r.label} was not saved. {r.copy === "device" ? "A copy is kept on this device and uploads when you next open RC Training or reconnect." : "No copy was kept on this device, so it can only be sent while this page stays open."}
            {canRetryUpload(r.key) && <> <button type="button" className="underline" disabled={busy} onClick={() => onRetryUpload(r.key)}>Try uploading again</button> <button type="button" className="underline" onClick={() => onDownload(r.key)}>Save a copy to this device</button></>}
          </li>)}
        </ul>}
      {failedSilent > 0 && <p role="alert" className="mt-2 text-sm">{failedSilent} silent recall record{failedSilent === 1 ? "" : "s"} could not be saved.</p>}
    </section>
    <RcTrainingFeedback attemptId={attemptId} enabled={!finished.error && finished.completed && recaps.every((r) => r.voice !== "spoken" || r.state === "saved")} />
    <button type="button" className={`${button} mt-5`} style={primary} onClick={onExit}>{finished.error ? "Leave and save later" : "Back to RC Training"}</button>
  </div>;
}
