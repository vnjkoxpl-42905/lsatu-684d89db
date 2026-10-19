import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import ExamplePlayer from "./ExamplePlayer";
import { ArrowDown, ArrowUpRight, Headphones, History } from "lucide-react";
import RcTrainingVideo from "./RcTrainingVideo";
import "./RcTraining.css";
import RcRecallRunner from "./RcRecallRunner";
import RcAttemptHistory from "./RcAttemptHistory";
import { useRcHistory, rcHistoryKey } from "./useRcHistory";
import { useRecordingRecovery } from "./useRecordingRecovery";
import { AttemptOutcomeUnknownError, createAttempt, newId, probeAttemptsBackend, readAttemptProgress, type AttemptRow } from "./lib/attempts";
import { REJECTION_MESSAGE, clearCheckpoint, contentKeyFor, listCheckpoints, loadCheckpoint, type Checkpoint } from "./lib/checkpoint";
import { recapLabel, type HistoryEntry } from "./lib/history";
import { retryPendingFinalization } from "./lib/pending";
import {
  RC_RECALL_DEMO_CORRECTION, RC_RECALL_EXAMPLES, RC_RECALL_NOTE,
  mediaBase,
} from "./lib/media";
import { buildRecallSections, restoreRecallPractice, selectRecallPractice, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { buildSectionSteps, type ConfirmScope, type RecallMode } from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";

interface Running {
  mode: RecallMode; scope: ConfirmScope; passages: RcPassage[]; segmented: SegmentedPassage[]; attempt: AttemptRow;
  showElapsedTimer: boolean; resume: Checkpoint | null; contentKey: string;
}

const SAVING_UNAVAILABLE = "Saving is not available yet, so starting practice is turned off. You can read the instructions and try the demonstration while saving is unavailable.";

export default function RcRecallPage() {
  const { user } = useAuth();
  // Discard account-specific in-memory work before rendering another account.
  return <AccountRecallPage key={user?.id ?? "signed-out"} />;
}

function AccountRecallPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const mode: RecallMode = "rc_recall";
  const [showElapsedTimer, setShowElapsedTimer] = useState(false);
  const scope: ConfirmScope = "all_read";
  const [passageCount, setPassageCount] = useState<1 | 4>(1);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  // The id a start attempt used, kept so a retry after a lost response reuses it instead of creating a second attempt.
  const pendingCreate = useRef<{ key: string; id: string } | null>(null);
  const base = mediaBase();

  const index = useQuery({ queryKey: ["rc-recall-index"], queryFn: loadAllIndexPassages, staleTime: Infinity });
  const sections = useMemo(() => buildRecallSections(index.data ?? []), [index.data]);
  const choices = useMemo(() => {
    const options = sections.flatMap((section) => passageCount === 4 ? [selectRecallPractice(section, 4)]
      : [1, 2, 3, 4].map((position) => selectRecallPractice(section, 1, position)));
    return options.map((selection) => {
      const first = index.data?.find((p) => p.passageId === selection.passageIds[0]);
      const title = passageCount === 1 ? first?.title || `Passage ${selection.passagePositions?.[0]}` : "Full section · 4 passages";
      const label = `PT${selection.preptest} · Section ${selection.section}${passageCount === 1 ? ` · Passage ${selection.passagePositions?.[0]}` : ""}`;
      return { selection, title, label, recommended: selection.preptest === 140 && selection.section === 4 && (passageCount === 4 || selection.passageIds[0] === 15) };
    }).sort((a, b) => Number(b.recommended) - Number(a.recommended));
  }, [sections, passageCount, index.data]);
  const matching = choices.filter((choice) => `${choice.label} ${choice.title}`.toLowerCase().includes(search.trim().toLowerCase()));

  const backend = useQuery({
    queryKey: ["rc-recall-backend", user?.id],
    enabled: !!user,
    queryFn: () => probeAttemptsBackend(user!.id),
    retry: false,
    staleTime: 0,
  });
  const savingReady = backend.data?.state === "available";
  const savingUnavailable = backend.data?.state === "unavailable";

  const history = useRcHistory(user?.id);
  const recovery = useRecordingRecovery(user?.id, () => { void queryClient.invalidateQueries({ queryKey: rcHistoryKey(user?.id) }); }, !running && !starting && !busyAttemptId);

  // The URL is the source of truth for the instructions view: click, reload, direct entry and Back all agree.
  useEffect(() => {
    const id = location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
  }, [location.hash, location.key]);

  const start = async (selected: RecallSection) => {
    if (!user || !savingReady || recovery.running || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded);
      const createKey = `${contentKeyFor(selected)}:${scope}`;
      if (pendingCreate.current?.key !== createKey) pendingCreate.current = { key: createKey, id: newId() };
      const attempt = await createAttempt({
        id: pendingCreate.current.id, studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: scope,
      });
      pendingCreate.current = null;
      setRunning({ mode, scope, passages, segmented, attempt, showElapsedTimer, resume: null, contentKey: contentKeyFor(selected) });
    } catch (err) {
      setStartError(err instanceof AttemptOutcomeUnknownError
        ? "We could not confirm whether this practice was saved. Try again. We will check first, so it will not be saved twice."
        : err instanceof Error && err.message
          ? `This practice could not be started: ${err.message} Nothing was saved.`
          : "This practice could not be started. Nothing was saved.");
    } finally { startingRef.current = false; setStarting(false); }
  };

  const resume = async (entry: HistoryEntry) => {
    if (!user || recovery.running) return;
    setHistoryMessage(null);
    setBusyAttemptId(entry.attempt.id);
    try {
      // Reconcile uploads and finishes that may have completed after the prior
      // runner unmounted. Offline, a valid same-device checkpoint still works.
      const fresh = await readAttemptProgress(entry.attempt.id, user.id).catch(() => null);
      const a = fresh?.attempt ?? entry.attempt;
      if (a.finished_at) {
        clearCheckpoint(user.id, a.id);
        setHistoryMessage("This attempt has already ended. Its saved result is shown in Your attempts.");
        await queryClient.invalidateQueries({ queryKey: rcHistoryKey(user.id) });
        return;
      }
      const available = buildRecallSections(await loadAllIndexPassages());
      const original = available.find((s) => s.preptest === a.preptest && s.section === a.section);
      if (!original) throw new Error("The saved section is no longer available.");
      const section = restoreRecallPractice(original, a.passage_ids);
      const { passages, segmented } = verifyLoadedSection(section, await loadPassages(a.passage_ids));
      const scopeUsed: ConfirmScope = a.confirmation_scope ?? "all_read";
      const steps = buildSectionSteps(a.mode, segmented, scopeUsed);
      const loaded = loadCheckpoint({ studentId: user.id, attemptId: a.id, contentKey: contentKeyFor(section), stepIds: steps.map((s) => s.id) });
      if (loaded.ok === false) { setHistoryMessage(`${REJECTION_MESSAGE[loaded.reason]} This attempt can't be resumed here.`); return; }
      const reconciled = new Map(loaded.checkpoint.recaps.map((r) => [r.key, r]));
      for (const row of fresh?.recaps ?? entry.recaps) {
        reconciled.set(row.recap_key, { key: row.recap_key, voice: row.voice, state: row.recording_state, rowId: row.id, label: recapLabel(row) });
      }
      setRunning({
        mode: a.mode, scope: scopeUsed, passages, segmented, attempt: a, showElapsedTimer: loaded.checkpoint.showElapsedTimer,
        resume: { ...loaded.checkpoint, recaps: [...reconciled.values()] }, contentKey: contentKeyFor(section),
      });
    } catch {
      setHistoryMessage("This practice could not be opened. Your saved place has not changed. Try again.");
    } finally { setBusyAttemptId(null); }
  };

  const retryFinish = async (entry: HistoryEntry) => {
    if (!user) return;
    setHistoryMessage(null);
    setBusyAttemptId(entry.attempt.id);
    try {
      // Only this account's records are listed, and a finish needs no step, only the saved result.
      const checkpoint = listCheckpoints(user.id).find((c) => c.attemptId === entry.attempt.id);
      if (!checkpoint?.pending) { setHistoryMessage("The unsaved result is no longer on this device."); return; }
      await retryPendingFinalization(checkpoint);
      await queryClient.invalidateQueries({ queryKey: rcHistoryKey(user.id) });
    } catch {
      setHistoryMessage("The result still could not be saved. It is kept on this device with its original time. Try again later.");
    } finally { setBusyAttemptId(null); history.refreshLocal(); }
  };

  if (running && user) {
    return <RcRecallRunner {...running} studentId={user.id} onExit={() => {
      setRunning(null);
      history.refreshLocal();
      void queryClient.invalidateQueries({ queryKey: rcHistoryKey(user.id) });
    }} />;
  }

  const inProgress = history.entries.filter((e) => e.status === "in_progress" && e.resumable);
  const unsavedResults = history.entries.filter((e) => e.status === "pending");

  return <main className="rct-page" data-reading-activity="rc-recall">
    <header className="rct-hub-header">
      <h1>RC Training</h1>
      <p>Practise remembering the details and reasoning in a passage, one paragraph at a time.</p>
      <div className="rct-hub-actions">
        <Link to={{ hash: "#rc-recall-start" }} className="rct-button rct-button-primary">Choose a passage <ArrowDown size={16} aria-hidden="true" /></Link>
        <Link to="/reading-center/rc-recall/instructions" className="rct-text-button">See the instructions</Link>
      </div>
    </header>

    <div className="rct-content">
      <section className="rct-start" aria-labelledby="rc-recall-start">
        <div className="rct-list-heading"><h2 id="rc-recall-start" tabIndex={-1}>{passageCount === 1 ? "Choose a passage" : "Choose a full section"}</h2><p>{passageCount === 1 ? "Read, hide the text and recall, then check. Start any passage below." : "Practise four passages in order, using the same paragraph-by-paragraph routine."}</p></div>
        <div className="rct-start-form">
          {(inProgress.length > 0 || unsavedResults.length > 0) && <div className="rct-resume-banner" role="status">
            {inProgress.map((e) => <p key={e.attempt.id}>You have practice in progress: {sectionLabel(e.attempt)}. <button type="button" className="underline" disabled={busyAttemptId === e.attempt.id} onClick={() => void resume(e)}>Resume it</button> <span className="rct-attempt-note">Your place is kept on this device only.</span></p>)}
            {unsavedResults.map((e) => <p key={e.attempt.id}>The result for {sectionLabel(e.attempt)} has not been saved yet. <button type="button" className="underline" disabled={busyAttemptId === e.attempt.id} onClick={() => void retryFinish(e)}>Try saving it again</button></p>)}
          </div>}
          <div className="rct-choice-tools">
            <label className="rct-section-field rct-passage-search"><span>Find a passage or PrepTest</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="For example, PT140" className="rct-select-trigger" /></label>
            <fieldset className="rct-segmented"><legend className="sr-only">Practice length</legend>
              <label><input type="radio" name="practice-length" checked={passageCount === 1} onChange={() => { setPassageCount(1); setVisibleCount(12); }} /><span>Single passage</span></label>
              <label><input type="radio" name="practice-length" checked={passageCount === 4} onChange={() => { setPassageCount(4); setVisibleCount(12); }} /><span>Full section · 4 passages</span></label>
            </fieldset>
          </div>
          <fieldset className="rct-clock-choice"><legend>Clock</legend>
            <label><input type="radio" name="practice-clock" checked={!showElapsedTimer} onChange={() => setShowElapsedTimer(false)} /> No clock</label>
            <label><input type="radio" name="practice-clock" checked={showElapsedTimer} onChange={() => setShowElapsedTimer(true)} /> Show elapsed time</label>
            {showElapsedTimer && <p>Counts up only. No time limit.</p>}
          </fieldset>
          {index.isPending && <div className="rct-loading" role="status">Loading passages…</div>}
          {index.isError && <div role="alert"><p>The passage list could not load.</p><button className="rct-text-button" onClick={() => void index.refetch()}>Try loading passages again</button></div>}
          {!index.isPending && !index.isError && !sections.length && <p role="status">No complete RC sections are available yet.</p>}
          {backend.isPending && !!user && <p role="status" className="rct-save-state">Checking that saving is available…</p>}
          {savingUnavailable && <div role="alert" className="rct-save-state"><p>{SAVING_UNAVAILABLE}</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Check again"}</button></div>}
          {backend.data?.state === "unknown" && <div role="alert" className="rct-save-state"><p>We could not check whether saving is available. Check your connection, then try again. Starting is turned off until we can confirm it.</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Try again"}</button></div>}
          <ul className="rct-passage-list" aria-label={passageCount === 1 ? "Available passages" : "Available full sections"}>
            {matching.slice(0, visibleCount).map(({ selection, title, label, recommended }) => <li key={contentKeyFor(selection)} className="rct-passage-choice">
              <div>{recommended && <span className="rct-attempt-note">{passageCount === 1 ? "The passage used in the example" : "Includes the example passage"}</span>}<h3>{title}</h3><p>{label}</p></div>
              <button type="button" className="rct-button rct-button-primary" aria-label={`Start ${label}`} disabled={starting || !savingReady || recovery.running} onClick={() => void start(selection)}>{starting ? "Starting…" : passageCount === 1 ? "Start passage" : "Start section"}<ArrowUpRight size={18} aria-hidden="true" /></button>
            </li>)}
          </ul>
          {!index.isPending && !index.isError && choices.length > 0 && matching.length === 0 && <p role="status">No passages match that search. Try a PrepTest number or another word.</p>}
          {matching.length > visibleCount && <button type="button" className="rct-text-button" onClick={() => setVisibleCount((count) => count + 24)}>Show more {passageCount === 1 ? "passages" : "sections"} ({matching.length - visibleCount} remaining)</button>}
          {startError && <p role="alert" className="rct-error">{startError}</p>}
          <p className="rct-save-note"><Headphones size={14} aria-hidden="true" />See Your attempts for your time and whether spoken recordings have saved. Your recall is not graded.</p>
        </div>
      </section>

      <details className="rct-demo-disclosure"><summary>Watch demo</summary><RcTrainingVideo compact /></details>

      {base && <section className="rct-examples" aria-labelledby="rc-recall-examples"><div className="rct-section-heading"><div><h2 id="rc-recall-examples" tabIndex={-1}>Video examples</h2><p>Watch the method unfold, then choose your own practice.</p></div></div>
        <div className="rct-example-note"><h3>Read this before the examples</h3><ul>{RC_RECALL_DEMO_CORRECTION.map((t) => <li key={t}>{t}</li>)}</ul><ExamplePlayer clip={RC_RECALL_NOTE} /></div>
        <div className="rct-example-grid">{RC_RECALL_EXAMPLES.map((clip) => <ExamplePlayer key={clip.id} clip={clip} />)}</div>
      </section>}

      <nav aria-label="Practice help" className="rct-hero-actions"><Link to={{ hash: "#rc-recall-history" }}>Your attempts</Link>{base && <Link to={{ hash: "#rc-recall-examples" }}>Examples</Link>}</nav>
      <section className="rct-history" aria-labelledby="rc-recall-history"><div className="rct-section-heading"><div><h2 id="rc-recall-history" tabIndex={-1}>Your attempts</h2><p>Each attempt stays here. Starting again never replaces your earlier work.</p></div><History size={23} aria-hidden="true" /></div>
        {user && (recovery.attention > 0 || recovery.result?.storageError || recovery.error) && <div className="rct-recovery" role="alert">
          <p>{recovery.result?.storageError ?? recovery.error ?? `${recovery.attention} recording${recovery.attention === 1 ? "" : "s"} saved on this device ${recovery.attention === 1 ? "has" : "have"} not uploaded yet.`}</p>
          {recovery.result?.details.filter((d) => d.outcome === "incomplete").map((d) => <p key={d.run.recapId} className="rct-attempt-note">{!d.run.stopped ? "One recording stopped unexpectedly. Its ending may be missing. You can save the available audio to this device." : "One recording is missing pieces and cannot be assembled. It is kept as it is."}</p>)}
          <button type="button" className="rct-text-button" disabled={recovery.running} onClick={() => void recovery.retry()}>{recovery.running ? "Retrying…" : "Retry uploads"}</button>
          {recovery.result?.details.filter((d) => d.outcome === "failed" || (d.outcome === "incomplete" && !d.run.stopped)).map((d) => <button key={d.run.recapId} type="button" className="rct-text-button" onClick={() => void recovery.download(d.run)}>Save a copy to this device</button>)}
        </div>}
        {user && <RcAttemptHistory studentId={user.id} history={history} recovery={recovery} savingUnavailable={savingUnavailable}
          onResume={(e) => void resume(e)} onRetryFinish={(e) => void retryFinish(e)} busyAttemptId={busyAttemptId} message={historyMessage} />}
      </section>
    </div>
  </main>;
}
