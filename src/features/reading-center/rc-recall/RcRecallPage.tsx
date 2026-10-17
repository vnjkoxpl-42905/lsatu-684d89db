import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import ExamplePlayer from "./ExamplePlayer";
import { ArrowDown, ArrowUpRight, BookOpen, Clock3, Headphones, History } from "lucide-react";
import RcTrainingDemo from "./RcTrainingDemo";
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
  COMPARATIVE_NOTE, PURPOSE, READ_STANDARD, RECAP_STANDARD, RC_RECALL_STEPS,
  SECTION_PICKER_NOTE, VOICE_NOTE,
} from "./lib/instructions";
import {
  RC_RECALL_DEMO_CORRECTION, RC_RECALL_EXAMPLES, RC_RECALL_NOTE,
  mediaBase,
} from "./lib/media";
import { buildRecallSections, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { buildSectionSteps, type ConfirmScope, type RecallMode } from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";

interface Running {
  mode: RecallMode; scope: ConfirmScope; passages: RcPassage[]; segmented: SegmentedPassage[]; attempt: AttemptRow;
  showElapsedTimer: boolean; resume: Checkpoint | null; contentKey: string;
}

export const INSTRUCTIONS_HASH = "#rc-recall-how";
const SAVING_UNAVAILABLE = "Saving is not available yet, so starting a section is turned off. You can read the instructions and try the demonstration while saving is unavailable.";

export default function RcRecallPage() {
  const { user } = useAuth();
  // Discard account-specific in-memory work before rendering another account.
  return <AccountRecallPage key={user?.id ?? "signed-out"} />;
}

function AccountRecallPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();
  const mode: RecallMode = "rc_recall";
  const [showElapsedTimer, setShowElapsedTimer] = useState(true);
  const [scope, setScope] = useState<ConfirmScope>("all_read");
  const [preptest, setPreptest] = useState<number | null>(null);
  const [sectionNumber, setSectionNumber] = useState<number | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  // The id a start attempt used, kept so a retry after a lost response reuses it instead of creating a second attempt.
  const pendingCreate = useRef<{ key: string; id: string } | null>(null);
  const base = mediaBase();
  const showInstructions = location.hash === INSTRUCTIONS_HASH;

  const index = useQuery({ queryKey: ["rc-recall-index"], queryFn: loadAllIndexPassages, staleTime: Infinity });
  const sections = useMemo(() => buildRecallSections(index.data ?? []), [index.data]);
  const preptests = useMemo(() => [...new Set(sections.map((s) => s.preptest))], [sections]);
  const inTest = useMemo(() => sections.filter((s) => s.preptest === preptest), [sections, preptest]);
  const selected: RecallSection | undefined = inTest.find((s) => s.section === sectionNumber);

  useEffect(() => { if (preptest === null && preptests.length) setPreptest(preptests[0]); }, [preptests, preptest]);
  useEffect(() => { if (inTest.length && !inTest.some((s) => s.section === sectionNumber)) setSectionNumber(inTest[0].section); }, [inTest, sectionNumber]);

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
  }, [location.hash, showInstructions]);

  const setInstructionsOpen = (open: boolean) => navigate({ pathname: location.pathname, search: location.search, hash: open ? INSTRUCTIONS_HASH : "" });

  const start = async () => {
    if (!user || !selected || !savingReady || recovery.running) return;
    setStarting(true);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded);
      const createKey = `${selected.preptest}:${selected.section}:${scope}`;
      if (pendingCreate.current?.key !== createKey) pendingCreate.current = { key: createKey, id: newId() };
      const attempt = await createAttempt({
        id: pendingCreate.current.id, studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: scope,
      });
      pendingCreate.current = null;
      setRunning({ mode, scope, passages, segmented, attempt, showElapsedTimer, resume: null, contentKey: contentKeyFor(selected) });
    } catch (err) {
      setStartError(err instanceof AttemptOutcomeUnknownError
        ? "We could not confirm whether this section was saved. Try again. We will check first, so it will not be saved twice."
        : err instanceof Error && err.message
          ? `This section could not be started: ${err.message} Nothing was saved.`
          : "This section could not be started. Nothing was saved.");
    } finally { setStarting(false); }
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
      const section: RecallSection = { preptest: a.preptest, section: a.section, passageIds: a.passage_ids };
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
      setHistoryMessage("This section could not be opened. Your saved place has not changed. Try again.");
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
    <header className="rct-hero">
      <div className="rct-hero-copy">
        <span className="rct-hero-tag"><BookOpen size={15} aria-hidden="true" /> Reading comprehension</span>
        <h1>RC Training</h1>
        <p className="rct-hero-lead">Recall one whole paragraph at a time.</p>
        <p className="rct-hero-description">{PURPOSE}</p>
        <div className="rct-hero-actions">
          <Link to={{ hash: "#rc-recall-start" }} className="rct-button rct-button-light">Start a section <ArrowDown size={16} aria-hidden="true" /></Link>
          <Link to={{ hash: INSTRUCTIONS_HASH }} className="rct-hero-link">Instructions</Link>
          {base && <Link to={{ hash: "#rc-recall-examples" }} className="rct-hero-link">Examples</Link>}
          <Link to={{ hash: "#rc-recall-history" }} className="rct-hero-link">Your attempts</Link>
        </div>
        <div className="rct-hero-foot"><span>4 passages, in order</span><span>Your recall is not graded</span></div>
      </div>
      <RcTrainingDemo />
    </header>

    <div className="rct-content">
      <section className="rct-start" aria-labelledby="rc-recall-start">
        <div className="rct-start-intro"><span className="rct-section-icon"><BookOpen size={23} aria-hidden="true" /></span><h2 id="rc-recall-start" tabIndex={-1}>Start a section</h2><p>{SECTION_PICKER_NOTE}</p><div className="rct-timing"><Clock3 size={17} aria-hidden="true" /><div><strong>Untimed</strong><span>No countdown or time limit. Work at your own pace.</span></div></div></div>
        <div className="rct-start-form">
          {(inProgress.length > 0 || unsavedResults.length > 0) && <div className="rct-resume-banner" role="status">
            {inProgress.map((e) => <p key={e.attempt.id}>You have a section in progress: {sectionLabel(e.attempt)}. <button type="button" className="underline" disabled={busyAttemptId === e.attempt.id} onClick={() => void resume(e)}>Resume it</button> <span className="rct-attempt-note">Your place is kept on this device only.</span></p>)}
            {unsavedResults.map((e) => <p key={e.attempt.id}>The result for {sectionLabel(e.attempt)} has not been saved yet. <button type="button" className="underline" disabled={busyAttemptId === e.attempt.id} onClick={() => void retryFinish(e)}>Try saving it again</button></p>)}
          </div>}
          <Link className="rct-text-button" to={{ hash: INSTRUCTIONS_HASH }}>Read the instructions <ArrowDown size={15} aria-hidden="true" /></Link>
          {index.isPending && <div className="rct-loading" role="status">Loading sections…</div>}
          {index.isError && <div role="alert"><p>The section list could not load.</p><button className="rct-text-button" onClick={() => void index.refetch()}>Try loading sections again</button></div>}
          {!index.isPending && !index.isError && !sections.length && <p role="status">No complete RC sections are available yet.</p>}
          {sections.length > 0 && <div className="rct-section-fields">
            <div className="rct-section-field">
              <label htmlFor="rct-preptest">PrepTest</label>
              <Select value={preptest === null ? "" : String(preptest)} onValueChange={(value) => setPreptest(Number(value))}>
                <SelectTrigger id="rct-preptest" className="rct-select-trigger"><SelectValue placeholder="Choose a PrepTest" /></SelectTrigger>
                <SelectContent className="rct-section-menu" position="popper" align="start" sideOffset={4} collisionPadding={12}>
                  {preptests.map((p) => <SelectItem key={p} value={String(p)} className="rct-section-option">PT{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="rct-section-field">
              <label htmlFor="rct-section">Section</label>
              <Select value={sectionNumber === null ? "" : String(sectionNumber)} onValueChange={(value) => setSectionNumber(Number(value))}>
                <SelectTrigger id="rct-section" className="rct-select-trigger"><SelectValue placeholder="Choose a section" /></SelectTrigger>
                <SelectContent className="rct-section-menu" position="popper" align="start" sideOffset={4} collisionPadding={12}>
                  {inTest.map((s) => <SelectItem key={s.section} value={String(s.section)} className="rct-section-option">Section {s.section}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>}
          <label className="rct-timer-choice"><input type="checkbox" checked={showElapsedTimer} onChange={(event) => setShowElapsedTimer(event.target.checked)} /> Show elapsed time for this passage and section</label>
          <p className="rct-timer-note">The timer display does not affect the time recorded for your attempt. Time pauses while you are away from the practice screen.</p>
          <details className="rct-check-options"><summary>Passage-pair check options</summary><fieldset className="rct-scope"><legend>What you check</legend><label><input type="radio" name="scope" checked={scope === "all_read"} onChange={() => setScope("all_read")} /> Everything read so far</label><label><input type="radio" name="scope" checked={scope === "current_sub_passage"} onChange={() => setScope("current_sub_passage")} /> Only the current passage (A or B in a passage pair)</label></fieldset></details>
          {backend.isPending && !!user && <p role="status" className="rct-save-state">Checking that saving is available…</p>}
          {savingUnavailable && <div role="alert" className="rct-save-state"><p>{SAVING_UNAVAILABLE}</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Check again"}</button></div>}
          {backend.data?.state === "unknown" && <div role="alert" className="rct-save-state"><p>We could not check whether saving is available. Check your connection, then try again. Starting is turned off until we can confirm it.</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Try again"}</button></div>}
          <button type="button" className="rct-button rct-button-primary rct-start-button" disabled={!selected || starting || !savingReady || recovery.running} onClick={() => void start()}>{starting ? "Starting…" : recovery.running ? "Checking recordings…" : "Start section"}<ArrowUpRight size={18} aria-hidden="true" /></button>
          {startError && <p role="alert" className="rct-error">{startError}</p>}
          <p className="rct-save-note"><Headphones size={14} aria-hidden="true" />See Your attempts for your time and whether spoken recordings have saved. Your recall is not graded.</p>
        </div>
      </section>

      <section className="rct-learn" aria-labelledby="rc-recall-how" id="rct-learn">
        <div className="rct-section-heading"><div><h2 id="rc-recall-how" tabIndex={-1}>How to practise</h2><p>Recall the meaning of the whole paragraph, including its details and reasoning.</p></div></div>
        <ol className="rct-process">
          <li><span className="rct-process-number">1</span><h3>Read the paragraph</h3><p>Read the whole paragraph. Put each idea into your own words and notice how the ideas connect.</p></li>
          <li><span className="rct-process-number">2</span><h3>Hide it and recall</h3><p>Hide the text and silently retell the paragraph. Include the details and qualifications, not just its main point.</p></li>
          <li><span className="rct-process-number">3</span><h3>Check and continue</h3><p>Check your recall against all the text read so far. Then repeat with the next paragraph.</p></li>
        </ol>
        <div className="rct-learn-footer"><p>Keep the details and explain how the ideas connect. Tell the whole story in your own words.</p><button type="button" className="rct-text-button" aria-expanded={showInstructions} aria-controls="rct-full-instructions" onClick={() => setInstructionsOpen(!showInstructions)}>{showInstructions ? "Close full instructions" : "Read the full instructions"}<ArrowDown size={15} aria-hidden="true" /></button></div>
        <div id="rct-full-instructions" hidden={!showInstructions} className="rct-full-instructions">
          <p className="rct-source-map">This paragraph-by-paragraph practice follows the method called Cappuccino RC Translation in the source lessons.</p>
          <div className="rct-instruction-columns"><div><h3>The standards</h3><ul>{READ_STANDARD.map((t) => <li key={t}>{t}</li>)}{RECAP_STANDARD.map((t) => <li key={t}>{t}</li>)}</ul></div><div><h3>The steps</h3><ol>{RC_RECALL_STEPS.map((t) => <li key={t}>{t}</li>)}</ol></div></div>
          <p>{VOICE_NOTE}</p><p>{COMPARATIVE_NOTE}</p>
        </div>
      </section>

      {base && <section className="rct-examples" aria-labelledby="rc-recall-examples"><div className="rct-section-heading"><div><h2 id="rc-recall-examples" tabIndex={-1}>Worked examples</h2><p>Watch the method unfold, then try a full section yourself.</p></div></div>
        <div className="rct-example-note"><h3>Read this before the examples</h3><ul>{RC_RECALL_DEMO_CORRECTION.map((t) => <li key={t}>{t}</li>)}</ul><ExamplePlayer clip={RC_RECALL_NOTE} /></div>
        <div className="rct-example-grid">{RC_RECALL_EXAMPLES.map((clip) => <ExamplePlayer key={clip.id} clip={clip} />)}</div>
      </section>}

      <section className="rct-history" aria-labelledby="rc-recall-history"><div className="rct-section-heading"><div><h2 id="rc-recall-history" tabIndex={-1}>Your attempts</h2><p>Each attempt stays here. Starting again never replaces your earlier work.</p></div><History size={23} aria-hidden="true" /></div>
        {user && (recovery.attention > 0 || recovery.result?.storageError || recovery.error) && <div className="rct-recovery" role="alert">
          <p>{recovery.result?.storageError ?? recovery.error ?? `${recovery.attention} recording${recovery.attention === 1 ? "" : "s"} saved on this device ${recovery.attention === 1 ? "has" : "have"} not uploaded yet.`}</p>
          {recovery.result?.details.filter((d) => d.outcome === "incomplete").map((d) => <p key={d.run.recapId} className="rct-attempt-note">One recording is missing pieces and cannot be assembled. It is kept as it is.</p>)}
          <button type="button" className="rct-text-button" disabled={recovery.running} onClick={() => void recovery.retry()}>{recovery.running ? "Retrying…" : "Retry uploads"}</button>
          {recovery.result?.details.filter((d) => d.outcome === "failed").map((d) => <button key={d.run.recapId} type="button" className="rct-text-button" onClick={() => void recovery.download(d.run)}>Save a copy to this device</button>)}
        </div>}
        {user && <RcAttemptHistory studentId={user.id} history={history} recovery={recovery} savingUnavailable={savingUnavailable}
          onResume={(e) => void resume(e)} onRetryFinish={(e) => void retryFinish(e)} busyAttemptId={busyAttemptId} message={historyMessage} />}
      </section>
    </div>
  </main>;
}
