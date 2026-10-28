import { useEffect, useMemo, useRef, useState } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import { ArrowUpRight, BookOpen, History } from "lucide-react";

import "./RcTraining.css";
import RcRecallRunner from "./RcRecallRunner";
import RcAttemptHistory from "./RcAttemptHistory";
import { useRcHistory, rcHistoryKey } from "./useRcHistory";
import { useRecordingRecovery } from "./useRecordingRecovery";
import { AttemptOutcomeUnknownError, createAttempt, newId, probeAttemptsBackend, readAttemptProgress, resetUnfinishedAttempt, type AttemptRow } from "./lib/attempts";
import { REJECTION_MESSAGE, clearCheckpoint, contentKeyFor, listCheckpoints, loadCheckpoint, type Checkpoint } from "./lib/checkpoint";
import { buildEntries, recapLabel, type HistoryEntry } from "./lib/history";
import { loadPassageCompletions } from "./lib/passageProgress";
import { retryPendingFinalization } from "./lib/pending";
import { buildRecallSections, restoreRecallPractice, selectRecallPractice, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { buildSectionSteps, buildParagraphTrainingSteps, type ConfirmScope, type RecallMode } from "./lib/sequence";
import { segmentPassage, type SegmentedPassage } from "./lib/segment";
import { getSelectionProgress, loadSelectionProgress } from "./lib/selectionProgress";

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
  const showElapsedTimer = true;
  const scope: ConfirmScope = "all_read";
  const [passageCount, setPassageCount] = useState<1 | 4>(1);
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const startingRef = useRef(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [startSelection, setStartSelection] = useState<string | null>(null);
  const [resettingSession, setResettingSession] = useState(false);
  const [resetTarget, setResetTarget] = useState<HistoryEntry | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetNotice, setResetNotice] = useState<string | null>(null);
  const resetLock = useRef(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetRows, setResetRows] = useState<Record<string, AttemptRow>>({});
  const [reviewAttemptId, setReviewAttemptId] = useState<string | null>(null);
  const startErrorRef = useRef<HTMLParagraphElement>(null);
  const [historyMessage, setHistoryMessage] = useState<string | null>(null);
  const [busyAttemptId, setBusyAttemptId] = useState<string | null>(null);
  // The id a start attempt used, kept so a retry after a lost response reuses it instead of creating a second attempt.
  const pendingCreate = useRef<{ key: string; id: string } | null>(null);
  useEffect(() => {
    if (!startError) return;
    startErrorRef.current?.scrollIntoView?.({ block: "nearest" });
    startErrorRef.current?.focus();
  }, [startError]);

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
  const passageProgress = useQuery({ queryKey: ["rc-passage-progress", user?.id], enabled: !!user, queryFn: () => loadPassageCompletions(user!.id), retry: false });
  const selectionProgress = useQuery({ queryKey: ["rc-selection-progress", user?.id], enabled: !!user, queryFn: () => loadSelectionProgress(user!.id), retry: false });
  const recovery = useRecordingRecovery(user?.id, () => { void queryClient.invalidateQueries({ queryKey: rcHistoryKey(user?.id) }); }, !running && !starting && !busyAttemptId);

  // The URL is the source of truth for the instructions view: click, reload, direct entry and Back all agree.
  useEffect(() => {
    const id = location.hash.slice(1);
    const target = id ? document.getElementById(id) : null;
    if (!target) return;
    target.scrollIntoView?.({ block: "start" });
    target.focus({ preventScroll: true });
  }, [location.hash, location.key]);

  const start = async (selected: RecallSection, fromSession = false) => {
    if (!user || !savingReady || recovery.running || busyAttemptId !== null || startingRef.current) return;
    startingRef.current = true;
    setStarting(true);
    setStartSelection(contentKeyFor(selected));
    setResettingSession(fromSession);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded, 2);
      const createKey = `${contentKeyFor(selected)}:${scope}`;
      if (pendingCreate.current?.key !== createKey) pendingCreate.current = { key: createKey, id: newId() };
      const attempt = await createAttempt({
        id: pendingCreate.current.id, studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: scope, segmentationVersion: 2,
      });
      pendingCreate.current = null;
      setRunning({ mode, scope, passages, segmented, attempt, showElapsedTimer, resume: null, contentKey: `${contentKeyFor(selected)}:v2` });
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
      const { passages, segmented } = verifyLoadedSection(section, await loadPassages(a.passage_ids), a.segmentation_version ?? 1);
      const scopeUsed: ConfirmScope = a.confirmation_scope ?? "all_read";
      const steps = a.segmentation_version === 2 ? buildParagraphTrainingSteps(segmented) : buildSectionSteps(a.mode, segmented, scopeUsed);
      const checkpointKey = `${contentKeyFor(section)}${a.segmentation_version === 2 ? ":v2" : ""}`;
      const loaded = loadCheckpoint({ studentId: user.id, attemptId: a.id, contentKey: checkpointKey, stepIds: steps.map((s) => s.id) });
      if (loaded.ok === false) { setHistoryMessage(`${REJECTION_MESSAGE[loaded.reason]} This attempt can't be resumed here.`); return; }
      const reconciled = new Map(loaded.checkpoint.recaps.map((r) => [r.key, r]));
      for (const row of fresh?.recaps ?? entry.recaps) {
        reconciled.set(row.recap_key, { key: row.recap_key, voice: row.voice, state: row.recording_state, rowId: row.id, label: recapLabel(row) });
      }
      setRunning({
        mode: a.mode, scope: scopeUsed, passages, segmented, attempt: a, showElapsedTimer: loaded.checkpoint.showElapsedTimer,
        resume: { ...loaded.checkpoint, recaps: [...reconciled.values()] }, contentKey: checkpointKey,
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

  const savedPlaces = new Map((user ? listCheckpoints(user.id) : []).map((checkpoint) => [checkpoint.attemptId, checkpoint]));
  const hasActivity = (entry: HistoryEntry) => entry.recaps.length > 0 || (savedPlaces.get(entry.attempt.id)?.stepIndex ?? 0) > 0 || (savedPlaces.get(entry.attempt.id)?.recaps.length ?? 0) > 0;
  const selectionEntries = selectionProgress.data ? buildEntries(selectionProgress.data.attempts.map((attempt) => resetRows[attempt.id] ?? attempt), selectionProgress.data.recaps, [...savedPlaces.values()]) : history.entries;
  const inProgress = selectionEntries.filter((e) => e.status === "in_progress" && e.resumable && !resetRows[e.attempt.id]).sort((a, b) => Number(hasActivity(b)) - Number(hasActivity(a)) || b.attempt.started_at.localeCompare(a.attempt.started_at));
  const latestSession = inProgress[0];

  const countIds = [...new Set([...matching.slice(0, visibleCount).flatMap((choice) => choice.selection.passageIds), ...inProgress.flatMap((entry) => entry.attempt.passage_ids)])].sort((a, b) => a - b);
  const paragraphCounts = useQuery({ queryKey: ["rc-selection-paragraph-counts", countIds.join(",")], enabled: countIds.length > 0, staleTime: Infinity, retry: false, queryFn: async () => {
    const sources = await loadPassages(countIds);
    const counts: Record<number, { 1: number; 2: number }> = {};
    for (const source of sources) if (source.text) counts[source.passageId] = { 1: segmentPassage(source.text, 1, { preptest: source.preptest, passageId: source.passageId }).paragraphs.length, 2: segmentPassage(source.text, 2, { preptest: source.preptest, passageId: source.passageId }).paragraphs.length };
    return counts;
  } });

  if (running && user) {
    return <RcRecallRunner {...running} studentId={user.id} onExit={() => {
      setRunning(null);
      history.refreshLocal();
      void queryClient.invalidateQueries({ queryKey: rcHistoryKey(user.id) });
      void queryClient.invalidateQueries({ queryKey: ["rc-passage-progress", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["rc-selection-progress", user.id] });
    }} />;
  }

  const requestReset = (entry: HistoryEntry) => {
    if (resetLock.current || startingRef.current || busyAttemptId !== null || recovery.running || !savingReady || entry.attempt.finished_at || entry.pendingFinalization) return;
    setResetError(null); setResetTarget(entry);
  };
  const confirmReset = async () => {
    if (!user || !resetTarget || resetLock.current) return;
    resetLock.current = true; setResetBusy(true); setResetError(null);
    const target = resetTarget;
    const y = window.scrollY;
    try {
      const checkpoint = savedPlaces.get(target.attempt.id);
      const saved = await resetUnfinishedAttempt({ attemptId: target.attempt.id, studentId: user.id, elapsedSeconds: Math.floor((checkpoint?.sectionMs ?? (target.attempt.elapsed_seconds ?? 0) * 1000) / 1000) });
      clearCheckpoint(user.id, target.attempt.id);
      setResetRows((rows) => ({ ...rows, [saved.id]: saved }));
      history.refreshLocal();
      setResetTarget(null); setResetNotice("Practice reset. Start again when you’re ready. Your earlier practice stays in Your attempts.");
      await Promise.all([queryClient.invalidateQueries({ queryKey: rcHistoryKey(user.id) }), queryClient.invalidateQueries({ queryKey: ["rc-selection-progress", user.id] }), queryClient.invalidateQueries({ queryKey: ["rc-passage-progress", user.id] })]);
    } catch (error) {
      setResetError(error instanceof Error ? error.message : "This practice could not be reset. Your saved place has not changed. Try again.");
    } finally {
      resetLock.current = false; setResetBusy(false);
      requestAnimationFrame(() => { if (window.scrollY !== y) window.scrollTo({ top: y, behavior: "instant" }); });
    }
  };
  const sessionTitle = (entry: HistoryEntry) => entry.attempt.passage_ids.length === 1
    ? index.data?.find((passage) => passage.passageId === entry.attempt.passage_ids[0])?.title || sectionLabel(entry.attempt)
    : sectionLabel(entry.attempt);
  const sessionDate = (entry: HistoryEntry) => new Date(entry.attempt.started_at).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
  const sessionMeta = (entry: HistoryEntry) => `${sessionTitle(entry) === sectionLabel(entry.attempt) ? "" : `${sectionLabel(entry.attempt)} · `}Started ${sessionDate(entry)}`;
  const unsavedResults = history.entries.filter((e) => e.status === "pending");
  const progressData = selectionProgress.data;
  const progressFor = (passageIds: number[], attemptId?: string) => getSelectionProgress({ passageIds, attemptId, attempts: (progressData?.attempts ?? history.entries.map((entry) => entry.attempt)).map((attempt) => resetRows[attempt.id] ?? attempt), recaps: progressData?.recaps ?? history.entries.flatMap((entry) => entry.recaps), passageProgress: progressData?.passageProgress, paragraphCountsByVersion: paragraphCounts.data ?? {} });
  const entryFor = (attempt: AttemptRow) => buildEntries([attempt], (progressData?.recaps ?? history.entries.flatMap((entry) => entry.recaps)).filter((recap) => recap.attempt_id === attempt.id), [...savedPlaces.values()])[0];
  const reviewResults = (attemptId: string) => { setReviewAttemptId(attemptId); const result = document.getElementById(`rc-attempt-${attemptId}`); result?.scrollIntoView({ block: "start" }); result?.focus({ preventScroll: true }); };
  const selectedReviewAttempt = progressData?.attempts.find((attempt) => attempt.id === reviewAttemptId);
  const displayedHistory = selectedReviewAttempt && !history.entries.some((entry) => entry.attempt.id === selectedReviewAttempt.id) ? { ...history, entries: [entryFor(selectedReviewAttempt), ...history.entries] } : history;
  const progressNote = (ids: number[], attemptId?: string) => {
    if (selectionProgress.isPending) return <p className="rct-attempt-note">Loading progress…</p>;
    if (selectionProgress.isError) return <p className="rct-attempt-note">Progress unavailable</p>;
    const progress = progressFor(ids, attemptId);
    if (progress.state === "ready") return <div className="rct-selection-progress"><span>Ready to start</span>{(progress.hasPriorPractice || ids.some((id) => passageProgress.data?.has(id))) && <span>Earlier practice saved in Your attempts</span>}</div>;
    const total = progress.totalParagraphs;
    const date = progress.state === "completed" ? progress.completedAt : progress.startedAt;
    return <div className="rct-selection-progress">{date && !attemptId && <span>{progress.state === "completed" ? "Completed" : "Started"} {new Date(date).toLocaleDateString("en-CA")}</span>}<p>{progress.state === "completed" ? "Completed" : "In progress"} · {total === null ? "Paragraph count unavailable" : `${progress.completedParagraphs} of ${total} paragraphs completed`}</p>
      {total !== null && progress.completedParagraphs > 0 && <progress value={progress.completedParagraphs} max={total} aria-label={`${progress.completedParagraphs} of ${total} paragraphs completed`} />}
    </div>;
  };

  return <main className="rct-page rct-selector-page" data-reading-activity="rc-recall">
    <header className="rct-hub-header">
      <h1>RC Training</h1>
      <div className="rct-hub-actions">
        <Link to="/reading-center/rc-recall" className="rct-text-button">Back to instructions</Link>
      </div>
    </header>

    <AlertDialog.Root open={!!resetTarget} onOpenChange={(open) => { if (!open && !resetBusy) setResetTarget(null); }}><AlertDialog.Portal><AlertDialog.Overlay className="rct-reset-overlay" /><AlertDialog.Content className="rct-reset-dialog" onCloseAutoFocus={(event) => event.preventDefault()}>
      <AlertDialog.Title>Reset this unfinished practice?</AlertDialog.Title><AlertDialog.Description>You’ll stay on this page. This practice will be ready to start again. Earlier attempts, completed passages and recordings stay saved.</AlertDialog.Description>
      {resetTarget && <p>{sessionTitle(resetTarget)} · {sessionMeta(resetTarget)}</p>}
      {resetError && <p role="alert" className="rct-error">{resetError}</p>}
      <div><AlertDialog.Cancel asChild><button type="button" className="rct-text-button" disabled={resetBusy}>Keep my place</button></AlertDialog.Cancel><button type="button" className="rct-button rct-button-primary" disabled={resetBusy} onClick={() => void confirmReset()}>{resetBusy ? "Resetting…" : "Reset practice"}</button></div>
    </AlertDialog.Content></AlertDialog.Portal></AlertDialog.Root>
    <div className="rct-content">
      <section className="rct-start" aria-labelledby="rc-recall-start">
        <div className="rct-list-heading"><h2 id="rc-recall-start" tabIndex={-1}>{passageCount === 1 ? "Choose a passage" : "Choose a full section"}</h2><p>{passageCount === 1 ? "Read one paragraph, retell it from memory, then move to the next. Start any passage below." : "Practise four passages in order, using the same paragraph-by-paragraph routine."}</p></div>
        <div className="rct-start-form">
          {latestSession && <section className="rct-continue-card" aria-labelledby="rc-continue-title">
            <div className="rct-continue-main">
              <span className="rct-continue-icon" aria-hidden="true"><BookOpen size={21} /></span>
              <div className="rct-continue-copy"><p className="rct-continue-caption">Resume practice</p><h3 id="rc-continue-title">{sessionTitle(latestSession)}</h3><p>{sessionMeta(latestSession)}</p>{progressNote(latestSession.attempt.passage_ids, latestSession.attempt.id)}</div>
              <div className="rct-passage-actions rct-continue-actions">
                <button type="button" className="rct-button rct-button-primary" disabled={recovery.running || busyAttemptId !== null || starting} onClick={() => void resume(latestSession)}>{busyAttemptId === latestSession.attempt.id ? "Opening…" : "Resume"}</button>
                <button type="button" className="rct-text-button rct-reset-passage" disabled={recovery.running || busyAttemptId !== null || starting || !savingReady || index.isPending || index.isError} onClick={() => requestReset(latestSession)} title="Clear this unfinished practice. Earlier work stays saved.">{resetBusy ? "Resetting…" : latestSession.attempt.passage_ids.length === 1 ? "Reset passage" : "Reset section"}</button>
              </div>
            </div>
            {startError && resettingSession && <p ref={startErrorRef} tabIndex={-1} role="alert" className="rct-error rct-continue-error">{startError}</p>}
            {inProgress.length > 1 && <footer className="rct-continue-footer"><details className="rct-other-sessions"><summary>Other unfinished sessions ({inProgress.length - 1})</summary><ul>{inProgress.slice(1).map((entry) => <li key={entry.attempt.id}><div><strong>{sessionTitle(entry)}</strong><p>{sessionMeta(entry)}</p>{progressNote(entry.attempt.passage_ids, entry.attempt.id)}</div><button type="button" className="rct-text-button" disabled={recovery.running || busyAttemptId !== null || starting} onClick={() => void resume(entry)} aria-label={`Resume ${sessionTitle(entry)}, started ${sessionDate(entry)}`}>{busyAttemptId === entry.attempt.id ? "Opening…" : "Resume"}</button><button type="button" className="rct-text-button" disabled={resetBusy || starting || recovery.running} onClick={() => requestReset(entry)} aria-label={`Reset ${sessionTitle(entry)}, started ${sessionDate(entry)}`}>Reset</button></li>)}</ul></details>
            </footer>}
          </section>}
          {unsavedResults.length > 0 && <div className="rct-save-results" role="status">{unsavedResults.map((entry) => <p key={entry.attempt.id}>Result not saved: {sectionLabel(entry.attempt)}. <button type="button" className="rct-text-button" disabled={busyAttemptId !== null || recovery.running || starting} onClick={() => void retryFinish(entry)}>Try saving it again</button></p>)}</div>}
          {resetNotice && <p role="status" className="rct-reset-notice">{resetNotice}</p>}
          <div className="rct-choice-tools">
            <label className="rct-section-field rct-passage-search"><span>Find a passage or PrepTest</span><input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(12); }} placeholder="For example, PT140" className="rct-select-trigger" /></label>
            <fieldset className="rct-segmented"><legend className="sr-only">Practice length</legend>
              <label><input type="radio" name="practice-length" checked={passageCount === 1} onChange={() => { setPassageCount(1); setVisibleCount(12); }} /><span>Single passage</span></label>
              <label><input type="radio" name="practice-length" checked={passageCount === 4} onChange={() => { setPassageCount(4); setVisibleCount(12); }} /><span>Full section · 4 passages</span></label>
            </fieldset>
          </div>
          {index.isPending && <div className="rct-loading" role="status">Loading passages…</div>}
          {index.isError && <div role="alert"><p>The passage list could not load.</p><button className="rct-text-button" onClick={() => void index.refetch()}>Try loading passages again</button></div>}
          {!index.isPending && !index.isError && !sections.length && <p role="status">No complete RC sections are available yet.</p>}
          {backend.isPending && !!user && <p role="status" className="rct-save-state">Checking that saving is available…</p>}
          {savingUnavailable && <div role="alert" className="rct-save-state"><p>{SAVING_UNAVAILABLE}</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Check again"}</button></div>}
          {backend.data?.state === "unknown" && <div role="alert" className="rct-save-state"><p>We could not check whether saving is available. Check your connection, then try again. Starting is turned off until we can confirm it.</p><button type="button" className="rct-text-button" disabled={backend.isFetching} onClick={() => void backend.refetch()}>{backend.isFetching ? "Checking…" : "Try again"}</button></div>}
          {selectionProgress.isError && <p role="status">Saved paragraph progress could not load. Your saved work has not changed. <button type="button" className="rct-text-button" onClick={() => void selectionProgress.refetch()}>Try loading paragraph progress again</button></p>}
          {passageProgress.isError && <p role="status">Completion records could not load. Your saved work has not changed. <button type="button" className="rct-text-button" onClick={() => void passageProgress.refetch()}>Try loading completion records again</button></p>}
          <ul className="rct-passage-list" aria-label={passageCount === 1 ? "Available passages" : "Available full sections"}>
            {matching.slice(0, visibleCount).map(({ selection, title, label, recommended }) => { const progress = progressFor(selection.passageIds); const activeEntry = progress.attempt && !progress.attempt.finished_at ? entryFor(progress.attempt) : null; return <li key={contentKeyFor(selection)} className="rct-passage-choice" style={startError && startSelection === contentKeyFor(selection) ? { flexWrap: "wrap" } : undefined}>
              <div>{recommended && <span className="rct-attempt-note">{passageCount === 1 ? "The passage used in the example" : "Includes the example passage"}</span>}<h3>{title}</h3><p>{label}</p>
                {progressNote(selection.passageIds)}

              </div>
              <div className="rct-passage-actions">
                {progress.state === "completed" && progress.attempt ? <button type="button" className="rct-button rct-button-primary" aria-label={`Review results ${label}`} onClick={() => reviewResults(progress.attempt!.id)}>Review results</button> : activeEntry?.pendingFinalization ? <button type="button" className="rct-button rct-button-primary" onClick={() => void retryFinish(activeEntry)} disabled={busyAttemptId !== null || resetBusy}>Try saving result</button> : activeEntry ? <button type="button" className="rct-button rct-button-primary" aria-label={`${activeEntry.resumable ? "Resume" : "Continue on original device"} ${label}`} disabled={!activeEntry.resumable || resetBusy || starting || busyAttemptId !== null || recovery.running} onClick={() => void resume(activeEntry)}>{activeEntry.resumable ? "Resume" : "Use original device"}</button> : <button type="button" className="rct-button rct-button-primary" aria-label={`Start ${label}`} disabled={resetBusy || starting || !savingReady || recovery.running || selectionProgress.isPending || selectionProgress.isError} onClick={() => void start(selection)}>{starting && startSelection === contentKeyFor(selection) ? "Starting…" : passageCount === 1 ? "Start passage" : "Start section"}<ArrowUpRight size={18} aria-hidden="true" /></button>}
                {activeEntry && !activeEntry.pendingFinalization && <button type="button" className="rct-text-button rct-reset-passage" aria-label={`Reset ${label}`} title="Clear this unfinished practice. Earlier work stays saved." disabled={resetBusy || starting || !savingReady || recovery.running} onClick={() => requestReset(activeEntry)}>Reset {activeEntry.attempt.passage_ids.length === 1 ? "passage" : "section"}</button>}

              </div>
              {startError && !resettingSession && startSelection === contentKeyFor(selection) && <p ref={startErrorRef} tabIndex={-1} role="alert" className="rct-error" style={{ flexBasis: "100%", width: "100%" }}>{startError}</p>}
            </li>; })}
          </ul>
          {!index.isPending && !index.isError && choices.length > 0 && matching.length === 0 && <p role="status">No passages match that search. Try a PrepTest number or another word.</p>}
          {matching.length > visibleCount && <button type="button" className="rct-text-button" onClick={() => setVisibleCount((count) => count + 24)}>Show more {passageCount === 1 ? "passages" : "sections"} ({matching.length - visibleCount} remaining)</button>}
        </div>
      </section>



      <nav aria-label="Practice help" className="rct-hero-actions"><Link to={{ hash: "#rc-recall-history" }}>Your attempts</Link></nav>
      <section className="rct-history" aria-labelledby="rc-recall-history"><div className="rct-section-heading"><div><h2 id="rc-recall-history" tabIndex={-1}>Your attempts</h2><p>Each attempt stays here. Starting again never replaces your earlier work.</p></div><History size={23} aria-hidden="true" /></div>
        {user && (recovery.attention > 0 || recovery.result?.storageError || recovery.error) && <div className="rct-recovery" role="alert">
          <p>{recovery.result?.storageError ?? recovery.error ?? `${recovery.attention} recording${recovery.attention === 1 ? "" : "s"} saved on this device ${recovery.attention === 1 ? "has" : "have"} not uploaded yet.`}</p>
          {recovery.result?.details.filter((d) => d.outcome === "incomplete").map((d) => <p key={d.run.recapId} className="rct-attempt-note">{!d.run.stopped ? "One recording stopped unexpectedly. Its ending may be missing. You can save the available audio to this device." : "One recording is missing pieces and cannot be assembled. It is kept as it is."}</p>)}
          <button type="button" className="rct-text-button" disabled={recovery.running} onClick={() => void recovery.retry()}>{recovery.running ? "Retrying…" : "Retry uploads"}</button>
          {recovery.result?.details.filter((d) => d.outcome === "failed" || (d.outcome === "incomplete" && !d.run.stopped)).map((d) => <button key={d.run.recapId} type="button" className="rct-text-button" onClick={() => void recovery.download(d.run)}>Save a copy to this device</button>)}
        </div>}
        {user && <RcAttemptHistory studentId={user.id} history={displayedHistory} reviewAttemptId={reviewAttemptId} recovery={recovery} savingUnavailable={savingUnavailable}
          onResume={(e) => void resume(e)} onRetryFinish={(e) => void retryFinish(e)} busyAttemptId={busyAttemptId} message={historyMessage} />}
      </section>
    </div>
  </main>;
}
