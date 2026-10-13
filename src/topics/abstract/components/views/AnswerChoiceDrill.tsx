import { useEffect, useRef, useState } from "react";
import { ANSWER_CHOICE_ITEMS, ABSTRACT_STEPS_HTML } from "../../data/answerChoiceDrill";
import { useApp } from "../../store/AppContext";
import { useAuth } from "@/contexts/AuthContext";
import { emptySourceSession, loadSourceSession, restoreSourceSession, saveSourceSession, sourceSessionKey, SOURCE_REVIEW_TAG, type SourceExerciseSession } from "../../lib/source-exercise-session";
import ChoiceResponseTimeline from "./ChoiceResponseTimeline";
import { RoleChoiceClosing } from "./RoleChoiceLecture";
import { BookOpen, ArrowRight } from "lucide-react";

export function AnswerChoiceSteps({ onStart }: { onStart: () => void }) {
  return <section className="space-y-6">
    <div className="bg-brutal-paper border-2 border-brutal-ink p-6 [&_h1]:text-3xl [&_h1]:font-black [&_h1]:mb-6 [&_li]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 text-lg leading-relaxed" dangerouslySetInnerHTML={{ __html: ABSTRACT_STEPS_HTML.replace(/<h3>/g, "<h1>").replace(/<\/h3>/g, "</h1>") }} />
    <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={onStart}>Start the answer-choice exercise</button>
  </section>;
}

