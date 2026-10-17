import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAllIndexPassages, loadPassages } from "@/features/rc/lib/rcBank";
import type { RcPassage } from "@/features/rc/lib/rcTypes";
import ExamplePlayer from "./ExamplePlayer";
import { ArrowDown, ArrowUpRight, BookOpen, Clock3, Headphones, History } from "lucide-react";
import RcTrainingDemo from "./RcTrainingDemo";
import "./RcTraining.css";
import RcRecallRunner, { formatClock } from "./RcRecallRunner";
import { recoverRcRecallBackups } from "./lib/backup";
import { createAttempt, listAttempts, summarizeRecordings, uploadRecording, type AttemptRow } from "./lib/attempts";
import {
  COMPARATIVE_NOTE, READ_STANDARD, RECAP_STANDARD, RC_RECALL_STEPS,
  SECTION_PICKER_NOTE, VOICE_NOTE,
} from "./lib/instructions";
import {
  RC_RECALL_DEMO_CORRECTION, RC_RECALL_EXAMPLES, RC_RECALL_NOTE,
  mediaBase,
} from "./lib/media";
import { buildRecallSections, sectionLabel, verifyLoadedSection, type RecallSection } from "./lib/sections";
import { MODE_LABEL, type ConfirmScope, type RecallMode } from "./lib/sequence";
import type { SegmentedPassage } from "./lib/segment";


interface Running { mode: RecallMode; scope: ConfirmScope; passages: RcPassage[]; segmented: SegmentedPassage[]; attempt: AttemptRow; showElapsedTimer: boolean }

