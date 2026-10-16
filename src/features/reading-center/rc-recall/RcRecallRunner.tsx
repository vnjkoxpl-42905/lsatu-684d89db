import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { discard } from "./lib/backup";
import {
  finalizeAttempt, insertRecap, markRecapFailed, resetFailedRecap, uploadRecording,
  type AttemptRow, type RecapRow, type RecordingState,
} from "./lib/attempts";
import {
  MODE_LABEL, STEP_TITLE, buildSectionSteps, passageGuidanceMinutes, stepInstruction,
  type ConfirmScope, type RecallMode, type Voice,
} from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";
import { useRecapRecorder } from "./useRecapRecorder";

const panel = { background: "var(--rc-card)", borderColor: "var(--rc-outline-2)" };
const muted = { color: "var(--rc-text-2)" };
const button = "inline-flex min-h-11 items-center justify-center rounded-lg px-4 text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50";
const primary = { background: "var(--rc-accent, #494387)", color: "#fff" };
const secondary = { border: "1px solid var(--rc-outline-2)", color: "var(--rc-text)" };

export const formatClock = (seconds: number): string =>
  `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;

interface RecapProgress { key: string; voice: Voice; state: RecordingState; rowId: string | null; label: string }

interface Props {
  mode: RecallMode;
  scope: ConfirmScope;
  passages: RcPassage[];
  segmented: SegmentedPassage[];
  attempt: AttemptRow;
  studentId: string;
  onExit: () => void;
}

export default function RcRecallRunner({ mode, scope, passages, segmented, attempt, studentId, onExit }: Props) {
  const steps = useMemo(() => buildSectionSteps(mode, segmented, scope), [mode, segmented, scope]);
  const [index, setIndex] = useState(0);
  const [voice, setVoice] = useState<Voice>("spoken");
  const [phase, setPhase] = useState<"idle" | "recalling">("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [recaps, setRecaps] = useState<RecapProgress[]>([]);
  const [finished, setFinished] = useState<null | { completed: boolean; seconds: number; error: string | null }>(null);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef(Date.now());
  const completionSeconds = useRef<number | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const recorder = useRecapRecorder();
  const step = steps[index];

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => window.clearInterval(id);
  }, [finished]);

  useEffect(() => { heading.current?.focus(); setPhase("idle"); setNotice(null); }, [index]);

  const setRecap = useCallback((key: string, patch: Partial<RecapProgress>) =>
    setRecaps((list) => list.map((r) => (r.key === key ? { ...r, ...patch } : r))), []);
  const failedSilent = recaps.filter((r) => r.voice === "silent" && r.state === "failed").length;

  /** Record a silent recap. A failed row is reported, never silently dropped. */
  const saveSilent = async (): Promise<void> => {
    const key = step.recapKey!;
    const prior = recaps.find((r) => r.key === key);
    setRecaps((list) => [...list.filter((r) => r.key !== key), { key, voice: "silent", state: "not_recorded", rowId: prior?.rowId ?? null, label: STEP_TITLE[step.kind] }]);
    try {
      const row = prior?.rowId
        ? await resetFailedRecap(prior.rowId, studentId, "silent")
        : await insertRecap({ attemptId: attempt.id, studentId, recapKey: key, passagePosition: step.passage + 1, kind: step.kind as RecapRow["kind"], voice: "silent" });
      setRecap(key, { rowId: row.id });
    } catch {
      setRecap(key, { state: "failed", rowId: null });
      setNotice("One recap could not be saved. The rest of your attempt is unaffected.");
    }
  };

  const startRecap = async () => {
    if (!step.recapKey) return;
    const effective: Voice = step.voiceChoice ? voice : "silent";
    if (effective === "silent") { setPhase("recalling"); return; }
    setBusy(true);
    setNotice(null);
    try {
      const key = step.recapKey;
      const prepared = await recorder.prepare();
      if (prepared.ok === false) { setNotice(prepared.reason); return; }
      const prior = recaps.find((r) => r.key === key);
      let row: RecapRow;
      try {
        row = prior?.rowId
          ? await resetFailedRecap(prior.rowId, studentId, "spoken")
          : await insertRecap({ attemptId: attempt.id, studentId, recapKey: key, passagePosition: step.passage + 1, kind: step.kind as RecapRow["kind"], voice: "spoken" });
      } catch (error) {
        prepared.stream.getTracks().forEach((track) => track.stop());
        throw error;
      }
      const started = await recorder.start({ recapId: row.id, attemptId: attempt.id, studentId, recapKey: key }, prepared);
      if ("reason" in started) {
        await markRecapFailed(row.id, studentId).catch(() => undefined);
        setRecaps((list) => [...list.filter((r) => r.key !== key), { key, voice: "spoken", state: "failed", rowId: row.id, label: STEP_TITLE[step.kind] }]);
        setNotice(started.reason);
        return;
      }
      setRecaps((list) => [...list.filter((r) => r.key !== key), { key, voice: "spoken", state: "pending", rowId: row.id, label: STEP_TITLE[step.kind] }]);
      setPhase("recalling");
    } catch {
      setNotice("This recap could not be started, so nothing was recorded. Try again or choose a silent recap.");
    } finally { setBusy(false); }
  };

  const upload = async (key: string, rowId: string, recorded: NonNullable<Awaited<ReturnType<typeof recorder.stop>>>) => {
    try {
      await uploadRecording({ studentId, attemptId: attempt.id, recapId: rowId, path: recorded.path, blob: recorded.blob, mimeType: recorded.mimeType, durationMs: recorded.durationMs });
      await discard(rowId);
      setRecap(key, { state: "saved" });
    } catch {
      // The backup stays on this device so the recap can still be recovered.
      setRecap(key, { state: "failed" });
    }
  };

  const advance = () => {
    if (index + 1 < steps.length) setIndex(index + 1);
    else void complete(true);
  };

  const finishRecap = async () => {
    const key = step.recapKey!;
    const current = recaps.find((r) => r.key === key);
    if (current?.voice === "spoken" && current.rowId) {
      setBusy(true);
      const recorded = await recorder.stop();
      setBusy(false);
      if (recorded) void upload(key, current.rowId, recorded);
      else { await markRecapFailed(current.rowId, studentId).catch(() => undefined); setRecap(key, { state: "failed" }); }
    } else {
      await saveSilent();
    }
    advance();
  };

  const complete = async (completed: boolean) => {
    setBusy(true);
    if (recorder.isRecording()) {
      const activeId = recorder.activeRecapId();
      const recorded = await recorder.stop();
      const open = recaps.find((r) => r.rowId === activeId);
      if (recorded && open?.rowId) void upload(open.key, open.rowId, recorded);
      else if (!recorded && open?.rowId) {
        await markRecapFailed(open.rowId, studentId).catch(() => undefined);
        setRecap(open.key, { state: "failed" });
      }
    }
    if (completionSeconds.current === null) completionSeconds.current = Math.floor((Date.now() - startedAt.current) / 1000);
    const seconds = completionSeconds.current;
    try {
      await finalizeAttempt({ attemptId: attempt.id, studentId, elapsedSeconds: seconds, completed });
      setFinished({ completed, seconds, error: null });
    } catch {
      setFinished({ completed, seconds, error: "Your result could not be saved. Your time and recordings on this device are intact; try finishing again." });
    }
    setBusy(false);
  };

  if (finished) {
    return <FinishedPanel mode={mode} finished={finished} recaps={recaps} onExit={onExit}
      onRetry={() => { void complete(finished.completed); }} busy={busy} />;
  }

  const hidden = step.visible.length === 0;
  const effectiveVoice: Voice = step.voiceChoice ? voice : "silent";
  const isRecap = step.recapKey !== null;
  const recalling = isRecap && phase === "recalling";
  const passage = segmented[step.passage];

  return <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6" data-testid="rc-recall-runner">
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm" style={muted}>
      <span>{MODE_LABEL[mode]} · Passage {step.passage + 1} of {passages.length} · Paragraph {step.paragraph + 1} of {passage.paragraphs.length}</span>
      <span aria-label="Elapsed time" className="tabular-nums">{formatClock(elapsed)}</span>
    </div>
    {failedSilent > 0 && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>
      {failedSilent} silent recap record{failedSilent === 1 ? "" : "s"} could not be saved. Your other recaps are unaffected.
    </p>}
    <p className="mt-1 text-xs" style={muted}>Guidance: {passageGuidanceMinutes(mode)} per passage. A guide, not a limit.</p>
    <h2 ref={heading} tabIndex={-1} className="mt-4 text-xl font-semibold outline-none">{STEP_TITLE[step.kind]}</h2>
    <p className="mt-2 text-sm leading-6" role="status">{stepInstruction(step, mode, scope)}</p>

    <section className="mt-4 rounded-2xl border p-5 sm:p-6" style={panel} aria-label={hidden ? "Passage text hidden" : "Passage text"}>
      {hidden ? <p className="text-sm leading-6" style={muted}>The text is hidden while you recall. Do not look back.</p>
        : step.visible.map((i) => <div key={i} className="mb-4 last:mb-0">
          {passage.paragraphs[i].labels.map((label) => <p key={label} className="mb-2 text-sm font-semibold" style={muted}>{label}</p>)}
          <p className="text-base leading-7">{passage.paragraphs[i].text}</p>
        </div>)}
    </section>

    {isRecap && !recalling && step.voiceChoice && <fieldset className="mt-4">
      <legend className="text-sm font-semibold">How will you recap?</legend>
      <div className="mt-2 flex flex-wrap gap-4 text-sm">
        {(["spoken", "silent"] as Voice[]).map((v) => <label key={v} className="flex min-h-11 items-center gap-2">
          <input type="radio" name="voice" value={v} checked={voice === v} onChange={() => setVoice(v)} />
          {v === "spoken" ? "Out loud (recorded)" : "Silent (not recorded)"}
        </label>)}
      </div>
      <p className="mt-1 text-xs" style={muted}>Start out loud while you are learning, then move to silent recaps when you feel ready.</p>
    </fieldset>}
    {isRecap && !step.voiceChoice && <p className="mt-4 text-sm" style={muted}>This recap is silent.</p>}

    {notice && <p role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>{notice}</p>}

    <div className="mt-5 flex flex-wrap gap-3">
      {!isRecap && <button type="button" className={button} style={primary} disabled={busy} onClick={advance}>
        {step.kind === "confirm" ? "Confirmed, continue" : "Done reading, continue"}
      </button>}
      {isRecap && !recalling && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void startRecap()}>
        {effectiveVoice === "spoken" ? "Start recording the recap" : "Start the recap"}
      </button>}
      {recalling && <button type="button" className={button} style={primary} disabled={busy} onClick={() => void finishRecap()}>
        {effectiveVoice === "spoken" ? "Finish recap and stop recording" : "Finish recap"}
      </button>}
      {step.optional && !recalling && <button type="button" className={button} style={secondary} disabled={busy} onClick={advance}>Skip this recap</button>}
      <button type="button" className={`${button} ml-auto`} style={secondary} disabled={busy} onClick={() => { if (window.confirm("End this attempt now? It will be saved as not completed.")) void complete(false); }}>End attempt</button>
    </div>
    {recalling && effectiveVoice === "spoken" && <p className="mt-2 text-sm" role="status">Recording this recap only.</p>}
  </div>;
}

function FinishedPanel({ mode, finished, recaps, onExit, onRetry, busy }: {
  mode: RecallMode; finished: { completed: boolean; seconds: number; error: string | null };
  recaps: RecapProgress[]; onExit: () => void; onRetry: () => void; busy: boolean;
}) {
  const spoken = recaps.filter((r) => r.voice === "spoken");
  const saved = spoken.filter((r) => r.state === "saved").length;
  const failed = spoken.filter((r) => r.state === "failed").length;
  const pending = spoken.filter((r) => r.state === "pending").length;
  const failedSilent = recaps.filter((r) => r.voice === "silent" && r.state === "failed").length;
  return <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6" data-testid="rc-recall-finished">
    <h2 className="text-xl font-semibold">{finished.completed ? `${MODE_LABEL[mode]} section complete` : "Attempt ended early"}</h2>
    <p className="mt-2 text-sm" style={muted}>Time {formatClock(finished.seconds)}. {finished.completed ? "Every paragraph and passage was worked in order." : "Saved as not completed."}</p>
    {finished.error && <div role="alert" className="mt-3 text-sm" style={{ color: "var(--rc-danger, #b3261e)" }}>
      <p>{finished.error}</p>
      <button type="button" className={`${button} mt-2`} style={secondary} disabled={busy} onClick={onRetry}>Try saving again</button>
    </div>}
    <section className="mt-4 rounded-2xl border p-5" style={panel} aria-label="Recording status">
      <h3 className="text-base font-semibold">Recordings</h3>
      {spoken.length === 0 ? <p className="mt-1 text-sm" style={muted}>No spoken recaps in this attempt, so nothing was recorded.</p>
        : <ul className="mt-2 space-y-1 text-sm">
          <li>{saved} of {spoken.length} spoken recaps saved</li>
          {pending > 0 && <li role="status">{pending} still uploading</li>}
          {failed > 0 && <li role="alert">{failed} could not be saved. They stay on this device and upload when you next open RC Recall.</li>}
        </ul>}
      {failedSilent > 0 && <p role="alert" className="mt-2 text-sm">{failedSilent} silent recap record{failedSilent === 1 ? "" : "s"} could not be saved.</p>}
    </section>
    <button type="button" className={`${button} mt-5`} style={primary} onClick={onExit}>Back to RC Recall</button>
  </div>;
}