export default function AnswerChoiceDrill({ onDone }: { onDone: () => void }) {
  const { bootcampState, loading, progressOwnerId, markTranslatorComplete, markDrillComplete, markModuleDrillComplete, setCurrentView, openModule } = useApp();
  const { user } = useAuth();
  const key = sourceSessionKey(user?.id);
  const [session, setSession] = useState<SourceExerciseSession>(emptySourceSession);
  const sessionRef = useRef(session);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [storageError, setStorageError] = useState(false);
  const initialized = useRef("");
  const dirty = useRef(false);
  const sectionRef = useRef<HTMLElement>(null);
  const sourceRef = useRef<HTMLDivElement>(null);
  const reviewedWrites = useRef(new Set<string>());
  const pendingReviews = useRef(new Map<string, Promise<boolean>>());
  const scopeRef = useRef(key);
  scopeRef.current = key;

  function commit(next: SourceExerciseSession) {
    dirty.current = true;
    sessionRef.current = next;
    setSession(next);
    setStorageError(!saveSourceSession(key, next));
  }

  useEffect(() => {
    if (loading || progressOwnerId !== (user?.id ?? null) || initialized.current === key) return;
    initialized.current = key;
    dirty.current = false;
    reviewedWrites.current = new Set(bootcampState.drillAttempts.filter((a) => a.trapTag === SOURCE_REVIEW_TAG).map((a) => a.drillId));
    pendingReviews.current.clear();
    const restored = restoreSourceSession(loadSourceSession(key), bootcampState.drillAttempts);
    sessionRef.current = restored; setSession(restored); setReady(true); setBusy(false); setSaveError(""); setStorageError(false);
  }, [loading, progressOwnerId, key, bootcampState.drillAttempts]);

  useEffect(() => {
    function onHydrated() {
      if (dirty.current || !ready || progressOwnerId !== (user?.id ?? null)) return;
      const saved = loadSourceSession(key);
      if (saved) { const restored = restoreSourceSession(saved, bootcampState.drillAttempts); sessionRef.current = restored; setSession(restored); }
    }
    window.addEventListener("cloud-mirror-hydrated", onHydrated);
    return () => window.removeEventListener("cloud-mirror-hydrated", onHydrated);
  }, [key, ready, progressOwnerId, bootcampState.drillAttempts]);
  useEffect(() => { sectionRef.current?.scrollIntoView({ block: "start" }); }, [session.index, session.finished]);
  const item = ANSWER_CHOICE_ITEMS[session.index];
  const draft = session.drafts[item.id] ?? { requirements: "", example: "", revealed: false };
  const hasWrittenWork = Boolean(draft.requirements.trim() && draft.example.trim());

  async function recordReview(): Promise<boolean> {
    if (reviewedWrites.current.has(item.id)) return true;
    const pending = pendingReviews.current.get(item.id);
    if (pending) return pending;
    const requestKey = key;
    setBusy(true);
    const request = (async () => {
      try {
        const result = await markDrillComplete(item.id, "translation", false, undefined, undefined, SOURCE_REVIEW_TAG);
        if (scopeRef.current !== requestKey) return false;
        if (!result.ok) { setSaveError("Your review could not be saved to your account. Your place is kept on this browser. Try again."); return false; }
        reviewedWrites.current.add(item.id); setSaveError(""); return true;
      } catch { if (scopeRef.current === requestKey) setSaveError("Your review could not be saved. Your place is kept on this browser. Try again."); return false; }
      finally { if (scopeRef.current === requestKey) { pendingReviews.current.delete(item.id); setBusy(false); } }
    })();
    pendingReviews.current.set(item.id, request);
    return request;
  }

  useEffect(() => {
    if (!ready || session.finished || !draft.revealed || !sourceRef.current) return;
    // This effect runs after the original breakdown has actually rendered.
    if (!session.reviewedIds.includes(item.id)) commit({ ...sessionRef.current, reviewedIds: [...sessionRef.current.reviewedIds, item.id] });
    void recordReview();
  }, [ready, key, progressOwnerId, session.index, session.finished, draft.revealed]);

  function updateDraft(field: "requirements" | "example", value: string) {
    commit({ ...sessionRef.current, drafts: { ...sessionRef.current.drafts, [item.id]: { ...draft, [field]: value } } });
  }
  function showBreakdown() {
    commit({ ...sessionRef.current, drafts: { ...sessionRef.current.drafts, [item.id]: { ...draft, revealed: true } } });
  }

  async function next() {
    const requestKey = key;
    setSaveError("");
    if (!await recordReview()) return;
    if (scopeRef.current !== requestKey) return;
    setBusy(true);
    let current = sessionRef.current;
    if (hasWrittenWork && !current.practicedIds.includes(item.id)) {
      const work = `What must be present:\n${draft.requirements.trim()}\n\nMy example argument and described statement:\n${draft.example.trim()}`;
      const translated = await markTranslatorComplete(item.stemNumber, [], work);
      if (scopeRef.current !== requestKey) return;
      const recorded = translated.ok && await markDrillComplete(item.id, "translation", false, undefined, undefined, "source_exercise_ungraded");
      if (scopeRef.current !== requestKey) return;
      if (!translated.ok || !recorded || !recorded.ok) { setSaveError("Your written work could not be saved. Keep this page open and try again."); setBusy(false); return; }
      current = { ...sessionRef.current, practicedIds: [...sessionRef.current.practicedIds, item.id] };
      commit(current);
    }
    const last = session.index === ANSWER_CHOICE_ITEMS.length - 1;
    if (last && current.practicedIds.length === ANSWER_CHOICE_ITEMS.length) {
      const result = await markModuleDrillComplete("m3");
      if (scopeRef.current !== requestKey) return;
      if (!result.ok) { setSaveError("Your practice completion could not be saved. Try again."); setBusy(false); return; }
    }
    commit({ ...current, index: last ? session.index : session.index + 1, finished: last });
    setBusy(false);
  }

  if (loading || progressOwnerId !== (user?.id ?? null) || !ready || initialized.current !== key) return <p role="status">Loading your saved practice...</p>;
  if (session.finished) return <section ref={sectionRef} className="source-review-summary space-y-5">
    <h1 className="text-3xl font-black">Your answer-choice review</h1>
    <details className="border-t border-brutal-ink-trace pt-5"><summary className="font-semibold cursor-pointer">Answer-choice recap</summary><div className="mt-6"><RoleChoiceClosing /></div></details>
    <p className="text-xl"><strong>{session.reviewedIds.length} of 15 breakdowns reviewed.</strong></p>
    <p><strong>{session.practicedIds.length} of 15 written exercises saved.</strong> Reviewing a breakdown does not earn correctness or mastery.</p>
    <p className="choice-completion-note">Your place and drafts are saved on this browser.</p>
    <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={() => commit({ ...sessionRef.current, index: 0, finished: false, drafts: Object.fromEntries(Object.entries(sessionRef.current.drafts).map(([id, value]) => [id, { ...value, revealed: false }])) })}>Review from the beginning</button>
    <button className="brutal-btn" onClick={() => setCurrentView("dashboard")}>Back to dashboard</button>
    <button className="brutal-btn bg-brutal-ink text-brutal-paper" onClick={() => openModule("m4")}>Match descriptions to a full argument</button>
  </section>;
  return <section ref={sectionRef} className="abstract-choice-exercise scroll-mt-24">
    <header className="choice-exercise-header">
      <p className="choice-exercise-counter">Answer choice {session.index + 1} of {ANSWER_CHOICE_ITEMS.length}</p>
      <div role="progressbar" aria-label="Breakdowns reviewed" aria-valuemin={0} aria-valuemax={15} aria-valuenow={session.reviewedIds.length} className="choice-exercise-progress"><div style={{ width: `${session.reviewedIds.length / 15 * 100}%` }} /></div>
      <p className="choice-exercise-status">{session.reviewedIds.length} reviewed / {session.practicedIds.length} written</p>
    </header>
    <div className="choice-question-card">
      <div className="choice-question-eyebrow"><h1>What would this answer choice describe?</h1><span aria-hidden="true">{String(session.index + 1).padStart(2, "0")}</span></div>
      <p className="choice-question-text" aria-label="Answer choice">{item.stemText}</p>
    </div>
    <ChoiceResponseTimeline disabled={busy} steps={[
      { id: "choice-requirements", label: "What must be present for this answer choice to be correct?", emphasis: "What must be present", value: draft.requirements, rows: 4, onChange: (value) => updateDraft("requirements", value) },
      { id: "choice-example", label: "Write your own example argument. Identify the statement this answer choice describes.", emphasis: "Write your own example argument.", value: draft.example, rows: 6, onChange: (value) => updateDraft("example", value) },
    ]} />
    {!draft.revealed && <button onClick={showBreakdown} className="brutal-btn bg-brutal-ink text-brutal-paper choice-reveal-button"><BookOpen className="w-5 h-5" aria-hidden="true" />Show breakdown</button>}
    {draft.revealed && <>
      <div className="choice-breakdown-card"><div className="choice-breakdown-heading"><BookOpen aria-hidden="true" /><h2>The breakdown</h2></div><div ref={sourceRef} data-testid="source-breakdown" className="choice-breakdown-prose" dangerouslySetInnerHTML={{ __html: item.breakdownHtml }} /></div>
      {session.index === ANSWER_CHOICE_ITEMS.length - 1 && <RoleChoiceClosing />}
      <p className="choice-completion-note">{hasWrittenWork ? "Compare your work with the breakdown. Your responses are saved as practice, without a correctness score." : "Review the breakdown, then continue. Reviewed breakdowns and written exercises are tracked separately."}</p>
      {saveError && <p role="alert">{saveError}</p>}
      <button className="brutal-btn bg-brutal-ink text-brutal-paper choice-reveal-button" disabled={busy} onClick={next}>{busy ? "Saving..." : session.index === 14 ? "Finish the exercise" : "Next answer choice"}<ArrowRight className="w-5 h-5" aria-hidden="true" /></button>
    </>}
    <p className="choice-completion-note">{storageError ? "Drafts could not be saved on this browser. Keep this page open." : "Your place and unfinished responses are saved on this browser."}</p>
  </section>;
}