const dateLabel = (v: string) => new Date(v).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function RcRecallPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const mode: RecallMode = "rc_recall";
  const [showElapsedTimer, setShowElapsedTimer] = useState(true);
  const [scope, setScope] = useState<ConfirmScope>("all_read");
  const [preptest, setPreptest] = useState<number | null>(null);
  const [sectionNumber, setSectionNumber] = useState<number | null>(null);
  const [running, setRunning] = useState<Running | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);
  const base = mediaBase();

  const index = useQuery({ queryKey: ["rc-recall-index"], queryFn: loadAllIndexPassages, staleTime: Infinity });
  const sections = useMemo(() => buildRecallSections(index.data ?? []), [index.data]);
  const preptests = useMemo(() => [...new Set(sections.map((s) => s.preptest))], [sections]);
  const inTest = useMemo(() => sections.filter((s) => s.preptest === preptest), [sections, preptest]);
  const selected: RecallSection | undefined = inTest.find((s) => s.section === sectionNumber);

  useEffect(() => { if (preptest === null && preptests.length) setPreptest(preptests[0]); }, [preptests, preptest]);
  useEffect(() => { if (inTest.length && !inTest.some((s) => s.section === sectionNumber)) setSectionNumber(inTest[0].section); }, [inTest, sectionNumber]);

  const history = useQuery({
    queryKey: ["rc-recall-history", user?.id],
    enabled: !!user,
    queryFn: () => listAttempts(user!.id),
  });

  // Upload any recording this device still holds from an earlier session.
  useEffect(() => {
    if (!user) return;
    void recoverRcRecallBackups(user.id, ({ run, blob }) => uploadRecording({
      studentId: run.studentId, attemptId: run.attemptId, recapId: run.recapId, path: run.path,
      blob, mimeType: run.mimeType, durationMs: run.durationMs ?? null,
    })).then((r) => { if (r.recovered) void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] }); });
  }, [user, queryClient]);

  const start = async () => {
    if (!user || !selected) return;
    setStarting(true);
    setStartError(null);
    try {
      const loaded = await loadPassages(selected.passageIds);
      const { passages, segmented } = verifyLoadedSection(selected, loaded);
      const attempt = await createAttempt({
        studentId: user.id, mode, preptest: selected.preptest, section: selected.section,
        passageIds: selected.passageIds, confirmationScope: mode === "rc_recall" ? scope : null,
      });
      setRunning({ mode, scope, passages, segmented, attempt, showElapsedTimer });
    } catch (err) {
      setStartError(err instanceof Error && err.message
        ? `This section could not be started: ${err.message} Nothing was saved.`
        : "This section could not be started. Nothing was saved.");
    } finally { setStarting(false); }
  };

  if (running && user) {
    return <RcRecallRunner {...running} studentId={user.id} onExit={() => {
      setRunning(null);
      void queryClient.invalidateQueries({ queryKey: ["rc-recall-history", user.id] });
    }} />;
  }

  return <main className="rct-page" data-reading-activity="rc-recall">
    <header className="rct-hero">
      <div className="rct-hero-copy">
        <span className="rct-hero-tag"><BookOpen size={15} aria-hidden="true" /> Reading comprehension</span>
        <h1>RC Training</h1>
        <p className="rct-hero-lead">Recall one whole paragraph at a time.</p>
        <p className="rct-hero-description">Read a paragraph. Hide it and retell it silently in your own words. Check the text, then move to the next paragraph.</p>
        <div className="rct-hero-actions">
          <a href="#rc-recall-start" className="rct-button rct-button-light">Choose a section <ArrowDown size={16} aria-hidden="true" /></a>
          <a href="#rc-recall-how" className="rct-hero-link" onClick={() => setShowInstructions(true)}>Instructions</a>
        </div>
        <div className="rct-hero-foot"><span>4 passages, in order</span><span>Your recall is not graded</span></div>
      </div>
      <RcTrainingDemo />
    </header>

    <div className="rct-content">
      <section className="rct-start" aria-labelledby="rc-recall-start">
        <div className="rct-start-intro"><span className="rct-section-icon"><BookOpen size={23} aria-hidden="true" /></span><h2 id="rc-recall-start">Start a section</h2><p>{SECTION_PICKER_NOTE}</p><div className="rct-timing"><Clock3 size={17} aria-hidden="true" /><div><strong>Untimed</strong><span>No countdown or time limit. Work at your own pace.</span></div></div></div>
        <div className="rct-start-form">
          <a className="rct-text-button" href="#rc-recall-how" onClick={() => setShowInstructions(true)}>Read the instructions <ArrowDown size={15} aria-hidden="true" /></a>
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
          <p className="rct-timer-note">Your total section time is saved either way.</p>
          <details className="rct-check-options"><summary>Passage-pair check options</summary><fieldset className="rct-scope"><legend>What you check</legend><label><input type="radio" name="scope" checked={scope === "all_read"} onChange={() => setScope("all_read")} /> Everything read so far</label><label><input type="radio" name="scope" checked={scope === "current_sub_passage"} onChange={() => setScope("current_sub_passage")} /> Only the current passage (A or B in a passage pair)</label></fieldset></details>
          <button type="button" className="rct-button rct-button-primary rct-start-button" disabled={!selected || starting} onClick={() => void start()}>{starting ? "Starting…" : "Start section"}<ArrowUpRight size={18} aria-hidden="true" /></button>
          {startError && <p role="alert" className="rct-error">{startError}</p>}
          <p className="rct-save-note"><Headphones size={14} aria-hidden="true" />Your time and spoken recordings are saved. Your recall is not graded.</p>
        </div>
      </section>

      <section className="rct-learn" aria-labelledby="rc-recall-how" id="rct-learn">
        <div className="rct-section-heading"><div><h2 id="rc-recall-how">How to practise</h2><p>Recall the meaning of the whole paragraph, including its details and reasoning.</p></div></div>
        <ol className="rct-process">
          <li><span className="rct-process-number">1</span><h3>Read the paragraph</h3><p>Read the whole paragraph. Put each idea into your own words and notice how the ideas connect.</p></li>
          <li><span className="rct-process-number">2</span><h3>Look away &amp; recall</h3><p>Silently retell the paragraph with the text hidden. Include the details, not just its main point.</p></li>
          <li><span className="rct-process-number">3</span><h3>Check & continue</h3><p>Briefly check your recall against the text read so far. Then repeat with the next paragraph.</p></li>
        </ol>
        <div className="rct-learn-footer"><p>Keep the details and explain how the ideas connect. Tell the whole story in your own words.</p><button type="button" className="rct-text-button" aria-expanded={showInstructions} aria-controls="rct-full-instructions" onClick={() => setShowInstructions(!showInstructions)}>{showInstructions ? "Close full instructions" : "Read the full instructions"}<ArrowDown size={15} aria-hidden="true" /></button></div>
        <div id="rct-full-instructions" hidden={!showInstructions} className="rct-full-instructions">
          <p className="rct-source-map">This paragraph-by-paragraph practice follows the method called Cappuccino RC Translation in the source lessons.</p>
          <div className="rct-instruction-columns"><div><h3>The standards</h3><ul>{READ_STANDARD.map((t) => <li key={t}>{t}</li>)}{RECAP_STANDARD.map((t) => <li key={t}>{t}</li>)}</ul></div><div><h3>The steps</h3><ol>{RC_RECALL_STEPS.map((t) => <li key={t}>{t}</li>)}</ol></div></div>
          <p>{VOICE_NOTE}</p><p>{COMPARATIVE_NOTE}</p>
        </div>
      </section>

      {base && <section className="rct-examples" aria-labelledby="rc-recall-examples"><div className="rct-section-heading"><div><h2 id="rc-recall-examples">Worked examples</h2><p>Watch the method unfold, then try a full section yourself.</p></div></div>
        <div className="rct-example-note"><h3>Read this before the examples</h3><ul>{RC_RECALL_DEMO_CORRECTION.map((t) => <li key={t}>{t}</li>)}</ul><ExamplePlayer clip={RC_RECALL_NOTE} /></div>
        <div className="rct-example-grid">{RC_RECALL_EXAMPLES.map((clip) => <ExamplePlayer key={clip.id} clip={clip} />)}</div>
      </section>}

      <section className="rct-history" aria-labelledby="rc-recall-history"><div className="rct-section-heading"><div><h2 id="rc-recall-history">Your attempts</h2><p>Each attempt stays here. Starting again never replaces your earlier work.</p></div><History size={23} aria-hidden="true" /></div>
        {history.isPending ? <div role="status" className="rct-loading">Loading your attempts…</div>
          : history.isError ? <div role="alert" className="rct-history-empty"><p>Your attempts could not load. Your saved work has not changed.</p><button type="button" className="rct-text-button" onClick={() => void history.refetch()}>Try loading attempts again</button></div>
            : !history.data?.attempts.length ? <div className="rct-history-empty"><span className="rct-empty-icon"><BookOpen size={23} aria-hidden="true" /></span><div><h3>Your first section starts here.</h3><p>Choose a section above. Your time and recording status will appear here after you practise.</p></div></div>
              : <ul className="rct-attempts">{history.data.attempts.map((a) => {
                const own = history.data.recaps.filter((r) => r.attempt_id === a.id);
                const sum = summarizeRecordings(own);
                return <li key={a.id}><div><h3>{sectionLabel(a)}</h3><p>{MODE_LABEL[a.mode]}{a.mode === "rc_recall" && a.confirmation_scope ? ` · Confirmation: ${a.confirmation_scope === "all_read" ? "all text so far" : "current sub-passage"}` : ""}</p></div><div className="rct-attempt-meta"><span className="rct-attempt-state" data-completed={a.completed}>{a.finished_at ? a.completed ? "Completed" : "Ended early" : "Not finished"}</span><span>{dateLabel(a.started_at)}{a.finished_at ? ` · ${formatClock(a.elapsed_seconds ?? 0)}` : ""}</span><span>{sum.spoken ? `${sum.saved} of ${sum.spoken} spoken recaps saved${sum.failed ? `, ${sum.failed} failed` : ""}` : "No spoken recaps"}</span></div></li>;
              })}</ul>}
      </section>
    </div>
  </main>;
}
